#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const { HttpSession } = require("./httpSession");

const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";
const BACKEND_ROOT = path.resolve(__dirname, "..");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isHealthy() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isHealthy()) return true;
    await sleep(500);
  }
  return false;
}

async function ensureBackendRunning() {
  if (await isHealthy()) {
    return {
      startedHere: false,
      stop: async () => {},
    };
  }

  const child = spawn("node", ["server.js"], {
    cwd: BACKEND_ROOT,
    env: process.env,
    stdio: "pipe",
  });

  let recentOutput = "";
  child.stdout.on("data", (chunk) => {
    recentOutput += chunk.toString();
    recentOutput = recentOutput.slice(-4000);
  });
  child.stderr.on("data", (chunk) => {
    recentOutput += chunk.toString();
    recentOutput = recentOutput.slice(-4000);
  });

  const up = await waitForHealth(25000);
  if (!up) {
    child.kill("SIGTERM");
    throw new Error(`Backend did not become healthy in time. Recent output:\n${recentOutput}`);
  }

  return {
    startedHere: true,
    stop: async () => {
      child.kill("SIGTERM");
      await sleep(500);
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    },
  };
}

function expectStatus(step, response, expected) {
  if (response.status !== expected) {
    throw new Error(`${step} failed: expected ${expected}, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  }
}

async function main() {
  const backend = await ensureBackendRunning();

  const admin = new HttpSession(BASE_URL);
  const secretary = new HttpSession(BASE_URL);

  const runId = Date.now();
  const secretaryUsername = `smoke.sec.${runId}`;
  const secretaryEmail = `smoke.sec.${runId}@urbanvista.local`;
  const initialPassword = "sec1234";
  const resetPassword = "sec6789";

  let secretaryId = null;
  let allowedHouseId = null;
  let outScopeHouseId = null;

  try {
    console.log("1) Login as admin");
    const login = await admin.request("POST", "/api/auth/login", {
      json: {
        email: "admin@urbanvista.com",
        password: "admin123",
      },
    });
    expectStatus("Admin login", login, 200);

    console.log("2) Create secretary with blocks C and D");
    const created = await admin.request("POST", "/api/admin/secretaries", {
      withCsrf: true,
      json: {
        name: "Smoke Secretary",
        email: secretaryEmail,
        username: secretaryUsername,
        temporaryPassword: initialPassword,
        assignments: [
          { assignmentType: "block", block: "C" },
          { assignmentType: "block", block: "D" },
        ],
      },
    });
    expectStatus("Create secretary", created, 201);
    secretaryId = created.body?.id;

    console.log("3) Edit assignments to E and F");
    const updatedAssignments = await admin.request("PUT", `/api/admin/secretaries/${secretaryId}/assignments`, {
      withCsrf: true,
      json: {
        assignments: [
          { assignmentType: "block", block: "E" },
          { assignmentType: "block", block: "F" },
        ],
      },
    });
    expectStatus("Update assignments", updatedAssignments, 200);

    console.log("4) Reset secretary password");
    const reset = await admin.request("POST", `/api/admin/secretaries/${secretaryId}/reset-password`, {
      withCsrf: true,
      json: {
        temporaryPassword: resetPassword,
      },
    });
    expectStatus("Reset password", reset, 200);

    console.log("5) Login as secretary using reset password");
    const secLogin = await secretary.request("POST", "/api/auth/login", {
      json: {
        username: secretaryUsername,
        password: resetPassword,
      },
    });
    expectStatus("Secretary login", secLogin, 200);

    const allowedHouseNumber = `SMK-E-${String(runId).slice(-6)}`;
    const outScopeHouseNumber = `SMK-Z-${String(runId).slice(-6)}`;

    console.log("6) Secretary creates house in assigned block E (should pass)");
    const allowedHouse = await secretary.request("POST", "/api/houses", {
      withCsrf: true,
      json: {
        block: "E",
        houseNumber: allowedHouseNumber,
        floor: 1,
      },
    });
    expectStatus("Create allowed house", allowedHouse, 201);
    allowedHouseId = allowedHouse.body?.id;

    console.log("7) Secretary attempts house create in block Z (should fail)");
    const deniedCreate = await secretary.request("POST", "/api/houses", {
      withCsrf: true,
      json: {
        block: "Z",
        houseNumber: outScopeHouseNumber,
        floor: 2,
      },
    });
    expectStatus("Out-of-scope create", deniedCreate, 403);

    console.log("8) Secretary attempts to move existing house to block Z (should fail)");
    const deniedUpdate = await secretary.request("PUT", `/api/houses/${allowedHouseId}`, {
      withCsrf: true,
      json: {
        block: "Z",
      },
    });
    expectStatus("Out-of-scope block update", deniedUpdate, 403);

    console.log("9) Admin creates out-of-scope house for settlement tamper test");
    const outScopeHouse = await admin.request("POST", "/api/houses", {
      withCsrf: true,
      json: {
        block: "Z",
        houseNumber: `${outScopeHouseNumber}-ADMIN`,
        floor: 1,
      },
    });
    expectStatus("Admin out-of-scope house create", outScopeHouse, 201);
    outScopeHouseId = outScopeHouse.body?.id;

    console.log("10) Secretary submits settlement with out-of-scope line item (should fail)");
    const deniedSettlement = await secretary.request("POST", "/api/settlements", {
      withCsrf: true,
      json: {
        scopeType: "block",
        block: "E",
        title: "Smoke settlement test",
        items: [
          {
            itemType: "manual",
            houseId: outScopeHouseId,
            amount: 250,
            description: "Should be denied",
          },
        ],
      },
    });
    expectStatus("Settlement item scope enforcement", deniedSettlement, 403);

    console.log("Smoke test passed: admin flow and secretary scope checks are behaving correctly.");
  } finally {
    if (allowedHouseId) {
      await admin.request("DELETE", `/api/houses/${allowedHouseId}`, { withCsrf: true });
    }
    if (outScopeHouseId) {
      await admin.request("DELETE", `/api/houses/${outScopeHouseId}`, { withCsrf: true });
    }
    if (secretaryId) {
      await admin.request("POST", `/api/admin/secretaries/${secretaryId}/disable`, { withCsrf: true, json: {} });
    }

    if (backend.startedHere) {
      await backend.stop();
    }
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
