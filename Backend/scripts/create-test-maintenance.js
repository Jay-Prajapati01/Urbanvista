const supabase = require("../src/config/supabase");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node create-test-maintenance.js <user-email>");
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

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const insertPayload = {
      house_id: user.house_id || null,
      house_number: "E2E-1",
      from_month: "2026-05",
      to_month: "2026-05",
      base_amount: 1000.0,
      total_amount: 1000.0,
      amount_paid: 0,
      balance: 1000.0,
      // avoid optional columns that may not exist in the target Supabase schema cache
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("maintenance_records")
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert maintenance record:", insertErr);
      process.exit(3);
    }

    console.log("Inserted maintenance record:", inserted.id);
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(4);
  }
}

main();
