const express = require("express");
const supabase = require("../config/supabase");
const { toCamelCase, toSnakeCase } = require("../utils/transform");
const { canAccessHouse, filterRowsByHouseScope, isScopedSecretary } = require("../utils/accessScope");

const router = express.Router();

// GET /api/vehicles — Fetch all vehicles with owner names
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("house_number", { ascending: true })
      .order("vehicle_number", { ascending: true });

    if (error) throw error;

    // Enrich with owner_name from houses table
    const houseIds = [...new Set((data || []).map((v) => v.house_id).filter(Boolean))];
    let houseMap = {};
    if (houseIds.length > 0) {
      const { data: houses } = await supabase
        .from("houses")
        .select("id, owner_name")
        .in("id", houseIds);
      (houses || []).forEach((h) => {
        houseMap[h.id] = h.owner_name || "";
      });
    }

    const enriched = (data || []).map((v) => ({
      ...v,
      owner_name: v.owner_name || houseMap[v.house_id] || "",
    }));

    const scoped = filterRowsByHouseScope(req, enriched, "house_id");

    res.json(toCamelCase(scoped));
  } catch (err) {
    console.error("Fetch vehicles error:", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

// GET /api/vehicles/:id — Fetch single vehicle
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Vehicle not found" });

    if (isScopedSecretary(req) && !canAccessHouse(req, data.house_id)) {
      return res.status(403).json({ message: "Access denied for this vehicle" });
    }

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Fetch vehicle error:", err);
    res.status(500).json({ message: "Failed to fetch vehicle" });
  }
});

// POST /api/vehicles — Create a new vehicle
router.post("/", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;
    delete dbData.owner_name;
    delete dbData.owner_id;

    if (isScopedSecretary(req) && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "You can only add vehicles for assigned houses" });
    }

    const { data, error } = await supabase
      .from("vehicles")
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(toCamelCase(data));
  } catch (err) {
    console.error("Create vehicle error:", err);
    res.status(500).json({ message: err.message || "Failed to create vehicle" });
  }
});

// PUT /api/vehicles/:id — Update a vehicle
router.put("/:id", async (req, res) => {
  try {
    const dbData = toSnakeCase(req.body);
    delete dbData.id;
    delete dbData.created_at;
    delete dbData.updated_at;

    const { data: existingVehicle, error: existingError } = await supabase
      .from("vehicles")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingVehicle.house_id)) {
      return res.status(403).json({ message: "Access denied for this vehicle" });
    }

    if (isScopedSecretary(req) && dbData.house_id && !canAccessHouse(req, dbData.house_id)) {
      return res.status(403).json({ message: "Target house is outside your scope" });
    }

    const { data, error } = await supabase
      .from("vehicles")
      .update(dbData)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Vehicle not found" });

    res.json(toCamelCase(data));
  } catch (err) {
    console.error("Update vehicle error:", err);
    res.status(500).json({ message: err.message || "Failed to update vehicle" });
  }
});

// DELETE /api/vehicles/:id — Delete a vehicle
router.delete("/:id", async (req, res) => {
  try {
    const { data: existingVehicle, error: existingError } = await supabase
      .from("vehicles")
      .select("id, house_id")
      .eq("id", req.params.id)
      .single();

    if (existingError || !existingVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (isScopedSecretary(req) && !canAccessHouse(req, existingVehicle.house_id)) {
      return res.status(403).json({ message: "Access denied for this vehicle" });
    }

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    res.status(500).json({ message: err.message || "Failed to delete vehicle" });
  }
});

module.exports = router;
