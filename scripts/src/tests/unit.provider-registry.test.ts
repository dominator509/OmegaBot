import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "development";
const providerModule = await import("../../../artifacts/api-server/src/lib/provider-registry.ts");
const { providerRegistry, DEFAULT_PROVIDERS } = providerModule;

test("provider registry upsert creates and masks API key in public response", () => {
  providerRegistry.hydrate(DEFAULT_PROVIDERS);

  const created = providerRegistry.upsert({
    id: "unit-provider",
    name: "Unit Provider",
    type: "openai-compat",
    baseUrl: "https://example.invalid/v1",
    apiKey: "abcd1234secret5678",
    enabled: true,
    models: [],
  });

  assert.equal(created.id, "unit-provider");
  assert.equal(created.hasApiKey, true);
  assert.notEqual(created.apiKey, "abcd1234secret5678");
  assert.match(created.apiKey, /^abcd/);
});

test("provider registry patch retains previous API key when blank patch is passed", () => {
  const first = providerRegistry.upsert({
    id: "unit-provider-2",
    name: "Unit Provider 2",
    type: "openai-compat",
    baseUrl: "https://example.invalid/v1",
    apiKey: "persist-me-12345678",
    enabled: false,
    models: [],
  });
  assert.equal(first.hasApiKey, true);

  const patched = providerRegistry.patch("unit-provider-2", {
    apiKey: "",
    enabled: true,
  });

  assert.ok(patched);
  assert.equal(patched?.hasApiKey, true);
  assert.equal(providerRegistry.getById("unit-provider-2")?.enabled, true);
});
