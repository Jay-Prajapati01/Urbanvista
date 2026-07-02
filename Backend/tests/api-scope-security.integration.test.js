const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const path = require("path");
const { HttpSession } = require("../scripts/httpSession");

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

  const up = await waitForHealth(25000);
  if (!up) {
    child.kill("SIGTERM");
    throw new Error("Backend did not become healthy in time for integration tests");
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

let backend = null;
let admin = null;
let secretary = null;
let secretaryId = null;
let secretaryUsername = null;
let secretaryPassword = "sec1234";
let allowedHouseId = null;
let outScopeHouseId = null;

async function loginAdmin() {
  admin = new HttpSession(BASE_URL);
  const response = await admin.request("POST", "/api/auth/login", {
    json: {
      email: "admin@urbanvista.com",
      password: "admin123",
    },
  });
  assert.equal(response.status, 200, `Admin login failed: ${JSON.stringify(response.body)}`);
}

async function loginSecretary() {
  secretary = new HttpSession(BASE_URL);
  const response = await secretary.request("POST", "/api/auth/login", {
    json: {
      username: secretaryUsername,
      password: secretaryPassword,
    },
  });
  assert.equal(response.status, 200, `Secretary login failed: ${JSON.stringify(response.body)}`);
}

test.before(async () => {
  backend = await ensureBackendRunning();
  await loginAdmin();

  const runId = Date.now();
  secretaryUsername = `itest.sec.${runId}`;
  const secretaryEmail = `itest.sec.${runId}@urbanvista.local`;

  const createSecretary = await admin.request("POST", "/api/admin/secretaries", {
    withCsrf: true,
    json: {
      name: "Integration Secretary",
      email: secretaryEmail,
      username: secretaryUsername,
      temporaryPassword: secretaryPassword,
      assignments: [
        { assignmentType: "block", block: "C" },
        { assignmentType: "block", block: "D" },
      ],
    },
  });

  assert.equal(createSecretary.status, 201, `Create secretary setup failed: ${JSON.stringify(createSecretary.body)}`);
  secretaryId = createSecretary.body.id;

  await loginSecretary();

  const outScopeHouse = await admin.request("POST", "/api/houses", {
    withCsrf: true,
    json: {
      block: "Z",
      houseNumber: `ITEST-Z-${String(runId).slice(-6)}`,
      floor: 1,
    },
  });

  assert.equal(outScopeHouse.status, 201, `Out-of-scope admin house setup failed: ${JSON.stringify(outScopeHouse.body)}`);
  outScopeHouseId = outScopeHouse.body.id;
});

test.after(async () => {
  if (allowedHouseId) {
    await admin.request("DELETE", `/api/houses/${allowedHouseId}`, { withCsrf: true });
  }
  if (outScopeHouseId) {
    await admin.request("DELETE", `/api/houses/${outScopeHouseId}`, { withCsrf: true });
  }
  if (secretaryId) {
    await admin.request("POST", `/api/admin/secretaries/${secretaryId}/disable`, { withCsrf: true, json: {} });
  }
  if (backend?.startedHere) {
    await backend.stop();
  }
});

test("1) Admin creates secretary with multiple block assignments", async () => {
  const response = await admin.request("GET", `/api/admin/secretaries/${secretaryId}`);
  assert.equal(response.status, 200);

  const assignedBlocks = response.body?.assignedBlocks || [];
  assert.deepEqual(assignedBlocks.sort(), ["C", "D"]);
});

test("2) Admin edits assignments and assignedBlocks is synchronized", async () => {
  const update = await admin.request("PUT", `/api/admin/secretaries/${secretaryId}/assignments`, {
    withCsrf: true,
    json: {
      assignments: [
        { assignmentType: "block", block: "E" },
        { assignmentType: "block", block: "F" },
      ],
    },
  });

  assert.equal(update.status, 200, JSON.stringify(update.body));
  assert.deepEqual((update.body.assignedBlocks || []).sort(), ["E", "F"]);
});

test("3) Password reset enforces minimum 6 characters", async () => {
  const resetShort = await admin.request("POST", `/api/admin/secretaries/${secretaryId}/reset-password`, {
    withCsrf: true,
    json: {
      temporaryPassword: "12345",
    },
  });

  assert.equal(resetShort.status, 400, JSON.stringify(resetShort.body));
});

test("4) Secretary can create in assigned block and cannot create in unassigned block", async () => {
  const runId = Date.now();

  const allowedCreate = await secretary.request("POST", "/api/houses", {
    withCsrf: true,
    json: {
      block: "E",
      houseNumber: `ITEST-E-${String(runId).slice(-6)}`,
      floor: 1,
    },
  });

  assert.equal(allowedCreate.status, 201, JSON.stringify(allowedCreate.body));
  allowedHouseId = allowedCreate.body.id;

  const deniedCreate = await secretary.request("POST", "/api/houses", {
    withCsrf: true,
    json: {
      block: "Z",
      houseNumber: `ITEST-Z-DENY-${String(runId).slice(-6)}`,
      floor: 2,
    },
  });

  assert.equal(deniedCreate.status, 403, JSON.stringify(deniedCreate.body));
});

test("5) Settlement creation rejects out-of-scope line items", async () => {
  const deniedSettlement = await secretary.request("POST", "/api/settlements", {
    withCsrf: true,
    json: {
      scopeType: "block",
      block: "E",
      title: "Integration settlement scope test",
      items: [
        {
          itemType: "manual",
          houseId: outScopeHouseId,
          amount: 200,
          description: "Out of scope house",
        },
      ],
    },
  });

  assert.equal(deniedSettlement.status, 403, JSON.stringify(deniedSettlement.body));
});
