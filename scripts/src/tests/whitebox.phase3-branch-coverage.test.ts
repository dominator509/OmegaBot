import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "production";
process.env.SESSION_SECRET = "phase3-session-secret-012345678901234567890123";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "phase3-admin-password";
process.env.ALLOWED_ORIGINS = "https://trusted.example";
process.env.API_AUTH_TOKEN = "phase3-api-auth-token";
process.env.PROVIDER_SECRET_KEY = "phase3-provider-secret-key-01234567890123";

const sessionAuth = await import("../../../artifacts/api-server/src/lib/session-auth.ts");
const platformState = await import("../../../artifacts/api-server/src/lib/platform-state.ts");
const apiAuth = await import("../../../artifacts/api-server/src/lib/api-auth.ts");
const secretStore = await import("../../../artifacts/api-server/src/lib/secret-store.ts");

function makeReq(options: {
  method?: string;
  path?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
} = {}) {
  return {
    method: options.method ?? "GET",
    path: options.path ?? "/api/test",
    cookies: options.cookies ?? {},
    header(name: string) {
      return options.headers?.[name.toLowerCase()] ?? options.headers?.[name];
    },
  };
}

function makeRes() {
  let statusCode = 200;
  let body: unknown;
  const cookies = new Map<string, string>();
  return {
    locals: {} as Record<string, unknown>,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
    cookie(name: string, value: string) {
      cookies.set(name, value);
      return this;
    },
    clearCookie(name: string) {
      cookies.delete(name);
      return this;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    getCookie(name: string) {
      return cookies.get(name);
    },
  };
}

test("phase3 branch: validateSessionAuthConfig enforces missing and weak production config", () => {
  const prevSecret = process.env.SESSION_SECRET;
  const prevAdminUser = process.env.ADMIN_USERNAME;
  const prevAdminPass = process.env.ADMIN_PASSWORD;

  delete process.env.SESSION_SECRET;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  assert.throws(() => sessionAuth.validateSessionAuthConfig(), /Missing required production configuration/);

  process.env.SESSION_SECRET = "short";
  process.env.ADMIN_USERNAME = "admin";
  process.env.ADMIN_PASSWORD = "short";
  assert.throws(() => sessionAuth.validateSessionAuthConfig(), /Weak production configuration/);

  process.env.SESSION_SECRET = prevSecret;
  process.env.ADMIN_USERNAME = prevAdminUser;
  process.env.ADMIN_PASSWORD = prevAdminPass;
  assert.doesNotThrow(() => sessionAuth.validateSessionAuthConfig());
});

test("phase3 branch: requireSession bypasses options/auth and allows apiAuthenticated", () => {
  const res1 = makeRes();
  let next1 = false;
  sessionAuth.requireSession(makeReq({ method: "OPTIONS", path: "/api/settings" }) as never, res1 as never, () => { next1 = true; });
  assert.equal(next1, true);

  const res2 = makeRes();
  let next2 = false;
  sessionAuth.requireSession(makeReq({ method: "POST", path: "/auth/login" }) as never, res2 as never, () => { next2 = true; });
  assert.equal(next2, true);

  const res3 = makeRes();
  res3.locals.apiAuthenticated = true;
  let next3 = false;
  sessionAuth.requireSession(makeReq({ method: "PATCH", path: "/api/settings" }) as never, res3 as never, () => { next3 = true; });
  assert.equal(next3, true);
});

test("phase3 branch: requireTrustedSessionOrigin bypasses non-mutation and apiAuthenticated", () => {
  const res1 = makeRes();
  let next1 = false;
  sessionAuth.requireTrustedSessionOrigin(makeReq({ method: "GET", path: "/api/settings" }) as never, res1 as never, () => { next1 = true; });
  assert.equal(next1, true);

  const res2 = makeRes();
  res2.locals.apiAuthenticated = true;
  let next2 = false;
  sessionAuth.requireTrustedSessionOrigin(makeReq({ method: "PATCH", path: "/api/settings" }) as never, res2 as never, () => { next2 = true; });
  assert.equal(next2, true);
});

test("phase3 branch: apiAuthMiddleware covers missing token and valid bearer token", () => {
  const denyRes = makeRes();
  let denyNext = false;
  apiAuth.apiAuthMiddleware(makeReq({ method: "PATCH", path: "/api/settings" }) as never, denyRes as never, () => {
    denyNext = true;
  });
  assert.equal(denyNext, false);
  assert.equal(denyRes.statusCode, 401);

  const allowRes = makeRes();
  let allowNext = false;
  apiAuth.apiAuthMiddleware(
    makeReq({
      method: "PATCH",
      path: "/api/settings",
      headers: { authorization: "Bearer phase3-api-auth-token" },
    }) as never,
    allowRes as never,
    () => {
      allowNext = true;
    },
  );
  assert.equal(allowNext, true);
  assert.equal(allowRes.locals.apiAuthenticated, true);
});

test("phase3 branch: validateProductionConfig enforces required boundaries and allow-file override", () => {
  const prevDb = process.env.DATABASE_URL;
  const prevAllowFile = process.env.ALLOW_FILE_STATE_IN_PRODUCTION;
  const prevOrigins = process.env.ALLOWED_ORIGINS;

  delete process.env.DATABASE_URL;
  delete process.env.ALLOW_FILE_STATE_IN_PRODUCTION;
  delete process.env.ALLOWED_ORIGINS;
  assert.throws(() => platformState.validateProductionConfig(), /Missing required production configuration/);

  process.env.ALLOWED_ORIGINS = "https://trusted.example";
  process.env.ALLOW_FILE_STATE_IN_PRODUCTION = "true";
  assert.doesNotThrow(() => platformState.validateProductionConfig());

  process.env.DATABASE_URL = prevDb;
  process.env.ALLOW_FILE_STATE_IN_PRODUCTION = prevAllowFile;
  process.env.ALLOWED_ORIGINS = prevOrigins;
});

test("phase3 branch: validateSecretStoreConfig catches weak production key", () => {
  const prev = process.env.PROVIDER_SECRET_KEY;
  process.env.PROVIDER_SECRET_KEY = "short";
  assert.throws(() => secretStore.validateSecretStoreConfig(), /Weak production configuration/);
  process.env.PROVIDER_SECRET_KEY = prev;
});
