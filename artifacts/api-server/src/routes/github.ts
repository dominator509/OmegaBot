import { Router } from "express";
import { CreateChangePlanBody } from "@workspace/api-zod";

const router = Router();

const CHANGE_PLANS: Record<string, unknown>[] = [
  {
    id: "cp-001",
    title: "Refactor authentication middleware",
    description: "Extract auth logic from Express middleware into a dedicated auth service with token rotation support.",
    status: "pending_review",
    repository: "org/backend-api",
    branch: "feature/auth-refactor",
    prUrl: "https://github.com/org/backend-api/pull/842",
    prNumber: 842,
    riskLevel: "high",
    filesChanged: 14,
    additions: 342,
    deletions: 187,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    reviewers: ["alice", "bob"],
    diff: `diff --git a/src/middleware/auth.ts b/src/middleware/auth.ts
index 1a2b3c4..5d6e7f8 100644
--- a/src/middleware/auth.ts
+++ b/src/middleware/auth.ts
@@ -1,24 +1,8 @@
-import jwt from 'jsonwebtoken';
-import { Request, Response, NextFunction } from 'express';
-
-export function authMiddleware(req: Request, res: Response, next: NextFunction) {
-  const token = req.headers.authorization?.split(' ')[1];
-  if (!token) {
-    return res.status(401).json({ error: 'Unauthorized' });
-  }
-  try {
-    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
-    req.user = decoded as User;
-    next();
-  } catch {
-    return res.status(401).json({ error: 'Invalid token' });
-  }
-}
+import { authService } from '../services/auth';
+export const authMiddleware = authService.middleware();`,
    taskId: "task-003",
  },
  {
    id: "cp-002",
    title: "Add rate limiting to API endpoints",
    description: "Implement sliding window rate limiting for all API endpoints using Redis.",
    status: "approved",
    repository: "org/backend-api",
    branch: "feature/rate-limiting",
    prUrl: "https://github.com/org/backend-api/pull/831",
    prNumber: 831,
    riskLevel: "medium",
    filesChanged: 6,
    additions: 128,
    deletions: 14,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    reviewers: ["carol"],
    diff: `diff --git a/src/middleware/rate-limit.ts b/src/middleware/rate-limit.ts
new file mode 100644
index 0000000..abc1234
--- /dev/null
+++ b/src/middleware/rate-limit.ts
@@ -0,0 +1,28 @@
+import rateLimit from 'express-rate-limit';
+import RedisStore from 'rate-limit-redis';
+
+export const apiRateLimit = rateLimit({
+  windowMs: 60 * 1000,
+  max: 100,
+  store: new RedisStore({ client: redisClient }),
+  message: { error: 'Too many requests' }
+});`,
    taskId: "task-003",
  },
  {
    id: "cp-003",
    title: "Fix database connection pool exhaustion",
    description: "Increase pool size and add connection timeout handling to prevent pool exhaustion under load.",
    status: "applied",
    repository: "org/backend-api",
    branch: "fix/db-pool-exhaustion",
    prUrl: "https://github.com/org/backend-api/pull/819",
    prNumber: 819,
    riskLevel: "critical",
    filesChanged: 3,
    additions: 45,
    deletions: 12,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    reviewers: ["alice", "dave"],
    diff: `diff --git a/src/lib/db.ts b/src/lib/db.ts
index def0123..456789a 100644
--- a/src/lib/db.ts
+++ b/src/lib/db.ts
@@ -5,7 +5,11 @@ export const pool = new Pool({
   connectionString: process.env.DATABASE_URL,
-  max: 10,
+  max: 25,
+  idleTimeoutMillis: 30000,
+  connectionTimeoutMillis: 5000,
+  allowExitOnIdle: true,
 });`,
    taskId: "task-001",
  },
  {
    id: "cp-004",
    title: "Add OpenTelemetry tracing",
    description: "Instrument key code paths with OpenTelemetry spans for distributed tracing.",
    status: "draft",
    repository: "org/backend-api",
    branch: "feature/otel-tracing",
    prUrl: undefined,
    prNumber: undefined,
    riskLevel: "low",
    filesChanged: 0,
    additions: 0,
    deletions: 0,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    reviewers: [],
    diff: "",
    taskId: "task-002",
  },
  {
    id: "cp-005",
    title: "Update dependencies to latest versions",
    description: "Automated dependency update: express, zod, drizzle-orm, pino, and 8 others.",
    status: "rejected",
    repository: "org/backend-api",
    branch: "deps/automated-update-may-2025",
    prUrl: "https://github.com/org/backend-api/pull/838",
    prNumber: 838,
    riskLevel: "medium",
    filesChanged: 2,
    additions: 47,
    deletions: 47,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    reviewers: ["bob"],
    diff: "",
    taskId: "task-001",
  },
];

router.get("/github/change-plans", (req, res) => {
  const { status } = req.query;
  let items = [...CHANGE_PLANS];
  if (status && typeof status === "string") {
    items = items.filter((p) => p.status === status);
  }
  res.json({ items, total: CHANGE_PLANS.length });
});

router.post("/github/change-plans", (req, res) => {
  const body = CreateChangePlanBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const plan = {
    id: `cp-${Date.now()}`,
    title: body.data.title,
    description: body.data.description ?? "",
    status: "draft",
    repository: body.data.repository,
    branch: body.data.branch ?? `feature/omegabot-${Date.now()}`,
    riskLevel: body.data.riskLevel ?? "medium",
    filesChanged: 0,
    additions: 0,
    deletions: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewers: [],
    diff: "",
    taskId: body.data.taskId,
  };
  CHANGE_PLANS.push(plan);
  res.status(201).json(plan);
});

router.get("/github/change-plans/:id", (req, res) => {
  const plan = CHANGE_PLANS.find((p) => p.id === req.params.id);
  if (!plan) {
    res.status(404).json({ error: "Change plan not found" });
    return;
  }
  res.json(plan);
});

export default router;
