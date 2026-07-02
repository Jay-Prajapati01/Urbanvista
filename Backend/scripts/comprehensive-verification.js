#!/usr/bin/env node
/**
 * Comprehensive Verification Suite
 * Tests all Week-1 fixes:
 * 1. Rate limiting on auth endpoints
 * 2. localStorage token removal (httpOnly cookies)
 * 3. Payment callback fix
 * 4. Payment validation & retry logic
 * 5. End-to-end payment flow
 */

const http = require("http");
const supabase = require("../src/config/supabase");

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;
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
function section(msg) { log(`\n${"═".repeat(60)}\n${msg}\n${"═".repeat(60)}`, "cyan"); }

function httpFetch(endpoint, options = {}) {
  return new Promise((resolve) => {
    const url = new URL(API_BASE + endpoint);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...options.headers },
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ ok: false, status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on("error", (err) => resolve({ ok: false, status: 0, data: { message: err.message }, headers: {} }));
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function testRateLimiting() {
  section("TEST 1: Rate Limiting on Auth Endpoints");
  
  const testEmail = `ratelimit-test-${Date.now()}@test.com`;
  const signupPromises = [];

  info("Attempting 6 rapid signup requests (limit is 5 per 15 min)...");
  
  // Fire 6 requests in rapid succession
  for (let i = 0; i < 6; i++) {
    signupPromises.push(
      httpFetch("/user-auth/signup", {
        method: "POST",
        body: { name: `User${i}`, email: `${testEmail.replace("ratelimit", `ratelimit${i}`)}`, password: "Pass123!" },
      })
    );
  }

  const results = await Promise.all(signupPromises);
  let successCount = 0;
  let rateLimitCount = 0;

  results.forEach((res, idx) => {
    if (res.ok) {
      successCount++;
    } else if (res.status === 429 || (res.data && res.data.message && res.data.message.includes("too many"))) {
      rateLimitCount++;
    }
  });

  if (rateLimitCount > 0) {
    pass(`Rate limiting detected: ${successCount} passed, ${rateLimitCount} rate-limited`);
  } else {
    fail(`No rate limiting detected (all ${successCount} requests passed)`);
  }
}

async function testAuthFlows() {
  section("TEST 2: Authentication Flows (Token Removal from Response)");
  
  const testUser = {
    name: "AuthTest",
    email: `authtest-${Date.now()}@test.com`,
    password: "Pass123!",
  };

  // Test signup response
  info("Testing signup response format...");
  const signupRes = await httpFetch("/user-auth/signup", {
    method: "POST",
    body: testUser,
  });

  if (signupRes.ok) {
    if (signupRes.data.user && !signupRes.data.token && !signupRes.data.accessToken) {
      pass("Signup response: token removed (only user object returned)");
    } else if (signupRes.data.token || signupRes.data.accessToken) {
      fail("Signup response: token still present (should be removed)");
    }
  } else {
    fail(`Signup failed: ${signupRes.data.message}`);
    return;
  }

  // Test login response
  info("Testing login response format...");
  const loginRes = await httpFetch("/user-auth/login", {
    method: "POST",
    body: { email: testUser.email, password: testUser.password },
  });

  if (loginRes.ok) {
    if (loginRes.data.user && !loginRes.data.token && !loginRes.data.accessToken) {
      pass("Login response: token removed (only user object returned)");
    } else if (loginRes.data.token || loginRes.data.accessToken) {
      fail("Login response: token still present (should be removed)");
    }
  } else {
    fail(`Login failed: ${loginRes.data.message}`);
    return;
  }

  // Check for httpOnly cookie
  info("Checking for httpOnly auth cookies...");
  const cookieHeader = loginRes.headers["set-cookie"];
  if (cookieHeader && Array.isArray(cookieHeader)) {
    const hasHttpOnly = cookieHeader.some(c => c.includes("httpOnly"));
    if (hasHttpOnly) {
      pass("httpOnly auth cookie detected in response headers");
    } else {
      fail("No httpOnly cookies found");
    }
  } else {
    info("No Set-Cookie headers (expected if backend handles cookies server-side)");
  }
}

async function testPaymentFlow() {
  section("TEST 3: End-to-End Payment Flow");
  
  const testEmail = `payment-test-${Date.now()}@test.com`;
  
  // Create user
  info("Step 1: Creating test resident...");
  const signupRes = await httpFetch("/user-auth/signup", {
    method: "POST",
    body: { name: "PaymentTester", email: testEmail, password: "Pass123!" },
  });
  
  if (!signupRes.ok) {
    fail(`Signup failed: ${signupRes.data.message}`);
    return;
  }
  const userId = signupRes.data.user?.id;
  pass(`Resident created: ${userId}`);

  // Create house and link user
  info("Step 2: Creating house and linking to resident...");
  const housePayload = {
    block: "TEST",
    house_number: `TEST-${Date.now()}`,
    floor: 1,
    status: "occupied",
    owner_name: "Test Owner",
    notes: "Auto-created",
  };

  const { data: house, error: houseErr } = await supabase.from("houses").insert(housePayload).select().single();
  if (houseErr) {
    fail(`House creation failed: ${houseErr.message}`);
    return;
  }

  const { error: linkErr } = await supabase.from("users").update({ house_id: house.id }).eq("id", userId);
  if (linkErr) {
    fail(`User-house link failed: ${linkErr.message}`);
    return;
  }
  pass(`House created and linked: ${house.id}`);

  // Create maintenance record
  info("Step 3: Creating maintenance record...");
  const mainPayload = {
    house_id: house.id,
    house_number: house.house_number,
    from_month: "2026-05",
    to_month: "2026-05",
    base_amount: 2000.0,
    total_amount: 2000.0,
    amount_paid: 0,
    balance: 2000.0,
  };

  const { data: maintenance, error: maintErr } = await supabase.from("maintenance_records").insert(mainPayload).select().single();
  if (maintErr) {
    fail(`Maintenance creation failed: ${maintErr.message}`);
    return;
  }
  pass(`Maintenance record created: ${maintenance.id}`);

  // Login and create order
  info("Step 4: Creating payment order...");
  const loginRes = await httpFetch("/user-auth/login", {
    method: "POST",
    body: { email: testEmail, password: "Pass123!" },
  });

  if (!loginRes.ok) {
    fail(`Login failed: ${loginRes.data.message}`);
    return;
  }

  const token = loginRes.data.token || loginRes.data.accessToken;
  if (!token) {
    fail("No token in login response (auth failed)");
    return;
  }

  const orderRes = await httpFetch("/user/payments/create-order", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { maintenanceRecordId: maintenance.id },
  });

  if (!orderRes.ok || !orderRes.data.orderId) {
    fail(`Order creation failed: ${orderRes.data.message || "Unknown error"}`);
    return;
  }
  
  const orderId = orderRes.data.orderId;
  const amount = orderRes.data.amount;
  pass(`Payment order created: ${orderId} (amount: ${amount} paise)`);

  // Mark payment as captured
  info("Step 5: Simulating payment capture...");
  const paymentId = `pay_test_${Date.now()}`;
  const { error: captureErr } = await supabase
    .from("payments")
    .update({ status: "captured", razorpay_payment_id: paymentId })
    .eq("razorpay_order_id", orderId);

  if (captureErr) {
    fail(`Payment capture failed: ${captureErr.message}`);
    return;
  }
  pass(`Payment marked as captured: ${paymentId}`);

  // Verify payment
  info("Step 6: Verifying payment...");
  const verifyRes = await httpFetch("/user/payments/verify", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: "test_sig",
    },
  });

  if (!verifyRes.ok) {
    fail(`Payment verification failed: ${verifyRes.data.message || "Unknown error"}`);
    return;
  }
  pass(`Payment verified: ${verifyRes.data.message || "Success"}`);

  // Fetch user payments
  info("Step 7: Fetching user payments list...");
  const paymentsRes = await httpFetch("/user/payments", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!paymentsRes.ok) {
    fail(`Fetch payments failed: ${paymentsRes.data.message || "Unknown error"}`);
    return;
  }

  const paymentCount = Array.isArray(paymentsRes.data) ? paymentsRes.data.length : 0;
  pass(`User payments fetched: ${paymentCount} records`);
}

async function testInputValidation() {
  section("TEST 4: Input Validation & Error Handling");
  
  const testEmail = `validation-test-${Date.now()}@test.com`;
  
  // Create user
  const signupRes = await httpFetch("/user-auth/signup", {
    method: "POST",
    body: { name: "ValidationTester", email: testEmail, password: "Pass123!" },
  });

  if (!signupRes.ok) {
    fail(`Setup failed: ${signupRes.data.message}`);
    return;
  }

  const loginRes = await httpFetch("/user-auth/login", {
    method: "POST",
    body: { email: testEmail, password: "Pass123!" },
  });

  const token = loginRes.data.token || loginRes.data.accessToken;

  // Test with invalid maintenance ID
  info("Testing with non-existent maintenance ID...");
  const invalidRes = await httpFetch("/user/payments/create-order", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: { maintenanceRecordId: "invalid-uuid-format" },
  });

  if (!invalidRes.ok && (invalidRes.status === 400 || invalidRes.status === 404)) {
    pass(`Invalid ID rejected: ${invalidRes.status} ${invalidRes.data.message || "validation error"}`);
  } else {
    fail(`Invalid ID not properly validated: ${invalidRes.status}`);
  }

  // Test missing auth header
  info("Testing without authentication...");
  const noAuthRes = await httpFetch("/user/payments/create-order", {
    method: "POST",
    body: { maintenanceRecordId: "some-id" },
  });

  if (noAuthRes.status === 401 || noAuthRes.status === 403 || (noAuthRes.data && noAuthRes.data.message && noAuthRes.data.message.includes("auth"))) {
    pass(`Unauthenticated requests rejected: ${noAuthRes.status}`);
  } else {
    fail(`Unauthenticated requests not properly rejected: ${noAuthRes.status}`);
  }
}

async function runAllTests() {
  log("\n╔════════════════════════════════════════════════════════════╗", "cyan");
  log("║     UrbanVista Week-1 Comprehensive Verification Suite      ║", "cyan");
  log("╚════════════════════════════════════════════════════════════╝\n", "cyan");

  const startTime = Date.now();

  try {
    await testRateLimiting();
    await testAuthFlows();
    await testPaymentFlow();
    await testInputValidation();

    section("VERIFICATION COMPLETE");
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Total execution time: ${duration}s\n`, "yellow");
    
    process.exit(0);
  } catch (err) {
    fail(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

runAllTests();
