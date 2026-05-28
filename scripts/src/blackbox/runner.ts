import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

type Endpoint = { method: string; path: string };
type CaseResult = {
  id: string;
  phase: number;
  endpoint: string;
  method: string;
  status: number;
  ok: boolean;
  expected: number[];
  notes?: string;
  leak?: boolean;
  durationMs: number;
};

const ROOT = path.resolve(process.cwd(), "..");
const OPENAPI_PATH = path.join(ROOT, "lib", "api-spec", "openapi.yaml");
const OUT_DIR = path.join(ROOT, "artifacts", "blackbox");
const BASE_URL = "http://127.0.0.1:8080/api";
const RESULTS: CaseResult[] = [];

function parseEndpoints(openapiText: string): Endpoint[] {
  const lines = openapiText.split(/\r?\n/);
  const endpoints: Endpoint[] = [];
  let currentPath = "";
  for (const line of lines) {
    const pathMatch = line.match(/^ {2}(\/[A-Za-z0-9_{}\-\/]+):\s*$/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    const methodMatch = line.match(/^ {4}(get|post|patch|put|delete):\s*$/);
    if (methodMatch && currentPath) {
      endpoints.push({ method: methodMatch[1].toUpperCase(), path: currentPath });
    }
  }
  return endpoints;
}

async function request(method: string, endpointPath: string, body?: unknown, headers?: Record<string, string>) {
  const url = `${BASE_URL}${endpointPath}`;
  const start = Date.now();
  const response = await fetch(url, {
    method,
    headers: { ...(headers ?? {}), ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // keep plain text
  }
  return { status: response.status, body: parsed, durationMs: Date.now() - start, raw: text };
}

async function writeJson(name: string, payload: unknown) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, name), JSON.stringify(payload, null, 2), "utf8");
}

async function writeMd(name: string, body: string) {
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, name), body, "utf8");
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("API server did not become ready on http://127.0.0.1:8080");
}

function leakDetected(raw: string): boolean {
  const lc = raw.toLowerCase();
  return ["stack", "trace", "postgres", "sqlite", "drizzle", "express", "node_modules", "syntaxerror"].some((k) =>
    lc.includes(k),
  );
}

function pushResult(r: CaseResult) {
  RESULTS.push(r);
}

function resultLine(r: CaseResult): string {
  return `- [${r.ok ? "PASS" : "FAIL"}] ${r.id} ${r.method} ${r.endpoint} => ${r.status} (expected: ${r.expected.join("/")}, ${r.durationMs}ms)${r.notes ? ` | ${r.notes}` : ""}${r.leak ? " | LEAKAGE_DETECTED" : ""}`;
}

async function phase1(endpoints: Endpoint[]) {
  const mapMd = [
    "# EXTERNAL_INTERFACE_MAP",
    "",
    "Source of truth: `lib/api-spec/openapi.yaml` (OpenAPI 3.1, server base `/api`).",
    "",
    "## Authorization Requirements",
    "- Contract does not define security schemes in OpenAPI.",
    "- Documented behavior indicates environment-dependent auth: health check public; production may require bearer/session.",
    "",
    "## Public Endpoints",
    ...endpoints.map((e) => `- \`${e.method} ${e.path}\``),
  ].join("\n");

  console.log(mapMd);
  await writeMd("phase1-interface-map.md", mapMd);
  await writeJson("phase1-results.json", { endpointCount: endpoints.length, endpoints });
}

async function phase2() {
  const cases: Array<{ id: string; method: string; path: string; body?: unknown; expected: number[]; notes?: string }> = [
    { id: "P2-TASK-VALID", method: "POST", path: "/tasks", body: { name: "blackbox-task", priority: "high" }, expected: [201] },
    { id: "P2-TASK-MISSING-NAME", method: "POST", path: "/tasks", body: { description: "x" }, expected: [400] },
    { id: "P2-TASK-EMPTY-NAME", method: "POST", path: "/tasks", body: { name: "" }, expected: [400, 201], notes: "boundary min length not declared for CreateTaskBody.name" },
    { id: "P2-TASK-LONG-NAME", method: "POST", path: "/tasks", body: { name: "x".repeat(10240) }, expected: [201, 400, 413] },
    { id: "P2-CMD-VALID", method: "POST", path: "/commands", body: { name: "blackbox-cmd", type: "read" }, expected: [201] },
    { id: "P2-CMD-BAD-TYPE", method: "POST", path: "/commands", body: { name: "bad-cmd", type: "invalid_type" }, expected: [400, 201] },
    { id: "P2-SETTINGS-TYPE-MISMATCH", method: "PATCH", path: "/settings", body: { maxRetries: "bad" }, expected: [400] },
    { id: "P2-CHANGEPLAN-MISSING-REPO", method: "POST", path: "/github/change-plans", body: { title: "x" }, expected: [400] },
  ];

  const lines = ["# Phase 2 Results", ""];
  for (const c of cases) {
    const res = await request(c.method, c.path, c.body);
    const ok = c.expected.includes(res.status);
    const row: CaseResult = { id: c.id, phase: 2, endpoint: c.path, method: c.method, status: res.status, ok, expected: c.expected, notes: c.notes, durationMs: res.durationMs };
    pushResult(row);
    lines.push(resultLine(row));
  }
  await writeMd("phase2-results.md", lines.join("\n"));
  await writeJson("phase2-results.json", RESULTS.filter((r) => r.phase === 2));
}

async function phase3() {
  const lines = ["# Phase 3 Results", ""];
  const createTask = await request("POST", "/tasks", { name: "workflow-task" });
  const taskId = typeof (createTask.body as any)?.id === "string" ? (createTask.body as any).id : "unknown";
  const seq: Array<{
    id: string;
    endpoint: string;
    method: string;
    status: number;
    expected: number[];
    durationMs: number;
  }> = [
    { id: "P3-WF-CREATE-TASK", method: "POST", endpoint: "/tasks", status: createTask.status, expected: [201], durationMs: createTask.durationMs },
    { id: "P3-WF-GET-TASK", ...(await request("GET", `/tasks/${taskId}`)), endpoint: `/tasks/${taskId}`, method: "GET", expected: [200] },
    { id: "P3-WF-LIST-TASKS", ...(await request("GET", "/tasks")), endpoint: "/tasks", method: "GET", expected: [200] },
    { id: "P3-WF-TASK-RUNS", ...(await request("GET", `/tasks/${taskId}/runs`)), endpoint: `/tasks/${taskId}/runs`, method: "GET", expected: [200] },
  ];

  for (const s of seq) {
    const ok = s.expected.includes(s.status);
    const row: CaseResult = { id: s.id, phase: 3, endpoint: s.endpoint, method: s.method, status: s.status, ok, expected: s.expected, durationMs: s.durationMs };
    pushResult(row);
    lines.push(resultLine(row));
  }
  await writeMd("phase3-results.md", lines.join("\n"));
  await writeJson("phase3-results.json", RESULTS.filter((r) => r.phase === 3));
}

async function phase4() {
  const lines = ["# Phase 4 Results", ""];
  const malformed = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ invalid-json",
  });
  const malformedBody = await malformed.text();
  const malformedLeak = leakDetected(malformedBody);
  const r1: CaseResult = {
    id: "P4-MALFORMED-JSON",
    phase: 4,
    endpoint: "/tasks",
    method: "POST",
    status: malformed.status,
    ok: [400].includes(malformed.status) && !malformedLeak,
    expected: [400],
    leak: malformedLeak,
    durationMs: 0,
  };
  pushResult(r1);
  lines.push(resultLine(r1));

  const wrongType = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "name=bad",
  });
  const wrongTypeBody = await wrongType.text();
  const wrongTypeLeak = leakDetected(wrongTypeBody);
  const r2: CaseResult = {
    id: "P4-CONTENT-TYPE-MISMATCH",
    phase: 4,
    endpoint: "/tasks",
    method: "POST",
    status: wrongType.status,
    ok: [400, 415].includes(wrongType.status) && !wrongTypeLeak,
    expected: [400, 415],
    leak: wrongTypeLeak,
    durationMs: 0,
  };
  pushResult(r2);
  lines.push(resultLine(r2));

  const unauth = await request("GET", "/tasks", undefined, { authorization: "Bearer blackbox.invalid.token" });
  const r3: CaseResult = {
    id: "P4-UNAUTHORIZED-TOKEN",
    phase: 4,
    endpoint: "/tasks",
    method: "GET",
    status: unauth.status,
    ok: [200, 401, 403].includes(unauth.status),
    expected: [200, 401, 403],
    notes: "Environment-dependent auth policy",
    durationMs: unauth.durationMs,
  };
  pushResult(r3);
  lines.push(resultLine(r3));

  const outOfSeq = await request("POST", "/approvals/nonexistent-approval-id/approve", { decidedBy: "blackbox" });
  const outSeqLeak = leakDetected(typeof outOfSeq.body === "string" ? outOfSeq.body : JSON.stringify(outOfSeq.body));
  const r4: CaseResult = {
    id: "P4-OUT-OF-SEQUENCE-WORKFLOW",
    phase: 4,
    endpoint: "/approvals/nonexistent-approval-id/approve",
    method: "POST",
    status: outOfSeq.status,
    ok: [404, 409].includes(outOfSeq.status) && !outSeqLeak,
    expected: [404, 409],
    leak: outSeqLeak,
    durationMs: outOfSeq.durationMs,
  };
  pushResult(r4);
  lines.push(resultLine(r4));

  await writeMd("phase4-results.md", lines.join("\n"));
  await writeJson("phase4-results.json", RESULTS.filter((r) => r.phase === 4));
}

async function phase5(endpoints: Endpoint[]) {
  const testedEndpoints = new Set(RESULTS.map((r) => `${r.method} ${r.endpoint.replace(/\/[A-Za-z0-9-]{6,}/g, "/{id}")}`));
  const documented = new Set(endpoints.map((e) => `${e.method} ${e.path}`));
  const covered = [...documented].filter((e) => testedEndpoints.has(e)).length;
  const coveragePct = ((covered / documented.size) * 100).toFixed(2);
  const failed = RESULTS.filter((r) => !r.ok);
  const leaks = RESULTS.filter((r) => r.leak);

  const report = [
    "# BLACK_BOX_CONTRACT_REPORT",
    "",
    `- Total documented endpoints: ${documented.size}`,
    `- Endpoints hit by suite: ${covered}`,
    `- Interface coverage: ${coveragePct}%`,
    `- Total executed checks: ${RESULTS.length}`,
    `- Failed checks: ${failed.length}`,
    `- Leakage findings: ${leaks.length}`,
    "",
    "## Failed Checks",
    ...(failed.length ? failed.map(resultLine) : ["- None"]),
    "",
    "## Leakage Findings",
    ...(leaks.length ? leaks.map(resultLine) : ["- None"]),
  ].join("\n");

  await writeMd("BLACK_BOX_CONTRACT_REPORT.md", report);
  await writeJson("phase5-summary.json", {
    documentedEndpoints: documented.size,
    coveredEndpoints: covered,
    coveragePct,
    totalChecks: RESULTS.length,
    failed: failed.length,
    leakageFindings: leaks.length,
  });
}

async function main() {
  const phaseArg = process.argv.find((arg) => arg.startsWith("--phase="));
  const targetPhase = phaseArg ? Number(phaseArg.split("=")[1]) : 5;
  if (!Number.isInteger(targetPhase) || targetPhase < 1 || targetPhase > 5) {
    throw new Error("Use --phase=1..5");
  }
  const openapi = await readFile(OPENAPI_PATH, "utf8");
  const endpoints = parseEndpoints(openapi);
  if (targetPhase === 1) {
    await phase1(endpoints);
    return;
  }
  const server: ChildProcess = spawn("corepack pnpm --filter @workspace/api-server run dev", [], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: "8080",
      NODE_ENV: "development",
      PROVIDER_SECRET_KEY: process.env.PROVIDER_SECRET_KEY ?? "blackbox-provider-secret-key-0123456789",
    },
    stdio: "pipe",
    shell: true,
  });
  server.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr?.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer();
    if (targetPhase === 2) await phase2();
    if (targetPhase === 3) await phase3();
    if (targetPhase === 4) await phase4();
    if (targetPhase === 5) {
      await phase2();
      await phase3();
      await phase4();
      await phase5(endpoints);
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
