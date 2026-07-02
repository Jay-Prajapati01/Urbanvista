const supabase = require('../src/config/supabase');
(async () => {
  const id = process.argv[2];
  if (!id) { console.error('Usage: node get-maintenance-raw.js <id>'); process.exit(2); }
  const { data, error } = await supabase.from('maintenance_records').select('*').eq('id', id).maybeSingle();
  if (error) { console.error('Error:', error); process.exit(1); }
  console.log('Maintenance raw:', data);
})();
