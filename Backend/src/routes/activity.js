const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");
const {
  getActivityLogs,
  getLoginHistory,
  getLoginStats,
  getActiveSessions,
  getDashboardStats,
  getUsersForRoleFilter,
} = require("../services/adminAnalyticsService");

const router = express.Router();

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.ip || null;
}

function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

function isMissingTableError(error, tableName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.includes(`public.${tableName}`)
  );
}

function safeQuery(queryFn) {
  return queryFn().then(({ data, error }) => {
    if (error && !isMissingTableError(error, "activity_logs") && 
        !isMissingTableError(error, "login_history") &&
        !isMissingTableError(error, "notifications") &&
        !isMissingTableError(error, "payment_transactions") &&
        !isMissingTableError(error, "secretary_activity_summary")) {
      console.warn("Activity query warning:", error.message);
    }
    return { data: data || [], error: null };
  }).catch(err => {
    console.warn("Activity query error (table may not exist):", err.message);
    return { data: [], error: null };
  });
}

function safeQueryWithCount(queryFn) {
  return queryFn().then(({ data, error, count }) => {
    if (error && !isMissingTableError(error, "activity_logs") && 
        !isMissingTableError(error, "login_history") &&
        !isMissingTableError(error, "notifications") &&
        !isMissingTableError(error, "payment_transactions") &&
        !isMissingTableError(error, "secretary_activity_summary")) {
      console.warn("Activity query warning:", error.message);
    }
    return { data: data || [], count: count || 0, error: null };
  }).catch(err => {
    console.warn("Activity query error (table may not exist):", err.message);
    return { data: [], count: 0, error: null };
  });
}

// ========================
// Activity Logs Endpoints
// ========================

function extractCommonFilters(queryOrBody = {}) {
  return {
    role: queryOrBody.role,
    userId: queryOrBody.userId || queryOrBody.user_id,
    days: queryOrBody.days,
    startDate: queryOrBody.startDate || queryOrBody.start_date,
    endDate: queryOrBody.endDate || queryOrBody.end_date,
    block: queryOrBody.block,
    action: queryOrBody.action,
    status: queryOrBody.status,
    resource: queryOrBody.resource || queryOrBody.resourceType || queryOrBody.resource_type,
    search: queryOrBody.search,
  };
}

async function getActivityStatsFromFilters(filters) {
  const activityPage = await getActivityLogs(filters, {
    page: 1,
    limit: 1000,
  });

  const stats = {
    total: activityPage.total,
    byAction: {},
    byResourceType: {},
    daily: {},
  };

  (activityPage.logs || []).forEach((log) => {
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    stats.byResourceType[log.resource] = (stats.byResourceType[log.resource] || 0) + 1;

    const dateKey = String(log.createdAt || "").split("T")[0];
    if (dateKey) stats.daily[dateKey] = (stats.daily[dateKey] || 0) + 1;
  });

  return stats;
}

router.get("/logs", async (req, res) => {
  try {
    const filters = extractCommonFilters(req.query);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const result = await getActivityLogs(filters, { page, limit });
    return res.json(result);
  } catch (err) {
    console.error("Get activity logs error:", err);
    return res.status(500).json({
      logs: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  }
});

// Backward compatibility for older frontend that POSTs filters to /logs.
router.post("/logs", async (req, res) => {
  try {
    const filters = extractCommonFilters(req.body || {});
    const page = Number(req.body?.page || 1);
    const limit = Number(req.body?.limit || 20);
    const result = await getActivityLogs(filters, { page, limit });
    return res.json(result);
  } catch (err) {
    console.error("Post activity logs error:", err);
    return res.status(500).json({
      logs: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  }
});

router.get("/logs/stats", async (req, res) => {
  try {
    const stats = await getActivityStatsFromFilters(extractCommonFilters(req.query));
    return res.json(stats);
  } catch (err) {
    console.error("Get activity stats error:", err);
    return res.status(500).json({
      total: 0,
      byAction: {},
      byResourceType: {},
      daily: {},
    });
  }
});

router.get("/filters/users", async (req, res) => {
  try {
    const role = String(req.query.role || "").trim().toLowerCase();
    const users = await getUsersForRoleFilter(role);
    return res.json({ users });
  } catch (err) {
    console.error("Get filter users error:", err);
    return res.status(500).json({ users: [] });
  }
});

// ========================
// Login History Endpoints
// ========================

router.get("/login-history", async (req, res) => {
  try {
    const filters = extractCommonFilters(req.query);
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const result = await getLoginHistory(filters, { page, limit });
    return res.json(result);
  } catch (err) {
    console.error("Get login history error:", err);
    return res.status(500).json({
      history: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    });
  }
});

router.get("/login-history/stats", async (req, res) => {
  try {
    const stats = await getLoginStats(extractCommonFilters(req.query));
    return res.json(stats);
  } catch (err) {
    console.error("Get login stats error:", err);
    return res.status(500).json({
      total: 0,
      successful: 0,
      failed: 0,
      blocked: 0,
      byUser: {},
      byDay: {}
    });
  }
});

router.get("/login-history/active-sessions", async (req, res) => {
  try {
    const sessions = await getActiveSessions(extractCommonFilters(req.query));
    return res.json(sessions);
  } catch (err) {
    console.error("Get active sessions error:", err);
    return res.status(500).json([]);
  }
});

// ========================
// Secretary Activity Endpoints
// ========================

// GET /api/activity/secretaries - Get activity summary for all secretaries
router.get("/secretaries", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await safeQuery(
      () => supabase
        .from("secretary_activity_summary")
        .select("*")
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false })
    );

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Get secretary activity error:", err);
    res.json([]);
  }
});

// GET /api/activity/secretaries/:id - Get activity for specific secretary
router.get("/secretaries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await safeQuery(
      () => supabase
        .from("secretary_activity_summary")
        .select("*")
        .eq("secretary_id", id)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: false })
    );

    const { data: secretary, error: secError } = await safeQuery(
      () => supabase
        .from("admin_users")
        .select("id, name, email, status")
        .eq("id", id)
        .eq("role", "secretary")
        .single()
    );

    res.json({
      secretary,
      activity: toCamelCase(data)
    });
  } catch (err) {
    console.error("Get secretary activity error:", err);
    res.json({
      secretary: null,
      activity: []
    });
  }
});

// GET /api/activity/secretaries/:id/detailed - Get detailed activity for specific secretary
router.get("/secretaries/:id/detailed", async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [activityLogs, loginHistory, paymentTrans] = await Promise.all([
      safeQuery(() => supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(100)),
      safeQuery(() => supabase
        .from("login_history")
        .select("*")
        .eq("user_id", id)
        .gte("login_time", startDate.toISOString())
        .order("login_time", { ascending: false })),
      safeQuery(() => supabase
        .from("payment_transactions")
        .select("*")
        .eq("secretary_id", id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false }))
    ]);

    res.json({
      activityLogs: toCamelCase(activityLogs.data || []),
      loginHistory: toCamelCase(loginHistory.data || []),
      payments: toCamelCase(paymentTrans.data || [])
    });
  } catch (err) {
    console.error("Get detailed secretary activity error:", err);
    res.json({
      activityLogs: [],
      loginHistory: [],
      payments: []
    });
  }
});

// ========================
// Payment Transactions Endpoints
// ========================

// GET /api/activity/payments - Get all payment transactions
router.get("/payments", async (req, res) => {
  try {
    const { page = 1, limit = 50, secretaryId, houseId, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from("payment_transactions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (secretaryId) query = query.eq("secretary_id", secretaryId);
    if (houseId) query = query.eq("house_id", houseId);
    if (status) query = query.eq("status", status);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await safeQueryWithCount(() => query);

    res.json({
      payments: toCamelCase(data),
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (err) {
    console.error("Get payments error:", err);
    res.json({
      payments: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0
    });
  }
});

// GET /api/activity/payments/stats - Get payment statistics
router.get("/payments/stats", async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await safeQuery(
      () => supabase
        .from("payment_transactions")
        .select("amount, status, created_at, secretary_name")
        .gte("created_at", startDate.toISOString())
    );

    const stats = {
      totalTransactions: data?.length || 0,
      totalAmount: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      bySecretary: {},
      byDay: {}
    };

    data?.forEach(payment => {
      if (payment.status === "success") {
        stats.totalAmount += parseFloat(payment.amount || 0);
        stats.successful++;
      } else if (payment.status === "failed") {
        stats.failed++;
      } else if (payment.status === "pending") {
        stats.pending++;
      }

      const secKey = payment.secretary_name || "unknown";
      if (payment.status === "success") {
        stats.bySecretary[secKey] = (stats.bySecretary[secKey] || 0) + parseFloat(payment.amount || 0);
      }

      const dateKey = payment.created_at?.split("T")[0];
      if (dateKey && payment.status === "success") {
        stats.byDay[dateKey] = (stats.byDay[dateKey] || 0) + parseFloat(payment.amount || 0);
      }
    });

    res.json(stats);
  } catch (err) {
    console.error("Get payment stats error:", err);
    res.json({
      totalTransactions: 0,
      totalAmount: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      bySecretary: {},
      byDay: {}
    });
  }
});

// ========================
// Notifications Endpoints
// ========================

// GET /api/activity/notifications - Get notifications
router.get("/notifications", async (req, res) => {
  try {
    const { page = 1, limit = 50, unreadOnly = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (unreadOnly === "true" || unreadOnly === true) {
      query = query.eq("is_read", false);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await safeQueryWithCount(() => query);

    const { data: unreadCountData } = await safeQuery(
      () => supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
    );

    res.json({
      notifications: toCamelCase(data),
      total: count,
      unreadCount: unreadCountData?.length || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.json({
      notifications: [],
      total: 0,
      unreadCount: 0,
      page: 1,
      limit: 50,
      totalPages: 0
    });
  }
});

// GET /api/activity/notifications/realtime - Get unread notifications for polling
router.get("/notifications/realtime", async (req, res) => {
  try {
    const { lastCheck } = req.query;
    
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (lastCheck) {
      query = query.gt("created_at", lastCheck);
    }

    const { data, error } = await safeQuery(() => query);

    res.json({
      notifications: toCamelCase(data),
      count: data?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Get realtime notifications error:", err);
    res.json({
      notifications: [],
      count: 0,
      timestamp: new Date().toISOString()
    });
  }
});

// PATCH /api/activity/notifications/:id/read - Mark notification as read
router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);

    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.json({ message: "Notification marked as read" });
  }
});

// PATCH /api/activity/notifications/read-all - Mark all notifications as read
router.patch("/notifications/read-all", async (req, res) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("is_read", false);

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.json({ message: "All notifications marked as read" });
  }
});

// DELETE /api/activity/notifications/:id - Delete a notification
router.delete("/notifications/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id);

    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.json({ message: "Notification deleted" });
  }
});

// ========================
// Dashboard Summary Endpoint
// ========================

router.get("/dashboard-summary", async (req, res) => {
  try {
    const summary = await getDashboardStats(extractCommonFilters(req.query));
    return res.json(summary);
  } catch (err) {
    console.error("Get dashboard summary error:", err);
    return res.status(500).json({
      activity: {
        total: 0,
        byType: {},
        recent: []
      },
      logins: { success: 0, failed: 0, blocked: 0 },
      payments: { total: 0, successful: 0, pending: 0, failed: 0 },
      notifications: {
        unread: 0,
        items: []
      },
      secretaries: {},
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
