const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");
const { isScopedSecretary } = require("../utils/accessScope");

const router = express.Router();

function isPaidStatus(status) {
  return String(status || "").trim().toLowerCase() === "paid";
}

// GET /api/dashboard — Fetch dashboard metrics
router.get("/", async (req, res) => {
  try {
    const scopedHouseIds = isScopedSecretary(req) ? req.accessScope?.houseIds || [] : [];

    if (isScopedSecretary(req) && !scopedHouseIds.length) {
      return res.json({
        totalHouses: 0,
        occupiedHouses: 0,
        vacantHouses: 0,
        maintenanceHouses: 0,
        totalMembers: 0,
        totalBilled: 0,
        totalCollected: 0,
        pendingAmount: 0,
        collectionRate: 0,
        totalExpenses: 0,
        netBalance: 0,
        totalVehicles: 0,
        twoWheelers: 0,
        fourWheelers: 0,
        totalPaymentAttempts: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        successfulPaymentAmount: 0,
      });
    }

    // Fallback: compute metrics from individual tables
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
      ? maintenance.filter((m) => {
          const hid = m.house_id || m.property_id || m.houseId || m.propertyId;
          return hid && scopedHouseIds.includes(hid);
        })
      : maintenance;
    const filteredExpenditures = isScopedSecretary(req)
      ? expenditures.filter((e) => {
          const hid = e.house_id || e.property_id || e.houseId || e.propertyId;
          return hid && scopedHouseIds.includes(hid);
        })
      : expenditures;
    // Support both snake_case and camelCase ids coming from different services/migrations
    const filteredMaintenanceIds = new Set(
      filteredMaintenance.map((record) => record.id || record.maintenance_id || record.maintenanceId)
    );

    const filteredPayments = isScopedSecretary(req)
      ? payments.filter((payment) => {
          const mid = payment.maintenance_record_id || payment.maintenanceRecordId || payment.maintenance_id || payment.maintenanceId;
          return mid && filteredMaintenanceIds.has(mid);
        })
      : payments;

    const totalHouses = filteredHouses.length;
    const occupiedHouses = filteredHouses.filter((h) => h.status === "occupied").length;
    const vacantHouses = filteredHouses.filter((h) => h.status === "vacant").length;
    const maintenanceHouses = filteredHouses.filter((h) => h.status === "maintenance").length;
    const totalMembers = filteredMembers.filter((m) => m.is_active).length;

    // Accept multiple field names for amounts to tolerate schema/casing differences
    const totalBilled = filteredMaintenance.reduce((acc, r) => {
      const amount = r.total_amount ?? r.totalAmount ?? r.amount ?? 0;
      return acc + Number(amount || 0);
    }, 0);

    const totalCollected = filteredMaintenance.reduce((acc, r) => {
      const paid = r.paid_amount ?? r.amount_paid ?? r.paidAmount ?? r.amountPaid ?? 0;
      return acc + Number(paid || 0);
    }, 0);
    const pendingAmount = totalBilled - totalCollected;
    const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

    const totalExpenses = filteredExpenditures.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const netBalance = totalCollected - totalExpenses;

    const twoWheelers = filteredVehicles.filter((v) => v.type === "Two Wheeler").length;
    const fourWheelers = filteredVehicles.filter((v) => v.type === "Four Wheeler").length;
    // Broaden accepted statuses (some services use 'paid', others 'captured'/'success')
    const successfulPaymentStatuses = new Set(["captured", "success", "paid"]);
    const failedPaymentStatuses = new Set(["failed", "cancelled"]);
    const totalPaymentAttempts = filteredPayments.length;
    const successfulPayments = filteredPayments.filter((payment) => successfulPaymentStatuses.has(String(payment.status || "").toLowerCase())).length;
    const failedPayments = filteredPayments.filter((payment) => failedPaymentStatuses.has(String(payment.status || "").toLowerCase())).length;
    const pendingPayments = Math.max(totalPaymentAttempts - successfulPayments - failedPayments, 0);
    const successfulPaymentAmount = filteredPayments
      .filter((payment) => successfulPaymentStatuses.has(String(payment.status || "").toLowerCase()))
      .reduce((acc, payment) => {
        const amt = payment.amount ?? payment.amount_paid ?? payment.amountPaid ?? payment.paid_amount ?? 0;
        return acc + Number(amt || 0);
      }, 0);

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
      totalVehicles: filteredVehicles.length,
      twoWheelers,
      fourWheelers,
      totalPaymentAttempts,
      successfulPayments,
      failedPayments,
      pendingPayments,
      successfulPaymentAmount,
    });
  } catch (err) {
    console.error("Dashboard metrics error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard metrics" });
  }
});

module.exports = router;
