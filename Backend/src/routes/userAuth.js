const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");
const { loginLimiter, signupLimiter } = require("../middleware/rateLimiter");
const {
  setResidentAuthCookie,
  clearResidentAuthCookie,
  setCsrfCookie,
  clearCsrfCookie,
  extractResidentToken,
} = require("../utils/authCookies");
const {
  logActivity,
  logLoginHistory,
  updateLoginLogout,
  getClientIp,
  getUserAgent,
} = require("../utils/activityLogger");

const router = express.Router();
const isDevFallbackEnabled = process.env.NODE_ENV !== "production";
const devUsersByEmail = new Map();
const USER_ACCESS_TOKEN_TTL = process.env.USER_ACCESS_TOKEN_TTL || "1d";
const USER_FRONTEND_REDIRECT_URL = process.env.USER_FRONTEND_REDIRECT_URL || "http://localhost:5173/login";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isMissingTableError(error, tableName) {
  return (
    error &&
    error.code === "PGRST205" &&
    typeof error.message === "string" &&
    error.message.includes(`public.${tableName}`)
  );
}

function sendUsersTableMissing(res) {
  return res.status(503).json({
    message:
      "Resident auth tables are not initialized in Supabase. Run Backend/database/fix_user_auth_tables.sql in Supabase SQL Editor, then retry.",
  });
}

function createUserPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    houseId: user.house_id ?? null,
    memberId: user.member_id ?? null,
    role: "user",
  };
}

function buildAuthResponse(user, token) {
  // Token is set via httpOnly cookie; do not return in response to reduce XSS exposure.
  // Frontend should use /verify endpoint to fetch user data after login.
  return {
    user: createUserPayload(user),
  };
}

async function trackResidentLogin(req, {
  user,
  status,
  failureReason,
  description,
}) {
  const block = String(user?.block || "").trim().toUpperCase() || null;

  await Promise.all([
    logActivity({
      userId: user?.id || null,
      userName: user?.name || null,
      userEmail: user?.email || null,
      userRole: "user",
      action: status === "success" ? "login_success" : "login_failed",
      resourceType: "user",
      resourceId: user?.id || null,
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
      userId: user?.id || null,
      userName: user?.name || null,
      userEmail: user?.email || null,
      userRole: "user",
      status,
      block,
      failureReason: failureReason || null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      sessionId: null,
    }),
  ]);
}

async function createDevFallbackUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  let houseId = null;
  let memberId = null;
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id, house_id")
    .eq("email", email)
    .maybeSingle();

  if (memberError && !isMissingTableError(memberError, "members")) {
    throw memberError;
  }

  if (member) {
    houseId = member.house_id;
    memberId = member.id;
  }

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    password_hash: passwordHash,
    house_id: houseId,
    member_id: memberId,
  };

  devUsersByEmail.set(email, user);
  return user;
}

function getUserJwtSecret(res) {
  if (!process.env.USER_JWT_SECRET) {
    res.status(500).json({ message: "USER_JWT_SECRET is not configured" });
    return null;
  }
  return process.env.USER_JWT_SECRET;
}

// POST /api/user-auth/signup
router.post("/signup", signupLimiter, async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if user already exists
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (isMissingTableError(existingError, "users")) {
      if (!isDevFallbackEnabled) {
        return sendUsersTableMissing(res);
      }

      if (devUsersByEmail.has(email)) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const fallbackUser = await createDevFallbackUser({ name, email, password });
      const jwtSecret = getUserJwtSecret(res);
      if (!jwtSecret) return;

      const token = jwt.sign(createUserPayload(fallbackUser), jwtSecret, { expiresIn: USER_ACCESS_TOKEN_TTL });
      setResidentAuthCookie(res, token);
      setCsrfCookie(res);

      await logActivity({
        userId: fallbackUser.id,
        userName: fallbackUser.name,
        userEmail: fallbackUser.email,
        userRole: "user",
        action: "signup_success",
        resourceType: "user",
        resourceId: fallbackUser.id,
        description: "Resident signup successful (dev fallback)",
        status: "success",
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      });

      return res.status(201).json(buildAuthResponse(fallbackUser, token));
    }

    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Auto-link to member record by matching email
    let houseId = null;
    let memberId = null;

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, house_id")
      .eq("email", email)
      .maybeSingle();

    if (memberError && !isMissingTableError(memberError, "members")) {
      throw memberError;
    }

    if (member) {
      houseId = member.house_id;
      memberId = member.id;
    }

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        name,
        email,
        password_hash: passwordHash,
        house_id: houseId,
        member_id: memberId,
      })
      .select()
      .single();

    if (createError) {
      if (isMissingTableError(createError, "users")) {
        return sendUsersTableMissing(res);
      }
      console.error("Signup error:", createError);
      return res.status(500).json({ message: "Failed to create account" });
    }

    const jwtSecret = getUserJwtSecret(res);
    if (!jwtSecret) return;

    // Generate JWT
    const token = jwt.sign(createUserPayload(newUser), jwtSecret, { expiresIn: USER_ACCESS_TOKEN_TTL });
    setResidentAuthCookie(res, token);
    setCsrfCookie(res);

    await logActivity({
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      userRole: "user",
      action: "signup_success",
      resourceType: "user",
      resourceId: newUser.id,
      description: "Resident signup successful",
      status: "success",
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json(buildAuthResponse(newUser, token));
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user-auth/login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (isMissingTableError(error, "users")) {
      if (!isDevFallbackEnabled) {
        return sendUsersTableMissing(res);
      }

      const fallbackUser = devUsersByEmail.get(email);
      if (!fallbackUser) {
        await trackResidentLogin(req, {
          user: null,
          status: "failed",
          failureReason: "invalid_credentials",
          description: "Resident login failed: invalid credentials",
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, fallbackUser.password_hash);
      if (!isMatch) {
        await trackResidentLogin(req, {
          user: fallbackUser,
          status: "failed",
          failureReason: "invalid_credentials",
          description: "Resident login failed: invalid credentials",
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const jwtSecret = getUserJwtSecret(res);
      if (!jwtSecret) return;

      const token = jwt.sign(createUserPayload(fallbackUser), jwtSecret, { expiresIn: USER_ACCESS_TOKEN_TTL });
      setResidentAuthCookie(res, token);
      setCsrfCookie(res);

      await trackResidentLogin(req, {
        user: fallbackUser,
        status: "success",
        failureReason: null,
        description: "Resident login successful (dev fallback)",
      });

      return res.json(buildAuthResponse(fallbackUser, token));
    }

    if (error || !user) {
      await trackResidentLogin(req, {
        user: null,
        status: "failed",
        failureReason: "invalid_credentials",
        description: "Resident login failed: invalid credentials",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await trackResidentLogin(req, {
        user,
        status: "failed",
        failureReason: "invalid_credentials",
        description: "Resident login failed: invalid credentials",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const jwtSecret = getUserJwtSecret(res);
    if (!jwtSecret) return;

    const token = jwt.sign(createUserPayload(user), jwtSecret, { expiresIn: USER_ACCESS_TOKEN_TTL });
    setResidentAuthCookie(res, token);
    setCsrfCookie(res);

    await trackResidentLogin(req, {
      user,
      status: "success",
      failureReason: null,
      description: "Resident login successful",
    });

    res.json(buildAuthResponse(user, token));
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/user-auth/verify
router.post("/verify", (req, res) => {
  const token = extractResidentToken(req);
  if (!token) {
    return res.status(401).json({ valid: false });
  }

  try {
    const jwtSecret = getUserJwtSecret(res);
    if (!jwtSecret) return;

    const decoded = jwt.verify(token, jwtSecret);
    res.json({
      valid: true,
      user: {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        houseId: decoded.houseId,
        memberId: decoded.memberId,
        role: "user",
      },
    });
  } catch {
    res.status(401).json({ valid: false });
  }
});

// GET /api/user-auth/csrf — issue CSRF token cookie and return token for clients
router.get("/csrf", (_req, res) => {
  const token = setCsrfCookie(res);
  res.set("Cache-Control", "no-store");
  return res.json({ csrfToken: token });
});

// GET /api/user-auth/google/status — Check if Google OAuth is configured
router.get("/google/status", (_req, res) => {
  const configured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CALLBACK_URL &&
    process.env.GOOGLE_CLIENT_ID !== "your-google-client-id-here"
  );

  res.json({ configured });
});

// GET /api/user-auth/google — Redirect to Google OAuth consent screen
router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || clientId === "your-google-client-id-here") {
    return res.status(503).json({ message: "Google OAuth is not configured" });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// GET /api/user-auth/google/callback — Handle Google OAuth callback
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${USER_FRONTEND_REDIRECT_URL}?error=no_code`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return res.redirect(`${USER_FRONTEND_REDIRECT_URL}?error=token_failed`);
    }

    // Fetch user profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    if (!profile.id || !profile.email) {
      return res.redirect(`${USER_FRONTEND_REDIRECT_URL}?error=profile_failed`);
    }

    // Check if user already exists by google_id
    let { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("google_id", profile.id)
      .single();

    if (!user) {
      // Check if user exists by email
      const { data: emailUser } = await supabase
        .from("users")
        .select("*")
        .eq("email", profile.email)
        .single();

      if (emailUser) {
        // Link Google account to existing user
        await supabase
          .from("users")
          .update({ google_id: profile.id, avatar_url: profile.picture })
          .eq("id", emailUser.id);
        user = { ...emailUser, google_id: profile.id, avatar_url: profile.picture };
      } else {
        // Create new user
        let houseId = null;
        let memberId = null;

        const { data: member } = await supabase
          .from("members")
          .select("id, house_id")
          .eq("email", profile.email)
          .single();

        if (member) {
          houseId = member.house_id;
          memberId = member.id;
        }

        const placeholderHash = await bcrypt.hash(profile.id + Date.now(), 10);

        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            name: profile.name,
            email: profile.email,
            password_hash: placeholderHash,
            google_id: profile.id,
            avatar_url: profile.picture,
            house_id: houseId,
            member_id: memberId,
            is_verified: true,
          })
          .select()
          .single();

        if (createError) {
          console.error("Google signup error:", createError);
          return res.redirect(`${USER_FRONTEND_REDIRECT_URL}?error=create_failed`);
        }
        user = newUser;
      }
    }

    const jwtSecret = getUserJwtSecret(res);
    if (!jwtSecret) return;

    // Generate JWT and set resident auth cookie
    const jwtToken = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        houseId: user.house_id,
        memberId: user.member_id,
        role: "user",
      },
      jwtSecret,
      { expiresIn: USER_ACCESS_TOKEN_TTL }
    );

    setResidentAuthCookie(res, jwtToken);
    setCsrfCookie(res);

    await trackResidentLogin(req, {
      user,
      status: "success",
      failureReason: null,
      description: "Resident login successful (Google OAuth)",
    });

    // Redirect without token in query params; cookie contains the token (httpOnly).
    // Frontend can fetch user via /verify endpoint after redirect.
    const redirectUrl = new URL(USER_FRONTEND_REDIRECT_URL);
    redirectUrl.searchParams.set(
      "user",
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        houseId: user.house_id,
        memberId: user.member_id,
        role: "user",
      })
    );

    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${USER_FRONTEND_REDIRECT_URL}?error=server_error`);
  }
});

// POST /api/user-auth/logout
router.post("/logout", async (req, res) => {
  let principal = null;
  try {
    const token = extractResidentToken(req);
    if (token && process.env.USER_JWT_SECRET) {
      principal = jwt.verify(token, process.env.USER_JWT_SECRET);
    }
  } catch {
    principal = null;
  }

  clearResidentAuthCookie(res);
  clearCsrfCookie(res);

  if (principal?.id) {
    await Promise.all([
      updateLoginLogout({
        userId: principal.id,
        userEmail: principal.email || null,
        userRole: "resident",
        logoutTime: new Date().toISOString(),
      }),
      logActivity({
        userId: principal.id,
        userName: principal.name || null,
        userEmail: principal.email || null,
        userRole: "user",
        action: "logout",
        resourceType: "user",
        resourceId: principal.id,
        description: "Resident logout",
        status: "success",
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
        metadata: {
          route: req.originalUrl,
        },
      }),
    ]);
  }

  return res.json({ message: "Logged out" });
});

module.exports = router;
