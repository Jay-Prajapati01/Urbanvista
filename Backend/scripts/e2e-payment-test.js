#!/usr/bin/env node
/**
 * Automated E2E Payment Flow Test
 * Tests: signup → create maintenance → create order → simulate capture → verify payment
 */

const supabase = require("../src/config/supabase");
const { HttpSession } = require("./httpSession");

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const TEST_EMAIL = `e2e-${Date.now()}@test.com`;
const TEST_PASSWORD = "TestPass123!";
const FALLBACK_EMAIL = "e2e3@example.com";
const FALLBACK_PASSWORD = "Password123!";
const session = new HttpSession(API_BASE);

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function pass(msg) { log(`✓ ${msg}`, "green"); }
function fail(msg) { log(`✗ ${msg}`, "red"); }
function info(msg) { log(`ℹ ${msg}`, "cyan"); }
function step(msg) { log(`\n➜ ${msg}`, "yellow"); }

async function httpFetch(endpoint, options = {}) {
  const response = await session.request(options.method || "GET", endpoint, {
    json: options.body,
    headers: options.headers,
    withCsrf: Boolean(options.withCsrf),
  });

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    data: response.body,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

async function testE2E() {
  let userId = null;
  let activeEmail = TEST_EMAIL;
  let activePassword = TEST_PASSWORD;
  let houseId = null;
  let maintenanceId = null;
  let orderId = null;
  const results = { passed: 0, failed: 0, errors: [] };

  try {
    // Step 1: Signup
    step("Creating test resident account");
    const signupRes = await httpFetch("/user-auth/signup", {
      method: "POST",
      body: { name: "E2E Tester", email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    if (!signupRes.ok || !signupRes.data.user) {
      info(`Signup unavailable (${signupRes.data.message || "unknown error"}); falling back to existing resident login`);
      const loginRes = await httpFetch("/user-auth/login", {
        method: "POST",
        body: { email: FALLBACK_EMAIL, password: FALLBACK_PASSWORD },
      });

      if (!loginRes.ok || !loginRes.data.user) {
        fail("Signup and fallback login both failed");
        results.failed++;
        results.errors.push(`Signup error: ${signupRes.data.message}`);
        results.errors.push(`Fallback login error: ${loginRes.data.message}`);
        return;
      }

      activeEmail = FALLBACK_EMAIL;
      activePassword = FALLBACK_PASSWORD;
      userId = loginRes.data.user.id;
      pass(`Fallback login successful (user: ${userId})`);
      results.passed++;
    } else {
      userId = signupRes.data.user.id;
      pass(`Signup successful (user: ${userId})`);
      results.passed++;
    }

    // Step 2: Create house
    step("Creating test house");
    const housePayload = {
      block: "E2E",
      house_number: `E2E-${Date.now() % 10000}`,
      floor: 1,
      status: "occupied",
      owner_name: "E2E Owner",
      notes: "E2E created",
    };
    const { data: newHouse, error: houseErr } = await supabase
      .from("houses")
      .insert(housePayload)
      .select()
      .single();
    if (houseErr) {
      fail(`House creation failed: ${houseErr.message}`);
      results.failed++;
      results.errors.push(`House error: ${houseErr.message}`);
    } else {
      houseId = newHouse.id;
      pass(`House created (${houseId})`);
      results.passed++;
    }

    // Step 3: Link user to house
    step("Linking user to house");
    const { error: updateUserErr } = await supabase
      .from("users")
      .update({ house_id: houseId })
      .eq("id", userId);
    if (updateUserErr) {
      fail(`User update failed: ${updateUserErr.message}`);
      results.failed++;
      results.errors.push(`User update error: ${updateUserErr.message}`);
    } else {
      pass("User linked to house");
      results.passed++;
    }

    step("Refreshing resident session after house link");
    const refreshLoginRes = await httpFetch("/user-auth/login", {
      method: "POST",
      body: { email: activeEmail, password: activePassword },
    });
    if (!refreshLoginRes.ok || !refreshLoginRes.data.user) {
      fail(`Session refresh failed: ${refreshLoginRes.data.message}`);
      results.failed++;
      results.errors.push(`Refresh login error: ${refreshLoginRes.data.message}`);
    } else {
      pass("Resident session refreshed with updated house scope");
      results.passed++;
    }

    // Step 4: Create maintenance record
    step("Creating maintenance record");
    const maintenancePayload = {
      house_id: houseId,
      house_number: housePayload.house_number,
      from_month: "2026-05",
      to_month: "2026-05",
      base_amount: 1500.0,
      total_amount: 1500.0,
      amount_paid: 0,
      balance: 1500.0,
    };
    const { data: maintenanceRecord, error: maintErr } = await supabase
      .from("maintenance_records")
      .insert(maintenancePayload)
      .select()
      .single();
    if (maintErr) {
      fail(`Maintenance creation failed: ${maintErr.message}`);
      results.failed++;
      results.errors.push(`Maintenance error: ${maintErr.message}`);
    } else {
      maintenanceId = maintenanceRecord.id;
      pass(`Maintenance created (${maintenanceId})`);
      results.passed++;
    }

    // Step 5: Create Razorpay order
    step("Creating payment order (via API)");
    const createOrderRes = await httpFetch("/user/payments/create-order", {
      method: "POST",
      body: { maintenanceRecordId: maintenanceId },
      withCsrf: true,
    });
    if (!createOrderRes.ok || !createOrderRes.data.orderId) {
      fail(`Order creation failed: ${createOrderRes.data.message}`);
      results.failed++;
      results.errors.push(`Order creation error: ${createOrderRes.data.message}`);
    } else {
      orderId = createOrderRes.data.orderId;
      pass(`Order created (${orderId}), amount: ${createOrderRes.data.amount} paise`);
      results.passed++;
    }

    // Step 6: Simulate payment capture (mark as captured)
    step("Simulating payment capture");
    const paymentId = `pay_e2e_${Date.now()}`;
    const { error: captureErr } = await supabase
      .from("payments")
      .update({ status: "captured", razorpay_payment_id: paymentId })
      .eq("razorpay_order_id", orderId);
    if (captureErr) {
      fail(`Payment capture failed: ${captureErr.message}`);
      results.failed++;
      results.errors.push(`Capture error: ${captureErr.message}`);
    } else {
      pass(`Payment marked as captured (${paymentId})`);
      results.passed++;
    }

    // Step 7: Verify payment
    step("Verifying payment (via API)");
    const verifyRes = await httpFetch("/user/payments/verify", {
      method: "POST",
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "e2e_sig",
      },
      withCsrf: true,
    });
    if (!verifyRes.ok) {
      fail(`Payment verification failed: ${verifyRes.data.message}`);
      results.failed++;
      results.errors.push(`Verify error: ${verifyRes.data.message}`);
    } else {
      pass(`Payment verified: ${verifyRes.data.message}`);
      results.passed++;
    }

    // Step 8: Check user can fetch payments
    step("Fetching user payments list");
    const paymentsRes = await httpFetch("/user/payments", {
      method: "GET",
    });
    if (!paymentsRes.ok) {
      fail(`Fetch payments failed: ${paymentsRes.data.message}`);
      results.failed++;
      results.errors.push(`Fetch payments error: ${paymentsRes.data.message}`);
    } else {
      pass(`Payments fetched (${Array.isArray(paymentsRes.data) ? paymentsRes.data.length : 0} records)`);
      results.passed++;
    }
  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    results.failed++;
    results.errors.push(err.message);
  }

  // Print summary
  step("\n═══ E2E Test Summary ═══");
  log(`Passed: ${results.passed}/${results.passed + results.failed}`, results.failed === 0 ? "green" : "yellow");
  if (results.failed > 0) {
    log(`Failed: ${results.failed}`, "red");
    results.errors.forEach((err) => log(`  • ${err}`, "red"));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

testE2E();
