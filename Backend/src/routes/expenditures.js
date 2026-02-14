const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");

const router = express.Router();

// GET /api/expenditures — Fetch all expenditures
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("expenditures")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    res.json(toCamelCase(data));
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
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data, error } = await supabase
      .from("expenditures")
      .insert(dbData)
      .select()
      .single();

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
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data, error } = await supabase
      .from("expenditures")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

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
