const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { loadSecretaryScope } = require("../utils/accessScope");
const { logAudit } = require("../utils/audit");
const {
  logActivity,
  logLoginHistory,
  updateLoginLogout,
} = require("../utils/activityLogger");
const { ROLE_PERMISSION_MATRIX, getRolePermissionMatrix } = require("../utils/permissions");
const {
  setStaffAuthCookie,
  clearStaffAuthCookie,
  setCsrfCookie,
  clearCsrfCookie,
  extractStaffToken,
} = require("../utils/authCookies");

const router = express.Router();

// Default admin credentials (for initial setup)
const DEFAULT_ADMIN = {
  email: "admin@urbanvista.com",
  username: "admin",
  password: "admin123",
  name: "Admin User",
};

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "1d";
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 24 * 60 * 60);
const LOCK_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const BRUTE_FORCE_WINDOW_MINUTES = 15;
const MAX_BRUTE_FORCE_IDENTIFIER_ATTEMPTS = 10;
const MAX_BRUTE_FORCE_IP_ATTEMPTS = 30;

function isMissingTableError(error, tableName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.includes(`public.${tableName}`)
  );
}

function getMissingColumnFromError(error) {
  const message = String(error?.message || "");
  const match = message.match(/'([^']+)' column/);
  return match?.[1] || null;
}

function normalizeIdentifier(identifier) {
  return String(identifier || "").trim().toLowerCase();
}

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.ip || null;
}

function getUserAgent(req) {
  return req.headers["user-agent"] || null;
}

function parseAndVerifyAccessToken(token) {
  if (!token) {
    const error = new Error("No token provided");
    error.status = 401;
    throw error;
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error("Invalid or expired token");
    error.status = 401;
    throw error;
  }
}

function buildPrincipal(user) {
  return {
    id: user.id,
    role: user.role || "admin",
    name: user.name,
    email: user.email,
    username: user.username || null,
    mustResetPassword: Boolean(user.must_reset_password),
  };
}

function signAccessToken(principal) {
  return jwt.sign(principal, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}
function buildAuthResponse(user) {
  const principal = buildPrincipal(user);
  return {
    tokenType: "Bearer",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: principal,
  };
}

async function trackStaffLogin(req, {
  admin,
  status,
  failureReason,
  description,
}) {
  const userRole = admin?.role || "admin";
  const block = Array.isArray(admin?.assigned_blocks) ? admin.assigned_blocks[0] : null;

  await Promise.all([
    logActivity({
      userId: admin?.id || null,
      userName: admin?.name || null,
      userEmail: admin?.email || null,
      userRole,
      action: status === "success" ? "login_success" : "login_failed",
      resourceType: "admin_user",
      resourceId: admin?.id || null,
      description,
      status,
      block,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      metadata: {
        failureReason: failureReason || null,
      },
    }),
    logLoginHistory({
      userId: admin?.id || null,
      userName: admin?.name || null,
      userEmail: admin?.email || null,
      userRole,
      status,
      block,
      failureReason: failureReason || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      sessionId: null,
    }),
  ]);
}

function isAccountLocked(account) {
  if (!account?.locked_until) return false;
  return new Date(account.locked_until).getTime() > Date.now();
}

async function safeAdminUpdate(id, payload) {
  let mutablePayload = { ...payload };

  while (Object.keys(mutablePayload).length) {
    const { error } = await supabase.from("admin_users").update(mutablePayload).eq("id", id);
    if (!error) return;

    const missingColumn = getMissingColumnFromError(error);
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(mutablePayload, missingColumn)) {
      console.warn("Admin update warning:", error.message);
      return;
    }

    delete mutablePayload[missingColumn];
    console.warn(`Admin update warning: skipped missing column '${missingColumn}'`);
  }
}

async function safeInsertLoginAttempt({ userId, identifier, success, req }) {
  const payload = {
    user_id: userId || null,
    username_or_email: normalizeIdentifier(identifier),
    ip_address: getClientIp(req),
    success: Boolean(success),
    attempted_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from("login_attempts").insert(payload);
    if (error && !isMissingTableError(error, "login_attempts")) {
      console.warn("Login attempt log warning:", error.message);
    }
  } catch (err) {
    // Silently ignore if table doesn't exist
  }
}

async function countRecentFailures({ identifier, req }) {
  const sinceIso = new Date(Date.now() - BRUTE_FORCE_WINDOW_MINUTES * 60 * 1000).toISOString();

  const identifierQuery = await supabase
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("username_or_email", normalizeIdentifier(identifier))
    .eq("success", false)
    .gte("attempted_at", sinceIso);

  const ipQuery = await supabase
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", getClientIp(req))
    .eq("success", false)
    .gte("attempted_at", sinceIso);

  if (identifierQuery.error || ipQuery.error) {
    return {
      blocked: false,
      identifierFailures: 0,
      ipFailures: 0,
    };
  }

  const identifierFailures = Number(identifierQuery.count || 0);
  const ipFailures = Number(ipQuery.count || 0);
  const blocked =
    identifierFailures >= MAX_BRUTE_FORCE_IDENTIFIER_ATTEMPTS ||
    ipFailures >= MAX_BRUTE_FORCE_IP_ATTEMPTS;

  return {
    blocked,
    identifierFailures,
    ipFailures,
  };
}

async function findStaffByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);

  const byEmail = await supabase
    .from("admin_users")
    .select("*")
    .eq("email", normalized)
    .maybeSingle();

  if (byEmail.data) return { data: byEmail.data, error: null };

  const byUsername = await supabase
    .from("admin_users")
    .select("*")
    .eq("username", normalized)
    .maybeSingle();

  return { data: byUsername.data, error: byUsername.error || byEmail.error };
}

async function buildEffectiveScope(user) {
  if (user.role !== "secretary") {
    return { role: user.role, houseIds: [], blocks: [], scopeVersion: Date.now(), scopeType: "global" };
  }

  const scope = await loadSecretaryScope(user.id);
  return {
    role: user.role,
    houseIds: scope.houseIds,
    blocks: scope.blocks,
    scopeVersion: Date.now(),
    scopeType: scope.scopeType || (scope.blocks.length ? "block" : scope.houseIds.length ? "flat" : "empty"),
  };
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const identifier = req.body.email || req.body.username;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Username/email and password are required" });
    }

    const bruteForce = await countRecentFailures({ identifier, req });
    if (bruteForce.blocked) {
      await trackStaffLogin(req, {
        admin: null,
        status: "blocked",
        failureReason: "brute_force_window",
        description: "Staff login blocked by brute-force protection",
      });

      await logAudit({
        req,
        action: "auth.login_blocked",
        resourceType: "admin_user",
        scopeContext: {
          identifier: normalizeIdentifier(identifier),
          reason: "brute_force_window",
          windowMinutes: BRUTE_FORCE_WINDOW_MINUTES,
          identifierFailures: bruteForce.identifierFailures,
          ipFailures: bruteForce.ipFailures,
        },
      });

      return res.status(429).json({
        message: "Too many attempts. Please try again later.",
      });
    }

    // Fetch staff by email or username
    let { data: admin, error } = await findStaffByIdentifier(identifier);

    // If no admin exists and using default credentials, create one
    if ((error || !admin) && normalizeIdentifier(identifier) === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      const { data: newAdmin, error: createError } = await supabase
        .from("admin_users")
        .insert({
          email: DEFAULT_ADMIN.email,
          username: DEFAULT_ADMIN.username,
          name: DEFAULT_ADMIN.name,
          password_hash: hash,
          role: "admin",
          status: "active",
        })
        .select()
        .single();

      if (createError) {
        console.error("Failed to create default admin:", createError);
        return res.status(500).json({ message: "Database setup error. Please ensure admin_users table exists." });
      }
      admin = newAdmin;
    }

    if (!admin) {
      await safeInsertLoginAttempt({ userId: null, identifier, success: false, req });
      await trackStaffLogin(req, {
        admin: null,
        status: "failed",
        failureReason: "invalid_credentials",
        description: "Staff login failed: invalid credentials",
      });

      await logAudit({
        req,
        action: "auth.login_failed",
        resourceType: "admin_user",
        scopeContext: {
          identifier: normalizeIdentifier(identifier),
          reason: "invalid_credentials",
        },
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if ((admin.status || "active") !== "active") {
      await safeInsertLoginAttempt({ userId: admin.id, identifier, success: false, req });
      await trackStaffLogin(req, {
        admin,
        status: "blocked",
        failureReason: "account_disabled",
        description: "Staff login blocked: account disabled",
      });

      await logAudit({
        req,
        action: "auth.login_failed",
        resourceType: "admin_user",
        resourceId: admin.id,
        scopeContext: {
          reason: "account_disabled",
          status: admin.status || "disabled",
        },
      });
      return res.status(403).json({ message: "Account is disabled. Contact administrator." });
    }

    if (isAccountLocked(admin)) {
      await safeInsertLoginAttempt({ userId: admin.id, identifier, success: false, req });
      await trackStaffLogin(req, {
        admin,
        status: "blocked",
        failureReason: "account_locked",
        description: "Staff login blocked: account locked",
      });

      await logAudit({
        req,
        action: "auth.login_failed",
        resourceType: "admin_user",
        resourceId: admin.id,
        scopeContext: {
          reason: "account_locked",
          lockedUntil: admin.locked_until,
        },
      });
      return res.status(423).json({ message: "Account is temporarily locked. Try again later." });
    }

    // Compare password with stored hash
    let isMatch = false;

    // Try bcrypt comparison first
    try {
      isMatch = await bcrypt.compare(password, admin.password_hash);
    } catch {
      // If password_hash is not a valid bcrypt hash, do plain comparison
      isMatch = password === admin.password_hash;
    }

    // Special case: If using default credentials and bcrypt fails, reset the password
    if (!isMatch && normalizeIdentifier(identifier) === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      await supabase
        .from("admin_users")
        .update({ password_hash: hash })
        .eq("id", admin.id);
      isMatch = true;
    }

    // If plain text matches, update to bcrypt hash for security
    if (!isMatch && password === admin.password_hash) {
      isMatch = true;
      const hash = await bcrypt.hash(password, 10);
      await supabase
        .from("admin_users")
        .update({ password_hash: hash })
        .eq("id", admin.id);
    }

    if (!isMatch) {
      const failedCount = Number(admin.failed_login_count || 0) + 1;
      const lockPayload = {
        failed_login_count: failedCount,
      };
      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        lockPayload.locked_until = new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString();
      }
      await safeAdminUpdate(admin.id, lockPayload);
      await safeInsertLoginAttempt({ userId: admin.id, identifier, success: false, req });
      await trackStaffLogin(req, {
        admin,
        status: failedCount >= MAX_FAILED_ATTEMPTS ? "blocked" : "failed",
        failureReason: failedCount >= MAX_FAILED_ATTEMPTS ? "account_locked" : "invalid_credentials",
        description: failedCount >= MAX_FAILED_ATTEMPTS
          ? "Staff login blocked: max failed attempts reached"
          : "Staff login failed: invalid credentials",
      });

      await logAudit({
        req,
        action: "auth.login_failed",
        resourceType: "admin_user",
        resourceId: admin.id,
        scopeContext: {
          reason: failedCount >= MAX_FAILED_ATTEMPTS ? "account_locked" : "invalid_credentials",
          failedCount,
          lockMinutes: failedCount >= MAX_FAILED_ATTEMPTS ? LOCK_MINUTES : null,
        },
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }

    await safeAdminUpdate(admin.id, {
      failed_login_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString(),
    });

    await safeInsertLoginAttempt({ userId: admin.id, identifier, success: true, req });

    const accessToken = signAccessToken(buildPrincipal(admin));
    setStaffAuthCookie(res, accessToken);
    setCsrfCookie(res);

    await trackStaffLogin(req, {
      admin,
      status: "success",
      failureReason: null,
      description: "Staff login successful",
    });

    await logAudit({
      req,
      action: "auth.login_success",
      resourceType: "admin_user",
      resourceId: admin.id,
      scopeContext: {
        role: admin.role || "admin",
      },
    });

    res.set("Cache-Control", "no-store");
    res.json(buildAuthResponse(admin));
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/csrf — issue CSRF token cookie and return token for clients
router.get("/csrf", (_req, res) => {
  const token = setCsrfCookie(res);
  res.set("Cache-Control", "no-store");
  return res.json({ csrfToken: token });
});

// POST /api/auth/verify — Verify existing token
router.post("/verify", (req, res) => {
  try {
    const decoded = parseAndVerifyAccessToken(extractStaffToken(req));
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name,
        email: decoded.email,
        username: decoded.username || null,
        mustResetPassword: Boolean(decoded.mustResetPassword),
      },
    });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// GET /api/auth/me — Returns principal + effective scope
router.get("/me", async (req, res) => {
  try {
    const decoded = parseAndVerifyAccessToken(extractStaffToken(req));
    const effectiveScope = await buildEffectiveScope(decoded);
    res.json({
      user: {
        id: decoded.id,
        role: decoded.role,
        name: decoded.name,
        email: decoded.email,
        username: decoded.username || null,
        mustResetPassword: Boolean(decoded.mustResetPassword),
      },
      effectiveScope,
      permissions: getRolePermissionMatrix(decoded.role),
    });
  } catch (err) {
    res.status(err.status || 401).json({ message: err.message || "Invalid or expired token" });
  }
});

// GET /api/auth/effective-scope — returns machine readable scope for UI
router.get("/effective-scope", async (req, res) => {
  try {
    const decoded = parseAndVerifyAccessToken(extractStaffToken(req));
    const effectiveScope = await buildEffectiveScope(decoded);
    res.json(effectiveScope);
  } catch (err) {
    res.status(err.status || 401).json({ message: err.message || "Invalid or expired token" });
  }
});

// GET /api/auth/role-matrix — Role and module access reference for the app
router.get("/role-matrix", (_req, res) => {
  res.json({
    roles: ROLE_PERMISSION_MATRIX,
  });
});

// POST /api/auth/refresh — stateless cookie auth does not use refresh sessions
router.post("/refresh", async (_req, res) => {
  return res.status(410).json({
    message: "Session refresh endpoint is disabled. Please log in again.",
  });
});

// POST /api/auth/logout — clear auth cookie
router.post("/logout", async (req, res) => {
  try {
    const accessToken = extractStaffToken(req);

    let principal = null;
    try {
      if (accessToken) {
        principal = parseAndVerifyAccessToken(accessToken);
      }
    } catch {
      principal = null;
    }

    clearStaffAuthCookie(res);
    clearCsrfCookie(res);

    if (principal?.id) {
      await Promise.all([
        updateLoginLogout({
          userId: principal.id,
          userEmail: principal.email || null,
          userRole: principal.role || "admin",
          logoutTime: new Date().toISOString(),
        }),
        logActivity({
          userId: principal.id,
          userName: principal.name || null,
          userEmail: principal.email || null,
          userRole: principal.role || "admin",
          action: "logout",
          resourceType: "admin_user",
          resourceId: principal.id,
          description: "Staff logout",
          status: "success",
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          metadata: {
            route: req.originalUrl,
          },
        }),
      ]);

      await logAudit({
        req,
        action: "auth.logout",
        resourceType: "admin_user",
        resourceId: principal.id,
      });
    }

    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Failed to logout" });
  }
});

module.exports = router;
