import type { Request } from "express";
import { getSessionUser } from "./session-auth.js";
import { getWorkflowItems, setWorkflowItems } from "./platform-state.js";
import { logger } from "./logger.js";

const MAX_AUDIT_EVENTS = 1000;

export type AuditEvent = {
  id: string;
  action: string;
  actor: string;
  targetType?: string;
  targetId?: string;
  outcome: "success" | "failure";
  timestamp: string;
  ip?: string;
  origin?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

function actorForRequest(req: Request): string {
  const sessionUser = getSessionUser(req);
  if (sessionUser) {
    return sessionUser.username;
  }
  if (req.res?.locals.apiAuthenticated === true) {
    return "machine-token";
  }
  return "anonymous";
}

export function listAuditEvents(): AuditEvent[] {
  return getWorkflowItems("auditEvents", []) as AuditEvent[];
}

export async function recordAuditEvent(
  req: Request,
  event: Omit<AuditEvent, "id" | "actor" | "timestamp" | "ip" | "origin" | "userAgent"> & { actor?: string },
): Promise<void> {
  const item: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    actor: event.actor ?? actorForRequest(req),
    action: event.action,
    targetType: event.targetType,
    targetId: event.targetId,
    outcome: event.outcome,
    metadata: event.metadata,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    origin: req.header("origin"),
    userAgent: req.header("user-agent"),
  };

  const next = [item, ...listAuditEvents()].slice(0, MAX_AUDIT_EVENTS);
  try {
    await setWorkflowItems("auditEvents", next as unknown as Record<string, unknown>[]);
  } catch (error) {
    logger.error({ err: error, action: event.action }, "Failed to persist audit event");
  }
}
