const supabase = require("../src/config/supabase");

async function main() {
  const email = process.argv[2];
  const maintenanceId = process.argv[3];
  if (!email || !maintenanceId) {
    console.error("Usage: node link-user-house.js <user-email> <maintenance-id>");
    process.exit(1);
  }

  try {
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id, name, email, house_id")
      .eq("email", email)
      .maybeSingle();

    if (userErr) throw userErr;
    if (!user) {
      console.error("User not found for email:", email);
      process.exit(2);
    }

    // Create a new house
    const housePayload = {
      block: "E2E",
      house_number: `E2E-${Date.now() % 10000}`,
      floor: 1,
      status: "occupied",
      owner_name: user.name || "E2E Owner",
      notes: "E2E created",
    };

    const { data: newHouse, error: houseErr } = await supabase
      .from("houses")
      .insert(housePayload)
      .select()
      .single();

    if (houseErr) {
      console.error("Failed to create house:", houseErr);
      process.exit(3);
    }

    const houseId = newHouse.id;

    // Update user with new house_id
    const { error: updateUserErr } = await supabase
      .from("users")
      .update({ house_id: houseId })
      .eq("id", user.id);

    if (updateUserErr) {
      console.error("Failed to update user house_id:", updateUserErr);
      process.exit(4);
    }

    // Update maintenance record to reference this house
    const { error: updateMaintErr } = await supabase
      .from("maintenance_records")
      .update({ house_id: houseId, house_number: housePayload.house_number })
      .eq("id", maintenanceId);

    if (updateMaintErr) {
      console.error("Failed to update maintenance record:", updateMaintErr);
      process.exit(5);
    }

    console.log(`Linked user ${email} and maintenance ${maintenanceId} to house ${houseId}`);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(6);
  }
}

main();
