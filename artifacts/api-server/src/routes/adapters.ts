import { Router } from "express";

const router = Router();

const ADAPTERS: Record<string, unknown>[] = [
  {
    id: "adapter-gmail",
    name: "Gmail",
    type: "email",
    status: "connected",
    health: { status: "healthy", latencyMs: 145, lastChecked: new Date(Date.now() - 60000).toISOString(), message: "All systems operational" },
    permissions: ["read:email", "send:email", "manage:labels"],
    version: "2.1.0",
    lastActivity: new Date(Date.now() - 3600000).toISOString(),
    commandCount: 47,
    errorRate: 0.02,
    description: "Google Gmail adapter for reading, sending, and managing emails",
    requiresCredentials: true,
    credentialsConfigured: true,
  },
  {
    id: "adapter-gcal",
    name: "Google Calendar",
    type: "calendar",
    status: "connected",
    health: { status: "healthy", latencyMs: 112, lastChecked: new Date(Date.now() - 60000).toISOString(), message: "All systems operational" },
    permissions: ["read:events", "write:events", "manage:calendars"],
    version: "1.4.2",
    lastActivity: new Date(Date.now() - 60000).toISOString(),
    commandCount: 23,
    errorRate: 0.01,
    description: "Google Calendar adapter for reading and creating calendar events",
    requiresCredentials: true,
    credentialsConfigured: true,
  },
  {
    id: "adapter-github",
    name: "GitHub",
    type: "github",
    status: "connected",
    health: { status: "degraded", latencyMs: 890, lastChecked: new Date(Date.now() - 120000).toISOString(), message: "Token recently refreshed; monitoring latency" },
    permissions: ["read:repos", "write:issues", "write:prs", "read:actions"],
    version: "3.0.1",
    lastActivity: new Date(Date.now() - 1600000).toISOString(),
    commandCount: 34,
    errorRate: 0.08,
    description: "GitHub adapter for managing repos, issues, PRs, and Actions",
    requiresCredentials: true,
    credentialsConfigured: true,
  },
  {
    id: "adapter-slack",
    name: "Slack",
    type: "custom",
    status: "degraded",
    health: { status: "degraded", latencyMs: 2400, lastChecked: new Date(Date.now() - 300000).toISOString(), message: "Elevated latency — possible rate limiting" },
    permissions: ["read:messages", "write:messages", "manage:channels"],
    version: "2.2.0",
    lastActivity: new Date(Date.now() - 600000).toISOString(),
    commandCount: 62,
    errorRate: 0.15,
    description: "Slack adapter for reading and posting messages to channels",
    requiresCredentials: true,
    credentialsConfigured: true,
  },
  {
    id: "adapter-notion",
    name: "Notion",
    type: "files",
    status: "connected",
    health: { status: "healthy", latencyMs: 230, lastChecked: new Date(Date.now() - 60000).toISOString(), message: "All systems operational" },
    permissions: ["read:pages", "write:pages", "read:databases", "write:databases"],
    version: "1.2.0",
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    commandCount: 18,
    errorRate: 0.03,
    description: "Notion adapter for reading and writing pages and database entries",
    requiresCredentials: true,
    credentialsConfigured: true,
  },
  {
    id: "adapter-web",
    name: "Web Crawler",
    type: "web",
    status: "disconnected",
    health: { status: "unknown", latencyMs: undefined, lastChecked: new Date(Date.now() - 86400000 * 2).toISOString(), message: "Adapter paused — no recent health check" },
    permissions: ["read:web", "crawl:pages"],
    version: "1.0.4",
    lastActivity: new Date(Date.now() - 86400000 * 2).toISOString(),
    commandCount: 5,
    errorRate: 0.0,
    description: "Web crawling adapter for fetching and indexing web pages",
    requiresCredentials: false,
    credentialsConfigured: true,
  },
  {
    id: "adapter-custom-01",
    name: "Internal API",
    type: "custom",
    status: "error",
    health: { status: "unhealthy", latencyMs: undefined, lastChecked: new Date(Date.now() - 600000).toISOString(), message: "Connection refused: internal API unreachable" },
    permissions: ["read:data", "write:data"],
    version: "0.9.1",
    lastActivity: new Date(Date.now() - 3600000 * 4).toISOString(),
    commandCount: 3,
    errorRate: 0.67,
    description: "Custom adapter for the internal company API",
    requiresCredentials: true,
    credentialsConfigured: false,
  },
];

router.get("/adapters", (_req, res) => {
  const healthy = ADAPTERS.filter((a) => (a.health as Record<string, unknown>).status === "healthy").length;
  const degraded = ADAPTERS.filter((a) => (a.health as Record<string, unknown>).status === "degraded").length;
  const unhealthy = ADAPTERS.filter((a) =>
    ["unhealthy", "unknown"].includes((a.health as Record<string, unknown>).status as string)
  ).length;
  res.json({ items: ADAPTERS, total: ADAPTERS.length, healthyCount: healthy, degradedCount: degraded, unhealthyCount: unhealthy });
});

router.get("/adapters/:id/health", (req, res) => {
  const adapter = ADAPTERS.find((a) => a.id === req.params.id);
  if (!adapter) {
    res.status(404).json({ error: "Adapter not found" });
    return;
  }
  res.json(adapter.health);
});

export default router;
