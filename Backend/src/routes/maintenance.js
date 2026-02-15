const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");

const router = express.Router();

// GET /api/maintenance — Fetch all maintenance records
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(toCamelCase(data));
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

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch maintenance record error:", err);
    res.status(500).json({ message: "Failed to fetch record" });
  }
});

// POST /api/maintenance — Create a new record
router.post("/", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    // Calculate total amount if not provided
    if (!dbData.total_amount && dbData.base_amount) {
      const base = Number(dbData.base_amount) || 0;
      const late = Number(dbData.late_fee) || 0;
      const extra = Number(dbData.extra_charges) || 0;
      dbData.total_amount = base + late + extra;
    }

    // Auto-populate owner_name from houses if empty
    if ((!dbData.owner_name || dbData.owner_name === "") && dbData.house_id) {
      const { data: house } = await supabase
        .from("houses")
        .select("owner_name")
        .eq("id", dbData.house_id)
        .single();
      if (house) dbData.owner_name = house.owner_name || "";
    }

    const { data, error } = await supabase
      .from("maintenance_records")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create maintenance error:", err);
    res.status(500).json({ message: err.message || "Failed to create record" });
  }
});

// PUT /api/maintenance/:id — Update a record
router.put("/:id", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data, error } = await supabase
      .from("maintenance_records")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Record not found" });

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update maintenance error:", err);
    res.status(500).json({ message: err.message || "Failed to update record" });
  }
});

// DELETE /api/maintenance/:id — Delete a record
router.delete("/:id", async (req, res) => {
  try {
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
