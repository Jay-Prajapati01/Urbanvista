const rateLimit = require("express-rate-limit");

// Limit login attempts to reduce brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: { message: "Too many login attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit signup attempts to avoid abuse
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 signup requests per windowMs
  message: { message: "Too many signup attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, signupLimiter };
