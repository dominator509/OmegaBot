import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

type PersonaVectorResult = {
  vector: string;
  hypothesis: string;
  observed: string;
  details: Record<string, unknown>;
};

function extractSessionCookie(setCookie: string | null): string | null {
  if (!setCookie) {
    return null;
  }
  const first = setCookie.split(",")[0];
  const part = first.split(";")[0]?.trim();
  return part && part.startsWith("omegabot_session=") ? part : null;
}

async function run(): Promise<void> {
  process.env.NODE_ENV = "production";
  process.env.SESSION_SECRET = "phase4-session-secret-0123456789abcdef0123456789";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "super-secure-admin-password";
  process.env.ALLOWED_ORIGINS = "https://trusted.example";
  process.env.ALLOW_FILE_STATE_IN_PRODUCTION = "true";
  process.env.API_AUTH_TOKEN = "phase4-api-auth-token";
  process.env.PROVIDER_SECRET_KEY = "phase4-provider-secret-0123456789";
  delete process.env.DATABASE_URL;

  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omegabot-adhoc-p4-"));
  process.env.OMEGABOT_STATE_FILE = path.join(tmpDir, "state.json");

  const logDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "logs");
  await mkdir(logDir, { recursive: true });

  const { initializePlatformState, closePlatformState } = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
  const app = (await import("../../../artifacts/api-server/src/app.ts")).default;

  await initializePlatformState();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not bind ad-hoc phase4 server");
  }
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const results: PersonaVectorResult[] = [];

  const unauthMutation = await fetch(`${baseUrl}/settings`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ maxRetries: 4 }),
  });
  results.push({
    vector: "p4-01-mutate-without-auth",
    hypothesis: "Mutation before initialization/auth should be blocked.",
    observed: unauthMutation.status === 401 ? "blocked-401" : `unexpected-${unauthMutation.status}`,
    details: { status: unauthMutation.status },
  });

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://trusted.example" },
    body: JSON.stringify({ username: "admin", password: "super-secure-admin-password" }),
  });
  const setCookie = login.headers.get("set-cookie");
  const sessionCookie = extractSessionCookie(setCookie);

  results.push({
    vector: "p4-02-login",
    hypothesis: "Valid operator credentials should issue session cookie.",
    observed: login.status === 200 && sessionCookie ? "cookie-issued" : `unexpected-${login.status}`,
    details: { status: login.status, hasCookie: Boolean(sessionCookie) },
  });

  const noOriginMutation = await fetch(`${baseUrl}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      cookie: sessionCookie ?? "",
    },
    body: JSON.stringify({ maxRetries: 5 }),
  });

  results.push({
    vector: "p4-03-session-mutate-no-origin",
    hypothesis: "Authenticated session mutation without trusted origin should be denied.",
    observed: noOriginMutation.status === 403 ? "blocked-403" : `unexpected-${noOriginMutation.status}`,
    details: { status: noOriginMutation.status },
  });

  const trustedOriginMutation = await fetch(`${baseUrl}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin: "https://trusted.example",
      cookie: sessionCookie ?? "",
    },
    body: JSON.stringify({ maxRetries: 6 }),
  });

  results.push({
    vector: "p4-04-session-mutate-trusted-origin",
    hypothesis: "Trusted-origin mutation should succeed with valid session.",
    observed: trustedOriginMutation.status === 200 ? "allowed-200" : `unexpected-${trustedOriginMutation.status}`,
    details: { status: trustedOriginMutation.status },
  });

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: {
      origin: "https://trusted.example",
      cookie: sessionCookie ?? "",
    },
  });

  const sessionReuse = await fetch(`${baseUrl}/auth/session`, {
    method: "GET",
    headers: {
      cookie: sessionCookie ?? "",
    },
  });
  const sessionReuseBody = await sessionReuse.json() as { authenticated?: boolean };

  const staleCookieMutation = await fetch(`${baseUrl}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin: "https://trusted.example",
      cookie: sessionCookie ?? "",
    },
    body: JSON.stringify({ maxRetries: 7 }),
  });

  results.push({
    vector: "p4-05-stale-cookie-reuse-after-logout",
    hypothesis: "Captured pre-logout cookie should be invalid after logout.",
    observed: staleCookieMutation.status === 401 || staleCookieMutation.status === 403
      ? "revoked"
      : "reused-session-still-authorized",
    details: {
      logoutStatus: logout.status,
      sessionStatus: sessionReuse.status,
      authenticatedAfterLogout: sessionReuseBody.authenticated,
      mutationStatusAfterLogout: staleCookieMutation.status,
    },
  });

  const apiTokenMutation = await fetch(`${baseUrl}/settings`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer phase4-api-auth-token",
    },
    body: JSON.stringify({ maxRetries: 8 }),
  });

  results.push({
    vector: "p4-06-api-token-path",
    hypothesis: "Machine-token mutation should work without session origin checks.",
    observed: apiTokenMutation.status === 200 ? "allowed-200" : `unexpected-${apiTokenMutation.status}`,
    details: { status: apiTokenMutation.status },
  });

  const summaryLines = [
    "# Phase 4 Persona Derailment Results",
    "",
    ...results.map((r) => `- ${r.vector}: ${r.observed}`),
    "",
  ];

  await writeFile(path.join(logDir, "phase4-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  await writeFile(path.join(logDir, "phase4-summary.md"), `${summaryLines.join("\n")}\n`);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closePlatformState();
  await rm(tmpDir, { recursive: true, force: true });
}

await run();
