const supabase = require("../config/supabase");

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "user") return "resident";
  if (["admin", "secretary", "resident"].includes(normalized)) {
    return normalized;
  }
  return "";
}

function normalizeUserId(userId, role) {
  if (!userId) return null;
  return normalizeRole(role) === "resident" ? null : userId;
}

async function insertLoginHistoryRow(payload) {
  const { error } = await supabase.from("login_history").insert(payload);
  if (!error) return true;

  if (error.code === "PGRST204" && typeof error.message === "string" && error.message.includes("block")) {
    const { block, ...retryPayload } = payload;
    const retry = await supabase.from("login_history").insert(retryPayload);
    if (!retry.error) return true;
    console.warn("Login history backfill warning:", retry.error.message);
    return false;
  }

  console.warn("Login history backfill warning:", error.message);
  return false;
}

async function seedLoginHistoryFromActivityLogs() {
  const { count, error: countError } = await supabase
    .from("login_history")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.warn("Login history seed skipped:", countError.message);
    return { seeded: false, inserted: 0 };
  }

  if (Number(count || 0) > 0) {
    return { seeded: false, inserted: 0 };
  }

  const { data, error } = await supabase
    .from("activity_logs")
    .select("id,user_id,user_name,user_email,user_role,action,created_at,ip_address,user_agent,metadata")
    .in("action", ["login_success", "login_failed", "login_blocked", "logout"])
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Login history seed skipped:", error.message);
    return { seeded: false, inserted: 0 };
  }

  const lastSuccessByKey = new Map();
  let inserted = 0;

  for (const row of data || []) {
    const role = normalizeRole(row.user_role);
    if (!role) continue;

    const actorKey = String(row.user_email || row.user_name || row.user_id || row.id || "unknown").trim().toLowerCase();
    const sessionKey = `${role}:${actorKey}`;

    if (row.action === "logout") {
      const sessionId = lastSuccessByKey.get(sessionKey);
      if (sessionId) {
        const { error: logoutError } = await supabase
          .from("login_history")
          .update({ logout_time: row.created_at })
          .eq("session_id", sessionId)
          .is("logout_time", null);

        if (logoutError) {
          console.warn("Login history backfill warning:", logoutError.message);
        }
      }
      continue;
    }

    const status = row.action === "login_success"
      ? "success"
      : row.action === "login_blocked"
        ? "blocked"
        : "failed";

    const payload = {
      user_id: normalizeUserId(row.user_id, role),
      user_name: row.user_name || null,
      user_email: row.user_email || null,
      user_role: role,
      block: row.metadata && typeof row.metadata === "object" && row.metadata.block
        ? String(row.metadata.block).trim().toUpperCase()
        : null,
      login_time: row.created_at,
      logout_time: null,
      ip_address: row.ip_address || null,
      user_agent: row.user_agent || null,
      device_fingerprint: null,
      status,
      failure_reason: row.metadata && typeof row.metadata === "object" ? row.metadata.failureReason || null : null,
      session_id: row.id,
    };

    const saved = await insertLoginHistoryRow(payload);
    if (saved) {
      inserted += 1;
      if (status === "success") {
        lastSuccessByKey.set(sessionKey, row.id);
      }
    }
  }

  return { seeded: inserted > 0, inserted };
}

module.exports = {
  seedLoginHistoryFromActivityLogs,
};
