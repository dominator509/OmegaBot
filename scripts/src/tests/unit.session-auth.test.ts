import test from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "development";
process.env.SESSION_SECRET = "unit-test-session-secret-01234567890123456789";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "admin-password-1234";

const sessionAuth = await import("../../../artifacts/api-server/src/lib/session-auth.ts");

function createMockResponse() {
  const cookies = new Map<string, string>();
  return {
    cookie(name: string, value: string) {
      cookies.set(name, value);
    },
    clearCookie(name: string) {
      cookies.delete(name);
    },
    getCookie(name: string) {
      return cookies.get(name);
    },
  };
}

test("credentials validation enforces configured username/password contract", () => {
  assert.equal(sessionAuth.credentialsAreValid("admin", "admin-password-1234"), true);
  assert.equal(sessionAuth.credentialsAreValid("admin", "wrong"), false);
  assert.equal(sessionAuth.credentialsAreValid("someone", "admin-password-1234"), false);
});

test("createSession issues signed cookie readable by getSessionUser", () => {
  const res = createMockResponse();
  const created = sessionAuth.createSession("admin", res as never);
  const signedCookie = res.getCookie("omegabot_session");

  assert.equal(created.username, "admin");
  assert.ok(created.expiresAt.length > 0);
  assert.ok(signedCookie);

  const user = sessionAuth.getSessionUser({
    cookies: { omegabot_session: signedCookie },
  } as never);

  assert.equal(user?.username, "admin");
  assert.ok(user?.expiresAt);
});

test("tampered cookie is rejected", () => {
  const res = createMockResponse();
  sessionAuth.createSession("admin", res as never);
  const signedCookie = res.getCookie("omegabot_session");
  assert.ok(signedCookie);

  const tampered = `${signedCookie}tampered`;
  const user = sessionAuth.getSessionUser({
    cookies: { omegabot_session: tampered },
  } as never);

  assert.equal(user, undefined);
});
