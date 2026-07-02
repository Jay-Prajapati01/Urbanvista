const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'services', 'paymentService.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('maintenance_record_id: payload.maintenanceRecordId,\n      maintenance_record_id: payload.maintenanceRecordId,', 'maintenance_record_id: payload.maintenanceRecordId,');

fs.writeFileSync(file, content, 'utf8');
console.log('Deduped maintenance_record_id in create payload');
