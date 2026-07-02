const Razorpay = require("razorpay");

let razorpayClient = null;

function getRazorpayConfig() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  if (!String(keyId).startsWith("rzp_test_")) {
    throw new Error("Only Razorpay TEST MODE keys are allowed in this environment.");
  }

  return {
    keyId,
    keySecret,
  };
}

function getRazorpayClient() {
  if (razorpayClient) {
    return razorpayClient;
  }

  const { keyId, keySecret } = getRazorpayConfig();
  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayClient;
}

module.exports = {
  getRazorpayClient,
  getRazorpayConfig,
};
