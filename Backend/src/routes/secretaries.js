const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");
const { buildScopeContext } = require("../utils/accessScope");
const { logAudit } = require("../utils/audit");
const { requirePermission } = require("../middleware/staffAuth");

const router = express.Router();

function isMissingTableError(error, tableName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.includes(`public.${tableName}`)
  );
}

function getMissingColumnFromError(error) {
  const message = String(error?.message || "");
  const match = message.match(/'([^']+)' column/);
  return match?.[1] || null;
}

async function safeAdminInsert(payload) {
  const mutablePayload = { ...payload };

  while (Object.keys(mutablePayload).length) {
    const { data, error } = await supabase
      .from("admin_users")
      .insert(mutablePayload)
      .select("id")
      .single();

    if (!error) return data;

    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn)) {
      throw error;
    }

    delete mutablePayload[missingColumn];
    console.warn(`Secretary insert warning: skipped missing column '${missingColumn}'`);
  }

  throw new Error("Failed to create secretary due to missing required schema columns");
}

async function safeAdminUpdateById(secretaryId, payload) {
  const mutablePayload = { ...payload };

  while (Object.keys(mutablePayload).length) {
    const { error } = await supabase
      .from("admin_users")
      .update(mutablePayload)
      .eq("id", secretaryId)
      .eq("role", "secretary");

    if (!error) return;

    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn)) {
      throw error;
    }

    delete mutablePayload[missingColumn];
    console.warn(`Secretary update warning: skipped missing column '${missingColumn}'`);
  }
}

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeBlock(block) {
  return String(block || "").trim().toUpperCase();
}

function isValidBlock(block) {
  return /^[A-Z]+$/.test(normalizeBlock(block));
}

function validateAssignments(assignments) {
  if (!Array.isArray(assignments) || !assignments.length) {
    return "At least one assignment is required";
  }

  const seenBlocks = new Set();

  for (const item of assignments) {
    const type = item?.assignmentType;
    if (type !== "block") {
      return "assignmentType must be block";
    }
    const block = normalizeBlock(item.block);
    if (!block) {
      return "block is required for block assignment";
    }
    if (!isValidBlock(block)) {
      return "block must contain only letters A-Z";
    }
    if (seenBlocks.has(block)) {
      return `Duplicate block assignment: ${block}`;
    }
    seenBlocks.add(block);
  }

  return null;
}

function normalizeAssignments(assignments) {
  const seenBlocks = new Set();
  return (assignments || [])
    .map((item) => normalizeBlock(item.block))
    .filter((block) => {
      if (!block || !isValidBlock(block) || seenBlocks.has(block)) return false;
      seenBlocks.add(block);
      return true;
    })
    .map((block) => ({
      assignmentType: "block",
      block,
    }));
}

async function syncAssignedBlocks(secretaryId, normalizedAssignments) {
  const assignedBlocks = [...new Set((normalizedAssignments || []).map((item) => item.block))];
  await safeAdminUpdateById(secretaryId, {
    assigned_blocks: assignedBlocks,
  });
}

async function replaceAssignments(secretaryId, assignments, adminId) {
  const normalizedAssignments = normalizeAssignments(assignments);

  const { error: updateError } = await supabase
    .from("secretary_assignments")
    .update({ is_active: false, unassigned_at: new Date().toISOString() })
    .eq("secretary_user_id", secretaryId)
    .eq("is_active", true);

  if (updateError && !isMissingTableError(updateError, "secretary_assignments")) {
    throw updateError;
  }

  const payload = normalizedAssignments.map((item) => ({
    secretary_user_id: secretaryId,
    assignment_type: "block",
    house_id: null,
    block: item.block,
    is_active: true,
    assigned_by_user_id: adminId,
    assigned_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("secretary_assignments").insert(payload);
  
  if (error && !isMissingTableError(error, "secretary_assignments")) {
    throw error;
  }

  await syncAssignedBlocks(secretaryId, normalizedAssignments);
}

async function getSecretaryWithAssignments(secretaryId) {
  const { data: secretary, error: userError } = await supabase
    .from("admin_users")
    .select("*")
    .eq("id", secretaryId)
    .eq("role", "secretary")
    .single();

  if (userError) throw userError;

  const { data: assignments, error: assignmentError } = await supabase
    .from("secretary_assignments")
    .select("id, assignment_type, house_id, block, is_active, assigned_at")
    .eq("secretary_user_id", secretaryId)
    .eq("is_active", true)
    .order("assigned_at", { ascending: false });

  if (assignmentError && !isMissingTableError(assignmentError, "secretary_assignments")) {
    throw assignmentError;
  }

  const normalizedAssignments = await (async () => {
    const rows = assignments || [];
    const flatHouseIds = [...new Set(rows.filter((row) => row.assignment_type === "flat" && row.house_id).map((row) => row.house_id))];

    let houseBlockMap = new Map();
    if (flatHouseIds.length) {
      const { data: houses, error: houseError } = await supabase
        .from("houses")
        .select("id, block")
        .in("id", flatHouseIds);

      if (houseError && !isMissingTableError(houseError, "houses")) {
        throw houseError;
      }

      houseBlockMap = new Map((houses || []).map((house) => [house.id, normalizeBlock(house.block)]));
    }

    return rows
      .map((row) => {
        const block = normalizeBlock(row.block || houseBlockMap.get(row.house_id) || "");
        if (!block) return null;
        return {
          ...row,
          assignment_type: "block",
          house_id: null,
          block,
        };
      })
      .filter(Boolean);
  })();

  const secretaryCamel = toCamelCase(secretary);
  const assignedBlocks = [...new Set((secretaryCamel.assignedBlocks || []).map((block) => normalizeBlock(block)).filter(Boolean))];
  const assignmentRows = normalizedAssignments.length
    ? toCamelCase(normalizedAssignments)
    : buildAssignmentsFromBlocks(assignedBlocks);

  return {
    ...secretaryCamel,
    assignedBlocks,
    assignments: assignmentRows,
  };
}

function buildAssignmentsFromBlocks(blocks) {
  return (blocks || []).map((block) => ({
    id: `block-${block}`,
    assignmentType: "block",
    houseId: null,
    block,
    isActive: true,
    assignedAt: null,
  }));
}

async function listSecretariesWithScope(status) {
  let query = supabase
    .from("admin_users")
    .select("*")
    .eq("role", "secretary")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const secretaries = data || [];
  const secretaryIds = secretaries.map((item) => item.id);
  const assignmentBySecretary = new Map();

  if (secretaryIds.length) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from("secretary_assignments")
      .select("secretary_user_id, assignment_type, house_id, block, is_active, assigned_at, id")
      .in("secretary_user_id", secretaryIds)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    if (assignmentsError && !isMissingTableError(assignmentsError, "secretary_assignments")) {
      throw assignmentsError;
    }

    (assignments || []).forEach((row) => {
      const block = normalizeBlock(row.block);
      if (!block) return;

      if (!assignmentBySecretary.has(row.secretary_user_id)) {
        assignmentBySecretary.set(row.secretary_user_id, []);
      }

      assignmentBySecretary.get(row.secretary_user_id).push({
        id: row.id,
        assignmentType: "block",
        houseId: null,
        block,
        isActive: true,
        assignedAt: row.assigned_at,
      });
    });
  }

  return secretaries.map((secretary) => {
    const normalizedUserBlocks = (secretary.assigned_blocks || []).map((block) => normalizeBlock(block)).filter(Boolean);
    const assignmentRows = assignmentBySecretary.get(secretary.id) || buildAssignmentsFromBlocks(normalizedUserBlocks);
    const assignedBlocks = [...new Set((assignmentRows || []).map((item) => normalizeBlock(item.block)).filter(Boolean))];

    return {
      ...toCamelCase(secretary),
      assignedBlocks,
      assignments: toCamelCase(assignmentRows),
    };
  });
}

router.post("/", requirePermission("secretaries", "create"), async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const name = String(req.body.name || "").trim();
    const temporaryPassword = String(req.body.temporaryPassword || "");
    const assignments = req.body.assignments;

    if (!username || !email || !name || !temporaryPassword) {
      return res.status(400).json({ message: "username, email, name and temporaryPassword are required" });
    }

    if (temporaryPassword.length < 6) {
      return res.status(400).json({ message: "temporaryPassword must be at least 6 characters" });
    }

    const assignmentError = validateAssignments(assignments);
    if (assignmentError) {
      return res.status(400).json({ message: assignmentError });
    }

    const { data: existingByUsername } = await supabase
      .from("admin_users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingByUsername) {
      return res.status(409).json({ message: "Username is already in use" });
    }

    const { data: existingByEmail } = await supabase
      .from("admin_users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingByEmail) {
      return res.status(409).json({ message: "Email is already in use" });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const secretary = await safeAdminInsert({
      name,
      email,
      username,
      password_hash: passwordHash,
      role: "secretary",
      status: "active",
      must_reset_password: true,
    });

    await replaceAssignments(secretary.id, assignments, req.user?.id);
    const created = await getSecretaryWithAssignments(secretary.id);

    await logAudit({
      req,
      action: "secretary.create",
      resourceType: "admin_user",
      resourceId: secretary.id,
      afterState: created,
      scopeContext: buildScopeContext(req, {
        assignmentCount: assignments.length,
      }),
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create secretary error:", err);
    
    if (isMissingTableError(err, "secretary_assignments") || isMissingTableError(err, "admin_users")) {
      return res.status(503).json({ 
        message: "Database schema is not initialized. Please run the following SQL migrations in Supabase SQL Editor:\n1. Backend/database/schema.sql\n2. Backend/database/phase1_rbac.sql\n3. Backend/database/phase2_activity_tracking.sql" 
      });
    }
    
    res.status(500).json({
      message: "Failed to create secretary account. Ensure phase1_rbac.sql is applied in Supabase.",
    });
  }
});

router.get("/", requirePermission("secretaries", "read"), async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();

    const data = await listSecretariesWithScope(status);
    res.json(data);
  } catch (err) {
    console.error("List secretaries error:", err);
    if (isMissingTableError(err, "admin_users")) {
      return res.status(503).json({
        message: "Database schema not initialized. Run schema.sql in Supabase.",
      });
    }
    res.status(500).json({ message: "Failed to list secretaries" });
  }
});

router.get("/:id", requirePermission("secretaries", "read"), async (req, res) => {
  try {
    const record = await getSecretaryWithAssignments(req.params.id);
    res.json(record);
  } catch (err) {
    console.error("Get secretary error:", err);
    res.status(404).json({ message: "Secretary not found" });
  }
});

router.patch("/:id", requirePermission("secretaries", "update"), async (req, res) => {
  try {
    const payload = {};
    if (req.body.name) payload.name = String(req.body.name).trim();
    if (req.body.email) payload.email = normalizeEmail(req.body.email);
    if (req.body.status) payload.status = req.body.status;

    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: "No update fields provided" });
    }

    const { data: before } = await supabase
      .from("admin_users")
      .select("id, name, email, username, role, status")
      .eq("id", req.params.id)
      .eq("role", "secretary")
      .maybeSingle();

    await safeAdminUpdateById(req.params.id, payload);

    const updated = await getSecretaryWithAssignments(req.params.id);

    await logAudit({
      req,
      action: "secretary.update",
      resourceType: "admin_user",
      resourceId: req.params.id,
      beforeState: before || null,
      afterState: updated,
      scopeContext: buildScopeContext(req),
    });

    res.json(updated);
  } catch (err) {
    console.error("Update secretary error:", err);
    res.status(500).json({ message: "Failed to update secretary" });
  }
});

router.post("/:id/reset-password", requirePermission("secretaries", "reset-password"), async (req, res) => {
  try {
    const temporaryPassword = String(req.body.temporaryPassword || "");
    if (temporaryPassword.length < 6) {
      return res.status(400).json({ message: "temporaryPassword must be at least 6 characters" });
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await safeAdminUpdateById(req.params.id, {
      password_hash: passwordHash,
      must_reset_password: true,
      failed_login_count: 0,
      locked_until: null,
    });

    await logAudit({
      req,
      action: "secretary.reset_password",
      resourceType: "admin_user",
      resourceId: req.params.id,
      scopeContext: buildScopeContext(req),
    });

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset secretary password error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
});

router.put("/:id/assignments", requirePermission("secretaries", "assign-scope"), async (req, res) => {
  try {
    const assignments = req.body.assignments;
    const assignmentError = validateAssignments(assignments);
    if (assignmentError) {
      return res.status(400).json({ message: assignmentError });
    }

    const { data: beforeAssignments } = await supabase
      .from("secretary_assignments")
      .select("id, assignment_type, house_id, block, is_active")
      .eq("secretary_user_id", req.params.id)
      .eq("is_active", true);

    await replaceAssignments(req.params.id, assignments, req.user?.id);
    const updated = await getSecretaryWithAssignments(req.params.id);

    await logAudit({
      req,
      action: "secretary.assignments_update",
      resourceType: "secretary_assignments",
      resourceId: req.params.id,
      beforeState: beforeAssignments || null,
      afterState: updated.assignments,
      scopeContext: buildScopeContext(req, {
        assignmentCount: assignments.length,
      }),
    });

    res.json(updated);
  } catch (err) {
    console.error("Update secretary assignments error:", err);
    res.status(500).json({ message: "Failed to update assignments" });
  }
});

router.post("/:id/disable", requirePermission("secretaries", "update"), async (req, res) => {
  try {
    const { data: before } = await supabase
      .from("admin_users")
      .select("id, name, email, username, role, status")
      .eq("id", req.params.id)
      .eq("role", "secretary")
      .maybeSingle();

    await safeAdminUpdateById(req.params.id, { status: "disabled" });

    await logAudit({
      req,
      action: "secretary.disable",
      resourceType: "admin_user",
      resourceId: req.params.id,
      beforeState: before || null,
      afterState: { status: "disabled" },
      scopeContext: buildScopeContext(req),
    });

    res.json({ message: "Secretary disabled" });
  } catch (err) {
    console.error("Disable secretary error:", err);
    res.status(500).json({ message: "Failed to disable secretary" });
  }
});

router.post("/:id/enable", requirePermission("secretaries", "update"), async (req, res) => {
  try {
    const { data: before } = await supabase
      .from("admin_users")
      .select("id, name, email, username, role, status")
      .eq("id", req.params.id)
      .eq("role", "secretary")
      .maybeSingle();

    await safeAdminUpdateById(req.params.id, {
      status: "active",
      locked_until: null,
      failed_login_count: 0,
    });

    await logAudit({
      req,
      action: "secretary.enable",
      resourceType: "admin_user",
      resourceId: req.params.id,
      beforeState: before || null,
      afterState: { status: "active" },
      scopeContext: buildScopeContext(req),
    });

    res.json({ message: "Secretary enabled" });
  } catch (err) {
    console.error("Enable secretary error:", err);
    res.status(500).json({ message: "Failed to enable secretary" });
  }
});

module.exports = router;
