const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const router = express.Router();

// Default admin credentials (for initial setup)
const DEFAULT_ADMIN = {
  email: "admin@urbanvista.com",
  password: "admin123",
  name: "Admin User",
};

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Fetch admin user by email
    let { data: admin, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("email", email)
      .single();

    // If no admin exists and using default credentials, create one
    if ((error || !admin) && email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
      const hash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      const { data: newAdmin, error: createError } = await supabase
        .from("admin_users")
        .insert({
          email: DEFAULT_ADMIN.email,
          name: DEFAULT_ADMIN.name,
          password_hash: hash,
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
      return res.status(401).json({ message: "Invalid credentials" });
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
    if (!isMatch && email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/verify — Verify existing token
router.post("/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ valid: false });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
