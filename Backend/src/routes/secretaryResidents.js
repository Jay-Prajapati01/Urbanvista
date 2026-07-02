const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, filterRowsByHouseScope, isScopedSecretary } = require("../utils/accessScope");
const { logAudit } = require("../utils/audit");

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// GET /api/secretary/residents — List all residents (secretary can only see residents in their assigned houses)
router.get("/", async (req, res) => {
  try {
    if (!isScopedSecretary(req)) {
      return res.status(403).json({ message: "Only secretaries can manage residents" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, house_id, member_id, created_at, updated_at")
      .order("name", { ascending: true });

    if (error) throw error;

    const scoped = filterRowsByHouseScope(req, data || [], "house_id");

    await logAudit({
      req,
      action: "secretary.residents_list",
      resourceType: "user",
      scopeContext: { count: scoped.length },
    });

    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("Fetch residents error:", err);
    res.status(500).json({ message: "Failed to fetch residents" });
  }
});

// GET /api/secretary/residents/:id — Get single resident
router.get("/:id", async (req, res) => {
  try {
    if (!isScopedSecretary(req)) {
      return res.status(403).json({ message: "Only secretaries can manage residents" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, name, email, house_id, member_id, created_at, updated_at")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Resident not found" });

    if (!canAccessHouse(req, data.house_id)) {
      return res.status(403).json({ message: "Access denied for this resident" });
    }

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch resident error:", err);
    res.status(500).json({ message: "Failed to fetch resident" });
  }
});

// POST /api/secretary/residents — Create a new resident account (secretary creates for their house)
router.post("/", async (req, res) => {
  try {
    if (!isScopedSecretary(req)) {
      return res.status(403).json({ message: "Only secretaries can create residents" });
    }

    const { name, email, password, houseId } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !houseId) {
      return res.status(400).json({ message: "Name, email, password, and house ID are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (!canAccessHouse(req, houseId)) {
      return res.status(403).json({ message: "You can only create residents for your assigned houses" });
    }

    // Check if email already exists
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST206") {
      throw existingError;
    }

    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // Verify house exists and belongs to secretary's scope
    const { data: house, error: houseError } = await supabase
      .from("houses")
      .select("id, block")
      .eq("id", houseId)
      .single();

    if (houseError || !house) {
      return res.status(404).json({ message: "House not found or you don't have access" });
    }

    // Try to find member with this email to link
    let memberId = null;
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("house_id", houseId)
      .maybeSingle();

    if (member) {
      memberId = member.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        name,
        email: normalizedEmail,
        password_hash: passwordHash,
        house_id: houseId,
        member_id: memberId,
      })
      .select("id, name, email, house_id, member_id, created_at")
      .single();

    if (createError) {
      console.error("Create resident error:", createError);
      return res.status(500).json({ message: "Failed to create resident account" });
    }

    await logAudit({
      req,
      action: "secretary.resident_created",
      resourceType: "user",
      resourceId: newUser.id,
      scopeContext: {
        houseId,
        email: normalizedEmail,
      },
    });

    res.status(201).json({
      message: "Resident account created successfully",
      resident: toCamelCase(newUser),
      credentials: {
        email: normalizedEmail,
        password: "[Hidden - shared with resident]",
      },
    });
  } catch (err) {
    console.error("Create resident error:", err);
    res.status(500).json({ message: err.message || "Failed to create resident account" });
  }
});

// PUT /api/secretary/residents/:id — Update resident (secretary can update residents in their houses)
router.put("/:id", async (req, res) => {
  try {
    if (!isScopedSecretary(req)) {
      return res.status(403).json({ message: "Only secretaries can update residents" });
    }

    const { name, email } = req.body;

    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingUser) {
      return res.status(404).json({ message: "Resident not found" });
    }

    if (!canAccessHouse(req, existingUser.house_id)) {
      return res.status(403).json({ message: "Access denied for this resident" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .neq("id", req.params.id)
        .maybeSingle();

      if (existing) {
        return res.status(409).json({ message: "Email already in use" });
      }
      updateData.email = normalizedEmail;
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.params.id)
      .select("id, name, email, house_id, member_id, created_at, updated_at")
      .single();

    if (updateError) throw updateError;

    await logAudit({
      req,
      action: "secretary.resident_updated",
      resourceType: "user",
      resourceId: req.params.id,
      newValue: updated,
      scopeContext: { houseId: existingUser.house_id },
    });

    res.json(toCamelCase(updated));
  } catch (err) {
    console.error("Update resident error:", err);
    res.status(500).json({ message: "Failed to update resident" });
  }
});

// DELETE /api/secretary/residents/:id — Delete resident
router.delete("/:id", async (req, res) => {
  try {
    if (!isScopedSecretary(req)) {
      return res.status(403).json({ message: "Only secretaries can delete residents" });
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("users")
      .select("id, house_id, email")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingUser) {
      return res.status(404).json({ message: "Resident not found" });
    }

    if (!canAccessHouse(req, existingUser.house_id)) {
      return res.status(403).json({ message: "Access denied for this resident" });
    }

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", req.params.id);

    if (deleteError) throw deleteError;

    await logAudit({
      req,
      action: "secretary.resident_deleted",
      resourceType: "user",
      resourceId: req.params.id,
      scopeContext: {
        houseId: existingUser.house_id,
        email: existingUser.email,
      },
    });

    res.json({ message: "Resident deleted successfully" });
  } catch (err) {
    console.error("Delete resident error:", err);
    res.status(500).json({ message: "Failed to delete resident" });
  }
});

module.exports = router;
