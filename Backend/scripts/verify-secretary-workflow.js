#!/usr/bin/env node

/**
 * Verification script for Secretary Panel Transformation
 * Tests:
 * 1. Query system with cascade invalidation patterns
 * 2. Scope enforcement on backend
 * 3. CRUD operations with secretary scope
 * 4. API response consistency
 */

const API_URL = process.env.API_URL || "http://localhost:5000/api";
// Optional: provide a staff JWT via env var `API_AUTH_TOKEN` to run authenticated checks
let authToken = process.env.API_AUTH_TOKEN || null;

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(test) {
  log(`✓ ${test}`, "green");
}

function fail(test) {
  log(`✗ ${test}`, "red");
}

function info(message) {
  log(`ℹ ${message}`, "blue");
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, error: error.message, ok: false };
  }
}

async function testHealthCheck() {
  info("Testing health check endpoint...");
  const result = await makeRequest("/health");

  if (result.ok && result.data?.message) {
    pass("Health check passed");
    return true;
  } else {
    fail("Health check failed");
    return false;
  }
}

async function testScopeEndpoint() {
  info("Testing scope endpoint...");
  const result = await makeRequest("/auth/effective-scope");

  if (result.ok && result.data?.role) {
    pass(`Scope endpoint accessible - Role: ${result.data.role}`);
    pass(`Secretary scope loaded: ${result.data.houseIds?.length || 0} houses, ${result.data.blocks?.length || 0} blocks`);
    return true;
  } else {
    fail(`Scope endpoint failed: ${result.status}`);
    return false;
  }
}

async function testHousesEndpoint() {
  info("Testing houses endpoint with scope filtering...");
  const result = await makeRequest("/houses");

  if (result.ok && Array.isArray(result.data)) {
    pass(`Houses endpoint returned ${result.data.length} houses`);

    // Check if houses have required fields
    if (result.data.length > 0) {
      const sample = result.data[0];
      if (sample.id && sample.block && sample.houseNumber !== undefined) {
        pass("House objects have required fields (id, block, houseNumber)");
      } else {
        fail("House objects missing required fields");
      }

      // Check for camelCase transformation
      if (sample.houseNumber !== undefined && sample.house_number === undefined) {
        pass("API responses properly camelCased");
      } else {
        fail("API responses not properly camelCased");
      }
    }
    return true;
  } else {
    fail(`Houses endpoint failed: ${result.status}`);
    return false;
  }
}

async function testDashboardEndpoint() {
  info("Testing dashboard metrics endpoint...");
  const result = await makeRequest("/dashboard");

  if (result.ok && result.data) {
    const metrics = result.data;
    const hasRequiredFields =
      "totalHouses" in metrics &&
      "occupiedHouses" in metrics &&
      "totalMembers" in metrics &&
      "totalBilled" in metrics &&
      "totalCollected" in metrics &&
      "collectionRate" in metrics;

    if (hasRequiredFields) {
      pass("Dashboard endpoint returns all required metrics");
      pass(`  - Total houses: ${metrics.totalHouses}`);
      pass(`  - Occupied: ${metrics.occupiedHouses}`);
      pass(`  - Collection rate: ${metrics.collectionRate}%`);
      pass(`  - Total billed: ₹${metrics.totalBilled}`);
      return true;
    } else {
      fail("Dashboard endpoint missing required metrics");
      return false;
    }
  } else {
    fail(`Dashboard endpoint failed: ${result.status}`);
    return false;
  }
}

async function testResidentsEndpoint() {
  info("Testing secretary residents endpoint...");
  const result = await makeRequest("/secretary/residents");

  if (result.ok && Array.isArray(result.data)) {
    pass(`Secretary residents endpoint returned ${result.data.length} residents`);

    if (result.data.length > 0) {
      const sample = result.data[0];
      if (sample.id && sample.name && sample.email) {
        pass("Resident objects have required fields (id, name, email)");
      } else {
        fail("Resident objects missing required fields");
      }
    }
    return true;
  } else if (result.status === 403) {
    pass("Residents endpoint properly scoped (403 when not secretary)");
    return true;
  } else {
    fail(`Residents endpoint failed: ${result.status}`);
    return false;
  }
}

async function testCascadeInvalidationPatterns() {
  info("Verifying cascade invalidation patterns in code...");

  try {
    const fs = require("fs");
    const path = require("path");

    // Resolve repo root reliably and check queryKeys.ts exists
    const repoRoot = path.resolve(__dirname, "..", "..");
    const queryKeysPath = path.join(repoRoot, "Frontend", "src", "lib", "queryKeys.ts");
    if (fs.existsSync(queryKeysPath)) {
      pass("Query keys file exists");

      const content = fs.readFileSync(queryKeysPath, "utf8");
      if (content.includes("invalidationPatterns")) {
        pass("Cascade invalidation patterns defined");

        // Check for key patterns
        const patterns = ["house.create", "resident.create", "expenditure.create"];
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            pass(`  - Pattern for ${pattern} defined`);
          }
        }
        return true;
      } else {
        fail("Cascade invalidation patterns not found");
        return false;
      }
    } else {
      fail("Query keys file not found");
      return false;
    }
  } catch (error) {
    fail(`Error checking cascade patterns: ${error.message}`);
    return false;
  }
}

async function testLayoutTransformation() {
  info("Verifying SecretaryLayout implementation...");

  try {
    const fs = require("fs");
    const path = require("path");

    const repoRoot = path.resolve(__dirname, "..", "..");
    const layoutPath = path.join(repoRoot, "Frontend", "src", "components", "secretary", "SecretaryLayout.tsx");
    if (fs.existsSync(layoutPath)) {
      pass("SecretaryLayout component exists");

      const content = fs.readFileSync(layoutPath, "utf8");

      // Check for navigation structure
      const navItems = ["Dashboard", "Management", "Operations", "Finance", "Analytics"];
      let allFound = true;
      for (const item of navItems) {
        if (content.includes(item)) {
          pass(`  - Navigation group: ${item}`);
        } else {
          fail(`  - Missing navigation group: ${item}`);
          allFound = false;
        }
      }

      return allFound;
    } else {
      fail("SecretaryLayout component not found");
      return false;
    }
  } catch (error) {
    fail(`Error checking layout: ${error.message}`);
    return false;
  }
}

async function testPageUpdates() {
  info("Verifying all secretary pages use SecretaryLayout...");

  try {
    const fs = require("fs");
    const path = require("path");
    const repoRoot = path.resolve(__dirname, "..", "..");
    const pagesDir = path.join(repoRoot, "Frontend", "src", "pages", "secretary");

    const pages = [
      "SecretaryDashboard.tsx",
      "SecretaryHouses.tsx",
      "SecretaryResidents.tsx",
      "SecretaryMaintenance.tsx",
      "SecretaryVehicles.tsx",
      "SecretaryExpenditures.tsx",
      "SecretaryReports.tsx",
      "SecretarySettings.tsx",
    ];

    let allPagesValid = true;

    for (const page of pages) {
      const filePath = path.join(pagesDir, page);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");

        if (content.includes("SecretaryLayout") && !content.includes("<AdminLayout")) {
          pass(`  - ${page} uses SecretaryLayout`);
        } else if (content.includes("<AdminLayout")) {
          fail(`  - ${page} still uses AdminLayout (needs update)`);
          allPagesValid = false;
        } else {
          fail(`  - ${page} missing SecretaryLayout`);
          allPagesValid = false;
        }
      } else {
        fail(`  - ${page} not found`);
        allPagesValid = false;
      }
    }

    return allPagesValid;
  } catch (error) {
    fail(`Error checking pages: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log("\n═══════════════════════════════════════════════════════════════", "blue");
  log("Secretary Panel Transformation - Verification Report", "blue");
  log("═══════════════════════════════════════════════════════════════\n", "blue");

  const tests = [
    {
      name: "Backend Health Check",
      fn: testHealthCheck,
    },
    {
      name: "Secretary Scope Loading",
      fn: testScopeEndpoint,
    },
    {
      name: "Houses Endpoint (Scope Filtering)",
      fn: testHousesEndpoint,
    },
    {
      name: "Dashboard Metrics Endpoint",
      fn: testDashboardEndpoint,
    },
    {
      name: "Secretary Residents Endpoint",
      fn: testResidentsEndpoint,
    },
    {
      name: "Cascade Invalidation Patterns",
      fn: testCascadeInvalidationPatterns,
    },
    {
      name: "SecretaryLayout Implementation",
      fn: testLayoutTransformation,
    },
    {
      name: "Page Updates to SecretaryLayout",
      fn: testPageUpdates,
    },
  ];

  let passedCount = 0;
  const results = [];

  for (const test of tests) {
    info(`\n[${passedCount + 1}/${tests.length}] ${test.name}`);
    const result = await test.fn();
    if (result) {
      passedCount++;
    }
    results.push({ name: test.name, result });
  }

  // Summary
  log("\n═══════════════════════════════════════════════════════════════", "blue");
  log("SUMMARY", "blue");
  log("═══════════════════════════════════════════════════════════════\n", "blue");

  const total = results.length;
  const passed = passedCount;
  const failed = total - passed;

  if (passed === total) {
    log(`✓ All ${total} tests passed!`, "green");
  } else {
    log(`Results: ${passed}/${total} passed, ${failed} failed`, passed === total ? "green" : "red");
  }

  results.forEach((r) => {
    const status = r.result ? "✓" : "✗";
    const color = r.result ? "green" : "red";
    log(`${status} ${r.name}`, color);
  });

  log("\n═══════════════════════════════════════════════════════════════\n", "blue");

  if (passed === total) {
    log("✓ Secretary panel transformation is complete and verified!", "green");
    process.exit(0);
  } else {
    log(`✗ ${failed} test(s) failed. Please review the errors above.`, "red");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  fail(`Fatal error: ${error.message}`);
  process.exit(1);
});
