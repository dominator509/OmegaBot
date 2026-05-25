import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile, readdir } from "node:fs/promises";

const platformState = await import("../../../artifacts/api-server/src/lib/platform-state.ts");

let cleanupDirs: string[] = [];

async function withServer() {
  const app = (await import("../../../artifacts/api-server/src/app.ts")).default;
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }
  return {
    baseUrl: `http://127.0.0.1:${address.port}/api`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function json(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const bodyText = await response.text();
  return {
    status: response.status,
    body: bodyText ? JSON.parse(bodyText) : null,
  };
}

afterEach(async () => {
  await platformState.closePlatformState();
  for (const dir of cleanupDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  cleanupDirs = [];
});

test("phase4 exception path: malformed persisted state is quarantined with corrupt backup", async () => {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "phase4-provider-secret-key-012345678901";
  delete process.env.DATABASE_URL;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "whitebox-corrupt-state-"));
  cleanupDirs.push(tmpDir);
  const statePath = path.join(tmpDir, "state.json");
  process.env.OMEGABOT_STATE_FILE = statePath;

  await writeFile(statePath, "{ malformed json", "utf8");
  await platformState.initializePlatformState();

  const files = await readdir(tmpDir);
  const hasCorruptBackup = files.some((name) => name.startsWith("state.json.corrupt-"));
  assert.equal(hasCorruptBackup, true);
});

test("phase4 taint path: unknown task keys are rejected and not persisted", async () => {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "phase4-provider-secret-key-012345678901";
  delete process.env.DATABASE_URL;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "whitebox-taint-task-"));
  cleanupDirs.push(tmpDir);
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  await platformState.initializePlatformState();
  const { baseUrl, close } = await withServer();
  try {
    const createRes = await json(`${baseUrl}/tasks`, {
      method: "POST",
      body: JSON.stringify({
        name: "tainted-task",
        payload: { hidden: "sink-attempt" },
      }),
    });
    assert.equal(createRes.status, 400);
    assert.ok(typeof createRes.body?.error === "string");

    const listRes = await json(`${baseUrl}/tasks`);
    assert.equal(listRes.status, 200);
    const ids = (listRes.body?.items ?? []).map((item: { name?: string }) => item.name);
    assert.equal(ids.includes("tainted-task"), false);
  } finally {
    await close();
  }
});

test("phase4 exception path: internal failures return structured errors without stack leakage", async () => {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "phase4-provider-secret-key-012345678901";
  delete process.env.DATABASE_URL;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "whitebox-error-boundary-"));
  cleanupDirs.push(tmpDir);
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  await platformState.initializePlatformState();
  const { baseUrl, close } = await withServer();
  const previous = process.env.PROVIDER_SECRET_KEY;
  delete process.env.PROVIDER_SECRET_KEY;
  try {
    const res = await json(`${baseUrl}/settings`, {
      method: "PATCH",
      body: JSON.stringify({ systemName: "force-persist-error" }),
    });
    assert.equal(res.status, 500);
    assert.ok(typeof res.body?.error === "string");
    assert.equal(typeof res.body?.stack, "undefined");
  } finally {
    process.env.PROVIDER_SECRET_KEY = previous;
    await close();
  }
});
