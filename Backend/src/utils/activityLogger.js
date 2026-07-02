const supabase = require("../config/supabase");

function normalizeTrackingRole(userRole) {
  const normalized = String(userRole || "admin").trim().toLowerCase();
  if (normalized === "user") return "resident";
  if (["admin", "secretary", "resident"].includes(normalized)) {
    return normalized;
  }
  return "admin";
}

function normalizeTrackingUserId(userId, userRole) {
  if (!userId) return null;
  return normalizeTrackingRole(userRole) === "resident" ? null : userId;
}

async function insertLoginHistoryRow(payload) {
  const { error } = await supabase.from("login_history").insert(payload);
  if (!error) return true;

  if (error.code === "PGRST204" && typeof error.message === "string" && error.message.includes("block")) {
    const { block, ...retryPayload } = payload;
    const retry = await supabase.from("login_history").insert(retryPayload);
    if (!retry.error) return true;
    console.warn("Failed to log login history:", retry.error.message);
    return false;
  }

  console.warn("Failed to log login history:", error.message);
  return false;
}

async function logActivity({
  userId,
  userName,
  userEmail,
  userRole = "admin",
  action,
  resourceType,
  resourceId,
  description,
  oldValue,
  newValue,
  status = "success",
  block,
  ipAddress,
  userAgent,
  metadata
}) {
  try {
    const normalizedRole = normalizeTrackingRole(userRole);
    const normalizedUserId = normalizeTrackingUserId(userId, normalizedRole);

    const normalizedBlock = String(block || "").trim().toUpperCase() || null;

    const { error } = await supabase.from("activity_logs").insert({
      user_id: normalizedUserId,
      user_name: userName || null,
      user_email: userEmail || null,
      user_role: normalizedRole,
      action: action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      description: description || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      metadata: {
        status,
        block: normalizedBlock,
        ...(metadata || {}),
      }
    });

    if (error) {
      console.warn("Failed to log activity:", error.message);
    }

    return !error;
  } catch (err) {
    console.warn("Activity logging error:", err.message);
    return false;
  }
}

async function logLoginHistory({
  userId,
  userName,
  userEmail,
  userRole = "admin",
  status,
  block,
  failureReason,
  ipAddress,
  userAgent,
  deviceFingerprint,
  sessionId
}) {
  try {
    const normalizedRole = normalizeTrackingRole(userRole);
    const normalizedUserId = normalizeTrackingUserId(userId, normalizedRole);

    return insertLoginHistoryRow({
      user_id: normalizedUserId,
      user_name: userName || null,
      user_email: userEmail || null,
      user_role: normalizedRole,
      block: String(block || "").trim().toUpperCase() || null,
      status: status,
      failure_reason: failureReason || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      device_fingerprint: deviceFingerprint || null,
      session_id: sessionId || null
    });
  } catch (err) {
    console.warn("Login history logging error:", err.message);
    return false;
  }
}

async function updateLoginLogout(userOrOptions, logoutTime) {
  try {
    const options = typeof userOrOptions === "object" && userOrOptions !== null
      ? userOrOptions
      : { userId: userOrOptions, logoutTime };
    const normalizedRole = normalizeTrackingRole(options.userRole);
    const normalizedUserId = normalizeTrackingUserId(options.userId, normalizedRole);
    const normalizedEmail = String(options.userEmail || "").trim().toLowerCase() || null;
    const normalizedLogoutTime = options.logoutTime || logoutTime || new Date().toISOString();

    if (!normalizedUserId && !normalizedEmail) {
      return false;
    }

    let query = supabase
      .from("login_history")
      .update({ logout_time: normalizedLogoutTime })
      .is("logout_time", null)
      .order("login_time", { ascending: false })
      .limit(1);

    query = normalizedUserId
      ? query.eq("user_id", normalizedUserId)
      : query.eq("user_email", normalizedEmail);

    const { error } = await query;

    if (error) {
      console.warn("Failed to update login history:", error.message);
    }

    return !error;
  } catch (err) {
    console.warn("Update login history error:", err.message);
    return false;
  }
}

async function logPaymentTransaction({
  userId,
  secretaryId,
  secretaryName,
  maintenanceRecordId,
  houseId,
  houseNumber,
  razorpayOrderId,
  razorpayPaymentId,
  amount,
  currency = "INR",
  status,
  paymentMethod,
  receiptNumber,
  notes
}) {
  try {
    // Canonical payload with all fields; will retry if columns missing
    const payload = {
      user_id: userId || null,
      secretary_id: secretaryId || null,
      secretary_name: secretaryName || null,
      maintenance_record_id: maintenanceRecordId || null,
      house_id: houseId || null,
      house_number: houseNumber || null,
      razorpay_order_id: razorpayOrderId || null,
      razorpay_payment_id: razorpayPaymentId || null,
      amount: amount || 0,
      currency: currency,
      status: status,
      payment_method: paymentMethod || null,
      receipt_number: receiptNumber || null,
      notes: notes || null
    };

    // Retry loop: if insert fails due to missing column(s), remove and retry
    let attempts = 0;
    while (attempts < 10) {
      attempts += 1;
      const { data, error } = await supabase.from("payment_transactions").insert(payload).select('*').single();

      if (!error) {
        return true;
      }

      const msg = String(error.message || '');
      if (error.code === 'PGRST204' || msg.toLowerCase().includes('could not find') || msg.toLowerCase().includes('column')) {
        // Extract column name from error message
        const m = msg.match(/'([^']+)'/);
        const col = m ? m[1] : null;
        if (col && payload.hasOwnProperty(col)) {
          delete payload[col];
          continue; // retry with this column removed
        }
      }

      // Non-recoverable error or all columns tried
      console.warn("Failed to log payment transaction:", error.message);
      return false;
    }

    console.warn("Payment transaction logging failed after retries");
    return false;
  } catch (err) {
    console.warn("Payment transaction logging error:", err.message);
    return false;
  }
}

async function createNotification({
  userId,
  title,
  message,
  type = "info",
  actionUrl,
  metadata
}) {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: userId || null,
      title: title,
      message: message,
      type: type,
      action_url: actionUrl || null,
      metadata: metadata || null
    });

    if (error) {
      console.warn("Failed to create notification:", error.message);
    }

    return !error;
  } catch (err) {
    console.warn("Create notification error:", err.message);
    return false;
  }
}

async function createBulkNotification(userIds, { title, message, type = "info", actionUrl, metadata }) {
  try {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      action_url: actionUrl || null,
      metadata: metadata || null
    }));

    const { error } = await supabase.from("notifications").insert(notifications);

    if (error) {
      console.warn("Failed to create bulk notifications:", error.message);
    }

    return !error;
  } catch (err) {
    console.warn("Bulk notification error:", err.message);
    return false;
  }
}

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.ip || null;
}

function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

function createActivityFromRequest(req, data) {
  return {
    userId: req.user?.id,
    userName: req.user?.name,
    userEmail: req.user?.email,
    userRole: req.user?.role || "admin",
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    ...data
  };
}

module.exports = {
  logActivity,
  logLoginHistory,
  updateLoginLogout,
  logPaymentTransaction,
  createNotification,
  createBulkNotification,
  getClientIp,
  getUserAgent,
  createActivityFromRequest
};
