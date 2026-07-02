const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { EMPTY_SCOPE, loadSecretaryScope } = require("../utils/accessScope");
const { canPerformAction, getRolePermissionMatrix, isStaffRole } = require("../utils/permissions");
const { extractStaffToken } = require("../utils/authCookies");

async function staffAuth(req, res, next) {
  const token = extractStaffToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: currentUser, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("id", decoded.id)
      .maybeSingle();

    if (error || !currentUser) {
      return res.status(401).json({ message: "Invalid account session" });
    }

    if ((currentUser.status || "active") !== "active") {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const role = currentUser.role || decoded.role || "admin";

    if (!isStaffRole(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    req.user = { ...decoded, role };
    req.permissions = getRolePermissionMatrix(role);
    req.accessScope = { ...EMPTY_SCOPE };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient role permission" });
    }

    if (req.user.role !== "secretary") {
      req.accessScope = { ...EMPTY_SCOPE };
      return next();
    }

    const scope = await loadSecretaryScope(req.user.id);
    req.accessScope = scope;

    if (!scope.assignmentTableReady) {
      return res.status(503).json({
        message:
          "Secretary scope is not initialized. Run Backend/database/phase1_rbac.sql in Supabase SQL Editor.",
      });
    }

    next();
  };
}

function mapMethodToAction(method) {
  switch (String(method || "").toUpperCase()) {
    case "GET":
    case "HEAD":
    case "OPTIONS":
      return "read";
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}

function requirePermission(moduleName, actionOrOptions = "read") {
  const options = typeof actionOrOptions === "string" ? { defaultAction: actionOrOptions } : (actionOrOptions || {});
  return (req, res, next) => {
    const defaultAction = options.defaultAction || mapMethodToAction(req.method);
    const action = options.actionByMethod?.[req.method] || defaultAction;

    if (!req.user?.role || !canPerformAction(req.user.role, moduleName, action)) {
      return res.status(403).json({ message: "Insufficient role permission" });
    }

    return next();
  };
}

module.exports = {
  staffAuth,
  requireRoles,
  requirePermission,
};
