import { Router } from "express";

const router = Router();

router.get("/overview/summary", (_req, res) => {
  const now = Date.now();
  res.json({
    activeTasks: 2,
    completedToday: 8,
    failedToday: 1,
    pendingApprovals: 3,
    adaptersHealthy: 4,
    adaptersDegraded: 2,
    adaptersTotal: 7,
    totalRunsToday: 12,
    avgRunDurationMs: 1840000,
    tokensUsedToday: 48300,
    recentActivity: [
      { id: "evt-001", type: "task.started", level: "info", message: "Task 'Sync calendar events to Notion' started", timestamp: new Date(now - 60000).toISOString(), adapter: "gcal" },
      { id: "evt-002", type: "approval.requested", level: "warning", message: "High-risk approval: Delete Slack message from #general", timestamp: new Date(now - 600000).toISOString(), adapter: "slack" },
      { id: "evt-003", type: "command.completed", level: "success", message: "Command 'Create GitHub issue' completed", timestamp: new Date(now - 3500000).toISOString(), adapter: "github" },
      { id: "evt-004", type: "run.failed", level: "error", message: "Run failed: Slack API rate limit exceeded", timestamp: new Date(now - 7100000).toISOString(), adapter: "slack" },
      { id: "evt-005", type: "task.completed", level: "success", message: "Task 'Summarize weekly emails' completed", timestamp: new Date(now - 3600000).toISOString(), adapter: "gmail" },
    ],
    tasksByStatus: [
      { status: "running", count: 1 },
      { status: "completed", count: 3 },
      { status: "failed", count: 1 },
      { status: "awaiting_approval", count: 1 },
      { status: "pending", count: 1 },
      { status: "paused", count: 1 },
    ],
    runTrend: [
      { hour: new Date(now - 3600000 * 11).toISOString(), count: 3, failed: 0 },
      { hour: new Date(now - 3600000 * 10).toISOString(), count: 5, failed: 1 },
      { hour: new Date(now - 3600000 * 9).toISOString(), count: 2, failed: 0 },
      { hour: new Date(now - 3600000 * 8).toISOString(), count: 4, failed: 0 },
      { hour: new Date(now - 3600000 * 7).toISOString(), count: 7, failed: 2 },
      { hour: new Date(now - 3600000 * 6).toISOString(), count: 6, failed: 1 },
      { hour: new Date(now - 3600000 * 5).toISOString(), count: 8, failed: 0 },
      { hour: new Date(now - 3600000 * 4).toISOString(), count: 4, failed: 1 },
      { hour: new Date(now - 3600000 * 3).toISOString(), count: 9, failed: 0 },
      { hour: new Date(now - 3600000 * 2).toISOString(), count: 11, failed: 1 },
      { hour: new Date(now - 3600000 * 1).toISOString(), count: 7, failed: 0 },
      { hour: new Date(now).toISOString(), count: 2, failed: 0 },
    ],
  });
});

export default router;
