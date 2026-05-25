import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { makeProviderPayload, makeTaskPayload } from "./fixtures.ts";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let tmpDir = "";

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.text();
  return {
    status: response.status,
    body: body ? JSON.parse(body) : null,
  };
}

before(async () => {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "integration-provider-secret-key-0123456789";
  delete process.env.DATABASE_URL;
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "omegabot-integration-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  const { initializePlatformState, closePlatformState } = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
  await initializePlatformState();

  const app = (await import("../../../artifacts/api-server/src/app.ts")).default;
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }
  baseUrl = `http://127.0.0.1:${address.port}/api`;

  closeServer = async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePlatformState();
  };
});

after(async () => {
  if (closeServer) {
    await closeServer();
  }
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test("integration: task create/read serializes payload correctly", async () => {
  const createRes = await json(`${baseUrl}/tasks`, {
    method: "POST",
    body: JSON.stringify(makeTaskPayload()),
  });
  assert.equal(createRes.status, 201);
  assert.equal(createRes.body?.name, "Fixture Task");

  const listRes = await json(`${baseUrl}/tasks`);
  assert.equal(listRes.status, 200);
  assert.equal(Array.isArray(listRes.body?.items), true);
  assert.equal(listRes.body.items.some((item: { id?: string }) => item.id === createRes.body.id), true);
});

test("integration: provider upsert/read masks secret and preserves contract", async () => {
  const upsertRes = await json(`${baseUrl}/providers/integration-provider`, {
    method: "PUT",
    body: JSON.stringify(makeProviderPayload()),
  });
  assert.equal(upsertRes.status, 200);
  assert.equal(upsertRes.body?.id, "integration-provider");
  assert.equal(upsertRes.body?.hasApiKey, true);
  assert.notEqual(upsertRes.body?.apiKey, "fixture-provider-key-12345678");

  const getRes = await json(`${baseUrl}/providers/integration-provider`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body?.id, "integration-provider");
  assert.equal(getRes.body?.hasApiKey, true);
});

test("integration failure: rejected API payload returns 400", async () => {
  const badTask = await json(`${baseUrl}/tasks`, {
    method: "POST",
    body: JSON.stringify({ description: "missing required name" }),
  });
  assert.equal(badTask.status, 400);
  assert.ok(typeof badTask.body?.error === "string");
});

test("integration failure: schema mismatch returns 400 for settings update", async () => {
  const badSettings = await json(`${baseUrl}/settings`, {
    method: "PATCH",
    body: JSON.stringify({ maxRetries: "not-a-number" }),
  });
  assert.equal(badSettings.status, 400);
  assert.ok(typeof badSettings.body?.error === "string");
});

test("integration failure: invalid approval state transition returns 409", async () => {
  const rejectRes = await json(`${baseUrl}/approvals/appr-001/reject`, {
    method: "POST",
    body: JSON.stringify({ decidedBy: "integration-test", reason: "reject once" }),
  });
  assert.equal(rejectRes.status, 200);

  const approveRes = await json(`${baseUrl}/approvals/appr-001/approve`, {
    method: "POST",
    body: JSON.stringify({ decidedBy: "integration-test", reason: "second decision" }),
  });
  assert.equal(approveRes.status, 409);
  assert.ok(typeof approveRes.body?.error === "string");
});

test("integration failure: persistence-layer secret configuration error degrades with 500", async () => {
  const previous = process.env.PROVIDER_SECRET_KEY;
  delete process.env.PROVIDER_SECRET_KEY;
  try {
    const res = await json(`${baseUrl}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ systemName: "Should Fail Persist" }),
    });
    assert.equal(res.status, 500);
    assert.ok(typeof res.body?.error === "string");
  } finally {
    process.env.PROVIDER_SECRET_KEY = previous;
  }
});
