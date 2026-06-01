import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { readFile, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Service = {
  name: string;
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  child?: ChildProcess;
  output: string[];
};

const rootDir = fileURLToPath(new URL("../..", import.meta.url));
const apiPort = Number(process.env.SMOKE_API_PORT ?? "18080");
const webPort = Number(process.env.SMOKE_WEB_PORT ?? "18081");
const apiBase = `http://127.0.0.1:${apiPort}`;
const webBase = `http://127.0.0.1:${webPort}`;
const apiAuthToken = process.env.API_AUTH_TOKEN ?? `smoke-token-${process.pid}-production-auth-check-secret`;
const adminUsername = process.env.ADMIN_USERNAME ?? "smoke-admin";
const adminPassword = process.env.ADMIN_PASSWORD ?? `smoke-password-${process.pid}`;
const sessionSecret = process.env.SESSION_SECRET ?? `smoke-session-secret-${process.pid}-signed-cookie-secret`;
const providerSecretKey = process.env.PROVIDER_SECRET_KEY ?? `smoke-provider-secret-${process.pid}-encrypted-storage-key`;
let sessionCookie = "";
const webCommand = process.platform === "win32" ? "cmd.exe" : "corepack";
const webArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", "corepack", "pnpm", "--filter", "@workspace/omegabot", "run", "serve"]
  : ["pnpm", "--filter", "@workspace/omegabot", "run", "serve"];
const stateFile = process.env.SMOKE_STATE_FILE
  ?? path.join(os.tmpdir(), `omegabot-smoke-${process.pid}.json`);

const services: Service[] = [
  {
    name: "api",
    command: process.execPath,
    args: ["--enable-source-maps", "artifacts/api-server/dist/index.mjs"],
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(apiPort),
      ALLOWED_ORIGINS: webBase,
      API_AUTH_TOKEN: apiAuthToken,
      ADMIN_USERNAME: adminUsername,
      ADMIN_PASSWORD: adminPassword,
      SESSION_SECRET: sessionSecret,
      PROVIDER_SECRET_KEY: providerSecretKey,
      OMEGABOT_STATE_FILE: stateFile,
      ALLOW_FILE_STATE_IN_PRODUCTION: "true",
    },
    output: [],
  },
  {
    name: "web",
    command: webCommand,
    args: webArgs,
    cwd: rootDir,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(webPort),
      BASE_PATH: "/",
      API_ORIGIN: apiBase,
      API_AUTH_TOKEN: apiAuthToken,
    },
    output: [],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertPortAvailable(port: number): Promise<void> {
  const server = net.createServer();
  try {
    server.listen(port, "127.0.0.1");
    await once(server, "listening");
  } catch (error) {
    throw new Error(`Port ${port} is already in use. Set SMOKE_API_PORT/SMOKE_WEB_PORT or stop the existing process.`, { cause: error });
  } finally {
    server.close();
  }
}

function start(service: Service): void {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    env: normalizeEnv(service.env),
    stdio: ["ignore", "pipe", "pipe"],
  });
  service.child = child;

  const capture = (chunk: Buffer) => {
    service.output.push(chunk.toString());
    if (service.output.length > 20) {
      service.output.shift();
    }
  };

  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
}

function normalizeEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

async function waitForJson(url: string, timeoutMs = 30_000): Promise<unknown> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`${url} returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}`, { cause: lastError });
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...sessionHeaders(url),
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  return text ? JSON.parse(text) : null;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetchWithTimeout(url, {
    headers: sessionHeaders(url),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${text.slice(0, 300)}`);
  }
  return text;
}

function sessionHeaders(url: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (url.startsWith(webBase)) {
    headers.origin = webBase;
  }
  if (sessionCookie && url.startsWith(webBase)) {
    headers.cookie = sessionCookie;
  }
  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function check(label: string, action: () => Promise<void>): Promise<void> {
  process.stdout.write(`- ${label}... `);
  await withTimeout(label, action(), 20_000);
  process.stdout.write("ok\n");
}

async function runChecks(): Promise<void> {
  await check("api health", async () => {
    const health = await waitForJson(`${apiBase}/api/healthz`);
    assert((health as { status?: string }).status === "ok", "API health check did not return ok");
  });

  await check("api auth gate", async () => {
    const response = await fetchWithTimeout(`${apiBase}/api/settings`);
    assert(response.status === 401, `Unauthenticated API request returned ${response.status}, expected 401`);
  });

  await check("api machine token", async () => {
    await fetchJson(`${apiBase}/api/settings`, {
      headers: { authorization: `Bearer ${apiAuthToken}` },
    });
  });

  await check("web proxy health", async () => {
    await waitForJson(`${webBase}/api/healthz`);
  });

  await check("web session gate", async () => {
    const response = await fetchWithTimeout(`${webBase}/api/settings`);
    assert(response.status === 401, `Unauthenticated web API request returned ${response.status}, expected 401`);
  });

  await check("web mutation origin gate", async () => {
    const response = await fetchWithTimeout(`${webBase}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    });
    assert(response.status === 403, `Login without a trusted origin returned ${response.status}, expected 403`);
  });

  await check("admin login", async () => {
    const response = await fetchWithTimeout(`${webBase}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: webBase },
      body: JSON.stringify({ username: adminUsername, password: adminPassword }),
    });
    const setCookie = response.headers.get("set-cookie");
    assert(response.ok, `Login returned ${response.status}`);
    assert(setCookie, "Login did not set a session cookie");
    sessionCookie = setCookie.split(";")[0] ?? "";
    const body = await response.json() as { authenticated?: boolean };
    assert(body.authenticated === true, "Login did not return authenticated=true");
  });

  await check("web app shell", async () => {
    const rootHtml = await fetchText(`${webBase}/`);
    assert(rootHtml.includes("OmegaBot") || rootHtml.includes("<!doctype html>"), "Web root did not return the app shell");
  });

  await check("spa routes", async () => {
    for (const route of ["/overview", "/tasks", "/commands", "/approvals", "/events", "/adapters", "/providers", "/llm", "/integrations", "/github", "/artifacts", "/settings", "/chat"]) {
      const html = await fetchText(`${webBase}${route}`);
      assert(html.includes("<!doctype html>") || html.includes("<div id=\"root\">"), `SPA route ${route} did not return the app shell`);
    }
  });

  const endpoints = [
    "/api/overview/summary",
    "/api/tasks",
    "/api/runs",
    "/api/commands",
    "/api/command-groups",
    "/api/approvals",
    "/api/events",
    "/api/adapters",
    "/api/audit",
    "/api/providers",
    "/api/llm/models",
    "/api/llm/routes",
    "/api/llm/usage",
    "/api/integrations",
    "/api/github/change-plans",
    "/api/artifacts",
    "/api/settings",
  ];

  await check("api read endpoints through web origin", async () => {
    for (const endpoint of endpoints) {
      await fetchJson(`${webBase}${endpoint}`);
    }
  });

  let persistedTaskName = "";
  let persistedCommandName = "";
  let persistedGroupName = "";
  let persistedRouteName = "";
  await check("api writes through web origin", async () => {
    const taskName = `production smoke ${Date.now()}`;
    persistedTaskName = taskName;
    const forgedTask = await fetchWithTimeout(`${webBase}/api/tasks`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: sessionCookie,
        origin: "https://evil.example",
      },
      body: JSON.stringify({
        name: `forged ${taskName}`,
        description: "Created by production smoke test",
        priority: "low",
        adapter: "custom",
        tags: ["smoke"],
        idempotencyKey: `forged-${taskName}`,
        writeSafe: true,
      }),
    });
    assert(forgedTask.status === 403, `Cross-origin session mutation returned ${forgedTask.status}, expected 403`);

    const createdTask = await fetchJson(`${webBase}/api/tasks`, {
      method: "POST",
      body: JSON.stringify({
        name: taskName,
        description: "Created by production smoke test",
        priority: "low",
        adapter: "custom",
        tags: ["smoke"],
        idempotencyKey: taskName,
        writeSafe: true,
      }),
    });
    assert((createdTask as { name?: string }).name === taskName, "Task creation through web /api proxy failed");

    const updatedSettings = await fetchJson(`${webBase}/api/settings`, {
      method: "PATCH",
      body: JSON.stringify({ systemName: "OmegaBot Smoke" }),
    });
    assert((updatedSettings as { systemName?: string }).systemName === "OmegaBot Smoke", "Settings update through web /api proxy failed");

    const provider = await fetchJson(`${webBase}/api/providers/smoke-provider`, {
      method: "PUT",
      body: JSON.stringify({
        name: "Smoke Provider",
        type: "openai-compat",
        baseUrl: "https://example.com/v1",
        apiKey: "smoke-secret",
        enabled: true,
        models: [{
          id: "smoke-model",
          name: "Smoke Model",
          contextWindow: 128000,
          capabilities: ["text"],
          costPer1kTokens: 0,
          avgLatencyMs: 1000,
        }],
      }),
    });
    assert((provider as { id?: string; hasApiKey?: boolean }).id === "smoke-provider", "Provider upsert through web /api proxy failed");
    assert((provider as { hasApiKey?: boolean }).hasApiKey === true, "Provider API key was not recorded");

    persistedCommandName = `smoke command ${Date.now()}`;
    const command = await fetchJson(`${webBase}/api/commands`, {
      method: "POST",
      body: JSON.stringify({
        name: persistedCommandName,
        type: "read",
        description: "Created by production smoke test",
        requiresApproval: false,
        isHighRisk: false,
        idempotencyKey: persistedCommandName,
        adapter: "custom",
        payload: { smoke: true },
      }),
    });
    assert((command as { name?: string }).name === persistedCommandName, "Command creation through web /api proxy failed");

    persistedGroupName = `smoke group ${Date.now()}`;
    const group = await fetchJson(`${webBase}/api/command-groups`, {
      method: "POST",
      body: JSON.stringify({
        name: persistedGroupName,
        description: "Created by production smoke test",
      }),
    });
    assert((group as { name?: string }).name === persistedGroupName, "Command group creation through web /api proxy failed");

    const rejectedApproval = await fetchJson(`${webBase}/api/approvals/appr-001/reject`, {
      method: "POST",
      body: JSON.stringify({
        decidedBy: "smoke",
        reason: "Production smoke test",
      }),
    });
    assert((rejectedApproval as { status?: string }).status === "rejected", "Approval decision through web /api proxy failed");

    persistedRouteName = `smoke route ${Date.now()}`;
    const route = await fetchJson(`${webBase}/api/llm/routes`, {
      method: "POST",
      body: JSON.stringify({
        name: persistedRouteName,
        condition: "task.adapter == 'custom'",
        targetModelId: "smoke-model",
        priority: 99,
        enabled: true,
      }),
    });
    assert((route as { name?: string }).name === persistedRouteName, "LLM route creation through web /api proxy failed");

    const audit = await fetchJson(`${webBase}/api/audit`);
    const auditItems = (audit as { items?: Array<{ action?: string; outcome?: string }> }).items ?? [];
    for (const action of ["auth.login", "settings.update", "provider.upsert", "approval.reject"]) {
      assert(auditItems.some((item) => item.action === action && item.outcome === "success"), `Audit log did not record ${action}`);
    }
    assert(!JSON.stringify(audit).includes("smoke-secret"), "Audit log leaked provider API key");
  });

  await check("state survives api restart", async () => {
    await restartService(services[0]);
    await waitForJson(`${apiBase}/api/healthz`);

    const settings = await fetchJson(`${webBase}/api/settings`);
    assert((settings as { systemName?: string }).systemName === "OmegaBot Smoke", "Settings did not survive API restart");

    const provider = await fetchJson(`${webBase}/api/providers/smoke-provider`);
    assert((provider as { id?: string; hasApiKey?: boolean }).id === "smoke-provider", "Provider did not survive API restart");
    assert((provider as { apiKey?: string }).apiKey !== "smoke-secret", "Provider API key was returned in plaintext after restart");

    const tasks = await fetchJson(`${webBase}/api/tasks`);
    const items = (tasks as { items?: Array<{ name?: string }> }).items ?? [];
    assert(items.some((item) => item.name === persistedTaskName), "Task did not survive API restart");

    const commands = await fetchJson(`${webBase}/api/commands`);
    const commandItems = (commands as { items?: Array<{ name?: string }> }).items ?? [];
    assert(commandItems.some((item) => item.name === persistedCommandName), "Command did not survive API restart");

    const groups = await fetchJson(`${webBase}/api/command-groups`);
    const groupItems = (groups as { items?: Array<{ name?: string }> }).items ?? [];
    assert(groupItems.some((item) => item.name === persistedGroupName), "Command group did not survive API restart");

    const approvals = await fetchJson(`${webBase}/api/approvals`);
    const approvalItems = (approvals as { items?: Array<{ id?: string; status?: string; reason?: string }> }).items ?? [];
    assert(approvalItems.some((item) => item.id === "appr-001" && item.status === "rejected" && item.reason === "Production smoke test"), "Approval decision did not survive API restart");

    const routes = await fetchJson(`${webBase}/api/llm/routes`);
    const routeItems = (routes as { items?: Array<{ name?: string }> }).items ?? [];
    assert(routeItems.some((item) => item.name === persistedRouteName), "LLM route did not survive API restart");

    const audit = await fetchJson(`${webBase}/api/audit`);
    const auditItems = (audit as { items?: Array<{ action?: string; outcome?: string }> }).items ?? [];
    for (const action of ["provider.upsert", "approval.reject"]) {
      assert(auditItems.some((item) => item.action === action && item.outcome === "success"), `Audit log ${action} event did not survive API restart`);
    }
    assert(!JSON.stringify(audit).includes("smoke-secret"), "Audit log leaked provider API key after restart");
  });

  if (!process.env.DATABASE_URL) {
    await check("provider secrets encrypted at rest", async () => {
      const persistedState = await readFile(stateFile, "utf8");
      assert(!persistedState.includes("smoke-secret"), "Provider API key was persisted in plaintext");
      assert(persistedState.includes("enc:v1:"), "Encrypted provider secret marker was not found in persisted state");
    });
  }
}

async function stopServices(): Promise<void> {
  for (const service of services) {
    const pid = service.child?.pid;
    if (!pid) {
      continue;
    }

    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      service.child?.kill("SIGTERM");
    }
  }
}

async function stopService(service: Service): Promise<void> {
  const pid = service.child?.pid;
  if (!pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    service.child?.kill("SIGTERM");
  }
  service.child = undefined;
}

async function restartService(service: Service): Promise<void> {
  await stopService(service);
  await new Promise((resolve) => setTimeout(resolve, 500));
  start(service);
}

async function main(): Promise<void> {
  await assertPortAvailable(apiPort);
  await assertPortAvailable(webPort);

  for (const service of services) {
    start(service);
  }

  try {
    await withTimeout("production smoke", runChecks(), 90_000);
    console.log(`Production smoke passed (${apiBase}, ${webBase})`);
  } catch (error) {
    for (const service of services) {
      const tail = service.output.join("").trim();
      if (tail) {
        console.error(`\n[${service.name} output]\n${tail}`);
      }
    }
    throw error;
  } finally {
    await stopServices();
    if (!process.env.SMOKE_STATE_FILE) {
      await rm(stateFile, { force: true });
    }
  }
}

await main();
