const express = require("express");
const { getUserReceiptList } = require("../services/receiptService");

const router = express.Router();

// GET /api/receipts/user
router.get("/user", async (req, res) => {
  try {
    const receipts = await getUserReceiptList(req.user.id, {
      residentName: req.user?.name || null,
    });
    return res.json(receipts);
  } catch (err) {
    console.error("Fetch user receipts error:", err);
    return res.status(Number(err.status || 500)).json({
      message: err.message || "Failed to fetch receipts",
      code: err.code || "RECEIPTS_ERROR",
    });
  }
});

module.exports = router;
