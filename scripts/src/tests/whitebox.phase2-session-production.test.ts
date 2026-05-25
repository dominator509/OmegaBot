import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "production";
process.env.SESSION_SECRET = "whitebox-session-secret-0123456789012345678901";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "whitebox-admin-password";
process.env.ALLOWED_ORIGINS = "https://trusted.example";

const sessionAuth = await import("../../../artifacts/api-server/src/lib/session-auth.ts");

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

test("phase2 production: requireSession blocks non-auth paths without token/cookie", () => {
  const req = makeReq({ method: "PATCH", path: "/api/settings" });
  const res = makeRes();
  let nextCalled = false;
  sessionAuth.requireSession(req as never, res as never, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Unauthorized" });
});

test("phase2 production: trusted-origin middleware allows and denies correct branches", () => {
  const deniedReq = makeReq({ method: "POST", path: "/api/settings", headers: {} });
  const deniedRes = makeRes();
  let deniedNext = false;
  sessionAuth.requireTrustedSessionOrigin(deniedReq as never, deniedRes as never, () => {
    deniedNext = true;
  });
  assert.equal(deniedNext, false);
  assert.equal(deniedRes.statusCode, 403);

  const allowReq = makeReq({
    method: "POST",
    path: "/api/settings",
    headers: { origin: "https://trusted.example" },
  });
  const allowRes = makeRes();
  let allowNext = false;
  sessionAuth.requireTrustedSessionOrigin(allowReq as never, allowRes as never, () => {
    allowNext = true;
  });
  assert.equal(allowNext, true);
});

test("phase2 production: clearSession revokes active cookie and blocks replay", () => {
  const loginRes = makeRes();
  sessionAuth.createSession("admin", loginRes as never);
  const cookie = loginRes.getCookie("omegabot_session");
  assert.ok(cookie);

  const userBefore = sessionAuth.getSessionUser(makeReq({
    method: "GET",
    path: "/api/auth/session",
    cookies: { omegabot_session: cookie! },
  }) as never);
  assert.equal(userBefore?.username, "admin");

  sessionAuth.clearSession(makeReq({
    method: "POST",
    path: "/api/auth/logout",
    cookies: { omegabot_session: cookie! },
  }) as never, makeRes() as never);

  const userAfter = sessionAuth.getSessionUser(makeReq({
    method: "GET",
    path: "/api/auth/session",
    cookies: { omegabot_session: cookie! },
  }) as never);
  assert.equal(userAfter, undefined);
});
