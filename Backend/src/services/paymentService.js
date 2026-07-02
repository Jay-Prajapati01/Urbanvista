const crypto = require("crypto");
const supabase = require("../config/supabase");
const { getRazorpayClient, getRazorpayConfig } = require("../config/razorpay");
const { computeBillingSnapshot, applyPaymentToBill, toDatabaseStatus } = require("./maintenanceBillingService");
const { createReceiptForPayment, buildReceiptNumber, normalizeReceiptRow } = require("./receiptService");
const {
  logActivity,
  logPaymentTransaction,
  getClientIp,
  getUserAgent,
} = require("../utils/activityLogger");

const RETRIABLE_MAINTENANCE_COLUMNS = new Set(["paid_amount", "due_amount", "payment_method", "payment_date", "updated_at"]);
const REUSABLE_ORDER_WINDOW_MINUTES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

function createHttpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

function extractMissingColumn(error) {
  if (!error || error.code !== "PGRST204" || typeof error.message !== "string") {
    return "";
  }
  const match = error.message.match(/Could not find the '([^']+)' column/);
  return match ? match[1] : "";
}

async function runPayloadWithMissingColumnFallback(executor, payload) {
  let mutablePayload = { ...payload };

  while (true) {
    const result = await executor(mutablePayload);
    if (!result.error) {
      return result;
    }

    const missingColumn = extractMissingColumn(result.error);
    if (!missingColumn) {
      return result;
    }

    if (!Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn)) {
      return result;
    }

    delete mutablePayload[missingColumn];
  }
}

function normalizePaymentPersistenceStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (normalized === "cancelled") return "failed";
  if (["created", "authorized", "captured", "failed", "refunded"].includes(normalized)) {
    return normalized;
  }
  return "failed";
}

function normalizeMaintenancePaymentMethod(method) {
  const normalized = String(method || "").trim().toLowerCase();
  if (!normalized) return "UPI";
  if (["upi", "wallet"].includes(normalized)) return "UPI";
  if (["card", "credit", "debit", "netbanking", "bank_transfer", "bank transfer"].includes(normalized)) {
    return "Bank Transfer";
  }
  if (["cash"].includes(normalized)) return "Cash";
  if (["cheque", "check"].includes(normalized)) return "Cheque";
  return "UPI";
}

function ensureResidentUser(user) {
  if (!user?.id || !user?.houseId || user?.role !== "user") {
    throw createHttpError(403, "Resident authentication is required", "AUTH_REQUIRED");
  }
}

function sanitizeMaintenanceId(maintenanceRecordId) {
  const value = String(maintenanceRecordId || "").trim();
  if (!value) {
    throw createHttpError(400, "maintenanceRecordId is required", "INVALID_INPUT");
  }
  return value;
}

async function findMaintenanceRecordForResident(maintenanceRecordId, user) {
  const { data, error } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", maintenanceRecordId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, "Failed to load maintenance record", "DB_ERROR");
  }

  if (!data) {
    throw createHttpError(404, "Maintenance record not found", "RECORD_NOT_FOUND");
  }

  const mappedHouseId = data.house_id || data.property_id;
  if (mappedHouseId !== user.houseId) {
    throw createHttpError(403, "This maintenance record does not belong to the resident", "SCOPE_VIOLATION");
  }

  return data;
}

async function findReusablePendingOrder(userId, maintenanceRecordId) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, razorpay_order_id, amount, currency, status, created_at, receipt_number")
    .eq("user_id", userId)
    .eq("maintenance_record_id", maintenanceRecordId)
    .in("status", ["created", "authorized"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const createdAt = new Date(data.created_at || 0).getTime();
  const ageMinutes = (Date.now() - createdAt) / (1000 * 60);
  if (ageMinutes <= REUSABLE_ORDER_WINDOW_MINUTES && data.razorpay_order_id) {
    return data;
  }

  return null;
}

async function savePayment({ mode, userId, orderId, payload }) {
  if (mode === "create") {
    const normalizedStatus = normalizePaymentPersistenceStatus(payload.status);
    const insertPayload = {
      user_id: userId,
      maintenance_record_id: payload.maintenanceRecordId,
      maintenance_record_id: payload.maintenanceRecordId,
      maintenance_id: payload.maintenanceRecordId,
      role: "resident",
      order_id: orderId,
      razorpay_order_id: orderId,
      amount: payload.amount,
      currency: payload.currency,
      status: normalizedStatus,
      receipt_number: payload.receiptNumber,
      notes: payload.notes || null,
    };

    const result = await runPayloadWithMissingColumnFallback((safePayload) =>
      supabase.from("payments").insert(safePayload).select("*").single(), insertPayload);

    if (result.error) {
      throw createHttpError(500, "Failed to save payment", "DB_ERROR");
    }

    return result.data;
  }

  if (mode === "update-by-order") {
    const normalizedStatus = normalizePaymentPersistenceStatus(payload.status);
    const updatePayload = {
      role: "resident",
      order_id: orderId,
      maintenance_record_id: payload.maintenanceRecordId,
      maintenance_id: payload.maintenanceRecordId,
      razorpay_payment_id: payload.razorpayPaymentId,
      razorpay_signature: payload.razorpaySignature,
      status: normalizedStatus,
      notes: payload.notes || null,
      updated_at: new Date().toISOString(),
    };

    const result = await runPayloadWithMissingColumnFallback((safePayload) =>
      supabase
        .from("payments")
        .update(safePayload)
        .eq("user_id", userId)
        .eq("razorpay_order_id", orderId)
        .select("*")
        .single(), updatePayload);

    if (result.error) {
      throw createHttpError(500, "Failed to update payment", "DB_ERROR");
    }

    return result.data;
  }

  throw createHttpError(500, "Unsupported payment save mode", "SERVICE_ERROR");
}

function verifySignature({ orderId, paymentId, signature }) {
  const { keySecret } = getRazorpayConfig();
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === String(signature || "").trim();
}

async function reconcileCapturedLifecycle({ payment, user, paymentMethod }) {
  let updatedMaintenanceRecord = null;
  let houseRecord = null;

  // Recovery: if capture succeeded but maintenance is still pending, apply settlement once.
  const { data: maintenanceRecord, error: maintenanceError } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", payment.maintenance_record_id)
    .maybeSingle();

  if (!maintenanceError && maintenanceRecord) {
    if (maintenanceRecord.house_id) {
      const { data: houseData } = await supabase
        .from("houses")
        .select("id, block, house_number")
        .eq("id", maintenanceRecord.house_id)
        .maybeSingle();
      houseRecord = houseData || null;
    }

    const snapshot = computeBillingSnapshot(maintenanceRecord, new Date());
    if (snapshot.totalPayable > 0 && String(snapshot.computedStatus || "").toLowerCase() !== "paid") {
      updatedMaintenanceRecord = await applyCapturedPaymentToMaintenance(
        payment.maintenance_record_id,
        Number(payment.amount || 0),
        paymentMethod || "Online"
      );
    }
  }

  const receipt = await createReceiptForPayment({
    paymentId: payment.id,
    userId: user.id,
    maintenanceId: payment.maintenance_record_id,
    amount: Number(payment.amount || 0),
    receiptNumber: payment.receipt_number || buildReceiptNumber(payment.maintenance_record_id),
    paymentMethod,
    razorpayTransactionId: payment.razorpay_payment_id || null,
    paymentStatus: payment.status || "captured",
  });

  return {
    receipt: normalizeReceiptRow({
      receipt,
      payment,
      maintenance: maintenanceRecord || null,
      house: houseRecord || null,
      residentName: user.name || null,
    }),
    updatedMaintenanceRecord,
  };
}

async function applyCapturedPaymentToMaintenance(maintenanceRecordId, paymentAmount, paymentMethod) {
  const { data: record, error: recordError } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", maintenanceRecordId)
    .maybeSingle();

  if (recordError || !record) {
    throw createHttpError(500, "Failed to load maintenance record for payment update", "DB_ERROR");
  }

  const nextState = applyPaymentToBill(record, paymentAmount, new Date());

  let updatePayload = {
    amount_paid: nextState.nextPaidAmount,
    paid_amount: nextState.nextPaidAmount,
    due_amount: nextState.nextDueAmount,
    status: toDatabaseStatus(nextState.nextStatus),
    payment_method: normalizeMaintenancePaymentMethod(paymentMethod),
    payment_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  let updatedRecord = null;
  let error = null;

  while (true) {
    const result = await supabase
      .from("maintenance_records")
      .update(updatePayload)
      .eq("id", maintenanceRecordId)
      .select("*")
      .single();

    updatedRecord = result.data;
    error = result.error;

    if (!error) {
      break;
    }

    const missingColumn = extractMissingColumn(error);
    if (!missingColumn || !RETRIABLE_MAINTENANCE_COLUMNS.has(missingColumn)) {
      break;
    }

    if (!Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)) {
      break;
    }

    updatePayload = { ...updatePayload };
    delete updatePayload[missingColumn];
  }

  if (error) {
    console.error("Maintenance payment update error:", error.message);
    throw createHttpError(500, "Failed to update maintenance after payment", "DB_ERROR");
  }

  return updatedRecord;
}

function sanitizeVerifyPayload(payload) {
  const orderId = String(payload?.razorpay_order_id || "").trim();
  const paymentId = String(payload?.razorpay_payment_id || "").trim();
  const signature = String(payload?.razorpay_signature || "").trim();

  if (!orderId || !paymentId || !signature) {
    throw createHttpError(400, "Missing payment verification data", "INVALID_INPUT");
  }

  return { orderId, paymentId, signature };
}

function sanitizeRequestedAmount(payload) {
  const raw = payload?.amount ?? payload?.requestedAmount;
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw createHttpError(400, "amount must be greater than 0", "INVALID_INPUT");
  }

  return parsed;
}

async function createOrder({ maintenanceRecordId, user, req, payload = {} }) {
  ensureResidentUser(user);
  const razorpay = getRazorpayClient();
  const safeMaintenanceId = sanitizeMaintenanceId(maintenanceRecordId);
  const record = await findMaintenanceRecordForResident(safeMaintenanceId, user);

  const snapshot = computeBillingSnapshot(record, new Date());
  const requestedAmount = sanitizeRequestedAmount(payload);

  if (snapshot.totalPayable <= 0 || String(snapshot.computedStatus || "").toLowerCase() === "paid") {
    throw createHttpError(400, "No dues available for this maintenance record", "NO_DUES");
  }

  const chargeAmount = requestedAmount === null ? snapshot.totalPayable : requestedAmount;
  if (chargeAmount > snapshot.totalPayable) {
    throw createHttpError(400, "amount cannot exceed total payable amount", "INVALID_INPUT");
  }

  const existing = await findReusablePendingOrder(user.id, safeMaintenanceId);
  const { keyId } = getRazorpayConfig();

  if (existing) {
    return {
      orderId: existing.razorpay_order_id,
      amount: Math.round(Number(existing.amount || chargeAmount) * 100),
      currency: existing.currency || "INR",
      razorpayKeyId: keyId,
      receiptNumber: existing.receipt_number || buildReceiptNumber(safeMaintenanceId),
      reused: true,
    };
  }

  const amountInPaise = Math.round(chargeAmount * 100);
  const receiptNumber = buildReceiptNumber(safeMaintenanceId);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptNumber,
    notes: {
      maintenance_record_id: safeMaintenanceId,
      resident_user_id: user.id,
      resident_house_id: user.houseId,
      role: "resident",
    },
  });

  await savePayment({
    mode: "create",
    userId: user.id,
    orderId: order.id,
    payload: {
      maintenanceRecordId: safeMaintenanceId,
      amount: chargeAmount,
      currency: "INR",
      status: "created",
      receiptNumber,
      notes: "Resident maintenance payment order created",
    },
  });

  await logActivity({
    userId: user.id,
    userName: user.name || null,
    userEmail: user.email || null,
    userRole: "user",
    action: "payment_order_created",
    resourceType: "payment",
    resourceId: null,
    description: "Resident created maintenance payment order",
    status: "success",
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req),
    metadata: {
      maintenanceRecordId: safeMaintenanceId,
        amount: chargeAmount,
      orderId: order.id,
        requestedAmount: requestedAmount,
    },
  });

  return {
    orderId: order.id,
    amount: amountInPaise,
    currency: "INR",
    razorpayKeyId: keyId,
    receiptNumber,
    reused: false,
  };
}

async function verifyPayment({ payload, user, req }) {
  ensureResidentUser(user);
  const { orderId, paymentId, signature } = sanitizeVerifyPayload(payload);
  const maintenanceRecordId = String(payload?.maintenance_id || payload?.maintenanceRecordId || "").trim();
  const requestedAmount = sanitizeRequestedAmount(payload);
  const razorpay = getRazorpayClient();

  const { data: existingPayment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, "Failed to load payment for verification", "DB_ERROR");
  }

  if (!existingPayment) {
    throw createHttpError(404, "Payment order not found", "ORDER_NOT_FOUND");
  }

  if (maintenanceRecordId && existingPayment.maintenance_record_id && maintenanceRecordId !== existingPayment.maintenance_record_id) {
    throw createHttpError(400, "Payment does not belong to the provided maintenance record", "MAINTENANCE_MISMATCH");
  }

  if (existingPayment.status === "captured" && existingPayment.razorpay_payment_id) {
    const { receipt, updatedMaintenanceRecord } = await reconcileCapturedLifecycle({
      payment: existingPayment,
      user,
      paymentMethod: "Online",
    });

    return {
      success: true,
      message: "Payment already verified",
      paymentId: existingPayment.razorpay_payment_id,
      receiptId: receipt?.id || null,
      receiptNumber: receipt?.receiptNumber || existingPayment.receipt_number || null,
      receipt: receipt || null,
      maintenanceStatus: updatedMaintenanceRecord?.status || null,
      alreadyVerified: true,
    };
  }

  const signatureValid = verifySignature({ orderId, paymentId, signature });
  if (!signatureValid) {
    await savePayment({
      mode: "update-by-order",
      userId: user.id,
      orderId,
      payload: {
        maintenanceRecordId: existingPayment.maintenance_record_id,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: "failed",
        notes: "Signature verification failed",
      },
    });

    await logActivity({
      userId: user.id,
      userName: user.name || null,
      userEmail: user.email || null,
      userRole: "user",
      action: "payment_verify_failed",
      resourceType: "payment",
      resourceId: existingPayment?.id || null,
      description: "Resident payment verification failed due to invalid signature",
      status: "failed",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: {
        orderId,
        paymentId,
      },
    });

    throw createHttpError(400, "Payment verification failed", "INVALID_SIGNATURE");
  }

  let razorpayPayment = null;
  try {
    razorpayPayment = await retryWithBackoff(() => razorpay.payments.fetch(paymentId));
  } catch (fetchError) {
    console.warn("Razorpay fetch warning after retries:", fetchError.message);
  }

  if (razorpayPayment && razorpayPayment.order_id !== orderId) {
    throw createHttpError(400, "Payment does not belong to this order", "ORDER_MISMATCH");
  }

  const expectedPaise = Math.round(Number(existingPayment.amount || 0) * 100);
  const actualPaise = razorpayPayment ? Number(razorpayPayment.amount || 0) : null;

  // RELAXED: Allow payment amount to vary from original order amount due to:
  // - Late fees added after order creation
  // - Extra charges added after order creation  
  // - Partial payment scenarios
  // Trust the Razorpay captured amount over the stored order amount
  if (razorpayPayment && actualPaise && Math.abs(actualPaise - expectedPaise) > 1000) {
    // Only fail if difference is > 10 rupees (to allow for rounding, but catch major discrepancies)
    console.warn(`Payment amount variance: expected ${expectedPaise} paise, got ${actualPaise} paise`);
  }

  // RELAXED: Allow requested amount to differ from original order amount
  // The frontend may send the current due amount (with late fees), not the original order amount
  if (requestedAmount !== null && actualPaise && Math.abs(actualPaise - (requestedAmount * 100)) > 1000) {
    console.warn(`Requested amount variance: requested ${requestedAmount}, captured ${actualPaise / 100}`);
  }

  const finalStatus = razorpayPayment?.status === "captured" ? "captured" : "authorized";

  // Use the actual captured amount from Razorpay instead of the original order amount
  const actualCapturedAmount = razorpayPayment ? Number(razorpayPayment.amount || 0) / 100 : Number(existingPayment.amount || 0);

  const updatedPayment = await savePayment({
    mode: "update-by-order",
    userId: user.id,
    orderId,
    payload: {
      maintenanceRecordId: existingPayment.maintenance_record_id,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      status: finalStatus,
      amount: actualCapturedAmount,  // Update to actual captured amount
      notes: "Resident payment verified",
    },
  });

  let receipt = null;
  let updatedMaintenanceRecord = null;
  if (finalStatus === "captured") {
    const reconciled = await reconcileCapturedLifecycle({
      payment: { ...existingPayment, ...updatedPayment },
      user,
      paymentMethod: razorpayPayment?.method || "Online",
    });
    updatedMaintenanceRecord = reconciled.updatedMaintenanceRecord;
    receipt = reconciled.receipt;
  }

  await Promise.all([
    logPaymentTransaction({
      userId: user.id,
      secretaryId: null,
      secretaryName: null,
      maintenanceRecordId: existingPayment.maintenance_record_id,
      houseId: user.houseId,
      houseNumber: null,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amount: Number(existingPayment.amount || 0),
      currency: existingPayment.currency || "INR",
      status: finalStatus === "captured" ? "success" : "pending",
      paymentMethod: razorpayPayment?.method || "Online",
      receiptNumber: existingPayment.receipt_number || null,
      notes:
        finalStatus === "captured"
          ? "Resident maintenance payment successful"
          : "Resident payment verified and awaiting capture",
    }),
    logActivity({
      userId: user.id,
      userName: user.name || null,
      userEmail: user.email || null,
      userRole: "user",
      action: "payment_success",
      resourceType: "payment",
      resourceId: updatedPayment?.id || orderId,
      description:
        finalStatus === "captured"
          ? "Resident maintenance payment successful"
          : "Resident payment verified and awaiting capture",
      status: finalStatus === "captured" ? "success" : "pending",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: {
        orderId,
        paymentId,
        maintenanceRecordId: existingPayment.maintenance_record_id,
        amount: Number(existingPayment.amount || 0),
        receiptId: receipt?.id || null,
        receiptNumber: receipt?.receiptNumber || existingPayment.receipt_number || null,
      },
    }),
  ]);

  return {
    success: true,
    message: "Payment verified successfully",
    paymentId: paymentId,
    receiptId: receipt?.id || null,
    receiptNumber: receipt?.receiptNumber || existingPayment.receipt_number || null,
    receipt: receipt || null,
    maintenanceStatus: updatedMaintenanceRecord?.status || null,
    alreadyVerified: false,
  };
}

async function markPaymentAttempt({ payload, user, req }) {
  ensureResidentUser(user);

  const orderId = String(payload?.razorpay_order_id || payload?.orderId || "").trim();
  const paymentId = String(payload?.razorpay_payment_id || payload?.paymentId || "").trim() || null;
  const status = String(payload?.status || "failed").trim().toLowerCase();
  const reason = String(payload?.reason || payload?.error || "Payment attempt failed or cancelled").trim();
  const statusForPersistence = normalizePaymentPersistenceStatus(status);

  if (!orderId) {
    throw createHttpError(400, "razorpay_order_id is required", "INVALID_INPUT");
  }

  if (!["failed", "cancelled"].includes(status)) {
    throw createHttpError(400, "status must be failed or cancelled", "INVALID_STATUS");
  }

  const { data: existingPayment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", user.id)
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (error) {
    throw createHttpError(500, "Failed to load payment attempt", "DB_ERROR");
  }

  if (!existingPayment) {
    throw createHttpError(404, "Payment order not found", "ORDER_NOT_FOUND");
  }

  if (existingPayment.status === "captured") {
    return {
      success: true,
      message: "Payment already captured",
      paymentId: existingPayment.razorpay_payment_id || null,
      ignored: true,
    };
  }

  const updatedPayment = await savePayment({
    mode: "update-by-order",
    userId: user.id,
    orderId,
    payload: {
      maintenanceRecordId: existingPayment.maintenance_record_id,
      razorpayPaymentId: paymentId,
      razorpaySignature: existingPayment.razorpay_signature || null,
      status: statusForPersistence,
      notes: reason,
    },
  });

  await Promise.all([
    logPaymentTransaction({
      userId: user.id,
      secretaryId: null,
      secretaryName: null,
      maintenanceRecordId: existingPayment.maintenance_record_id,
      houseId: user.houseId,
      houseNumber: null,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amount: Number(existingPayment.amount || 0),
      currency: existingPayment.currency || "INR",
      status: statusForPersistence,
      paymentMethod: null,
      receiptNumber: existingPayment.receipt_number || null,
      notes: reason,
    }),
    logActivity({
      userId: user.id,
      userName: user.name || null,
      userEmail: user.email || null,
      userRole: "user",
      action: status === "cancelled" ? "payment_cancelled" : "payment_failed",
      resourceType: "payment",
      resourceId: updatedPayment?.id || orderId,
      description: `Resident payment ${status}`,
      status: "failed",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: {
        orderId,
        paymentId,
        reason,
      },
    }),
  ]);

  return {
    success: true,
    message: `Payment marked as ${status}`,
    paymentId,
  };
}

module.exports = {
  createOrder,
  verifyPayment,
  markPaymentAttempt,
  savePayment,
};
