import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

process.env.NODE_ENV = "development";
process.env.PROVIDER_SECRET_KEY = "whitebox-provider-secret-key-012345678901";
delete process.env.DATABASE_URL;

const stateMod = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
const secretStore = await import("../../../artifacts/api-server/src/lib/secret-store.ts");

test("phase2 state tracking: settings lifecycle persists across close/re-init", async (t) => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "whitebox-state-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  await t.test("initialize -> mutate -> close", async () => {
    await stateMod.initializePlatformState();
    const before = stateMod.getSettings();
    assert.equal(typeof before.systemName, "string");

    const updated = await stateMod.updateSettings({
      systemName: "Whitebox Deterministic",
      maxRetries: 9,
    });
    assert.equal(updated.systemName, "Whitebox Deterministic");
    assert.equal(updated.maxRetries, 9);
    await stateMod.closePlatformState();
  });

  await t.test("re-initialize reads persisted values", async () => {
    await stateMod.initializePlatformState();
    const after = stateMod.getSettings();
    assert.equal(after.systemName, "Whitebox Deterministic");
    assert.equal(after.maxRetries, 9);
    await stateMod.closePlatformState();
  });

  await rm(tmpDir, { recursive: true, force: true });
});

test("phase2 state tracking: workflow overwrite semantics preserve latest set only", async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "whitebox-workflow-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");
  await stateMod.initializePlatformState();

  await stateMod.setWorkflowItems("tasks", [
    { id: "t-1", name: "Task One", status: "pending" },
  ]);
  await stateMod.setWorkflowItems("tasks", [
    { id: "t-2", name: "Task Two", status: "running" },
  ]);
  const items = stateMod.getWorkflowItems("tasks", []);
  assert.deepEqual(items.map((item) => item.id), ["t-2"]);

  await stateMod.closePlatformState();
  await rm(tmpDir, { recursive: true, force: true });
});

test("phase2 edge injection: decryptSecret malformed payload and missing key paths are guarded", async () => {
  assert.throws(
    () => secretStore.decryptSecret("enc:v1:.bad.parts"),
    /Invalid encrypted secret format/,
  );

  const encrypted = secretStore.encryptSecret("stateful-secret");
  const previous = process.env.PROVIDER_SECRET_KEY;
  delete process.env.PROVIDER_SECRET_KEY;
  try {
    assert.throws(
      () => secretStore.decryptSecret(encrypted),
      /PROVIDER_SECRET_KEY is required to decrypt provider secrets/,
    );
  } finally {
    process.env.PROVIDER_SECRET_KEY = previous;
  }
});
