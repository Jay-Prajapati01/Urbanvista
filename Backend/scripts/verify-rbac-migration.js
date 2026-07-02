#!/usr/bin/env node

require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const supabase = require("../src/config/supabase");

async function verifyAssignedBlocksColumn() {
  const { error } = await supabase
    .from("admin_users")
    .select("id, role, assigned_blocks")
    .limit(1);

  if (error) {
    throw new Error(`assigned_blocks column check failed: ${error.message}`);
  }

  return {
    ok: true,
    message: "admin_users.assigned_blocks is queryable",
  };
}

async function verifySecretaryAssignmentsTable() {
  const { error } = await supabase
    .from("secretary_assignments")
    .select("id, secretary_user_id, block, is_active")
    .limit(1);

  if (error) {
    throw new Error(`secretary_assignments availability check failed: ${error.message}`);
  }

  return {
    ok: true,
    message: "secretary_assignments table is queryable",
  };
}

async function verifyBackfillConsistencySample() {
  const { data: secretaries, error } = await supabase
    .from("admin_users")
    .select("id, assigned_blocks")
    .eq("role", "secretary")
    .limit(20);

  if (error) {
    throw new Error(`failed to load secretaries for backfill check: ${error.message}`);
  }

  const secretaryIds = (secretaries || []).map((row) => row.id);
  if (!secretaryIds.length) {
    return {
      ok: true,
      message: "no secretary rows found; backfill sample check skipped",
    };
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from("secretary_assignments")
    .select("secretary_user_id, block, is_active")
    .in("secretary_user_id", secretaryIds)
    .eq("is_active", true);

  if (assignmentError) {
    throw new Error(`failed to load assignments for backfill check: ${assignmentError.message}`);
  }

  const assignmentMap = new Map();
  for (const item of assignments || []) {
    const key = item.secretary_user_id;
    const value = String(item.block || "").trim().toUpperCase();
    if (!key || !value) continue;
    if (!assignmentMap.has(key)) assignmentMap.set(key, new Set());
    assignmentMap.get(key).add(value);
  }

  const mismatches = [];
  for (const secretary of secretaries || []) {
    const fromAssignments = Array.from(assignmentMap.get(secretary.id) || []).sort();
    if (!fromAssignments.length) continue;

    const fromColumn = Array.from(
      new Set((secretary.assigned_blocks || []).map((block) => String(block || "").trim().toUpperCase()).filter(Boolean))
    ).sort();

    const missing = fromAssignments.filter((block) => !fromColumn.includes(block));
    if (missing.length) {
      mismatches.push({
        secretaryId: secretary.id,
        missing,
      });
    }
  }

  if (mismatches.length) {
    return {
      ok: false,
      message: "backfill mismatches found",
      details: mismatches,
    };
  }

  return {
    ok: true,
    message: "sample backfill consistency check passed",
  };
}

async function verifyIndexVisibility() {
  const expected = [
    "idx_admin_users_assigned_blocks_gin",
    "idx_secretary_assignments_block_active",
  ];

  const { data, error } = await supabase
    .from("pg_indexes")
    .select("indexname")
    .in("indexname", expected);

  if (error) {
    return {
      ok: true,
      warning: true,
      message: `could not introspect pg_indexes with current credentials: ${error.message}`,
      manualCheckSql: "SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_admin_users_assigned_blocks_gin','idx_secretary_assignments_block_active');",
    };
  }

  const found = new Set((data || []).map((row) => row.indexname));
  const missing = expected.filter((name) => !found.has(name));

  if (missing.length) {
    return {
      ok: false,
      message: `index(es) missing: ${missing.join(", ")}`,
    };
  }

  return {
    ok: true,
    message: "required migration indexes are present",
  };
}

async function main() {
  const checks = [];

  checks.push(await verifyAssignedBlocksColumn());
  checks.push(await verifySecretaryAssignmentsTable());
  checks.push(await verifyBackfillConsistencySample());
  checks.push(await verifyIndexVisibility());

  let hasFailure = false;
  for (const check of checks) {
    const status = !check.ok ? "FAIL" : check.warning ? "WARN" : "PASS";
    console.log(`${status}: ${check.message}`);
    if (check.details) {
      console.log(JSON.stringify(check.details, null, 2));
    }
    if (check.manualCheckSql) {
      console.log(`Manual SQL: ${check.manualCheckSql}`);
    }
    if (!check.ok) hasFailure = true;
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`FAIL: ${error.message || error}`);
  process.exitCode = 1;
});
