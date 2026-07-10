const crypto = require("crypto");
const supabase = require("../config/supabase");
const { computeBillingSnapshot, applyPaymentToBill, toDatabaseStatus } = require("./maintenanceBillingService");
const { createReceiptForPayment, buildReceiptNumber, normalizeReceiptRow } = require("./receiptService");

const WEBHOOK_SECRET = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

function verifyWebhookSignature({ body, signature }) {
  if (!WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set — skipping signature verification");
    return false;
  }

  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(String(signature).trim())
  );
}

function normalizePaymentMethod(method) {
  const normalized = String(method || "").trim().toLowerCase();
  if (["upi", "wallet"].includes(normalized)) return "UPI";
  if (["card", "credit", "debit", "netbanking", "bank_transfer", "bank transfer"].includes(normalized)) {
    return "Bank Transfer";
  }
  return "Online";
}

async function handlePaymentCaptured(event) {
  const payment = event.payload?.payment?.entity;
  if (!payment) {
    console.warn("webhook: payment.captured — no payment entity in payload");
    return;
  }

  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;
  const amountInRupees = Number(payment.amount || 0) / 100;
  const paymentMethod = normalizePaymentMethod(payment.method);

  // Find existing payment record by razorpay_order_id
  const { data: existingPayment, error: findError } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (findError) {
    console.error("webhook: DB lookup error:", findError.message);
    return;
  }

  if (!existingPayment) {
    console.warn(`webhook: No payment record found for order ${razorpayOrderId}`);
    return;
  }

  // Idempotent — already captured, skip
  if (existingPayment.status === "captured") {
    console.log(`webhook: Payment ${razorpayPaymentId} already captured — skipping`);
    return;
  }

  // Update payment record
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: payment.id,
      status: "captured",
      amount: amountInRupees,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingPayment.id);

  if (updateError) {
    console.error("webhook: Payment update error:", updateError.message);
    return;
  }

  // Update maintenance record if linked
  if (existingPayment.maintenance_record_id) {
    const { data: maintenanceRecord } = await supabase
      .from("maintenance_records")
      .select("*")
      .eq("id", existingPayment.maintenance_record_id)
      .maybeSingle();

    if (maintenanceRecord) {
      const snapshot = computeBillingSnapshot(maintenanceRecord, new Date());
      if (snapshot.totalPayable > 0 && String(snapshot.computedStatus || "").toLowerCase() !== "paid") {
        await applyCapturedPaymentToMaintenance(
          existingPayment.maintenance_record_id,
          amountInRupees,
          paymentMethod
        );
      }
    }
  }

  console.log(`webhook: Payment ${razorpayPaymentId} captured successfully (order: ${razorpayOrderId})`);
}

async function handlePaymentAuthorized(event) {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (!existingPayment || existingPayment.status === "captured") return;

  await supabase
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      status: "authorized",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingPayment.id);

  console.log(`webhook: Payment ${razorpayPaymentId} authorized (order: ${razorpayOrderId})`);
}

async function handlePaymentFailed(event) {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;
  const errorDescription = payment.error_description || "Payment failed";

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (!existingPayment) return;
  if (existingPayment.status === "captured") return;

  await supabase
    .from("payments")
    .update({
      razorpay_payment_id: razorpayPaymentId,
      status: "failed",
      notes: errorDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingPayment.id);

  console.log(`webhook: Payment ${razorpayPaymentId} failed (order: ${razorpayOrderId}): ${errorDescription}`);
}

async function handlePaymentExpired(event) {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  const razorpayOrderId = payment.order_id;

  const { data: existingPayment } = await supabase
    .from("payments")
    .select("*")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (!existingPayment || existingPayment.status === "captured") return;

  await supabase
    .from("payments")
    .update({
      status: "failed",
      notes: "Payment link expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingPayment.id);

  console.log(`webhook: Payment expired for order ${razorpayOrderId}`);
}

async function applyCapturedPaymentToMaintenance(maintenanceRecordId, paymentAmount, paymentMethod) {
  const { data: record } = await supabase
    .from("maintenance_records")
    .select("*")
    .eq("id", maintenanceRecordId)
    .maybeSingle();

  if (!record) return;

  const nextState = applyPaymentToBill(record, paymentAmount, new Date());

  const { error } = await supabase
    .from("maintenance_records")
    .update({
      amount_paid: nextState.nextPaidAmount,
      paid_amount: nextState.nextPaidAmount,
      due_amount: nextState.nextDueAmount,
      status: toDatabaseStatus(nextState.nextStatus),
      payment_method: paymentMethod,
      payment_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", maintenanceRecordId);

  if (error) {
    console.error("webhook: Maintenance update error:", error.message);
  }
}

async function processWebhookEvent(event) {
  const eventType = event.event;

  switch (eventType) {
    case "payment.captured":
      await handlePaymentCaptured(event);
      break;
    case "payment.authorized":
      await handlePaymentAuthorized(event);
      break;
    case "payment.failed":
      await handlePaymentFailed(event);
      break;
    case "payment.expired":
      await handlePaymentExpired(event);
      break;
    default:
      console.log(`webhook: Unhandled event type: ${eventType}`);
  }
}

module.exports = {
  verifyWebhookSignature,
  processWebhookEvent,
};
