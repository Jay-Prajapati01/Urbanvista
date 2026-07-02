const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");
const {
  enrichMaintenanceRecords,
  ensureOverdueStatus,
  normalizeStatus,
} = require("../services/maintenanceBillingService");
const { getUserReceiptList } = require("../services/receiptService");
const { createOrder, verifyPayment, markPaymentAttempt } = require("../services/paymentService");

const router = express.Router();

async function getUserHouse(houseId) {
  const { data, error } = await supabase
    .from("houses")
    .select("id, house_number, owner_name")
    .eq("id", houseId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

// GET /api/user/payments — All maintenance records for user's house
router.get("/", async (req, res) => {
  try {
    const { houseId } = req.user;

    if (!houseId) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .eq("house_id", houseId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const enriched = enrichMaintenanceRecords(data || []);
    await Promise.all(
      enriched
        .filter((record) => record.status_needs_update)
        .map((record) => ensureOverdueStatus(record.id, record.previous_status, record.status))
    );

    res.json(toCamelCase(enriched));
  } catch (err) {
    console.error("Get payments error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch payments" });
  }
});

// GET /api/user/payments/statement — Resident statement and payment summary
router.get("/statement", async (req, res) => {
  try {
    const { houseId, id: userId } = req.user;

    if (!houseId) {
      return res.json({ house: null, summary: null, records: [] });
    }

    const [house, maintenanceRes, paymentsRes] = await Promise.all([
      getUserHouse(houseId),
      supabase
        .from("maintenance_records")
        .select("*")
        .eq("house_id", houseId)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (maintenanceRes.error) throw maintenanceRes.error;

    const records = enrichMaintenanceRecords(maintenanceRes.data || []);
    const payments = paymentsRes.data || [];
    await Promise.all(
      records
        .filter((record) => record.status_needs_update)
        .map((record) => ensureOverdueStatus(record.id, record.previous_status, record.status))
    );

    const totalBilled = records.reduce((sum, record) => sum + Number(record.total_amount || 0), 0);
    const totalPaid = records.reduce((sum, record) => sum + Number(record.paid_amount || record.amount_paid || 0), 0);
    const pendingAmount = Math.max(totalBilled - totalPaid, 0);

    res.json({
      house: toCamelCase(house),
      records: toCamelCase(records),
      payments: toCamelCase(payments),
      summary: {
        totalBilled,
        totalPaid,
        pendingAmount,
        totalRecords: records.length,
        paidRecords: records.filter((record) => normalizeStatus(record.status) === "paid").length,
        pendingRecords: records.filter((record) => normalizeStatus(record.status) !== "paid").length,
      },
    });
  } catch (err) {
    console.error("Get resident statement error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch statement" });
  }
});

// GET /api/user/payments/receipts — Only paid records
router.get("/receipts", async (req, res) => {
  try {
    const receipts = await getUserReceiptList(req.user.id, {
      residentName: req.user?.name || null,
    });
    return res.json(receipts);
  } catch (err) {
    console.error("Get receipts error:", err);
    res.status(500).json({ message: err.message || "Failed to fetch receipts" });
  }
});

// POST /api/user/payments/create-order — Create Razorpay order
router.post("/create-order", async (req, res) => {
  try {
    const maintenanceRecordId = req.body?.maintenanceRecordId || req.body?.maintenance_id;
    const data = await createOrder({
      maintenanceRecordId,
      payload: req.body,
      user: req.user,
      req,
    });

    res.json(data);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(Number(err.status || 500)).json({ message: err.message || "Failed to create payment order" });
  }
});

// POST /api/user/payments/verify — Verify Razorpay payment signature
router.post("/verify", async (req, res) => {
  try {
    const data = await verifyPayment({
      payload: req.body,
      user: req.user,
      req,
    });

    res.json(data);
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(Number(err.status || 500)).json({ message: err.message || "Payment verification failed" });
  }
});

// POST /api/user/payments/attempt — Track failed/cancelled attempts
router.post("/attempt", async (req, res) => {
  try {
    const data = await markPaymentAttempt({
      payload: req.body,
      user: req.user,
      req,
    });

    res.json(data);
  } catch (err) {
    console.error("Mark payment attempt error:", err);
    res.status(Number(err.status || 500)).json({
      message: err.message || "Failed to mark payment attempt",
      code: err.code || "PAYMENT_ERROR",
    });
  }
});

module.exports = router;
