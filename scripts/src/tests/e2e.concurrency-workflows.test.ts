import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { makeTaskPayload } from "./fixtures.ts";

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
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "e2e-provider-secret-key-012345678901";
  delete process.env.DATABASE_URL;
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "omegabot-e2e-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  const { initializePlatformState, closePlatformState } = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
  await initializePlatformState();
  const app = (await import("../../../artifacts/api-server/src/app.ts")).default;

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to start e2e server");
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

test("e2e workflow: task -> command -> approval decision -> settings update", async () => {
  const createTaskRes = await json(`${baseUrl}/tasks`, {
    method: "POST",
    body: JSON.stringify(makeTaskPayload({ name: "E2E Task Alpha" })),
  });
  assert.equal(createTaskRes.status, 201);
  const taskId = createTaskRes.body?.id as string;
  assert.ok(taskId);

  const createCommandRes = await json(`${baseUrl}/commands`, {
    method: "POST",
    body: JSON.stringify({
      name: "E2E Command Alpha",
      type: "write",
      description: "E2E command",
      requiresApproval: true,
      isHighRisk: false,
      adapter: "custom",
      payload: { taskId },
    }),
  });
  assert.equal(createCommandRes.status, 201);
  assert.equal(createCommandRes.body?.status, "awaiting_approval");

  const rejectRes = await json(`${baseUrl}/approvals/appr-002/reject`, {
    method: "POST",
    body: JSON.stringify({
      decidedBy: "e2e-suite",
      reason: "workflow check",
    }),
  });
  assert.equal(rejectRes.status, 200);
  assert.equal(rejectRes.body?.status, "rejected");

  const settingsRes = await json(`${baseUrl}/settings`, {
    method: "PATCH",
    body: JSON.stringify({ systemName: "OmegaBot E2E" }),
  });
  assert.equal(settingsRes.status, 200);
  assert.equal(settingsRes.body?.systemName, "OmegaBot E2E");

  const approvalsRes = await json(`${baseUrl}/approvals`);
  assert.equal(approvalsRes.status, 200);
  assert.equal(
    approvalsRes.body?.items.some((item: { id?: string; status?: string }) => item.id === "appr-002" && item.status === "rejected"),
    true,
  );
});

test("concurrency: parallel task creation preserves state integrity", async () => {
  const beforeList = await json(`${baseUrl}/tasks`);
  assert.equal(beforeList.status, 200);
  const beforeTotal = Number(beforeList.body?.total ?? 0);

  const count = 40;
  const responses = await Promise.all(
    Array.from({ length: count }, (_, index) => json(`${baseUrl}/tasks`, {
      method: "POST",
      body: JSON.stringify(makeTaskPayload({
        name: `Concurrency Task ${index}`,
        idempotencyKey: `concurrency-${index}-${Date.now()}`,
      })),
    })),
  );

  assert.equal(responses.every((response) => response.status === 201), true);

  const afterList = await json(`${baseUrl}/tasks`);
  assert.equal(afterList.status, 200);
  const afterTotal = Number(afterList.body?.total ?? 0);

  assert.equal(afterTotal - beforeTotal, count);
});
