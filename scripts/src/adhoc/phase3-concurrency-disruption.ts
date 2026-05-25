import http from "node:http";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

type Phase3Log = {
  vector: string;
  hypothesis: string;
  observed: string;
  details: Record<string, unknown>;
};

async function run(): Promise<void> {
  process.env.NODE_ENV = "development";
  process.env.PROVIDER_SECRET_KEY = "adhoc-phase3-provider-secret-0123456789";
  delete process.env.DATABASE_URL;
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omegabot-adhoc-p3-"));
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
    throw new Error("Could not bind phase3 server");
  }
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const logs: Phase3Log[] = [];

  // Vector 1: Concurrent settings mutations
  const settingsResponses = await Promise.all(
    Array.from({ length: 60 }, (_, i) =>
      fetch(`${baseUrl}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ systemName: `chaos-settings-${i}` }),
      }).then(async (response) => response.status),
    ),
  );
  logs.push({
    vector: "p3-01-concurrent-settings",
    hypothesis: "Rapid settings writes may produce 5xx or state lockups.",
    observed: settingsResponses.every((status) => status === 200) ? "no-5xx" : "error-status-observed",
    details: {
      statusHistogram: settingsResponses.reduce<Record<string, number>>((acc, status) => {
        const key = String(status);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    },
  });

  // Vector 2: Conflicting concurrent decisions on same approval ID
  const decisionStatuses = await Promise.all([
    fetch(`${baseUrl}/approvals/appr-003/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decidedBy: "chaos-a", reason: "approve branch" }),
    }).then((response) => response.status),
    fetch(`${baseUrl}/approvals/appr-003/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decidedBy: "chaos-b", reason: "reject branch" }),
    }).then((response) => response.status),
  ]);
  logs.push({
    vector: "p3-02-conflicting-approval-race",
    hypothesis: "Concurrent state transitions may both succeed and corrupt approval state.",
    observed: decisionStatuses.filter((status) => status === 200).length === 1 ? "single-winner" : "race-anomaly",
    details: { decisionStatuses },
  });

  // Vector 3: Client disconnect mid-request (abort socket during large post)
  const abortResult = await new Promise<string>((resolve) => {
    const payload = JSON.stringify({
      name: "mid-flight-abort",
      description: "B".repeat(200_000),
    });
    const req = http.request(
      {
        host: "127.0.0.1",
        port: address.port,
        path: "/api/tasks",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      () => {
        resolve("server-responded-before-abort");
      },
    );
    req.on("error", () => resolve("client-aborted"));
    req.write(payload.slice(0, Math.floor(payload.length / 2)));
    req.destroy();
  });
  logs.push({
    vector: "p3-03-mid-flight-abort",
    hypothesis: "Dropped connection mid-transaction may leave inconsistent state or crash route handling.",
    observed: abortResult,
    details: { abortResult },
  });

  // Vector 4: Timeout pressure via intentionally aborted request
  const timeoutStatus = await (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20);
    try {
      await fetch(`${baseUrl}/events?limit=1000`, { signal: controller.signal });
      return "completed-before-timeout";
    } catch {
      return "aborted-by-timeout";
    } finally {
      clearTimeout(timeout);
    }
  })();
  logs.push({
    vector: "p3-04-timeout-interruption",
    hypothesis: "Timeout/interruption should not crash process or poison future requests.",
    observed: timeoutStatus,
    details: { timeoutStatus },
  });

  // Vector 5: Secret flip during concurrent persistence writes
  const secretFlipStatuses: number[] = [];
  const originalSecret = process.env.PROVIDER_SECRET_KEY;
  const writers = Array.from({ length: 24 }, async (_, i) => {
    if (i === 8) {
      delete process.env.PROVIDER_SECRET_KEY;
    }
    if (i === 16) {
      process.env.PROVIDER_SECRET_KEY = originalSecret;
    }
    const response = await fetch(`${baseUrl}/settings`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemName: `secret-flip-${i}` }),
    });
    secretFlipStatuses.push(response.status);
  });
  await Promise.all(writers);
  process.env.PROVIDER_SECRET_KEY = originalSecret;
  const secretFlip5xx = secretFlipStatuses.filter((status) => status >= 500).length;
  logs.push({
    vector: "p3-05-secret-flip-race",
    hypothesis: "Removing encryption secret during concurrent writes should surface controlled failure, not process crash.",
    observed: secretFlip5xx > 0 ? "write-path-5xx-observed" : "no-5xx",
    details: {
      statusHistogram: secretFlipStatuses.reduce<Record<string, number>>((acc, status) => {
        const key = String(status);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    },
  });

  // Post-check service health
  const health = await fetch(`${baseUrl}/healthz`).then((response) => response.status);
  logs.push({
    vector: "p3-06-post-chaos-health",
    hypothesis: "Service remains responsive after disruption campaign.",
    observed: health === 200 ? "healthy" : "degraded",
    details: { health },
  });

  await writeFile(path.join(logDir, "phase3-results.json"), `${JSON.stringify(logs, null, 2)}\n`);
  await writeFile(
    path.join(logDir, "phase3-summary.md"),
    `${[
      "# Phase 3 Concurrency/Disruption Results",
      "",
      ...logs.map((item) => `- ${item.vector}: ${item.observed}`),
      "",
    ].join("\n")}\n`,
  );

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closePlatformState();
  await rm(tmpDir, { recursive: true, force: true });
}

await run();
