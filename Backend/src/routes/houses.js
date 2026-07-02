const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, canCreateInBlock, isScopedSecretary } = require("../utils/accessScope");
const { withTimeout } = require("../utils/timeout");

const router = express.Router();

function normalizeBlock(value) {
  return String(value || "").trim().toUpperCase();
}

function sanitizeHousePayload(rawBody) {
  const dbData = toSnakeCase(rawBody || {});
  // Remove fields not in the houses table
  delete dbData.id;
  delete dbData.created_at;
  delete dbData.updated_at;
  delete dbData.members_count;
  delete dbData.vehicles_count;

  if (Object.prototype.hasOwnProperty.call(dbData, "block")) {
    dbData.block = normalizeBlock(dbData.block);
  }

  if (Object.prototype.hasOwnProperty.call(dbData, "house_number")) {
    dbData.house_number = String(dbData.house_number || "").trim();
  }

  if (Object.prototype.hasOwnProperty.call(dbData, "floor")) {
    const parsedFloor = Number(dbData.floor);
    dbData.floor = Number.isFinite(parsedFloor) ? parsedFloor : 0;
  }

  return dbData;
}

function isDuplicateHouseNumberError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  const message = String(error.message || "").toLowerCase();
  return code === "23505" && (message.includes("houses_house_number_key") || message.includes("house_number"));
}

function isMissingDeletedAtColumn(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("deleted_at") && (message.includes("does not exist") || message.includes("column"));
}

async function fetchHousesQuery(paginate, page, limit) {
  const baseQuery = supabase
    .from("houses")
    .select("*", { count: paginate ? "exact" : undefined })
    .order("block", { ascending: true })
    .order("house_number", { ascending: true });
  // Check whether the houses table exposes a deleted_at column before using it
  let useDeletedAt = true;
  try {
    const test = await supabase.from('houses').select('deleted_at').limit(1);
    if (test.error) useDeletedAt = false;
  } catch (e) {
    useDeletedAt = false;
  }

  const activeQuery = useDeletedAt ? baseQuery.is("deleted_at", null) : baseQuery;
  const query = paginate ? activeQuery.range((page - 1) * limit, (page - 1) * limit + limit - 1) : activeQuery;

  try {
    const result = await query;
    if (result.error && isMissingDeletedAtColumn(result.error)) {
      console.warn('fetchHousesQuery: detected missing deleted_at column, using fallback query');
      const fallbackQuery = paginate
        ? baseQuery.range((page - 1) * limit, (page - 1) * limit + limit - 1)
        : baseQuery;
      const fallbackResult = await fallbackQuery;
      return fallbackResult;
    }

    return result;
  } catch (err) {
    console.warn('fetchHousesQuery caught error:', err?.message || err);
    if (isMissingDeletedAtColumn(err)) {
      console.warn('fetchHousesQuery: caught missing deleted_at column error, using fallback');
      const fallbackQuery = paginate
        ? baseQuery.range((page - 1) * limit, (page - 1) * limit + limit - 1)
        : baseQuery;
      const fallbackResult = await fallbackQuery;
      return fallbackResult;
    }
    throw err;
  }
}

async function fetchSimpleRows(table) {
  // Check if this table has deleted_at column before applying .is
  let useDeletedAt = true;
  try {
    const test = await supabase.from(table).select('deleted_at').limit(1);
    if (test.error) useDeletedAt = false;
  } catch (e) {
    useDeletedAt = false;
  }

  if (useDeletedAt) {
    try {
      const activeResult = await supabase.from(table).select("house_id").is("deleted_at", null);
      if (activeResult.error) {
        const fallback = await supabase.from(table).select("house_id");
        return fallback;
      }
      return activeResult;
    } catch (err) {
      const fallback = await supabase.from(table).select("house_id");
      return fallback;
    }
  }

  return supabase.from(table).select("house_id");
}

// GET /api/houses — Fetch all houses with computed member/vehicle counts
router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const paginate = String(req.query.paginate || "false").toLowerCase() === "true" || req.query.page || req.query.limit;
    const offset = (page - 1) * limit;

    const [housesRes, membersRes, vehiclesRes] = await withTimeout(
      Promise.all([
        fetchHousesQuery(paginate, page, limit),
        fetchSimpleRows("members"),
        fetchSimpleRows("vehicles"),
      ]),
      10000,
      "Failed to fetch houses in time"
    );
    console.log('housesRes.error=', housesRes?.error ? housesRes.error.message || housesRes.error : null);
    console.log('membersRes.error=', membersRes?.error ? membersRes.error.message || membersRes.error : null);
    console.log('vehiclesRes.error=', vehiclesRes?.error ? vehiclesRes.error.message || vehiclesRes.error : null);

    if (housesRes.error) throw housesRes.error;

    // Build count maps
    const memberCountMap = {};
    (membersRes.data || []).forEach((m) => {
      memberCountMap[m.house_id] = (memberCountMap[m.house_id] || 0) + 1;
    });
    const vehicleCountMap = {};
    (vehiclesRes.data || []).forEach((v) => {
      vehicleCountMap[v.house_id] = (vehicleCountMap[v.house_id] || 0) + 1;
    });

    // Enrich houses with counts
    const enriched = housesRes.data.map((h) => ({
      ...h,
      members_count: memberCountMap[h.id] || 0,
      vehicles_count: vehicleCountMap[h.id] || 0,
    }));

    const scoped = isScopedSecretary(req)
      ? enriched.filter((h) => canAccessHouse(req, h.id))
      : enriched;

    if (paginate) {
      const total = housesRes.count ?? scoped.length;
      return res.json({
        data: toCamelCase(scoped),
        pagination: {
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      });
    }

    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("Fetch houses error:", err);
    res.status(500).json({ message: "Failed to fetch houses" });
  }
});

// GET /api/houses/:id — Fetch single house
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "House not found" });

    if (isScopedSecretary(req) && !canAccessHouse(req, data.id)) {
      return res.status(403).json({ message: "Access denied for this house" });
    }

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch house error:", err);
    res.status(500).json({ message: "Failed to fetch house" });
  }
});

// POST /api/houses — Create a new house
router.post("/", async (req, res) => {
  try {
    const dbData = sanitizeHousePayload(req.body);

    if (!dbData.block || !dbData.house_number) {
      return res.status(400).json({ message: "Block and house number are required" });
    }

    if (isScopedSecretary(req) && !canCreateInBlock(req, dbData.block)) {
      return res.status(403).json({
        message: "You can only create houses in your assigned block scope",
        allowedBlocks: req.accessScope?.blocks || [],
      });
    }

    const { data, error } = await supabase
      .from("houses")
      .insert(dbData)
      .select()
      .single();

    if (isDuplicateHouseNumberError(error)) {
      return res.status(409).json({
        message: `House number '${dbData.house_number}' already exists. Use a different house number.`,
      });
    }

    if (error) throw error;

    res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create house error:", err);
    res.status(500).json({ message: err.message || "Failed to create house" });
  }
});

// PUT /api/houses/:id — Update a house
router.put("/:id", async (req, res) => {
  try {
    const dbData = sanitizeHousePayload(req.body);

    if (Object.keys(dbData).length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    const { data: existingHouse, error: existingError } = await supabase
      .from("houses")
      .select("id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingHouse) {
      return res.status(404).json({ message: "House not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingHouse.id)) {
      return res.status(403).json({ message: "Access denied for this house" });
    }

    if (isScopedSecretary(req) && Object.prototype.hasOwnProperty.call(dbData, "block") && !canCreateInBlock(req, dbData.block)) {
      return res.status(403).json({
        message: "You can only assign houses to your allowed blocks",
        allowedBlocks: req.accessScope?.blocks || [],
      });
    }

    const { data, error } = await supabase
      .from("houses")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (isDuplicateHouseNumberError(error)) {
      return res.status(409).json({
        message: `House number '${dbData.house_number}' already exists. Use a different house number.`,
      });
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "House not found" });

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update house error:", err);
    res.status(500).json({ message: err.message || "Failed to update house" });
  }
});

// DELETE /api/houses/:id — Delete a house
router.delete("/:id", async (req, res) => {
  try {
    const { data: existingHouse, error: existingError } = await supabase
      .from("houses")
      .select("id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingHouse) {
      return res.status(404).json({ message: "House not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingHouse.id)) {
      return res.status(403).json({ message: "Access denied for this house" });
    }

    const softDeletePayload = { deleted_at: new Date().toISOString() };
    let deleteResult = await supabase
      .from("houses")
      .update(softDeletePayload)
      .eq("id", req.params.id);

    if (deleteResult.error && isMissingDeletedAtColumn(deleteResult.error)) {
      deleteResult = await supabase
        .from("houses")
        .delete()
        .eq("id", req.params.id);
    }

    const { error } = deleteResult;

    if (error) throw error;

    res.json({ message: "House deleted successfully" });
  } catch (err) {
    console.error("Delete house error:", err);
    res.status(500).json({ message: err.message || "Failed to delete house" });
  }
});

module.exports = router;
