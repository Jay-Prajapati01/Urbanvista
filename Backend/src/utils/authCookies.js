const crypto = require("crypto");

const STAFF_AUTH_COOKIE = process.env.STAFF_AUTH_COOKIE || "uv_staff_token";
const RESIDENT_AUTH_COOKIE = process.env.RESIDENT_AUTH_COOKIE || "uv_resident_token";
const CSRF_COOKIE = process.env.CSRF_COOKIE || "uv_csrf_token";

function parseBooleanEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return String(value).trim().toLowerCase() === "true";
}

function getCookieSecure() {
  const defaultSecure = process.env.NODE_ENV === "production";
  return parseBooleanEnv("AUTH_COOKIE_SECURE", defaultSecure);
}

function getCookieDomain() {
  const domain = String(process.env.AUTH_COOKIE_DOMAIN || "").trim();
  return domain || undefined;
}

function getSameSite() {
  const raw = String(process.env.AUTH_COOKIE_SAMESITE || "strict").trim().toLowerCase();
  if (raw === "none") return "none";
  if (raw === "lax") return "lax";
  return "strict";
}

function getCookieMaxAgeMs() {
  const days = Number(process.env.AUTH_COOKIE_DAYS || 1);
  if (Number.isFinite(days) && days > 0) {
    return Math.floor(days * 24 * 60 * 60 * 1000);
  }
  return 24 * 60 * 60 * 1000;
}

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: getCookieSecure(),
    sameSite: getSameSite(),
    path: "/",
    ...(getCookieDomain() ? { domain: getCookieDomain() } : {}),
  };
}

function getAuthCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: getCookieMaxAgeMs(),
  };
}

function getCsrfCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    httpOnly: false,
    maxAge: getCookieMaxAgeMs(),
  };
}

function setStaffAuthCookie(res, token) {
  res.cookie(STAFF_AUTH_COOKIE, token, getAuthCookieOptions());
}

function clearStaffAuthCookie(res) {
  res.clearCookie(STAFF_AUTH_COOKIE, getBaseCookieOptions());
}

function setResidentAuthCookie(res, token) {
  res.cookie(RESIDENT_AUTH_COOKIE, token, getAuthCookieOptions());
}

function clearResidentAuthCookie(res) {
  res.clearCookie(RESIDENT_AUTH_COOKIE, getBaseCookieOptions());
}

function generateCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

function setCsrfCookie(res, token = generateCsrfToken()) {
  res.cookie(CSRF_COOKIE, token, getCsrfCookieOptions());
  return token;
}

function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE, {
    ...getBaseCookieOptions(),
    httpOnly: false,
  });
}

function extractCsrfToken(req) {
  const headerToken = req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  return {
    headerToken: typeof headerToken === "string" ? headerToken : null,
    cookieToken: typeof cookieToken === "string" ? cookieToken : null,
  };
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
}

function extractStaffToken(req) {
  return req.cookies?.[STAFF_AUTH_COOKIE] || extractBearerToken(req);
}

function extractResidentToken(req) {
  return req.cookies?.[RESIDENT_AUTH_COOKIE] || extractBearerToken(req);
}

module.exports = {
  STAFF_AUTH_COOKIE,
  RESIDENT_AUTH_COOKIE,
  CSRF_COOKIE,
  setStaffAuthCookie,
  clearStaffAuthCookie,
  setResidentAuthCookie,
  clearResidentAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  extractStaffToken,
  extractResidentToken,
  extractCsrfToken,
};
