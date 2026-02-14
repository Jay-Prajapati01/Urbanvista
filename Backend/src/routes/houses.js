const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");

const router = express.Router();

// GET /api/houses — Fetch all houses
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .order("block", { ascending: true })
      .order("house_number", { ascending: true });

    if (error) throw error;

    res.json(toCamelCase(data));
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

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch house error:", err);
    res.status(500).json({ message: "Failed to fetch house" });
  }
});

// POST /api/houses — Create a new house
router.post("/", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    // Remove id if sent from frontend (let DB generate it)
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data, error } = await supabase
      .from("houses")
      .insert(dbData)
      .select()
      .single();

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
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data, error } = await supabase
      .from("houses")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

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
    const { error } = await supabase
      .from("houses")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "House deleted successfully" });
  } catch (err) {
    console.error("Delete house error:", err);
    res.status(500).json({ message: err.message || "Failed to delete house" });
  }
});

module.exports = router;
