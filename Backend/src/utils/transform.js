/**
 * Convert snake_case database rows to camelCase for frontend
 */
function toCamelCase(obj) {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      val,
    ])
  );
}

/**
 * Convert camelCase frontend data to snake_case for database
 */
function toSnakeCase(obj) {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj === null || obj === undefined || typeof obj !== "object") return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [
      key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`),
      val,
    ])
  );
}

module.exports = { toCamelCase, toSnakeCase };
