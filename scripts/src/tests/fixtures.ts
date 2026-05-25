export function makeTaskPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Fixture Task",
    description: "Created from fixture",
    adapter: "custom",
    priority: "low",
    tags: ["fixture"],
    idempotencyKey: `fixture-${Date.now()}`,
    writeSafe: true,
    ...overrides,
  };
}

export function makeProviderPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Fixture Provider",
    type: "openai-compat",
    baseUrl: "https://example.invalid/v1",
    apiKey: "fixture-provider-key-12345678",
    enabled: true,
    models: [
      {
        id: "fixture-model",
        name: "Fixture Model",
        contextWindow: 128000,
        capabilities: ["text"],
        costPer1kTokens: 0,
        avgLatencyMs: 1000,
      },
    ],
    ...overrides,
  };
}
