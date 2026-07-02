const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, filterRowsByHouseScope, isScopedSecretary } = require("../utils/accessScope");
const {
  enrichMaintenanceRecords,
  enrichMaintenanceRecord,
  ensureOverdueStatus,
  validateBillPayload,
} = require("../services/maintenanceBillingService");

const router = express.Router();
const MAINTENANCE_OPTIONAL_COLUMNS = new Set([
  "owner_name",
  "house_number",
  "property_id",
  "user_id",
  "late_fee_per_day",
  "paid_amount",
  "due_amount",
  "due_date",
  "description",
]);

function extractMissingColumn(error) {
  if (!error || error.code !== "PGRST204" || typeof error.message !== "string") {
    return "";
  }
  const match = error.message.match(/Could not find the '([^']+)' column/);
  return match ? match[1] : "";
}

function isMaintenanceSchemaMismatch(error) {
  const message = String(error?.message || "");
  return (
    (error?.code === "PGRST204" && message.includes("maintenance_records")) ||
    message.includes("enum payment_status")
  );
}

async function withColumnFallback(executor, payload) {
  let safePayload = { ...payload };

  while (true) {
    const result = await executor(safePayload);
    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumn(result.error);
    if (!missingColumn || !MAINTENANCE_OPTIONAL_COLUMNS.has(missingColumn)) {
      if (
        typeof result.error?.message === "string" &&
        result.error.message.includes("enum payment_status") &&
        Object.prototype.hasOwnProperty.call(safePayload, "status")
      ) {
        delete safePayload.status;
        continue;
      }
      return result;
    }

    if (!Object.prototype.hasOwnProperty.call(safePayload, missingColumn)) {
      return result;
    }

    delete safePayload[missingColumn];
  }
}

async function getHouseMapByIds(houseIds) {
  if (!houseIds.length) return {};

  const { data: houses } = await supabase
    .from("houses")
    .select("id, house_number, owner_name")
    .in("id", houseIds);

  const houseMap = {};
  (houses || []).forEach((h) => {
    houseMap[h.id] = {
      house_number: h.house_number || "",
      owner_name: h.owner_name || "",
    };
  });

  return houseMap;
}

function enrichRecordsFromHouseMap(records, houseMap) {
  return records.map((r) => {
    const mappedHouse = r.house_id ? houseMap[r.house_id] : null;
    return {
      ...r,
      house_number: r.house_number || mappedHouse?.house_number || "",
      owner_name: r.owner_name || mappedHouse?.owner_name || "",
    };
  });
}

async function getResidentById(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("users")
    .select("id, name, house_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function syncOverdueStatuses(records) {
  const updates = (records || [])
    .filter((record) => record.status_needs_update)
    .map((record) => ensureOverdueStatus(record.id, record.previous_status, record.status));

  if (updates.length) {
    await Promise.all(updates);
  }
}

// GET /api/maintenance — Fetch all maintenance records
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const records = data || [];
    const scopedRecords = filterRowsByHouseScope(req, records, "house_id");
    const houseIds = [...new Set(scopedRecords.filter((r) => r.house_id).map((r) => r.house_id))];
    const houseMap = await getHouseMapByIds(houseIds);
    const enriched = enrichRecordsFromHouseMap(scopedRecords, houseMap);
    const withBilling = enrichMaintenanceRecords(enriched);
    await syncOverdueStatuses(withBilling);

    res.json(toCamelCase(withBilling));
  } catch (err) {
    console.error("Fetch maintenance error:", err);
    res.status(500).json({ message: "Failed to fetch maintenance records" });
  }
});

// GET /api/maintenance/:id — Fetch single record
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Record not found" });

    if (isScopedSecretary(req) && !canAccessHouse(req, data.house_id)) {
      return res.status(403).json({ message: "Access denied for this maintenance record" });
    }

    const houseMap = await getHouseMapByIds(data.house_id ? [data.house_id] : []);
    const enrichedRecord = enrichRecordsFromHouseMap([data], houseMap)[0];
    const withBilling = enrichMaintenanceRecord(enrichedRecord);
    await ensureOverdueStatus(withBilling.id, data.status, withBilling.status);

    res.json(toCamelCase(withBilling));
  } catch (err) {
    console.error("Fetch maintenance record error:", err);
    res.status(500).json({ message: "Failed to fetch record" });
  }
});

// POST /api/maintenance — Create a new record
router.post("/", async (req, res) => {
  try {
    const input = toSnakeCase(req.body || {});
    const validation = validateBillPayload(input, { isCreate: true });
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const dbData = {
      house_id: validation.payload.house_id,
      property_id: validation.payload.property_id,
      user_id: validation.payload.user_id,
      house_number: validation.payload.house_number,
      from_month: validation.payload.from_month,
      to_month: validation.payload.to_month,
      due_date: validation.payload.due_date,
      base_amount: validation.payload.base_amount,
      late_fee_per_day: validation.payload.late_fee_per_day,
      late_fee: validation.payload.late_fee,
      extra_charges: validation.payload.extra_charges,
      total_amount: validation.payload.total_amount,
      paid_amount: validation.payload.paid_amount,
      due_amount: validation.payload.due_amount,
      amount_paid: validation.payload.amount_paid,
      status: validation.payload.status,
      description: validation.payload.description,
      payment_method: validation.payload.payment_method,
      payment_date: validation.payload.payment_date,
    };
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    if (isScopedSecretary(req) && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "You can only create records for assigned houses" });
    }

    const resident = await getResidentById(dbData.user_id);
    if (!resident) {
      return res.status(400).json({ message: "Selected resident was not found" });
    }

    if (resident.house_id !== dbData.house_id) {
      return res.status(400).json({ message: "Selected resident does not belong to the chosen property" });
    }

    if ((!dbData.house_number || dbData.house_number === "") && dbData.house_id) {
      const { data: house } = await supabase
        .from("houses")
        .select("house_number")
        .eq("id", dbData.house_id)
        .single();
      if (house) dbData.house_number = house.house_number || "";
    }

    const { data, error } = await withColumnFallback(
      (safePayload) =>
        supabase
          .from("maintenance_records")
          .insert(safePayload)
          .select()
          .single(),
      dbData
    );

    if (error) throw error;

    const houseMap = await getHouseMapByIds(data.house_id ? [data.house_id] : []);
    const enrichedRecord = enrichRecordsFromHouseMap([data], houseMap)[0];
    const withBilling = enrichMaintenanceRecord(enrichedRecord);

    res.status(201).json(toCamelCase(withBilling));
  } catch (err) {
    console.error("Create maintenance error:", err);
    if (isMaintenanceSchemaMismatch(err)) {
      return res.status(503).json({
        message: "Maintenance billing schema is outdated. Apply phase3_maintenance_due_receipts.sql and reload schema cache.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to create record" });
  }
});

// PUT /api/maintenance/:id — Update a record
router.put("/:id", async (req, res) => {
  try {
    const input = toSnakeCase(req.body || {});
    const dbData = {
      house_id: input.house_id,
      property_id: input.property_id || input.house_id,
      user_id: input.user_id,
      house_number: input.house_number,
      from_month: input.from_month,
      to_month: input.to_month,
      due_date: input.due_date,
      base_amount: input.base_amount,
      late_fee_per_day: input.late_fee_per_day ?? input.late_fee,
      late_fee: input.late_fee,
      extra_charges: input.extra_charges,
      total_amount: input.total_amount,
      description: input.description,
      payment_method: input.payment_method,
      payment_date: input.payment_date,
    };

    Object.keys(dbData).forEach((key) => {
      if (dbData[key] === undefined) {
        delete dbData[key];
      }
    });

    if ((!dbData.house_number || dbData.house_number === "") && dbData.house_id) {
      const { data: house } = await supabase
        .from("houses")
        .select("house_number")
        .eq("id", dbData.house_id)
        .single();
      if (house) dbData.house_number = house.house_number || "";
    }

    const { data: existingRecord, error: existingError } = await supabase
      .from("maintenance_records")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingRecord) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingRecord.house_id)) {
      return res.status(403).json({ message: "Access denied for this maintenance record" });
    }

    if (isScopedSecretary(req) && dbData.house_id && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "Target house is outside your scope" });
    }

    const { data, error } = await withColumnFallback(
      (safePayload) =>
        supabase
          .from("maintenance_records")
          .update(safePayload)
          .eq("id", req.params.id)
          .select()
          .single(),
      dbData
    );

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Record not found" });

    const houseMap = await getHouseMapByIds(data.house_id ? [data.house_id] : []);
    const enrichedRecord = enrichRecordsFromHouseMap([data], houseMap)[0];
    const withBilling = enrichMaintenanceRecord(enrichedRecord);
    await ensureOverdueStatus(withBilling.id, data.status, withBilling.status);

    res.json(toCamelCase(withBilling));
  } catch (err) {
    console.error("Update maintenance error:", err);
    if (isMaintenanceSchemaMismatch(err)) {
      return res.status(503).json({
        message: "Maintenance billing schema is outdated. Apply phase3_maintenance_due_receipts.sql and reload schema cache.",
      });
    }
    res.status(500).json({ message: err.message || "Failed to update record" });
  }
});

// DELETE /api/maintenance/:id — Delete a record
router.delete("/:id", async (req, res) => {
  try {
    const { data: existingRecord, error: existingError } = await supabase
      .from("maintenance_records")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingRecord) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingRecord.house_id)) {
      return res.status(403).json({ message: "Access denied for this maintenance record" });
    }

    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    console.error("Delete maintenance error:", err);
    res.status(500).json({ message: err.message || "Failed to delete record" });
  }
});

module.exports = router;
