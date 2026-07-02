const express = require("express");
const supabase = require("../config/supabase");
const userAuthMiddleware = require("../middleware/userAuth");
const { toCamelCase } = require("../utils/transform");
const { enrichMaintenanceRecords, ensureOverdueStatus } = require("../services/maintenanceBillingService");

const router = express.Router();

// GET /api/maintenance/user
router.get("/user", userAuthMiddleware, async (req, res) => {
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

    return res.json(toCamelCase(enriched));
  } catch (err) {
    console.error("Fetch resident maintenance error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch maintenance records" });
  }
});

module.exports = router;
