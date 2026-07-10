const express = require("express");
const { verifyWebhookSignature, processWebhookEvent } = require("../services/webhookService");

const router = express.Router();

// POST /api/webhooks/razorpay
// Razorpay sends events here. Raw body is parsed by express.raw() in server.js.
router.post("/", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.body; // Buffer because of express.raw()

    if (!Buffer.isBuffer(rawBody)) {
      console.error("webhook: Request body is not a raw Buffer");
      return res.status(400).json({ message: "Invalid request body" });
    }

    const isValid = verifyWebhookSignature({
      body: rawBody.toString(),
      signature,
    });

    if (!isValid) {
      console.error("webhook: Invalid signature — rejecting request");
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    let event;
    try {
      event = JSON.parse(rawBody.toString());
    } catch (parseError) {
      console.error("webhook: Failed to parse event payload:", parseError.message);
      return res.status(400).json({ message: "Invalid JSON payload" });
    }

    console.log(`webhook: Received event: ${event.event} (id: ${event.id})`);

    // Process asynchronously — respond immediately to Razorpay
    processWebhookEvent(event).catch((err) => {
      console.error(`webhook: Error processing event ${event.event}:`, err.message);
    });

    // Always return 200 to Razorpay so it doesn't retry
    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("webhook: Unexpected error:", err.message);
    // Still return 200 to prevent Razorpay retries on processing errors
    return res.status(200).json({ status: "ok" });
  }
});

module.exports = router;
