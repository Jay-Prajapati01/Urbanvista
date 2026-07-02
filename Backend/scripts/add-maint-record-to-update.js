const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'services', 'paymentService.js');
let content = fs.readFileSync(file, 'utf8');

const marker = 'const updatePayload = {';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('updatePayload marker not found');
  process.exit(1);
}
const start = idx;
const rest = content.slice(start);
const insertAfter = 'order_id: orderId,';
const i = rest.indexOf(insertAfter);
if (i === -1) {
  console.error('order_id line not found in updatePayload');
  process.exit(1);
}
const insertPos = start + i + insertAfter.length;
const newContent = content.slice(0, insertPos) + '\n      maintenance_record_id: payload.maintenanceRecordId,' + content.slice(insertPos);
fs.writeFileSync(file, newContent, 'utf8');
console.log('Inserted maintenance_record_id into updatePayload');
