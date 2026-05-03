import { Router } from "express";

const router = Router();

const RUNS: Record<string, unknown>[] = [
  {
    id: "run-001",
    taskId: "task-001",
    taskName: "Summarize weekly emails",
    status: "completed",
    startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 3600000).toISOString(),
    durationMs: 3600000,
    retryCount: 0,
    maxRetries: 3,
    output: "Summarized 47 emails across 8 threads. Key items: 3 action items, 2 meeting requests.",
    adapter: "gmail",
    llmModel: "gpt-4o",
    tokenCount: 12400,
    idempotencyKey: "weekly-email-summary-v1",
    isStale: false,
  },
  {
    id: "run-002",
    taskId: "task-002",
    taskName: "Sync calendar events to Notion",
    status: "running",
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: undefined,
    durationMs: undefined,
    retryCount: 0,
    maxRetries: 3,
    output: undefined,
    adapter: "gcal",
    llmModel: "claude-3-5-haiku",
    tokenCount: 0,
    idempotencyKey: "cal-notion-sync-daily",
    isStale: false,
  },
  {
    id: "run-003",
    taskId: "task-004",
    taskName: "Draft Slack standup message",
    status: "failed",
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
    durationMs: 100000,
    retryCount: 3,
    maxRetries: 3,
    error: "Slack API rate limit exceeded: 429 Too Many Requests",
    adapter: "slack",
    llmModel: "gpt-4o-mini",
    tokenCount: 842,
    idempotencyKey: "slack-standup-daily",
    isStale: false,
  },
  {
    id: "run-004",
    taskId: "task-001",
    taskName: "Summarize weekly emails",
    status: "completed",
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000 + 1800000).toISOString(),
    durationMs: 1800000,
    retryCount: 0,
    maxRetries: 3,
    output: "Summarized 31 emails. 1 urgent action item flagged.",
    adapter: "gmail",
    llmModel: "gpt-4o",
    tokenCount: 9100,
    idempotencyKey: "weekly-email-summary-v1-prev",
    isStale: true,
  },
  {
    id: "run-005",
    taskId: "task-003",
    taskName: "Review and triage GitHub PRs",
    status: "retrying",
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: undefined,
    durationMs: undefined,
    retryCount: 1,
    maxRetries: 3,
    error: "GitHub token expired",
    adapter: "github",
    llmModel: "claude-3-5-sonnet",
    tokenCount: 2800,
    idempotencyKey: "gh-pr-triage-v2",
    isStale: false,
  },
  {
    id: "run-006",
    taskId: "task-006",
    taskName: "Crawl documentation sites",
    status: "stale",
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    durationMs: 3600000,
    retryCount: 0,
    maxRetries: 3,
    output: "Indexed 142 pages across 3 documentation sites.",
    adapter: "web",
    llmModel: "gpt-4o-mini",
    tokenCount: 18200,
    idempotencyKey: "docs-crawl-weekly",
    isStale: true,
  },
];

router.get("/runs", (req, res) => {
  let runs = [...RUNS];
  const { status, limit } = req.query;
  if (status && typeof status === "string") {
    runs = runs.filter((r) => r.status === status);
  }
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
  res.json({ items: runs.slice(0, lim), total: RUNS.length });
});

router.get("/tasks/:id/runs", (req, res) => {
  const runs = RUNS.filter((r) => r.taskId === req.params.id);
  res.json({ items: runs, total: runs.length });
});

export default router;
