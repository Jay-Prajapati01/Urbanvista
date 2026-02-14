const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");

const router = express.Router();

// GET /api/reports/summary — Aggregated summary for reports page
router.get("/summary", async (req, res) => {
  try {
    const [housesRes, membersRes, vehiclesRes, maintenanceRes, expendituresRes] =
      await Promise.all([
        supabase.from("houses").select("*"),
        supabase.from("members").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("expenditures").select("*"),
      ]);

    res.json({
      houses: toCamelCase(housesRes.data || []),
      members: toCamelCase(membersRes.data || []),
      vehicles: toCamelCase(vehiclesRes.data || []),
      maintenanceRecords: toCamelCase(maintenanceRes.data || []),
      expenditures: toCamelCase(expendituresRes.data || []),
    });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ message: "Failed to fetch report data" });
  }
});

// GET /api/reports/housewise-maintenance — Maintenance grouped by house
router.get("/housewise-maintenance", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("house_number", { ascending: true });

    if (error) throw error;

    // Group by house_number
    const grouped = {};
    (data || []).forEach((r) => {
      if (!grouped[r.house_number]) grouped[r.house_number] = [];
      grouped[r.house_number].push(toCamelCase(r));
    });

    res.json(grouped);
  } catch (err) {
    console.error("Housewise maintenance error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

// GET /api/reports/late-payments — Overdue and pending records
router.get("/late-payments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .in("status", ["Overdue", "Pending"])
      .order("house_number", { ascending: true });

    if (error) throw error;

    res.json(toCamelCase(data || []));
  } catch (err) {
    console.error("Late payments error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

// GET /api/reports/vacant-properties — Vacant houses
router.get("/vacant-properties", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("status", "vacant")
      .order("house_number", { ascending: true });

    if (error) throw error;

    res.json(toCamelCase(data || []));
  } catch (err) {
    console.error("Vacant properties error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

module.exports = router;
