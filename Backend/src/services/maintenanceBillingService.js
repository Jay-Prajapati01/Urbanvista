const supabase = require("../config/supabase");

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function toAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

function toDateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function normalizeStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (["pending", "partial", "paid", "overdue"].includes(normalized)) {
    return normalized;
  }

  if (normalized === "success" || normalized === "captured") {
    return "paid";
  }

  if (normalized === "authorized" || normalized === "created") {
    return "pending";
  }

  return "pending";
}

function normalizeMonth(value) {
  const month = String(value || "").trim();
  return MONTH_PATTERN.test(month) ? month : "";
}

function monthToComparable(month) {
  const normalized = normalizeMonth(month);
  if (!normalized) return Number.NaN;
  return Number(normalized.replace("-", ""));
}

function formatDisplayStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function toDatabaseStatus(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "paid") return "Paid";
  if (normalized === "overdue") return "Overdue";
  if (normalized === "partial") return "Pending";
  return "Pending";
}

function computeBillingSnapshot(record, now = new Date()) {
  const baseAmount = toAmount(record.base_amount);
  const extraCharges = toAmount(record.extra_charges);
  const totalAmount = Math.max(toAmount(record.total_amount), baseAmount + extraCharges);

  const paidRaw = record.paid_amount !== undefined && record.paid_amount !== null
    ? record.paid_amount
    : record.amount_paid;
  const paidAmount = toAmount(paidRaw);

  const dueRaw = record.due_amount !== undefined && record.due_amount !== null
    ? record.due_amount
    : totalAmount - paidAmount;
  const dueAmount = Math.max(toAmount(dueRaw), 0);

  const lateFeePerDay = toAmount(
    record.late_fee_per_day !== undefined && record.late_fee_per_day !== null
      ? record.late_fee_per_day
      : record.late_fee
  );

  const nowDate = new Date(now);
  nowDate.setHours(0, 0, 0, 0);

  const dueDate = toDateOnly(record.due_date);
  const isOverdue = Boolean(dueDate && dueAmount > 0 && nowDate.getTime() > dueDate.getTime());
  const daysOverdue = isOverdue
    ? Math.floor((nowDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const lateFeeAmount = isOverdue ? daysOverdue * lateFeePerDay : 0;
  const totalPayable = dueAmount + lateFeeAmount;

  let computedStatus = "pending";
  if (dueAmount <= 0) {
    computedStatus = "paid";
  } else if (isOverdue) {
    computedStatus = "overdue";
  } else if (paidAmount > 0) {
    computedStatus = "partial";
  }

  return {
    baseAmount,
    extraCharges,
    totalAmount,
    paidAmount,
    dueAmount,
    dueDate,
    lateFeePerDay,
    daysOverdue,
    lateFeeAmount,
    totalPayable,
    isOverdue,
    computedStatus,
    statusNeedsUpdate: normalizeStatus(record.status) !== computedStatus,
  };
}

async function ensureOverdueStatus(recordId, currentStatus, computedStatus) {
  if (!recordId) return;
  if (normalizeStatus(currentStatus) === computedStatus) return;

  const { error } = await supabase
    .from("maintenance_records")
    .update({ status: toDatabaseStatus(computedStatus), updated_at: new Date().toISOString() })
    .eq("id", recordId);

  if (error) {
    console.warn("Maintenance status sync warning:", error.message);
  }
}

function enrichMaintenanceRecord(record, now = new Date()) {
  const snapshot = computeBillingSnapshot(record, now);

  return {
    ...record,
    paid_amount: snapshot.paidAmount,
    due_amount: snapshot.dueAmount,
    total_amount: snapshot.totalAmount,
    late_fee_per_day: snapshot.lateFeePerDay,
    status: snapshot.computedStatus,
    due_status: snapshot.computedStatus,
    late_fee_amount: snapshot.lateFeeAmount,
    overdue_days: snapshot.daysOverdue,
    total_payable: snapshot.totalPayable,
    display_status: formatDisplayStatus(snapshot.computedStatus),
    status_needs_update: snapshot.statusNeedsUpdate,
    previous_status: record.status,
  };
}

function enrichMaintenanceRecords(records, now = new Date()) {
  return (records || []).map((record) => enrichMaintenanceRecord(record, now));
}

function validateBillPayload(input, { isCreate }) {
  const payload = {
    house_id: String(input.houseId || input.house_id || input.propertyId || input.property_id || "").trim() || null,
    user_id: String(input.userId || input.user_id || input.residentId || input.resident_id || "").trim() || null,
    from_month: String(input.fromMonth || input.from_month || "").trim(),
    to_month: String(input.toMonth || input.to_month || "").trim(),
    due_date: String(input.dueDate || input.due_date || "").trim() || null,
    base_amount: toAmount(input.baseAmount ?? input.base_amount),
    late_fee_per_day: toAmount(input.lateFeePerDay ?? input.late_fee_per_day ?? input.lateFee ?? input.late_fee),
    extra_charges: toAmount(input.extraCharges ?? input.extra_charges),
    description: String(input.description || "").trim() || null,
    house_number: String(input.houseNumber || input.house_number || "").trim() || null,
    owner_name: String(input.ownerName || input.owner_name || "").trim() || null,
  };

  if (!payload.from_month || !normalizeMonth(payload.from_month)) {
    return { valid: false, message: "fromMonth must be in YYYY-MM format" };
  }

  if (!payload.to_month || !normalizeMonth(payload.to_month)) {
    return { valid: false, message: "toMonth must be in YYYY-MM format" };
  }

  if (monthToComparable(payload.from_month) > monthToComparable(payload.to_month)) {
    return { valid: false, message: "fromMonth must be before or equal to toMonth" };
  }

  if (!payload.due_date || !toDateOnly(payload.due_date)) {
    return { valid: false, message: "A valid dueDate is required" };
  }

  if (payload.base_amount <= 0) {
    return { valid: false, message: "baseAmount must be greater than 0" };
  }

  if (isCreate && !payload.user_id) {
    return { valid: false, message: "Resident is required" };
  }

  if (!payload.house_id) {
    return { valid: false, message: "Property is required" };
  }

  const totalAmount = payload.base_amount + payload.extra_charges;

  const dbPayload = {
    ...payload,
    property_id: payload.house_id,
    total_amount: totalAmount,
    paid_amount: 0,
    due_amount: totalAmount,
    amount_paid: 0,
    late_fee: payload.late_fee_per_day,
    status: toDatabaseStatus("pending"),
    payment_method: null,
    payment_date: null,
  };

  return {
    valid: true,
    payload: dbPayload,
  };
}

function applyPaymentToBill(record, paymentAmount, now = new Date()) {
  const snapshot = computeBillingSnapshot(record, now);
  const amount = toAmount(paymentAmount);

  if (amount <= 0) {
    return {
      nextPaidAmount: snapshot.paidAmount,
      nextDueAmount: snapshot.dueAmount,
      nextStatus: snapshot.computedStatus,
    };
  }

  const nextPaidAmount = snapshot.paidAmount + amount;
  const nextDueAmount = Math.max(snapshot.totalAmount - nextPaidAmount, 0);
  const currentDate = new Date(now);
  currentDate.setHours(0, 0, 0, 0);

  let nextStatus = "pending";
  if (nextDueAmount <= 0) {
    nextStatus = "paid";
  } else if (snapshot.dueDate && currentDate.getTime() > snapshot.dueDate.getTime()) {
    nextStatus = "overdue";
  } else {
    nextStatus = "partial";
  }

  return {
    nextPaidAmount,
    nextDueAmount,
    nextStatus,
  };
}

module.exports = {
  computeBillingSnapshot,
  enrichMaintenanceRecord,
  enrichMaintenanceRecords,
  ensureOverdueStatus,
  validateBillPayload,
  normalizeStatus,
  formatDisplayStatus,
  applyPaymentToBill,
  toDatabaseStatus,
};
