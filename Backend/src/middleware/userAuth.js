const jwt = require("jsonwebtoken");
const { extractResidentToken } = require("../utils/authCookies");

function userAuthMiddleware(req, res, next) {
  const token = extractResidentToken(req);
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
    if (decoded.role !== "user") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = userAuthMiddleware;
