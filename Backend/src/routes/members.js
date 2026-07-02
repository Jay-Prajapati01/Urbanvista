const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, filterRowsByHouseScope, isScopedSecretary } = require("../utils/accessScope");

const router = express.Router();

// GET /api/members — Fetch all members
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .order("house_number", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    const scoped = filterRowsByHouseScope(req, data || [], "house_id");
    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("Fetch members error:", err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});

// GET /api/members/:id — Fetch single member
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Member not found" });

    if (isScopedSecretary(req) && !canAccessHouse(req, data.house_id)) {
      return res.status(403).json({ message: "Access denied for this member" });
    }

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch member error:", err);
    res.status(500).json({ message: "Failed to fetch member" });
  }
});

// POST /api/members — Create a new member
router.post("/", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    if (isScopedSecretary(req) && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "You can only add members for assigned houses" });
    }

    const { data, error } = await supabase
      .from("members")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create member error:", err);
    res.status(500).json({ message: err.message || "Failed to create member" });
  }
});

// PUT /api/members/:id — Update a member
router.put("/:id", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data: existingMember, error: existingError } = await supabase
      .from("members")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingMember.house_id)) {
      return res.status(403).json({ message: "Access denied for this member" });
    }

    if (isScopedSecretary(req) && dbData.house_id && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "Target house is outside your scope" });
    }

    const { data, error } = await supabase
      .from("members")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Member not found" });

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update member error:", err);
    res.status(500).json({ message: err.message || "Failed to update member" });
  }
});

// DELETE /api/members/:id — Delete a member
router.delete("/:id", async (req, res) => {
  try {
    const { data: existingMember, error: existingError } = await supabase
      .from("members")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingMember.house_id)) {
      return res.status(403).json({ message: "Access denied for this member" });
    }

    const { error } = await supabase
      .from("members")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Member deleted successfully" });
  } catch (err) {
    console.error("Delete member error:", err);
    res.status(500).json({ message: err.message || "Failed to delete member" });
  }
});

module.exports = router;
