const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");
const { isScopedSecretary } = require("../utils/accessScope");

const router = express.Router();

function isLateOrPendingStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "overdue" || normalized === "pending" || normalized === "partial";
}

// GET /api/reports/summary — Aggregated summary for reports page
router.get("/summary", async (req, res) => {
  try {
    const scopedHouseIds = isScopedSecretary(req) ? req.accessScope?.houseIds || [] : [];

    const [housesRes, membersRes, vehiclesRes, maintenanceRes, expendituresRes, paymentsRes] =
      await Promise.all([
        supabase.from("houses").select("*"),
        supabase.from("members").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("expenditures").select("*"),
        supabase.from("payments").select("*"),
      ]);

    const houses = housesRes.data || [];
    const members = membersRes.data || [];
    const vehicles = vehiclesRes.data || [];
    const maintenance = maintenanceRes.data || [];
    const expenditures = expendituresRes.data || [];
    const payments = paymentsRes.data || [];

    const filteredHouses = isScopedSecretary(req)
      ? houses.filter((h) => scopedHouseIds.includes(h.id))
      : houses;
    const filteredMembers = isScopedSecretary(req)
      ? members.filter((m) => m.house_id && scopedHouseIds.includes(m.house_id))
      : members;
    const filteredVehicles = isScopedSecretary(req)
      ? vehicles.filter((v) => v.house_id && scopedHouseIds.includes(v.house_id))
      : vehicles;
    const filteredMaintenance = isScopedSecretary(req)
      ? maintenance.filter((m) => m.house_id && scopedHouseIds.includes(m.house_id))
      : maintenance;
    const filteredExpenditures = isScopedSecretary(req)
      ? expenditures.filter((e) => e.house_id && scopedHouseIds.includes(e.house_id))
      : expenditures;
    const filteredMaintenanceIds = new Set(filteredMaintenance.map((record) => record.id));
    const filteredPayments = isScopedSecretary(req)
      ? payments.filter((payment) => payment.maintenance_record_id && filteredMaintenanceIds.has(payment.maintenance_record_id))
      : payments;
    const successfulPaymentStatuses = new Set(["captured", "success"]);
    const failedPaymentStatuses = new Set(["failed", "cancelled"]);
    const paymentSummary = {
      totalPaymentAttempts: filteredPayments.length,
      successfulPayments: filteredPayments.filter((payment) => successfulPaymentStatuses.has(String(payment.status || "").toLowerCase())).length,
      failedPayments: filteredPayments.filter((payment) => failedPaymentStatuses.has(String(payment.status || "").toLowerCase())).length,
      pendingPayments: filteredPayments.filter((payment) => !successfulPaymentStatuses.has(String(payment.status || "").toLowerCase()) && !failedPaymentStatuses.has(String(payment.status || "").toLowerCase())).length,
      successfulPaymentAmount: filteredPayments
        .filter((payment) => successfulPaymentStatuses.has(String(payment.status || "").toLowerCase()))
        .reduce((acc, payment) => acc + Number(payment.amount || 0), 0),
    };

    res.json({
      houses: toCamelCase(filteredHouses),
      members: toCamelCase(filteredMembers),
      vehicles: toCamelCase(filteredVehicles),
      maintenanceRecords: toCamelCase(filteredMaintenance),
      expenditures: toCamelCase(filteredExpenditures),
      payments: toCamelCase(filteredPayments),
      paymentSummary,
    });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ message: "Failed to fetch report data" });
  }
});

// GET /api/reports/housewise-maintenance — Maintenance grouped by house
router.get("/housewise-maintenance", async (req, res) => {
  try {
    const scopedHouseIds = isScopedSecretary(req) ? req.accessScope?.houseIds || [] : [];

    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("house_number", { ascending: true });

    if (error) throw error;

    const scoped = isScopedSecretary(req)
      ? (data || []).filter((r) => r.house_id && scopedHouseIds.includes(r.house_id))
      : data || [];

    // Group by house_number
    const grouped = {};
    scoped.forEach((r) => {
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
    const scopedHouseIds = isScopedSecretary(req) ? req.accessScope?.houseIds || [] : [];

    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*")
      .order("house_number", { ascending: true });

    if (error) throw error;

    const scoped = isScopedSecretary(req)
      ? (data || []).filter((r) => r.house_id && scopedHouseIds.includes(r.house_id))
      : data || [];

    const filtered = scoped.filter((record) => isLateOrPendingStatus(record.status));

    res.json(toCamelCase(filtered));
  } catch (err) {
    console.error("Late payments error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

// GET /api/reports/vacant-properties — Vacant houses
router.get("/vacant-properties", async (req, res) => {
  try {
    const scopedHouseIds = isScopedSecretary(req) ? req.accessScope?.houseIds || [] : [];

    const { data, error } = await supabase
      .from("houses")
      .select("*")
      .eq("status", "vacant")
      .order("house_number", { ascending: true });

    if (error) throw error;

    const scoped = isScopedSecretary(req)
      ? (data || []).filter((h) => scopedHouseIds.includes(h.id))
      : data || [];

    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("Vacant properties error:", err);
    res.status(500).json({ message: "Failed to fetch report" });
  }
});

module.exports = router;
