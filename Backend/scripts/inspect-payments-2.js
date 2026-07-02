const supabase = require('../src/config/supabase');
(async () => {
  const maintenanceId = process.argv[2];
  if (!maintenanceId) {
    console.error('Usage: node inspect-payments-2.js <maintenance_id>');
    process.exit(2);
  }
  const { data, error } = await supabase.from('payments').select('*');
  if (error) {
    console.error('Error querying payments:', error);
    process.exit(1);
  }
  const filtered = (data || []).filter(p => (p.maintenance_record_id === maintenanceId) || (p.maintenance_id === maintenanceId) || (p.maintenanceRecordId === maintenanceId) || (p.maintenanceId === maintenanceId));
  console.log('Payments for maintenance', maintenanceId, ':', filtered);
})();
