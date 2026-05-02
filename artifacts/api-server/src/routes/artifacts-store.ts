import { Router } from "express";

const router = Router();

const ARTIFACTS: Record<string, unknown>[] = [
  {
    id: "art-001",
    name: "weekly-email-summary.md",
    type: "markdown",
    size: 4823,
    taskId: "task-001",
    taskName: "Summarize weekly emails",
    runId: "run-001",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    mimeType: "text/markdown",
    tags: ["email", "summary", "weekly"],
    previewUrl: undefined,
  },
  {
    id: "art-002",
    name: "calendar-events-export.json",
    type: "json",
    size: 8241,
    taskId: "task-002",
    taskName: "Sync calendar events to Notion",
    runId: "run-002",
    createdAt: new Date(Date.now() - 60000).toISOString(),
    mimeType: "application/json",
    tags: ["calendar", "export"],
    previewUrl: undefined,
  },
  {
    id: "art-003",
    name: "pr-triage-report.md",
    type: "markdown",
    size: 12800,
    taskId: "task-003",
    taskName: "Review and triage GitHub PRs",
    runId: "run-005",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    mimeType: "text/markdown",
    tags: ["github", "pr", "triage"],
    previewUrl: undefined,
  },
  {
    id: "art-004",
    name: "crawl-index-results.csv",
    type: "csv",
    size: 31400,
    taskId: "task-006",
    taskName: "Crawl documentation sites",
    runId: "run-006",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    mimeType: "text/csv",
    tags: ["web", "crawl", "index"],
    previewUrl: undefined,
  },
  {
    id: "art-005",
    name: "auth-refactor-analysis.md",
    type: "markdown",
    size: 7200,
    taskId: "task-003",
    taskName: "Review and triage GitHub PRs",
    runId: "run-005",
    createdAt: new Date(Date.now() - 1600000).toISOString(),
    mimeType: "text/markdown",
    tags: ["github", "code-review", "analysis"],
    previewUrl: undefined,
  },
  {
    id: "art-006",
    name: "standup-draft.txt",
    type: "text",
    size: 892,
    taskId: "task-004",
    taskName: "Draft Slack standup message",
    runId: "run-003",
    createdAt: new Date(Date.now() - 7100000).toISOString(),
    mimeType: "text/plain",
    tags: ["slack", "standup", "draft"],
    previewUrl: undefined,
  },
  {
    id: "art-007",
    name: "notion-archive-plan.json",
    type: "json",
    size: 3120,
    taskId: "task-005",
    taskName: "Archive old Notion pages",
    runId: undefined,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    mimeType: "application/json",
    tags: ["notion", "archive", "plan"],
    previewUrl: undefined,
  },
];

router.get("/artifacts", (req, res) => {
  const { taskId, type } = req.query;
  let items = [...ARTIFACTS];
  if (taskId && typeof taskId === "string") {
    items = items.filter((a) => a.taskId === taskId);
  }
  if (type && typeof type === "string") {
    items = items.filter((a) => a.type === type);
  }
  res.json({ items, total: ARTIFACTS.length });
});

export default router;
