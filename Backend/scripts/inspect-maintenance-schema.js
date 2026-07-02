const supabase = require("../src/config/supabase");

async function main() {
  try {
    const { data, error } = await supabase.from("maintenance_records").select("*").limit(1);
    if (error) {
      console.error("Error fetching maintenance records:", error);
      process.exit(2);
    }
    if (!data || data.length === 0) {
      console.log("No maintenance records found — unable to infer schema from data rows.");
      process.exit(0);
    }
    console.log(Object.keys(data[0]));
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
