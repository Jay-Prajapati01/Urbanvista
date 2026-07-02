const ROLE_PERMISSION_MATRIX = {
  resident: {
    profile: ["read"],
    payments: ["read", "create"],
    receipts: ["read"],
    statements: ["read"],
    notices: ["read"],
    complaints: ["read", "create"],
  },
  secretary: {
    dashboard: ["read"],
    houses: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete"],
    vehicles: ["read", "create", "update", "delete"],
    maintenance: ["read", "create", "update", "delete"],
    expenditures: ["read", "create", "update", "delete"],
    reports: ["read"],
    activity: ["read"],
    settlements: ["read", "create", "update", "submit"],
  },
  admin: {
    dashboard: ["read"],
    houses: ["read", "create", "update", "delete"],
    members: ["read", "create", "update", "delete"],
    vehicles: ["read", "create", "update", "delete"],
    maintenance: ["read", "create", "update", "delete"],
    expenditures: ["read", "create", "update", "delete"],
    reports: ["read"],
    settings: ["read", "update"],
    secretaries: ["read", "create", "update", "delete", "reset-password", "assign-scope"],
    settlements: ["read", "approve", "reject"],
    activity: ["read"],
  },
};

const STAFF_MODULES = ["dashboard", "houses", "members", "vehicles", "maintenance", "expenditures", "reports", "settlements"];

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function getRolePermissionMatrix(role) {
  return ROLE_PERMISSION_MATRIX[normalizeRole(role)] || {};
}

function canPerformAction(role, moduleName, action) {
  const permissions = getRolePermissionMatrix(role);
  return Boolean(permissions[moduleName]?.includes(action));
}

function isStaffRole(role) {
  return ["admin", "secretary"].includes(normalizeRole(role));
}

function isResidentRole(role) {
  return normalizeRole(role) === "resident";
}

function requiresSecretaryScope(moduleName) {
  return STAFF_MODULES.includes(String(moduleName || "").trim().toLowerCase());
}

module.exports = {
  ROLE_PERMISSION_MATRIX,
  STAFF_MODULES,
  canPerformAction,
  getRolePermissionMatrix,
  isResidentRole,
  isStaffRole,
  requiresSecretaryScope,
};