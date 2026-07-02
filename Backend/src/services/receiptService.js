const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");

function createHttpError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function buildReceiptNumber(maintenanceRecordId) {
  const prefix = String(maintenanceRecordId || "MNT").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10).toUpperCase() || "MNT";
  return `RCPT-${prefix}-${Date.now()}`;
}

function buildPdfReference(receiptNumber) {
  const safeReceiptNumber = String(receiptNumber || "").trim();
  return safeReceiptNumber ? `receipts/${safeReceiptNumber}.pdf` : null;
}

function normalizeReceiptRow({ receipt = null, payment = null, maintenance = null, house = null, residentName = null }) {
  const receiptNumber =
    receipt?.receipt_number ||
    receipt?.receiptNumber ||
    payment?.receipt_number ||
    payment?.receiptNumber ||
    buildReceiptNumber(maintenance?.id || maintenance?.maintenance_id || payment?.maintenance_id || payment?.maintenance_record_id);

  const basePaymentId = receipt?.payment_id || payment?.id || payment?.payment_id || null;
  const baseMaintenanceId = receipt?.maintenance_id || payment?.maintenance_id || payment?.maintenance_record_id || maintenance?.id || null;
  const receiptAmount = Number(receipt?.amount ?? payment?.amount ?? maintenance?.paid_amount ?? maintenance?.amount_paid ?? 0);
  const generatedAt = receipt?.generated_at || receipt?.created_at || payment?.created_at || new Date().toISOString();
  const paidAt = receipt?.paid_at || payment?.payment_date || payment?.created_at || generatedAt;
  const pdfReference = receipt?.pdf_reference || receipt?.pdfReference || buildPdfReference(receiptNumber);
  const paymentStatus = receipt?.payment_status || payment?.status || null;
  const paymentMethod = receipt?.payment_method || maintenance?.payment_method || null;

  const camel = toCamelCase({
    ...(receipt || {}),
    id: receipt?.id || null,
    payment_id: basePaymentId,
    resident_id: receipt?.resident_id || receipt?.user_id || payment?.user_id || null,
    maintenance_id: baseMaintenanceId,
    amount: receiptAmount,
    receipt_number: receiptNumber,
    generated_at: generatedAt,
    paid_at: paidAt,
    payment_status: paymentStatus,
    pdf_reference: pdfReference,
    razorpay_transaction_id: receipt?.razorpay_transaction_id || payment?.razorpay_payment_id || null,
    razorpay_payment_id: payment?.razorpay_payment_id || receipt?.razorpay_transaction_id || null,
    razorpay_order_id: payment?.razorpay_order_id || null,
    payment_method: paymentMethod,
    house_id: maintenance?.house_id || house?.id || null,
    house_number: maintenance?.house_number || house?.house_number || null,
    block_name: house?.block || null,
    resident_name: residentName || null,
    from_month: maintenance?.from_month || null,
    to_month: maintenance?.to_month || null,
    due_date: maintenance?.due_date || null,
  });

  return {
    ...camel,
    payment_id: camel.paymentId || basePaymentId,
    resident_id: camel.residentId || receipt?.resident_id || receipt?.user_id || payment?.user_id || null,
    maintenance_id: camel.maintenanceId || baseMaintenanceId,
    amount: camel.amount || receiptAmount,
    receipt_number: camel.receiptNumber || receiptNumber,
    generated_at: camel.generatedAt || generatedAt,
    paid_at: camel.paidAt || paidAt,
    payment_status: camel.paymentStatus || paymentStatus,
    pdf_reference: camel.pdfReference || pdfReference,
    razorpay_transaction_id: camel.razorpayTransactionId || receipt?.razorpay_transaction_id || payment?.razorpay_payment_id || null,
    razorpay_payment_id: camel.razorpayPaymentId || payment?.razorpay_payment_id || receipt?.razorpay_transaction_id || null,
    razorpay_order_id: camel.razorpayOrderId || payment?.razorpay_order_id || null,
    payment_method: camel.paymentMethod || paymentMethod,
    house_id: camel.houseId || maintenance?.house_id || house?.id || null,
    house_number: camel.houseNumber || maintenance?.house_number || house?.house_number || null,
    block_name: camel.blockName || house?.block || null,
    resident_name: camel.residentName || residentName || null,
    from_month: camel.fromMonth || maintenance?.from_month || null,
    to_month: camel.toMonth || maintenance?.to_month || null,
    due_date: camel.dueDate || maintenance?.due_date || null,
  };
}

async function insertReceiptWithFallback(payload) {
  let mutablePayload = { ...payload };

  while (true) {
    const { data, error } = await supabase
      .from("receipts")
      .insert(mutablePayload)
      .select("*")
      .single();

    if (!error) {
      return data;
    }

    if (error.code !== "PGRST204" || typeof error.message !== "string") {
      throw error;
    }

    const missingColumnMatch = error.message.match(/'([^']+)'/);
    const missingColumn = missingColumnMatch ? missingColumnMatch[1] : "";
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn)) {
      throw error;
    }

    delete mutablePayload[missingColumn];
  }
}

function isMissingRelationError(error, relationName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes(String(relationName || "").toLowerCase())
  );
}

async function createReceiptForPayment({
  paymentId,
  userId,
  maintenanceId,
  amount,
  receiptNumber,
  paymentMethod = null,
  razorpayTransactionId = null,
  paymentStatus = "captured",
  generatedAt = null,
  paidAt = null,
  pdfReference = null,
}) {
  // Idempotency guard: multiple verify callbacks should not create duplicate receipts.
  if (paymentId) {
    const existing = await supabase
      .from("receipts")
      .select("*")
      .eq("payment_id", paymentId)
      .maybeSingle();

    if (!existing.error && existing.data) {
      return existing.data;
    }
  }

  const safeReceiptNumber = String(receiptNumber || "").trim() || buildReceiptNumber(maintenanceId);
  const payload = {
    payment_id: paymentId,
    user_id: userId,
    resident_id: userId,
    maintenance_id: maintenanceId,
    amount,
    receipt_number: safeReceiptNumber,
    generated_at: generatedAt || new Date().toISOString(),
    paid_at: paidAt || generatedAt || new Date().toISOString(),
    payment_status: paymentStatus,
    pdf_reference: pdfReference || buildPdfReference(safeReceiptNumber),
    razorpay_transaction_id: razorpayTransactionId,
    payment_method: paymentMethod,
  };

  let data = null;
  try {
    data = await insertReceiptWithFallback(payload);
  } catch (error) {
    // Unique violation can happen in race conditions when two callbacks insert same payment receipt.
    if (error.code === "23505" && paymentId) {
      const existing = await supabase
        .from("receipts")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();

      if (!existing.error && existing.data) {
        return normalizeReceiptRow({ receipt: existing.data });
      }
    }

    if (isMissingRelationError(error, "receipts")) {
      // Soft fallback for environments where receipts table migration is pending.
      return normalizeReceiptRow({
        receipt: {
          id: null,
          payment_id: paymentId,
          user_id: userId,
          resident_id: userId,
          maintenance_id: maintenanceId,
          amount,
          receipt_number: safeReceiptNumber,
          generated_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
          payment_status: paymentStatus,
          pdf_reference: buildPdfReference(safeReceiptNumber),
          razorpay_transaction_id: razorpayTransactionId,
          payment_method: paymentMethod,
          fallback_mode: true,
        },
      });
    }
    throw createHttpError(500, "Failed to generate receipt", "RECEIPT_CREATE_FAILED");
  }

  return normalizeReceiptRow({ receipt: data });
}

async function getUserReceiptList(userId, options = {}) {
  const residentName = String(options?.residentName || "").trim() || null;
  const { data: receipts, error: receiptError } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (receiptError) {
    if (isMissingRelationError(receiptError, "receipts")) {
      // Fallback: synthesize receipt history from captured payments.
      const paymentsRes = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "captured")
        .order("created_at", { ascending: false });

      if (paymentsRes.error) {
        throw createHttpError(500, "Failed to fetch receipts", "RECEIPT_FETCH_FAILED");
      }

      const paymentRows = paymentsRes.data || [];
      if (!paymentRows.length) return [];

      const maintenanceIds = [
        ...new Set(
          paymentRows
            .map((row) => row.maintenance_id || row.maintenance_record_id)
            .filter(Boolean)
        ),
      ];

      const maintenanceRes = maintenanceIds.length
        ? await supabase
            .from("maintenance_records")
            .select("*")
            .in("id", maintenanceIds)
        : { data: [], error: null };

      const houseIds = [...new Set((maintenanceRes.data || []).map((item) => item.house_id).filter(Boolean))];
      const housesRes = houseIds.length
        ? await supabase
            .from("houses")
            .select("id, block, house_number")
            .in("id", houseIds)
        : { data: [], error: null };

      if (maintenanceRes.error) {
        // Keep receipts endpoint available even when maintenance enrichment columns drift.
        console.warn("Receipt maintenance enrichment warning:", maintenanceRes.error.message);
      }

      if (housesRes.error) {
        // House metadata is optional for rendering; continue with payment-only receipt details.
        console.warn("Receipt house enrichment warning:", housesRes.error.message);
      }

      const maintenanceMap = new Map(((maintenanceRes.error ? [] : maintenanceRes.data) || []).map((item) => [item.id, item]));
      const houseMap = new Map(((housesRes.error ? [] : housesRes.data) || []).map((item) => [item.id, item]));

      return paymentRows.map((payment) => {
        const maintenanceId = payment.maintenance_id || payment.maintenance_record_id;
        const maintenance = maintenanceMap.get(maintenanceId) || {};
        const house = maintenance.house_id ? houseMap.get(maintenance.house_id) || null : null;
        return normalizeReceiptRow({
          receipt: {
            id: `fallback-${payment.id}`,
            payment_id: payment.id,
            user_id: payment.user_id,
            resident_id: payment.user_id,
            maintenance_id: maintenanceId,
            amount: payment.amount,
            receipt_number: payment.receipt_number || buildReceiptNumber(maintenanceId),
            generated_at: payment.created_at,
            paid_at: payment.created_at,
            payment_status: payment.status || null,
            pdf_reference: buildPdfReference(payment.receipt_number || buildReceiptNumber(maintenanceId)),
            razorpay_transaction_id: payment.razorpay_payment_id || null,
            razorpay_payment_id: payment.razorpay_payment_id || null,
            razorpay_order_id: payment.razorpay_order_id || null,
          },
          payment,
          maintenance,
          house,
          residentName,
        });
      });
    }
    throw createHttpError(500, "Failed to fetch receipts", "RECEIPT_FETCH_FAILED");
  }

  if (!receipts || !receipts.length) {
    return [];
  }

  const maintenanceIds = [...new Set(receipts.map((r) => r.maintenance_id).filter(Boolean))];
  const paymentIds = [...new Set(receipts.map((r) => r.payment_id).filter(Boolean))];

  const [maintenanceRes, paymentRes] = await Promise.all([
    maintenanceIds.length
      ? supabase.from("maintenance_records").select("*").in("id", maintenanceIds)
      : Promise.resolve({ data: [], error: null }),
    paymentIds.length
      ? supabase.from("payments").select("id, razorpay_payment_id, razorpay_order_id, status, created_at, payment_method, amount").in("id", paymentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const houseIds = [...new Set((maintenanceRes.data || []).map((item) => item.house_id).filter(Boolean))];
  const housesRes = houseIds.length
    ? await supabase.from("houses").select("id, block, house_number").in("id", houseIds)
    : { data: [], error: null };

  if (paymentRes.error) {
    throw createHttpError(500, "Failed to fetch payment details for receipts", "RECEIPT_FETCH_FAILED");
  }

  if (maintenanceRes.error) {
    // Keep endpoint functional if enrichment lookup fails on schema mismatches.
    console.warn("Receipt maintenance enrichment warning:", maintenanceRes.error.message);
  }

  if (housesRes.error) {
    // House metadata is optional and should not break receipt listing.
    console.warn("Receipt house enrichment warning:", housesRes.error.message);
  }

  const maintenanceMap = new Map(((maintenanceRes.error ? [] : maintenanceRes.data) || []).map((item) => [item.id, item]));
  const paymentMap = new Map((paymentRes.data || []).map((item) => [item.id, item]));
  const houseMap = new Map(((housesRes.error ? [] : housesRes.data) || []).map((item) => [item.id, item]));

  return receipts.map((receipt) => {
    const maintenance = maintenanceMap.get(receipt.maintenance_id) || {};
    const payment = paymentMap.get(receipt.payment_id) || {};
    const house = maintenance.house_id ? houseMap.get(maintenance.house_id) || null : null;

    return normalizeReceiptRow({
      receipt,
      payment,
      maintenance,
      house,
      residentName,
    });
  });
}

module.exports = {
  createReceiptForPayment,
  getUserReceiptList,
  buildReceiptNumber,
  buildPdfReference,
  normalizeReceiptRow,
};
