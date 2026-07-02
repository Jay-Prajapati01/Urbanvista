const { extractCsrfToken } = require("../utils/authCookies");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizePath(path) {
  return String(path || "").split("?")[0];
}

function createCsrfProtection(options = {}) {
  const exemptPaths = new Set((options.exemptPaths || []).map(normalizePath));

  return function csrfProtection(req, res, next) {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }

    const requestPath = normalizePath(req.originalUrl || req.url);
    if (exemptPaths.has(requestPath)) {
      return next();
    }

    const { headerToken, cookieToken } = extractCsrfToken(req);

    if (!headerToken || !cookieToken || headerToken !== cookieToken) {
      return res.status(403).json({
        message: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    return next();
  };
}

module.exports = {
  createCsrfProtection,
};
