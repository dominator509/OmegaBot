import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "development";
process.env.PROVIDER_SECRET_KEY = "unit-test-provider-secret-key-012345678901";

const secretStore = await import("../../../artifacts/api-server/src/lib/secret-store.ts");

test("secret-store encrypt/decrypt roundtrip is deterministic per value contract", () => {
  const raw = "sk-live-secret-value";
  const encrypted = secretStore.encryptSecret(raw);

  assert.ok(secretStore.isEncryptedSecret(encrypted));
  assert.notEqual(encrypted, raw);
  assert.equal(secretStore.decryptSecret(encrypted), raw);
});

test("secret-store leaves empty and pre-encrypted values untouched", () => {
  assert.equal(secretStore.encryptSecret(""), "");

  const encrypted = secretStore.encryptSecret("another-secret");
  assert.equal(secretStore.encryptSecret(encrypted), encrypted);
});

test("secret-store rejects malformed encrypted payloads", () => {
  assert.throws(
    () => secretStore.decryptSecret("enc:v1:.bad.parts"),
    /Invalid encrypted secret format/,
  );
});
