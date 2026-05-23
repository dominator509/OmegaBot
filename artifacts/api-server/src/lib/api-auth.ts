import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const isProduction = process.env.NODE_ENV === "production";

function getExpectedToken(): string | undefined {
  return process.env.API_AUTH_TOKEN;
}

function isAuthDisabled(): boolean {
  return process.env.DISABLE_API_AUTH_IN_PRODUCTION === "true";
}

function extractBearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match?.[1];
}

function tokensMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validateApiAuthConfig(): void {
  if (!isProduction || isAuthDisabled()) {
    return;
  }

  if (!getExpectedToken()) {
    throw new Error("Missing required production configuration: API_AUTH_TOKEN");
  }
}

export function apiAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isProduction || isAuthDisabled() || req.method === "OPTIONS" || req.path === "/healthz") {
    next();
    return;
  }

  const expectedToken = getExpectedToken();
  const actualToken = extractBearerToken(req.header("authorization"));

  if (!expectedToken || !actualToken || !tokensMatch(actualToken, expectedToken)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
