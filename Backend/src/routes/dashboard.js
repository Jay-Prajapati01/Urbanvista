const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");

const router = express.Router();

// GET /api/dashboard — Fetch dashboard metrics
router.get("/", async (req, res) => {
  try {
    // Try the dashboard_metrics view first
    const { data: viewData, error: viewError } = await supabase
      .from("dashboard_metrics")
      .select("*")
      .single();

    if (!viewError && viewData) {
      return res.json(toCamelCase(viewData));
    }

    // Fallback: compute metrics from individual tables
    const [housesRes, membersRes, vehiclesRes, maintenanceRes, expendituresRes] =
      await Promise.all([
        supabase.from("houses").select("*"),
        supabase.from("members").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("expenditures").select("*"),
      ]);

    const houses = housesRes.data || [];
    const members = membersRes.data || [];
    const vehicles = vehiclesRes.data || [];
    const maintenance = maintenanceRes.data || [];
    const expenditures = expendituresRes.data || [];

    const totalHouses = houses.length;
    const occupiedHouses = houses.filter((h) => h.status === "occupied").length;
    const vacantHouses = houses.filter((h) => h.status === "vacant").length;
    const maintenanceHouses = houses.filter((h) => h.status === "maintenance").length;
    const totalMembers = members.filter((m) => m.is_active).length;

    const totalBilled = maintenance.reduce((acc, r) => acc + Number(r.total_amount || 0), 0);
    const totalCollected = maintenance.reduce((acc, r) => acc + Number(r.amount_paid || 0), 0);
    const pendingAmount = totalBilled - totalCollected;
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    const totalExpenses = expenditures.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const netBalance = totalCollected - totalExpenses;

    const twoWheelers = vehicles.filter((v) => v.type === "Two Wheeler").length;
    const fourWheelers = vehicles.filter((v) => v.type === "Four Wheeler").length;

    res.json({
      totalHouses,
      occupiedHouses,
      vacantHouses,
      maintenanceHouses,
      totalMembers,
      totalBilled,
      totalCollected,
      pendingAmount,
      collectionRate,
      totalExpenses,
      netBalance,
      totalVehicles: vehicles.length,
      twoWheelers,
      fourWheelers,
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard metrics" });
  }
});

module.exports = router;
