#!/usr/bin/env node

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const supabase = require("../src/config/supabase");

const REQUIRED_TABLE_COLUMNS = {
  houses: ["id", "block", "house_number", "owner_name"],
  members: ["id", "house_id", "name", "role"],
  vehicles: ["id", "house_id", "vehicle_number", "type"],
  users: ["id", "name", "email", "house_id", "member_id"],
  maintenance_records: [
    "id",
    "house_id",
    "property_id",
    "user_id",
    "base_amount",
    "late_fee_per_day",
    "paid_amount",
    "due_amount",
    "due_date",
    "status",
  ],
  payments: [
    "id",
    "user_id",
    "maintenance_record_id",
    "maintenance_id",
    "order_id",
    "razorpay_order_id",
    "razorpay_payment_id",
    "status",
  ],
  receipts: ["id", "payment_id", "user_id", "maintenance_id", "receipt_number"],
  expenditures: ["id", "title", "category", "amount", "house_id", "vendor", "payment_mode", "date"],
  admin_users: ["id", "email", "role", "status", "assigned_blocks"],
  secretary_assignments: ["id", "secretary_user_id", "assignment_type", "block", "is_active"],
  settlement_batches: ["id", "scope_type", "house_id", "block", "status", "created_at"],
  settlement_batch_items: ["id", "settlement_batch_id", "house_id", "amount"],
  login_history: ["id", "user_id", "login_time", "status"],
  activity_logs: ["id", "user_id", "action", "resource_type", "created_at"],
  payment_transactions: ["id", "maintenance_record_id", "house_id", "amount", "status"],
  notifications: ["id", "user_id", "title", "message", "is_read"],
  login_attempts: ["id", "user_id", "username_or_email", "success", "attempted_at"],
  audit_logs: ["id", "actor_user_id", "action", "resource_type", "created_at"],
  secretary_activity_summary: ["id", "secretary_id", "date", "total_logins", "total_expenditures_added"],
};

const MIGRATION_HINTS = [
  "Backend/database/phase5_live_schema_alignment_patch.sql (fastest targeted patch for live schema drift)",
  "Backend/database/schema.sql",
  "Backend/database/phase1_rbac.sql",
  "Backend/database/phase2_activity_tracking.sql",
  "Backend/database/phase3_maintenance_due_receipts.sql",
  "Backend/database/phase4_expenditures_house_scope.sql",
];

function parseMissingColumn(errorMessage) {
  if (typeof errorMessage !== "string") return null;
  const match = errorMessage.match(/Could not find the '([^']+)' column/i);
  return match ? match[1] : null;
}

async function verifyTable(tableName, columns) {
  const selectList = columns.join(", ");
  const { error } = await supabase.from(tableName).select(selectList).limit(1);

  if (!error) {
    return { ok: true, tableName };
  }

  return {
    ok: false,
    tableName,
    code: error.code || "UNKNOWN",
    message: error.message || "Unknown schema error",
    missingColumn: parseMissingColumn(error.message),
  };
}

async function main() {
  const results = [];

  for (const [tableName, columns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const result = await verifyTable(tableName, columns);
    results.push(result);
  }

  const failures = results.filter((r) => !r.ok);

  for (const result of results) {
    if (result.ok) {
      console.log(`PASS: ${result.tableName}`);
      continue;
    }

    const missingColumnPart = result.missingColumn
      ? ` | missing column: ${result.missingColumn}`
      : "";
    console.log(`FAIL: ${result.tableName} | ${result.code} | ${result.message}${missingColumnPart}`);
  }

  if (!failures.length) {
    console.log("PASS: Supabase schema is aligned with backend expectations.");
    return;
  }

  console.log("\nACTION REQUIRED: Apply these migrations in Supabase SQL Editor (in order):");
  for (const hint of MIGRATION_HINTS) {
    console.log(`- ${hint}`);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FAIL: ${error.message || error}`);
  process.exitCode = 1;
});
