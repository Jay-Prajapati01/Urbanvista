const express = require("express");
const userAuthMiddleware = require("../middleware/userAuth");
const { createOrder, verifyPayment, markPaymentAttempt } = require("../services/paymentService");

const router = express.Router();

router.use(userAuthMiddleware);

function sendError(res, err, fallbackMessage) {
  const status = Number(err?.status || 500);
  return res.status(status).json({
    message: err?.message || fallbackMessage,
    code: err?.code || "PAYMENT_ERROR",
  });
}

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
  try {
    const maintenanceRecordId = req.body?.maintenanceRecordId || req.body?.maintenance_id;
    const data = await createOrder({
      maintenanceRecordId,
      payload: req.body,
      user: req.user,
      req,
    });

    return res.json(data);
  } catch (err) {
    console.error("Create payment order error:", err);
    return sendError(res, err, "Failed to create payment order");
  }
});

// POST /api/payments/verify
router.post("/verify", async (req, res) => {
  try {
    const data = await verifyPayment({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.json(data);
  } catch (err) {
    console.error("Verify payment error:", err);
    return sendError(res, err, "Payment verification failed");
  }
});

// POST /api/payments/attempt
router.post("/attempt", async (req, res) => {
  try {
    const data = await markPaymentAttempt({
      payload: req.body,
      user: req.user,
      req,
    });

    return res.json(data);
  } catch (err) {
    console.error("Mark payment attempt error:", err);
    return sendError(res, err, "Failed to mark payment attempt");
  }
});

module.exports = router;
