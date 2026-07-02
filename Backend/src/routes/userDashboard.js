const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase } = require("../utils/transform");

const router = express.Router();

function normalizeStatus(status) {
  return String(status || "").trim().toLowerCase();
}

async function getUserHouse(houseId) {
  const { data, error } = await supabase
    .from("houses")
    .select("id, house_number, owner_name")
    .eq("id", houseId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

// GET /api/user/dashboard — Returns all data scoped to the user's house
router.get("/", async (req, res) => {
  try {
    const { houseId } = req.user;

    if (!houseId) {
      return res.json({
        house: null,
        members: [],
        vehicles: [],
        maintenanceRecords: [],
        message: "Your account is not yet linked to a house. Please contact the society admin.",
      });
    }

    const [houseRes, membersRes, vehiclesRes, maintenanceRes] = await Promise.all([
      supabase.from("houses").select("*").eq("id", houseId).single(),
      supabase.from("members").select("*").eq("house_id", houseId).order("name"),
      supabase.from("vehicles").select("*").eq("house_id", houseId).order("vehicle_number"),
      supabase
        .from("maintenance_records")
        .select("*")
        .eq("house_id", houseId)
        .order("created_at", { ascending: false }),
    ]);

    if (houseRes.error) throw houseRes.error;

    // Calculate payment summary
    const records = maintenanceRes.data || [];
    const totalBilled = records.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const totalPaid = records.reduce((sum, r) => sum + Number(r.paid_amount ?? r.amount_paid ?? 0), 0);
    const pendingAmount = totalBilled - totalPaid;

    res.json({
      house: toCamelCase(houseRes.data),
      members: toCamelCase(membersRes.data || []),
      vehicles: toCamelCase(vehiclesRes.data || []),
      maintenanceRecords: toCamelCase(records),
      paymentSummary: {
        totalBilled,
        totalPaid,
        pendingAmount,
        totalRecords: records.length,
        paidRecords: records.filter((r) => normalizeStatus(r.status) === "paid").length,
        pendingRecords: records.filter((r) => normalizeStatus(r.status) !== "paid").length,
      },
    });
  } catch (err) {
    console.error("User dashboard error:", err);
    res.status(500).json({ message: err.message || "Failed to load dashboard" });
  }
});

// PATCH /api/user/dashboard/house — resident updates limited own house fields
router.patch("/house", async (req, res) => {
  try {
    const { houseId } = req.user;
    if (!houseId) {
      return res.status(400).json({ message: "Your account is not linked to a house" });
    }

    const ownerContact = req.body.ownerContact;
    const notes = req.body.notes;

    const payload = {};
    if (typeof ownerContact === "string") payload.owner_contact = ownerContact.trim();
    if (typeof notes === "string") payload.notes = notes.trim();

    if (!Object.keys(payload).length) {
      return res.status(400).json({ message: "No editable house fields provided" });
    }

    const { data, error } = await supabase
      .from("houses")
      .update(payload)
      .eq("id", houseId)
      .select("*")
      .single();

    if (error) throw error;
    return res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update house from resident error:", err);
    return res.status(500).json({ message: err.message || "Failed to update house" });
  }
});

// POST /api/user/dashboard/members — resident creates member in own house
router.post("/members", async (req, res) => {
  try {
    const { houseId } = req.user;
    if (!houseId) {
      return res.status(400).json({ message: "Your account is not linked to a house" });
    }

    const name = String(req.body.name || "").trim();
    const role = String(req.body.role || "Family").trim();
    const phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ message: "Member name is required" });
    }

    if (!["Owner", "Tenant", "Family"].includes(role)) {
      return res.status(400).json({ message: "role must be Owner, Tenant, or Family" });
    }

    const house = await getUserHouse(houseId);
    if (!house) {
      return res.status(404).json({ message: "Linked house not found" });
    }

    const { data, error } = await supabase
      .from("members")
      .insert({
        name,
        role,
        phone: phone || null,
        email: email || null,
        house_id: houseId,
        house_number: house.house_number,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) throw error;
    return res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create resident member error:", err);
    return res.status(500).json({ message: err.message || "Failed to add member" });
  }
});

// POST /api/user/dashboard/vehicles — resident creates vehicle in own house
router.post("/vehicles", async (req, res) => {
  try {
    const { houseId } = req.user;
    if (!houseId) {
      return res.status(400).json({ message: "Your account is not linked to a house" });
    }

    const vehicleNumber = String(req.body.vehicleNumber || "").trim().toUpperCase();
    const type = String(req.body.type || "Four Wheeler").trim();
    const color = String(req.body.color || "").trim();

    if (!vehicleNumber) {
      return res.status(400).json({ message: "vehicleNumber is required" });
    }

    if (!["Two Wheeler", "Four Wheeler"].includes(type)) {
      return res.status(400).json({ message: "type must be Two Wheeler or Four Wheeler" });
    }

    const house = await getUserHouse(houseId);
    if (!house) {
      return res.status(404).json({ message: "Linked house not found" });
    }

    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        vehicle_number: vehicleNumber,
        type,
        color: color || null,
        house_id: houseId,
        house_number: house.house_number,
      })
      .select("*")
      .single();

    if (error) throw error;
    return res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create resident vehicle error:", err);
    return res.status(500).json({ message: err.message || "Failed to add vehicle" });
  }
});

module.exports = router;
