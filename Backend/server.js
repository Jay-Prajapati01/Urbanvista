const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authMiddleware = require("./src/middleware/auth");

// Import routes
const authRoutes = require("./src/routes/auth");
const housesRoutes = require("./src/routes/houses");
const membersRoutes = require("./src/routes/members");
const vehiclesRoutes = require("./src/routes/vehicles");
const maintenanceRoutes = require("./src/routes/maintenance");
const expendituresRoutes = require("./src/routes/expenditures");
const dashboardRoutes = require("./src/routes/dashboard");
const reportsRoutes = require("./src/routes/reports");

const app = express();
const PORT = process.env.PORT || 5000;

// ──── Middleware ────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000"],
  credentials: true,
}));
app.use(express.json());

// Request logger (dev)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ──── Public Routes ────
app.use("/api/auth", authRoutes);

// ──── Protected Routes (require JWT) ────
app.use("/api/houses", authMiddleware, housesRoutes);
app.use("/api/members", authMiddleware, membersRoutes);
app.use("/api/vehicles", authMiddleware, vehiclesRoutes);
app.use("/api/maintenance", authMiddleware, maintenanceRoutes);
app.use("/api/expenditures", authMiddleware, expendituresRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/reports", authMiddleware, reportsRoutes);

// ──── Health Check ────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ──── 404 Handler ────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ──── Global Error Handler ────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// ──── Verify Supabase Connection & Start Server ────
const supabase = require("./src/config/supabase");

async function startServer() {
  // Test Supabase connectivity
  try {
    const { data, error } = await supabase.from("houses").select("id").limit(1);
    if (error) throw error;
    console.log("\n  ✅  Supabase database is connected successfully!");
  } catch (err) {
    console.warn(`\n  ⚠️  Supabase connection warning: ${err.message}`);
    console.warn("  ℹ️  Server will start, but database queries may fail.\n");
  }

  const server = app.listen(PORT, () => {
    console.log(`  🏙️  UrbanVista Backend running on http://localhost:${PORT}`);
    console.log(`  📡  API endpoints available at http://localhost:${PORT}/api\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\n  ❌  Port ${PORT} is already in use!`);
      console.error(`  💡  Fix: Run  taskkill /F /IM node.exe  then try again.\n`);
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
}

startServer();
