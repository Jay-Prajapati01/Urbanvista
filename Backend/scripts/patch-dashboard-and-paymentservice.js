const fs = require('fs');
const path = require('path');

function patchDashboard() {
  const file = path.join(__dirname, '..', 'src', 'routes', 'dashboard.js');
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    "const filteredMaintenance = isScopedSecretary(req)\n      ? maintenance.filter((m) => m.house_id && scopedHouseIds.includes(m.house_id))\n      : maintenance;",
    "const filteredMaintenance = isScopedSecretary(req)\n      ? maintenance.filter((m) => {\n          const hid = m.house_id || m.property_id || m.houseId || m.propertyId;\n          return hid && scopedHouseIds.includes(hid);\n        })\n      : maintenance;"
  );

  content = content.replace(
    "const filteredExpenditures = isScopedSecretary(req)\n      ? expenditures.filter((e) => e.house_id && scopedHouseIds.includes(e.house_id))\n      : expenditures;",
    "const filteredExpenditures = isScopedSecretary(req)\n      ? expenditures.filter((e) => {\n          const hid = e.house_id || e.property_id || e.houseId || e.propertyId;\n          return hid && scopedHouseIds.includes(hid);\n        })\n      : expenditures;"
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched dashboard.js');
}

function patchPaymentService() {
  const file = path.join(__dirname, '..', 'src', 'services', 'paymentService.js');
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(
    /const updatePayload = \{\n\s+role: "resident",[\s\S]*?razorpay_signature: payload.razorpaySignature,\n\s+status: normalizedStatus,\n/,
    (match) => {
      // Insert maintenance_record_id alongside maintenance_id
      return match.replace('razorpay_signature: payload.razorpaySignature,\n      status: normalizedStatus,', 'razorpay_signature: payload.razorpaySignature,\n      maintenance_record_id: payload.maintenanceRecordId,\n      status: normalizedStatus,');
    }
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Patched paymentService.js');
}

try {
  patchDashboard();
  patchPaymentService();
  console.log('Patching complete');
} catch (err) {
  console.error('Patching failed:', err);
  process.exit(1);
}
