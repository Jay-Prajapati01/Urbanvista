const { createActivityFromRequest, logActivity } = require("../utils/activityLogger");

function normalizeRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (normalized === "user") return "resident";
  if (normalized === "resident") return "resident";
  if (normalized === "secretary") return "secretary";
  return "admin";
}

function normalizeAction(method) {
  switch (String(method || "").toUpperCase()) {
    case "GET":
    case "HEAD":
      return "READ";
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "READ";
  }
}

function extractBlock(req) {
  const direct =
    req?.body?.block ||
    req?.query?.block ||
    req?.body?.houseBlock ||
    req?.body?.house_block ||
    req?.accessScope?.blocks?.[0] ||
    null;

  const normalized = String(direct || "").trim().toUpperCase();
  return normalized || null;
}

function shouldTrack({ method, statusCode, trackRead }) {
  const upper = String(method || "GET").toUpperCase();
  if (["OPTIONS"].includes(upper)) return false;
  if ((upper === "GET" || upper === "HEAD") && !trackRead) return false;
  if (statusCode === 404) return false;
  return true;
}

function createActivityTracker(resourceType, options = {}) {
  const trackRead = Boolean(options.trackRead);
  const allowAnonymous = Boolean(options.allowAnonymous);

  return function activityTracker(req, res, next) {
    const originalJson = res.json.bind(res);
    let responseBody = null;

    res.json = function patchedJson(payload) {
      responseBody = payload;
      return originalJson(payload);
    };

    res.on("finish", () => {
      if (!shouldTrack({ method: req.method, statusCode: res.statusCode, trackRead })) return;
      if (!allowAnonymous && !req.user) return;

      const role = normalizeRole(req?.user?.role);
      const action = normalizeAction(req.method);
      const status = res.statusCode >= 400 ? "failed" : "success";
      const resourceId = req.params?.id || responseBody?.id || responseBody?.resourceId || null;
      const block = extractBlock(req);

      const payload = createActivityFromRequest(req, {
        userRole: role,
        action,
        resourceType,
        resourceId,
        description: `${action} ${resourceType}`,
        metadata: {
          status,
          block,
          route: req.originalUrl,
          method: String(req.method || "").toUpperCase(),
        },
      });

      // Best-effort async tracking.
      logActivity(payload).catch(() => {});
    });

    return next();
  };
}

module.exports = {
  createActivityTracker,
};
