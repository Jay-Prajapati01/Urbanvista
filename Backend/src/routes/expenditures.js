const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, isScopedSecretary } = require("../utils/accessScope");

const router = express.Router();

const EXPENDITURE_OPTIONAL_COLUMNS = new Set(["vendor"]);

function extractMissingColumn(error) {
  if (!error || error.code !== "PGRST204" || typeof error.message !== "string") {
    return "";
  }
  const match = error.message.match(/Could not find the '([^']+)' column/);
  return match ? match[1] : "";
}

function isMissingHouseIdColumnError(error) {
  return (
    error &&
    error.code === "PGRST204" &&
    typeof error.message === "string" &&
    error.message.includes("'house_id'")
  );
}

// GET /api/expenditures — Fetch all expenditures
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expenditures")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    const scopedData = isScopedSecretary(req)
      ? (data || []).filter((row) => row.house_id && canAccessHouse(req, row.house_id))
      : (data || []);

    res.json(toCamelCase(scopedData));
  } catch (err) {
    console.error("Fetch expenditures error:", err);
    res.status(500).json({ message: "Failed to fetch expenditures" });
  }
});

// GET /api/expenditures/:id — Fetch single expenditure
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expenditures")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Expenditure not found" });

    if (
      isScopedSecretary(req) &&
      !Object.prototype.hasOwnProperty.call(data, "house_id")
    ) {
      return res.status(503).json({
        message:
          "Secretary expenditure access requires expenditures.house_id column. Please apply latest database migration.",
      });
    }

    if (isScopedSecretary(req) && (!data.house_id || !canAccessHouse(req, data.house_id))) {
      return res.status(403).json({ message: "Access denied for this expenditure" });
    }

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch expenditure error:", err);
    res.status(500).json({ message: "Failed to fetch expenditure" });
  }
});

// POST /api/expenditures — Create a new expenditure
router.post("/", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    if (!dbData.title) {
      dbData.title = String(dbData.description || dbData.category || "Expense").trim() || "Expense";
    }
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    if (isScopedSecretary(req)) {
      if (!dbData.house_id) {
        return res.status(400).json({
          message: "houseId is required for secretary-created expenditures",
        });
      }
      if (!canAccessHouse(req, dbData.house_id)) {
        return res.status(403).json({ message: "Target house is outside your scope" });
      }
    }

    let { data, error } = await supabase
      .from("expenditures")
      .insert(dbData)
      .select()
      .single();

    if (error && isMissingHouseIdColumnError(error) && Object.prototype.hasOwnProperty.call(dbData, "house_id")) {
      if (isScopedSecretary(req)) {
        return res.status(503).json({
          message:
            "Secretary expenditure creation requires expenditures.house_id column. Please apply latest database migration.",
        });
      }

      const fallbackPayload = { ...dbData };
      delete fallbackPayload.house_id;
      ({ data, error } = await supabase
        .from("expenditures")
        .insert(fallbackPayload)
        .select()
        .single());
    }

    while (error) {
      const missingColumn = extractMissingColumn(error);
      if (!missingColumn || !EXPENDITURE_OPTIONAL_COLUMNS.has(missingColumn) || !Object.prototype.hasOwnProperty.call(dbData, missingColumn)) {
        break;
      }

      delete dbData[missingColumn];
      ({ data, error } = await supabase
        .from("expenditures")
        .insert(dbData)
        .select()
        .single());
    }

    if (error) throw error;

    res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create expenditure error:", err);
    res.status(500).json({ message: err.message || "Failed to create expenditure" });
  }
});

// PUT /api/expenditures/:id — Update an expenditure
router.put("/:id", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    if (Object.prototype.hasOwnProperty.call(dbData, "title") && !dbData.title) {
      dbData.title = String(dbData.description || dbData.category || "Expense").trim() || "Expense";
    }
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    let { data: existingExpenditure, error: existingError } = await supabase
      .from("expenditures")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError && isMissingHouseIdColumnError(existingError)) {
      if (isScopedSecretary(req)) {
        return res.status(503).json({
          message:
            "Secretary expenditure updates require expenditures.house_id column. Please apply latest database migration.",
        });
      }

      ({ data: existingExpenditure, error: existingError } = await supabase
        .from("expenditures")
        .select("id")
        .eq("id", req.params.id)
        .single());
    }

    if (existingError || !existingExpenditure) {
      return res.status(404).json({ message: "Expenditure not found" });
    }

    if (isScopedSecretary(req) && (!existingExpenditure.house_id || !canAccessHouse(req, existingExpenditure.house_id))) {
      return res.status(403).json({ message: "Access denied for this expenditure" });
    }

    if (isScopedSecretary(req) && dbData.house_id && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "Target house is outside your scope" });
    }

    let payload = { ...dbData };
    let { data, error } = await supabase
      .from("expenditures")
      .update(payload)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error && isMissingHouseIdColumnError(error) && Object.prototype.hasOwnProperty.call(payload, "house_id")) {
      if (isScopedSecretary(req)) {
        return res.status(503).json({
          message:
            "Secretary expenditure updates require expenditures.house_id column. Please apply latest database migration.",
        });
      }

      payload = { ...payload };
      delete payload.house_id;
      ({ data, error } = await supabase
        .from("expenditures")
        .update(payload)
        .eq("id", req.params.id)
        .select()
        .single());
    }

    while (error) {
      const missingColumn = extractMissingColumn(error);
      if (!missingColumn || !EXPENDITURE_OPTIONAL_COLUMNS.has(missingColumn) || !Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
        break;
      }

      delete payload[missingColumn];
      ({ data, error } = await supabase
        .from("expenditures")
        .update(payload)
        .eq("id", req.params.id)
        .select()
        .single());
    }

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Expenditure not found" });

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update expenditure error:", err);
    res.status(500).json({ message: err.message || "Failed to update expenditure" });
  }
});

// DELETE /api/expenditures/:id — Delete an expenditure
router.delete("/:id", async (req, res) => {
  try {
    let { data: existingExpenditure, error: existingError } = await supabase
      .from("expenditures")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError && isMissingHouseIdColumnError(existingError)) {
      if (isScopedSecretary(req)) {
        return res.status(503).json({
          message:
            "Secretary expenditure deletion requires expenditures.house_id column. Please apply latest database migration.",
        });
      }

      ({ data: existingExpenditure, error: existingError } = await supabase
        .from("expenditures")
        .select("id")
        .eq("id", req.params.id)
        .single());
    }

    if (existingError || !existingExpenditure) {
      return res.status(404).json({ message: "Expenditure not found" });
    }

    if (isScopedSecretary(req) && (!existingExpenditure.house_id || !canAccessHouse(req, existingExpenditure.house_id))) {
      return res.status(403).json({ message: "Access denied for this expenditure" });
    }

    const { error } = await supabase
      .from("expenditures")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Expenditure deleted successfully" });
  } catch (err) {
    console.error("Delete expenditure error:", err);
    res.status(500).json({ message: err.message || "Failed to delete expenditure" });
  }
});

module.exports = router;
