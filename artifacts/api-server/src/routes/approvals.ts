import { Router } from "express";

const router = Router();

const APPROVALS: Record<string, unknown>[] = [
  {
    id: "appr-001",
    title: "Delete Slack message from #general",
    description: "OmegaBot wants to delete a draft message accidentally posted to #general channel during standup preparation.",
    status: "pending",
    riskLevel: "high",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 600000).toISOString(),
    expiresAt: new Date(Date.now() + 3000000).toISOString(),
    decidedAt: undefined,
    decidedBy: undefined,
    reason: undefined,
    commandId: "cmd-003",
    taskId: "task-004",
    adapter: "slack",
    payload: { channel: "#general", messageTs: "1714500000.123456", preview: "Draft: Hey team, don't forget..." },
  },
  {
    id: "appr-002",
    title: "Send email reply to john@example.com",
    description: "Reply to John's email thread about Q4 roadmap planning session.",
    status: "pending",
    riskLevel: "medium",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 1800000).toISOString(),
    expiresAt: new Date(Date.now() + 7200000).toISOString(),
    decidedAt: undefined,
    decidedBy: undefined,
    reason: undefined,
    commandId: "cmd-001",
    taskId: "task-001",
    adapter: "gmail",
    payload: { to: "john@example.com", subject: "Re: Q4 roadmap", bodyPreview: "Thanks for the heads up. I'll join the meeting..." },
  },
  {
    id: "appr-003",
    title: "Merge PR #842: feature/auth-refactor",
    description: "Merge the auth refactor branch into main using squash merge. CI is passing.",
    status: "pending",
    riskLevel: "critical",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 300000).toISOString(),
    expiresAt: new Date(Date.now() + 14400000).toISOString(),
    decidedAt: undefined,
    decidedBy: undefined,
    reason: undefined,
    commandId: "cmd-005",
    taskId: "task-003",
    adapter: "github",
    payload: { repo: "org/repo", prNumber: 842, branch: "feature/auth-refactor", target: "main" },
  },
  {
    id: "appr-004",
    title: "Post standup to #engineering",
    description: "Send daily standup summary to the #engineering Slack channel.",
    status: "approved",
    riskLevel: "low",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 79200000).toISOString(),
    decidedAt: new Date(Date.now() - 85000000).toISOString(),
    decidedBy: "operator",
    reason: "Approved for daily routine",
    commandId: "cmd-prev-001",
    taskId: "task-004",
    adapter: "slack",
    payload: { channel: "#engineering", message: "Daily standup: Completed auth work, in progress on dashboard..." },
  },
  {
    id: "appr-005",
    title: "Archive 156 Notion pages",
    description: "Archive all Notion pages older than 90 days with no recent edits across 4 databases.",
    status: "rejected",
    riskLevel: "high",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 172800000).toISOString(),
    expiresAt: new Date(Date.now() - 100800000).toISOString(),
    decidedAt: new Date(Date.now() - 169000000).toISOString(),
    decidedBy: "operator",
    reason: "Too broad — please scope to Projects database only",
    commandId: "cmd-prev-002",
    taskId: "task-005",
    adapter: "notion",
    payload: { databases: ["Projects", "Tasks", "Notes", "Archive"], rowCount: 156 },
  },
  {
    id: "appr-006",
    title: "Create 12 calendar events from emails",
    description: "Parse meeting requests from email and create calendar events for next week.",
    status: "expired",
    riskLevel: "medium",
    requestedBy: "omegabot-runtime",
    requestedAt: new Date(Date.now() - 259200000).toISOString(),
    expiresAt: new Date(Date.now() - 172800000).toISOString(),
    decidedAt: undefined,
    decidedBy: undefined,
    reason: undefined,
    commandId: "cmd-prev-003",
    taskId: "task-002",
    adapter: "gcal",
    payload: { eventCount: 12, sources: ["email-thread-001", "email-thread-004"] },
  },
];

router.get("/approvals", (req, res) => {
  const { status } = req.query;
  let items = [...APPROVALS];
  if (status && typeof status === "string") {
    items = items.filter((a) => a.status === status);
  }
  const pending = APPROVALS.filter((a) => a.status === "pending");
  res.json({ items, total: APPROVALS.length, pendingCount: pending.length });
});

router.post("/approvals/:id/approve", (req, res) => {
  const idx = APPROVALS.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  APPROVALS[idx] = {
    ...APPROVALS[idx],
    status: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy: req.body.decidedBy ?? "operator",
    reason: req.body.reason,
  };
  res.json(APPROVALS[idx]);
});

router.post("/approvals/:id/reject", (req, res) => {
  const idx = APPROVALS.findIndex((a) => a.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Approval not found" });
    return;
  }
  APPROVALS[idx] = {
    ...APPROVALS[idx],
    status: "rejected",
    decidedAt: new Date().toISOString(),
    decidedBy: req.body.decidedBy ?? "operator",
    reason: req.body.reason,
  };
  res.json(APPROVALS[idx]);
});

export default router;
