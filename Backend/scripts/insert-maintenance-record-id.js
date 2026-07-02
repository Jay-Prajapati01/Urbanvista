const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'services', 'paymentService.js');
let content = fs.readFileSync(file, 'utf8');

if (content.includes('maintenance_id: payload.maintenanceRecordId,')) {
  content = content.replace('maintenance_id: payload.maintenanceRecordId,', 'maintenance_record_id: payload.maintenanceRecordId,\n      maintenance_id: payload.maintenanceRecordId,');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Inserted maintenance_record_id into update payload');
} else {
  console.log('Pattern not found; no changes made');
}
