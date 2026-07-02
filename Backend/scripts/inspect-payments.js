const supabase = require('../src/config/supabase');
(async () => {
  const maintenanceId = process.argv[2];
  if (!maintenanceId) {
    console.error('Usage: node inspect-payments.js <maintenance_id>');
    process.exit(2);
  }
  const { data, error } = await supabase.from('payments').select('*').or(`maintenance_record_id.eq.${maintenanceId},maintenance_id.eq.${maintenanceId}`);
  if (error) {
    console.error('Error querying payments:', error);
    process.exit(1);
  }
  console.log('Payments for maintenance', maintenanceId, ':', data);
})();
