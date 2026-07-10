const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const { staffAuth, requireRoles, requirePermission } = require("./src/middleware/staffAuth");
const userAuthMiddleware = require("./src/middleware/userAuth");
const { createCsrfProtection } = require("./src/middleware/csrf");
const { createActivityTracker } = require("./src/middleware/activityTracker");
const { seedLoginHistoryFromActivityLogs } = require("./src/utils/loginHistoryBootstrap");

// Import routes
const authRoutes = require("./src/routes/auth");
const housesRoutes = require("./src/routes/houses");
const membersRoutes = require("./src/routes/members");
const vehiclesRoutes = require("./src/routes/vehicles");
const maintenanceRoutes = require("./src/routes/maintenance");
const expendituresRoutes = require("./src/routes/expenditures");
const dashboardRoutes = require("./src/routes/dashboard");
const reportsRoutes = require("./src/routes/reports");
const secretaryRoutes = require("./src/routes/secretaries");
const activityRoutes = require("./src/routes/activity");
const settlementsRoutes = require("./src/routes/settlements");
const paymentsRoutes = require("./src/routes/payments");
const userMaintenanceRoutes = require("./src/routes/userMaintenance");
const receiptsRoutes = require("./src/routes/receipts");
const webhookRoutes = require("./src/routes/webhook");

// User routes
const userAuthRoutes = require("./src/routes/userAuth");
const userDashboardRoutes = require("./src/routes/userDashboard");
const userPaymentsRoutes = require("./src/routes/userPayments");

// Secretary routes
const secretaryResidentsRoutes = require("./src/routes/secretaryResidents");

const app = express();
const PORT = process.env.PORT || 5000;
const startupStatus = {
  databaseConnected: false,
  residentAuthReady: false,
};

app.set("trust proxy", 1);
const logger = require("./src/utils/logger");

// Middleware — raw body for Razorpay webhook verification (must be before express.json)
app.use("/api/webhooks/razorpay", express.raw({ type: "application/json" }));

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:3000",
    "https://urbanvista-omega.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(createCsrfProtection({
  exemptPaths: [
    "/api/auth/login",
    "/api/auth/verify",
    "/api/auth/refresh",
    "/api/user-auth/login",
    "/api/user-auth/signup",
    "/api/user-auth/verify",
    "/api/user/payments/create-order",
    "/api/user/payments/verify",
    "/api/user/payments/attempt",
    "/api/payments/create-order",
    "/api/payments/verify",
    "/api/payments/attempt",
    "/api/webhooks/razorpay",
  ],
}));

// Request logger (dev)
app.use((req, _res, next) => {
  logger.info("%s %s %s", new Date().toISOString(), req.method, req.url);
  next();
});

// Public routes
app.use("/api/auth", authRoutes);
app.use("/api/user-auth", userAuthRoutes);

// User protected routes
app.use("/api/user/dashboard", userAuthMiddleware, userDashboardRoutes);
app.use("/api/user/payments", userAuthMiddleware, createActivityTracker("payment"), userPaymentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/maintenance", userMaintenanceRoutes);
app.use("/api/receipts", userAuthMiddleware, receiptsRoutes);

// Staff protected routes (admin + secretary)
app.use("/api/houses", staffAuth, requireRoles("admin", "secretary"), requirePermission("houses"), createActivityTracker("house"), housesRoutes);
app.use("/api/members", staffAuth, requireRoles("admin", "secretary"), requirePermission("members"), createActivityTracker("member"), membersRoutes);
app.use("/api/vehicles", staffAuth, requireRoles("admin", "secretary"), requirePermission("vehicles"), createActivityTracker("vehicle"), vehiclesRoutes);
app.use("/api/maintenance", staffAuth, requireRoles("admin", "secretary"), requirePermission("maintenance"), createActivityTracker("maintenance_record"), maintenanceRoutes);
app.use("/api/expenditures", staffAuth, requireRoles("admin", "secretary"), requirePermission("expenditures"), createActivityTracker("expenditure"), expendituresRoutes);
app.use("/api/dashboard", staffAuth, requireRoles("admin", "secretary"), requirePermission("dashboard"), dashboardRoutes);
app.use("/api/reports", staffAuth, requireRoles("admin", "secretary"), requirePermission("reports", "read"), reportsRoutes);

// Settlement workflow routes
app.use("/api/settlements", staffAuth, requireRoles("admin", "secretary"), createActivityTracker("settlement"), settlementsRoutes);

// Admin-only routes
app.use("/api/admin/secretaries", staffAuth, requireRoles("admin"), createActivityTracker("admin_user"), secretaryRoutes);

// Secretary-only routes
app.use("/api/secretary/residents", staffAuth, requireRoles("secretary"), createActivityTracker("member"), secretaryResidentsRoutes);

// Activity tracking routes (admin + secretary)
app.use(
  "/api/activity",
  staffAuth,
  requireRoles("admin", "secretary"),
  requirePermission("activity", { defaultAction: "read", actionByMethod: { POST: "read" } }),
  activityRoutes
);

// Razorpay webhook — no auth, raw body, CSRF exempt
app.use("/api/webhooks/razorpay", webhookRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: startupStatus,
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const { handleError } = require("./src/utils/errorHandler");

// Global error handler (uses standardized handler)
app.use(handleError);

// Verify Supabase connection and start server
const supabase = require("./src/config/supabase");

async function startServer() {
  try {
    const { error } = await supabase.from("houses").select("id").limit(1);
    if (error) throw error;
    startupStatus.databaseConnected = true;
    console.log("\nSupabase database is connected successfully.");
  } catch (err) {
    console.warn(`\nSupabase connection warning: ${err.message}`);
    console.warn("Server will start, but database queries may fail.\n");
  }

  try {
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    startupStatus.residentAuthReady = true;
    console.log("Resident auth tables are ready.");
  } catch (err) {
    console.warn(`Resident auth setup warning: ${err.message}`);
    console.warn("Run Backend/database/fix_user_auth_tables.sql in Supabase SQL Editor to enable resident signup/login.\n");
  }

  try {
    const result = await seedLoginHistoryFromActivityLogs();
    if (result.seeded) {
      console.log(`Login history seeded with ${result.inserted} existing auth events.`);
    }
  } catch (err) {
    console.warn(`Login history seed warning: ${err.message}`);
  }

  const server = app.listen(PORT, () => {
    console.log(`UrbanVista Backend running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${PORT} is already in use.`);
      console.error("Fix: run `taskkill /F /IM node.exe` and start the backend again.\n");
    } else {
      console.error("Server error:", err);
    }
    process.exit(1);
  });
}

startServer();
