import { Router } from "express";
import { CreateCommandBody, CreateCommandGroupBody } from "@workspace/api-zod";

const router = Router();

const COMMANDS: Record<string, unknown>[] = [
  {
    id: "cmd-001",
    name: "Send email reply",
    description: "Reply to John's email about the Q4 roadmap meeting",
    type: "external_call",
    status: "awaiting_approval",
    isHighRisk: false,
    requiresApproval: true,
    idempotencyKey: "email-reply-john-q4-001",
    writeSafe: false,
    groupId: "grp-001",
    adapter: "gmail",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    executedAt: undefined,
    payload: { to: "john@example.com", subject: "Re: Q4 roadmap", body: "Thanks for the heads up..." },
    result: undefined,
  },
  {
    id: "cmd-002",
    name: "Create GitHub issue",
    description: "File bug report for authentication timeout regression",
    type: "write",
    status: "completed",
    isHighRisk: false,
    requiresApproval: false,
    idempotencyKey: "gh-issue-auth-timeout-v1",
    writeSafe: true,
    groupId: "grp-001",
    adapter: "github",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    executedAt: new Date(Date.now() - 3500000).toISOString(),
    payload: { title: "Auth timeout regression in v2.4.1", body: "..." },
    result: { issueNumber: 1247, url: "https://github.com/org/repo/issues/1247" },
  },
  {
    id: "cmd-003",
    name: "Delete Slack message",
    description: "Remove accidentally posted draft message from #general",
    type: "delete",
    status: "awaiting_approval",
    isHighRisk: true,
    requiresApproval: true,
    idempotencyKey: "slack-delete-msg-abc123",
    writeSafe: false,
    groupId: undefined,
    adapter: "slack",
    createdAt: new Date(Date.now() - 600000).toISOString(),
    executedAt: undefined,
    payload: { channel: "#general", messageTs: "1714500000.123456" },
    result: undefined,
  },
  {
    id: "cmd-004",
    name: "Archive Notion database rows",
    description: "Archive 23 stale project entries from the Projects database",
    type: "write",
    status: "completed",
    isHighRisk: false,
    requiresApproval: false,
    idempotencyKey: "notion-archive-projects-batch-04",
    writeSafe: true,
    groupId: "grp-002",
    adapter: "notion",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    executedAt: new Date(Date.now() - 86000000).toISOString(),
    payload: { databaseId: "db-xyz", rowCount: 23 },
    result: { archived: 23, skipped: 0 },
  },
  {
    id: "cmd-005",
    name: "Merge pull request",
    description: "Merge feature/auth-refactor into main after CI passes",
    type: "external_call",
    status: "pending",
    isHighRisk: true,
    requiresApproval: true,
    idempotencyKey: "gh-merge-pr-842",
    writeSafe: false,
    groupId: undefined,
    adapter: "github",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    executedAt: undefined,
    payload: { repo: "org/repo", prNumber: 842, mergeMethod: "squash" },
    result: undefined,
  },
  {
    id: "cmd-006",
    name: "Fetch calendar events",
    description: "Read calendar events for next 7 days",
    type: "read",
    status: "completed",
    isHighRisk: false,
    requiresApproval: false,
    idempotencyKey: "gcal-read-7d-001",
    writeSafe: true,
    groupId: "grp-002",
    adapter: "gcal",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    executedAt: new Date(Date.now() - 7100000).toISOString(),
    payload: { calendarId: "primary", days: 7 },
    result: { eventCount: 14 },
  },
];

const GROUPS: Record<string, unknown>[] = [
  {
    id: "grp-001",
    name: "Email + GitHub triage batch",
    description: "Reply to pending emails and file GitHub issues from weekly review",
    status: "partial",
    commandCount: 2,
    completedCount: 1,
    failedCount: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    commands: COMMANDS.filter((c) => c.groupId === "grp-001"),
  },
  {
    id: "grp-002",
    name: "Notion + Calendar cleanup",
    description: "Archive old Notion entries and sync calendar for the week",
    status: "completed",
    commandCount: 2,
    completedCount: 2,
    failedCount: 0,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    commands: COMMANDS.filter((c) => c.groupId === "grp-002"),
  },
];

router.get("/commands", (_req, res) => {
  res.json({ items: COMMANDS, total: COMMANDS.length });
});

router.post("/commands", (req, res) => {
  const body = CreateCommandBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const cmd = {
    id: `cmd-${Date.now()}`,
    name: body.data.name,
    description: body.data.description ?? "",
    type: body.data.type,
    status: body.data.requiresApproval ? "awaiting_approval" : "pending",
    isHighRisk: body.data.isHighRisk ?? false,
    requiresApproval: body.data.requiresApproval ?? false,
    idempotencyKey: body.data.idempotencyKey,
    writeSafe: false,
    adapter: body.data.adapter ?? "custom",
    createdAt: new Date().toISOString(),
    payload: body.data.payload ?? {},
  };
  COMMANDS.push(cmd);
  res.status(201).json(cmd);
});

router.get("/commands/:id", (req, res) => {
  const cmd = COMMANDS.find((c) => c.id === req.params.id);
  if (!cmd) {
    res.status(404).json({ error: "Command not found" });
    return;
  }
  res.json(cmd);
});

router.get("/command-groups", (_req, res) => {
  res.json({ items: GROUPS, total: GROUPS.length });
});

router.post("/command-groups", (req, res) => {
  const body = CreateCommandGroupBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const group = {
    id: `grp-${Date.now()}`,
    name: body.data.name,
    description: body.data.description ?? "",
    status: "pending",
    commandCount: 0,
    completedCount: 0,
    failedCount: 0,
    createdAt: new Date().toISOString(),
    commands: [],
  };
  GROUPS.push(group);
  res.status(201).json(group);
});

export default router;
