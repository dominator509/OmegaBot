import { Router } from "express";

const router = Router();

const EVENTS: Record<string, unknown>[] = [
  {
    id: "evt-001",
    type: "task.started",
    level: "info",
    message: "Task 'Sync calendar events to Notion' started",
    taskId: "task-002",
    taskName: "Sync calendar events to Notion",
    runId: "run-002",
    commandId: undefined,
    adapter: "gcal",
    timestamp: new Date(Date.now() - 60000).toISOString(),
    metadata: { adapter: "gcal", llmModel: "claude-3-5-haiku" },
  },
  {
    id: "evt-002",
    type: "approval.requested",
    level: "warning",
    message: "High-risk approval requested: Delete Slack message from #general",
    taskId: "task-004",
    taskName: "Draft Slack standup message",
    runId: undefined,
    commandId: "cmd-003",
    adapter: "slack",
    timestamp: new Date(Date.now() - 600000).toISOString(),
    metadata: { riskLevel: "high", commandType: "delete", expiresIn: "50m" },
  },
  {
    id: "evt-003",
    type: "command.completed",
    level: "success",
    message: "Command 'Create GitHub issue' completed successfully",
    taskId: "task-003",
    taskName: "Review and triage GitHub PRs",
    runId: "run-005",
    commandId: "cmd-002",
    adapter: "github",
    timestamp: new Date(Date.now() - 3500000).toISOString(),
    metadata: { issueNumber: 1247, writeSafe: true },
  },
  {
    id: "evt-004",
    type: "run.failed",
    level: "error",
    message: "Run failed: Slack API rate limit exceeded (429)",
    taskId: "task-004",
    taskName: "Draft Slack standup message",
    runId: "run-003",
    commandId: undefined,
    adapter: "slack",
    timestamp: new Date(Date.now() - 7100000).toISOString(),
    metadata: { retryCount: 3, maxRetries: 3, error: "429 Too Many Requests" },
  },
  {
    id: "evt-005",
    type: "task.completed",
    level: "success",
    message: "Task 'Summarize weekly emails' completed. 47 emails processed.",
    taskId: "task-001",
    taskName: "Summarize weekly emails",
    runId: "run-001",
    commandId: undefined,
    adapter: "gmail",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: { emailCount: 47, actionItems: 3, tokenCount: 12400, durationMs: 3600000 },
  },
  {
    id: "evt-006",
    type: "adapter.health_check",
    level: "warning",
    message: "Adapter 'slack' health degraded: latency spike detected (2400ms)",
    taskId: undefined,
    taskName: undefined,
    runId: undefined,
    commandId: undefined,
    adapter: "slack",
    timestamp: new Date(Date.now() - 300000).toISOString(),
    metadata: { latencyMs: 2400, threshold: 1000, previousLatencyMs: 180 },
  },
  {
    id: "evt-007",
    type: "approval.approved",
    level: "success",
    message: "Approval granted: Post standup to #engineering",
    taskId: "task-004",
    taskName: "Draft Slack standup message",
    runId: undefined,
    commandId: "cmd-prev-001",
    adapter: "slack",
    timestamp: new Date(Date.now() - 85000000).toISOString(),
    metadata: { decidedBy: "operator", reason: "Approved for daily routine" },
  },
  {
    id: "evt-008",
    type: "llm.call",
    level: "info",
    message: "LLM call: gpt-4o via openai (2400 tokens, 1.2s)",
    taskId: "task-001",
    taskName: "Summarize weekly emails",
    runId: "run-001",
    commandId: undefined,
    adapter: "gmail",
    timestamp: new Date(Date.now() - 3650000).toISOString(),
    metadata: { model: "gpt-4o", provider: "openai", tokens: 2400, latencyMs: 1200, cost: 0.024 },
  },
  {
    id: "evt-009",
    type: "run.retry",
    level: "warning",
    message: "Run retrying (attempt 1/3): GitHub token expired",
    taskId: "task-003",
    taskName: "Review and triage GitHub PRs",
    runId: "run-005",
    commandId: undefined,
    adapter: "github",
    timestamp: new Date(Date.now() - 1700000).toISOString(),
    metadata: { retryCount: 1, maxRetries: 3, error: "GitHub token expired", nextRetryMs: 30000 },
  },
  {
    id: "evt-010",
    type: "approval.rejected",
    level: "warning",
    message: "Approval rejected: Archive 156 Notion pages — scope too broad",
    taskId: "task-005",
    taskName: "Archive old Notion pages",
    runId: undefined,
    commandId: "cmd-prev-002",
    adapter: "notion",
    timestamp: new Date(Date.now() - 169000000).toISOString(),
    metadata: { reason: "Too broad — please scope to Projects database only", rowCount: 156 },
  },
  {
    id: "evt-011",
    type: "adapter.connected",
    level: "success",
    message: "Adapter 'github' reconnected after token refresh",
    taskId: undefined,
    taskName: undefined,
    runId: undefined,
    commandId: undefined,
    adapter: "github",
    timestamp: new Date(Date.now() - 1600000).toISOString(),
    metadata: { previousStatus: "error", newStatus: "connected" },
  },
  {
    id: "evt-012",
    type: "task.paused",
    level: "info",
    message: "Task 'Crawl documentation sites' paused by operator",
    taskId: "task-006",
    taskName: "Crawl documentation sites",
    runId: undefined,
    commandId: undefined,
    adapter: "web",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    metadata: { reason: "Manual pause — reviewing crawl targets" },
  },
];

router.get("/events", (req, res) => {
  const { taskId, type, level, limit } = req.query;
  let items = [...EVENTS];
  if (taskId && typeof taskId === "string") {
    items = items.filter((e) => e.taskId === taskId);
  }
  if (type && typeof type === "string") {
    items = items.filter((e) => e.type === type);
  }
  if (level && typeof level === "string") {
    items = items.filter((e) => e.level === level);
  }
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 1000);
  items.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
  res.json({ items: items.slice(0, lim), total: EVENTS.length });
});

export default router;
