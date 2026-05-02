import { Router } from "express";
import { z } from "zod/v4";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskBody,
} from "@workspace/api-zod";

const router = Router();

const TASKS: Record<string, unknown>[] = [
  {
    id: "task-001",
    name: "Summarize weekly emails",
    description: "Fetch and summarize all unread emails from the past week",
    status: "completed",
    priority: "high",
    adapter: "gmail",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    runCount: 12,
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    tags: ["email", "summary", "weekly"],
    idempotencyKey: "weekly-email-summary-v1",
    writeSafe: false,
  },
  {
    id: "task-002",
    name: "Sync calendar events to Notion",
    description: "Pull today's calendar events and create Notion entries",
    status: "running",
    priority: "medium",
    adapter: "gcal",
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 60000).toISOString(),
    runCount: 5,
    lastRunAt: new Date(Date.now() - 60000).toISOString(),
    tags: ["calendar", "notion", "sync"],
    idempotencyKey: "cal-notion-sync-daily",
    writeSafe: true,
  },
  {
    id: "task-003",
    name: "Review and triage GitHub PRs",
    description: "Analyze open pull requests and add triage labels",
    status: "awaiting_approval",
    priority: "high",
    adapter: "github",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    runCount: 3,
    lastRunAt: new Date(Date.now() - 1800000).toISOString(),
    tags: ["github", "pr", "review"],
    idempotencyKey: "gh-pr-triage-v2",
    writeSafe: false,
  },
  {
    id: "task-004",
    name: "Draft Slack standup message",
    description: "Compose and send daily standup to #engineering channel",
    status: "failed",
    priority: "medium",
    adapter: "slack",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    runCount: 8,
    lastRunAt: new Date(Date.now() - 7200000).toISOString(),
    tags: ["slack", "standup", "daily"],
    idempotencyKey: "slack-standup-daily",
    writeSafe: false,
  },
  {
    id: "task-005",
    name: "Archive old Notion pages",
    description: "Find Notion pages older than 90 days with no updates and archive them",
    status: "pending",
    priority: "low",
    adapter: "notion",
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    runCount: 0,
    lastRunAt: undefined,
    tags: ["notion", "archive", "cleanup"],
    idempotencyKey: "notion-archive-90d",
    writeSafe: true,
  },
  {
    id: "task-006",
    name: "Crawl documentation sites",
    description: "Crawl and index updated documentation for knowledge base",
    status: "paused",
    priority: "low",
    adapter: "web",
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    runCount: 2,
    lastRunAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ["web", "crawl", "docs"],
    idempotencyKey: "docs-crawl-weekly",
    writeSafe: false,
  },
];

router.get("/tasks", (req, res) => {
  const query = ListTasksQueryParams.safeParse(req.query);
  let tasks = [...TASKS];
  if (query.success && query.data.status) {
    tasks = tasks.filter((t) => t.status === query.data.status);
  }
  const limit = query.success ? query.data.limit : 50;
  tasks = tasks.slice(0, limit);
  res.json({ items: tasks, total: TASKS.length });
});

router.post("/tasks", (req, res) => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const task = {
    id: `task-${Date.now()}`,
    name: body.data.name,
    description: body.data.description ?? "",
    status: "pending",
    priority: body.data.priority ?? "medium",
    adapter: body.data.adapter ?? "custom",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runCount: 0,
    tags: body.data.tags ?? [],
    idempotencyKey: body.data.idempotencyKey,
    writeSafe: body.data.writeSafe ?? false,
  };
  TASKS.push(task);
  res.status(201).json(task);
});

router.get("/tasks/:id", (req, res) => {
  const task = TASKS.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

router.patch("/tasks/:id", (req, res) => {
  const idx = TASKS.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const body = UpdateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  TASKS[idx] = { ...TASKS[idx], ...body.data, updatedAt: new Date().toISOString() };
  res.json(TASKS[idx]);
});

export default router;
