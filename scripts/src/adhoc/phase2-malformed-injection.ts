import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

type AttackCase = {
  id: string;
  hypothesis: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  body: unknown;
};

type AttackResult = {
  id: string;
  hypothesis: string;
  endpoint: string;
  method: string;
  status: number;
  responseSnippet: string;
  graceful: boolean;
};

function deepObject(depth: number): unknown {
  let root: Record<string, unknown> = { value: "leaf" };
  for (let i = 0; i < depth; i += 1) {
    root = { nest: root };
  }
  return root;
}

async function run(): Promise<void> {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "adhoc-phase2-provider-secret-0123456789";
  delete process.env.DATABASE_URL;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omegabot-adhoc-p2-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  const logDir = path.resolve(process.cwd(), "src", "adhoc", "logs");
  await mkdir(logDir, { recursive: true });

  const { initializePlatformState, closePlatformState } = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
  const app = (await import("../../../artifacts/api-server/src/app.ts")).default;
  await initializePlatformState();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not bind ad-hoc test server");
  }
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const attacks: AttackCase[] = [
    {
      id: "p2-01",
      hypothesis: "Type mismatch in strongly typed settings path should be rejected with 4xx, not crash.",
      endpoint: "/settings",
      method: "PATCH",
      body: { maxRetries: "NaN", retryDelayMs: null },
    },
    {
      id: "p2-02",
      hypothesis: "Deeply nested task payload should reject or gracefully bound parse.",
      endpoint: "/tasks",
      method: "POST",
      body: {
        name: "deep-task",
        description: "x",
        payload: deepObject(250),
      },
    },
    {
      id: "p2-03",
      hypothesis: "Oversized string body should be bounded by parser limit and not exhaust memory.",
      endpoint: "/tasks",
      method: "POST",
      body: {
        name: "huge-description",
        description: "A".repeat(700_000),
      },
    },
    {
      id: "p2-04",
      hypothesis: "Massive integer model metadata should fail validation safely.",
      endpoint: "/providers/mal-int/models",
      method: "POST",
      body: {
        id: "big-int-model",
        name: "big-int-model",
        contextWindow: Number.MAX_SAFE_INTEGER,
        capabilities: ["text"],
        costPer1kTokens: 0,
        avgLatencyMs: 1,
      },
    },
    {
      id: "p2-05",
      hypothesis: "Malformed llm route body with null target should reject with 4xx.",
      endpoint: "/llm/routes",
      method: "POST",
      body: {
        name: "null-target",
        condition: "task.adapter == 'custom'",
        targetModelId: null,
      },
    },
    {
      id: "p2-06",
      hypothesis: "Control endpoint unknown action should reject without stack leakage.",
      endpoint: "/control",
      method: "POST",
      body: {
        action: "drop_database",
        payload: { now: true },
      },
    },
  ];

  const results: AttackResult[] = [];

  for (const attack of attacks) {
    const response = await fetch(`${baseUrl}${attack.endpoint}`, {
      method: attack.method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(attack.body),
    });
    const text = await response.text();
    results.push({
      id: attack.id,
      hypothesis: attack.hypothesis,
      endpoint: attack.endpoint,
      method: attack.method,
      status: response.status,
      responseSnippet: text.slice(0, 240),
      graceful: response.status < 500,
    });
  }

  const failures = results.filter((result) => result.status >= 500);
  const lines = [
    "# Phase 2 Malformed Injection Results",
    "",
    `Total attacks: ${results.length}`,
    `5xx failures: ${failures.length}`,
    "",
    ...results.map((result) =>
      `- ${result.id} ${result.method} ${result.endpoint} => ${result.status} | graceful=${result.graceful}`,
    ),
    "",
  ];

  await writeFile(path.join(logDir, "phase2-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(path.join(logDir, "phase2-summary.md"), `${lines.join("\n")}\n`);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closePlatformState();
  await rm(tmpDir, { recursive: true, force: true });
}

await run();
