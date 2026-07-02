const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "user") return "resident";
  if (normalized === "resident") return "resident";
  if (normalized === "secretary") return "secretary";
  if (normalized === "admin") return "admin";
  return "";
}

function normalizeAction(action) {
  return String(action || "").trim();
}

function normalizeStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["success", "failed", "blocked", "pending"].includes(normalized)) {
    return normalized;
  }
  return "";
}

function normalizePagination({ page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, offset };
}

function getDateRange(filters = {}) {
  const now = new Date();
  const endDate = filters.endDate ? new Date(filters.endDate) : now;
  const startDate = filters.startDate
    ? new Date(filters.startDate)
    : (() => {
        const d = new Date(endDate);
        d.setDate(d.getDate() - (Number(filters.days) || 7));
        return d;
      })();

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
}

function extractBlockFromMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return null;
  const block = String(metadata.block || "").trim().toUpperCase();
  return block || null;
}

function mapActivityRow(row) {
  const metadata = row.metadata || {};
  const action = normalizeAction(row.action || "");
  const role = normalizeRole(row.user_role || metadata.role || "");
  const status = normalizeStatus(metadata.status || "success") || "success";
  const resourceType = String(row.resource_type || "system").trim().toLowerCase();

  return {
    id: row.id,
    userId: row.user_id || null,
    role,
    userRole: role,
    action,
    resource: resourceType,
    resourceType,
    resourceId: row.resource_id || null,
    block: extractBlockFromMetadata(metadata),
    description: row.description || null,
    status,
    ipAddress: row.ip_address || null,
    createdAt: row.created_at,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    userAgent: row.user_agent || null,
    metadata,
  };
}

function mapLoginRow(row) {
  const role = normalizeRole(row.user_role || "");
  const status = normalizeStatus(row.status || "failed") || "failed";
  return {
    id: row.id,
    userId: row.user_id || null,
    role,
    userRole: role,
    action: status === "success" ? "login_success" : status === "blocked" ? "login_blocked" : "login_failed",
    resource: "auth",
    resourceType: "auth",
    resourceId: null,
    block: row.block ? String(row.block).trim().toUpperCase() : null,
    description: status === "success" ? "Login success" : "Login failed",
    status,
    ipAddress: row.ip_address || null,
    createdAt: row.login_time || row.created_at,
    userName: row.user_name || null,
    userEmail: row.user_email || null,
    userAgent: row.user_agent || null,
    loginTime: row.login_time || row.created_at,
    logoutTime: row.logout_time || null,
    failureReason: row.failure_reason || null,
    sessionId: row.session_id || null,
  };
}

async function getUsersForRoleFilter(role = "") {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "secretary" || normalizedRole === "admin") {
    const { data, error } = await supabase
      .from("admin_users")
      .select("id, name, email, role")
      .eq("role", normalizedRole)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || row.email || row.id,
      email: row.email || null,
      role: normalizeRole(row.role),
    }));
  }

  if (normalizedRole === "resident") {
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      name: row.name || row.email || row.id,
      email: row.email || null,
      role: "resident",
    }));
  }

  return [];
}

function applyActivityFilters(query, filters = {}) {
  const role = normalizeRole(filters.role);
  const status = normalizeStatus(filters.status);

  if (role) query = query.eq("user_role", role);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.resource) query = query.eq("resource_type", String(filters.resource).trim().toLowerCase());

  if (filters.action) {
    const action = String(filters.action).trim();
    if (action.endsWith("*") || action.endsWith(".")) {
      const prefix = action.endsWith("*") ? action.slice(0, -1) : action;
      query = query.ilike("action", `${prefix}%`);
    } else {
      query = query.eq("action", action);
    }
  }

  if (filters.search) {
    const term = String(filters.search).trim();
    if (term) {
      query = query.or(`description.ilike.%${term}%,user_name.ilike.%${term}%,user_email.ilike.%${term}%,action.ilike.%${term}%`);
    }
  }

  if (status) {
    query = query.contains("metadata", { status });
  }

  if (filters.block) {
    query = query.contains("metadata", { block: String(filters.block).trim().toUpperCase() });
  }

  return query;
}

function applyLoginFilters(query, filters = {}) {
  const role = normalizeRole(filters.role);
  const status = normalizeStatus(filters.status);

  if (role) query = query.eq("user_role", role);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (status) query = query.eq("status", status);
  if (filters.block) query = query.eq("block", String(filters.block).trim().toUpperCase());

  if (filters.search) {
    const term = String(filters.search).trim();
    if (term) {
      query = query.or(`user_name.ilike.%${term}%,user_email.ilike.%${term}%,ip_address.ilike.%${term}%`);
    }
  }

  return query;
}

async function getActivityLogs(filters = {}, pagination = {}) {
  const { page, limit, offset } = normalizePagination(pagination);
  const { startIso, endIso } = getDateRange(filters);

  let query = supabase
    .from("activity_logs")
    .select("*", { count: "exact" })
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  query = applyActivityFilters(query, filters);

  const { data, error, count } = await query;
  if (error) throw error;

  const logs = (data || []).map(mapActivityRow);

  return {
    logs: toCamelCase(logs),
    total: Number(count || 0),
    page,
    limit,
    totalPages: Math.ceil(Number(count || 0) / limit),
  };
}

async function getLoginHistory(filters = {}, pagination = {}) {
  const { page, limit, offset } = normalizePagination(pagination);
  const { startIso, endIso } = getDateRange(filters);

  let query = supabase
    .from("login_history")
    .select("*", { count: "exact" })
    .gte("login_time", startIso)
    .lte("login_time", endIso)
    .order("login_time", { ascending: false })
    .range(offset, offset + limit - 1);

  query = applyLoginFilters(query, filters);

  const { data, error, count } = await query;
  if (error) throw error;

  const history = (data || []).map(mapLoginRow);

  return {
    history: toCamelCase(history),
    total: Number(count || 0),
    page,
    limit,
    totalPages: Math.ceil(Number(count || 0) / limit),
  };
}

async function getLoginStats(filters = {}) {
  const { startIso, endIso } = getDateRange(filters);

  let query = supabase
    .from("login_history")
    .select("status, user_name, user_email, login_time, user_role")
    .gte("login_time", startIso)
    .lte("login_time", endIso)
    .order("login_time", { ascending: true });

  query = applyLoginFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  const stats = {
    total: 0,
    successful: 0,
    failed: 0,
    blocked: 0,
    byUser: {},
    byDay: {},
  };

  (data || []).forEach((row) => {
    const status = normalizeStatus(row.status || "failed") || "failed";
    stats.total += 1;
    if (status === "success") stats.successful += 1;
    else if (status === "blocked") stats.blocked += 1;
    else stats.failed += 1;

    const userKey = row.user_email || row.user_name || "unknown";
    stats.byUser[userKey] = (stats.byUser[userKey] || 0) + 1;

    const day = String(row.login_time || "").split("T")[0];
    if (day) stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  });

  return stats;
}

async function getActiveSessions(filters = {}) {
  const { startIso } = getDateRange({ ...filters, days: filters.days || 30 });

  let query = supabase
    .from("login_history")
    .select("*")
    .eq("status", "success")
    .is("logout_time", null)
    .gte("login_time", startIso)
    .order("login_time", { ascending: false });

  query = applyLoginFilters(query, filters);

  const { data, error } = await query;
  if (error) throw error;

  return toCamelCase((data || []).map(mapLoginRow));
}

async function getDashboardStats(filters = {}) {
  const [activitySummary, loginSummary, paymentSummary, unreadNotificationCount] = await Promise.all([
    (async () => {
      const activity = await getActivityLogs(filters, { page: 1, limit: 50 });
      const byType = {};
      activity.logs.forEach((row) => {
        byType[row.action] = (byType[row.action] || 0) + 1;
      });
      return {
        total: activity.total,
        byType,
        recent: activity.logs,
      };
    })(),
    (async () => {
      const loginStats = await getLoginStats(filters);
      return {
        success: loginStats.successful,
        failed: loginStats.failed,
        blocked: loginStats.blocked,
      };
    })(),
    (async () => {
      let paymentQuery = supabase
        .from("payment_transactions")
        .select("amount, status, created_at, secretary_id, user_id")
        .gte("created_at", getDateRange({ ...filters, days: filters.days || 30 }).startIso)
        .order("created_at", { ascending: false });

      if (filters.userId) {
        paymentQuery = paymentQuery.or(`user_id.eq.${filters.userId},secretary_id.eq.${filters.userId}`);
      }

      const role = normalizeRole(filters.role);
      if (role === "secretary") {
        // Secretary role in payments is represented by secretary_id.
        paymentQuery = paymentQuery.not("secretary_id", "is", null);
      }

      const { data, error } = await paymentQuery;
      if (error) {
        return { total: 0, successful: 0, pending: 0, failed: 0 };
      }

      const summary = { total: 0, successful: 0, pending: 0, failed: 0 };
      (data || []).forEach((row) => {
        const status = normalizeStatus(row.status || "pending") || "pending";
        if (status === "success") {
          summary.successful += 1;
          summary.total += Number(row.amount || 0);
        } else if (status === "failed") {
          summary.failed += 1;
        } else {
          summary.pending += 1;
        }
      });

      return summary;
    })(),
    (async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return Number(count || 0);
    })(),
  ]);

  return {
    activity: activitySummary,
    logins: loginSummary,
    payments: paymentSummary,
    notifications: {
      unread: unreadNotificationCount,
      items: [],
    },
    secretaries: {},
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  getActivityLogs,
  getLoginHistory,
  getLoginStats,
  getActiveSessions,
  getDashboardStats,
  getUsersForRoleFilter,
};
