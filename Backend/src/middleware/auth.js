const jwt = require("jsonwebtoken");
const { extractStaffToken } = require("../utils/authCookies");

/**
 * JWT authentication middleware
 * Verifies the Bearer token from Authorization header
 */
function authMiddleware(req, res, next) {
  const token = extractStaffToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authMiddleware;
