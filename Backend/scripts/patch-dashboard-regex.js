const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'routes', 'dashboard.js');
let content = fs.readFileSync(file, 'utf8');

const maintenanceRegex = /const filteredMaintenance = isScopedSecretary\(req\)\s*\?[\s\S]*?: maintenance;/m;
const newMaintenance = `const filteredMaintenance = isScopedSecretary(req)
      ? maintenance.filter((m) => {
          const hid = m.house_id || m.property_id || m.houseId || m.propertyId;
          return hid && scopedHouseIds.includes(hid);
        })
      : maintenance;`;

if (maintenanceRegex.test(content)) {
  content = content.replace(maintenanceRegex, newMaintenance);
  console.log('Replaced filteredMaintenance block');
} else {
  console.log('filteredMaintenance block not found');
}

const expendituresRegex = /const filteredExpenditures = isScopedSecretary\(req\)\s*\?[\s\S]*?: expenditures;/m;
const newExpenditures = `const filteredExpenditures = isScopedSecretary(req)
      ? expenditures.filter((e) => {
          const hid = e.house_id || e.property_id || e.houseId || e.propertyId;
          return hid && scopedHouseIds.includes(hid);
        })
      : expenditures;`;

if (expendituresRegex.test(content)) {
  content = content.replace(expendituresRegex, newExpenditures);
  console.log('Replaced filteredExpenditures block');
} else {
  console.log('filteredExpenditures block not found');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
