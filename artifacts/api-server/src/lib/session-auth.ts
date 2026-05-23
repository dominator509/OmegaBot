import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = "omegabot_session";
const sessionTtlMs = 8 * 60 * 60 * 1000;

type Session = {
  id: string;
  username: string;
  expiresAt: number;
};

function getSessionSecret(): string | undefined {
  return process.env.SESSION_SECRET;
}

function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME ?? "admin";
}

function getAdminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD;
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

function signPayload(payload: string): string {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("SESSION_SECRET is required for session signing");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function encodeSessionCookie(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSessionCookie(value: string | undefined): Session | undefined {
  if (!value) {
    return undefined;
  }

  const [payload, signature] = value.split(".");
  if (!payload || !signature) {
    return undefined;
  }

  const expectedSignature = signPayload(payload);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<Session>;
    if (!parsed.id || !parsed.username || typeof parsed.expiresAt !== "number") {
      return undefined;
    }
    return {
      id: parsed.id,
      username: parsed.username,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return undefined;
  }
}

function getSession(req: Request): Session | undefined {
  const signedSession = (req.cookies as Record<string, string | undefined> | undefined)?.[sessionCookieName];
  const session = decodeSessionCookie(signedSession);
  if (!session) {
    return undefined;
  }

  if (session.expiresAt <= Date.now()) {
    return undefined;
  }

  return session;
}

export function validateSessionAuthConfig(): void {
  if (!isProduction) {
    return;
  }

  const missing: string[] = [];
  if (!getSessionSecret()) {
    missing.push("SESSION_SECRET");
  }
  if (!process.env.ADMIN_USERNAME) {
    missing.push("ADMIN_USERNAME");
  }
  if (!getAdminPassword()) {
    missing.push("ADMIN_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
  }
}

export function hasValidSession(req: Request): boolean {
  return Boolean(getSession(req));
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "OPTIONS" || req.path === "/healthz" || req.path.startsWith("/auth/")) {
    next();
    return;
  }

  if (!isProduction || res.locals.apiAuthenticated === true || hasValidSession(req)) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export function createSession(username: string, res: Response): { username: string; expiresAt: string } {
  const session: Session = {
    id: randomBytes(32).toString("base64url"),
    username,
    expiresAt: Date.now() + sessionTtlMs,
  };
  res.cookie(sessionCookieName, encodeSessionCookie(session), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionTtlMs,
  });

  return {
    username: session.username,
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

export function clearSession(_req: Request, res: Response): void {
  res.clearCookie(sessionCookieName, { path: "/" });
}

export function getSessionUser(req: Request): { username: string; expiresAt: string } | undefined {
  const session = getSession(req);
  return session
    ? { username: session.username, expiresAt: new Date(session.expiresAt).toISOString() }
    : undefined;
}

export function credentialsAreValid(username: string, password: string): boolean {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) {
    return false;
  }
  return username === getAdminUsername()
    && constantTimeEqual(password, expectedPassword);
}
