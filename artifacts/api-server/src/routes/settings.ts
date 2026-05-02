import { Router } from "express";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router = Router();

let SETTINGS: Record<string, unknown> = {
  systemName: "OmegaBot",
  defaultLlmModelId: "gpt-4o",
  requireApprovalForHighRisk: true,
  approvalTimeoutMinutes: 60,
  maxConcurrentTasks: 5,
  maxRetries: 3,
  retryDelayMs: 5000,
  stalenessThresholdMs: 3600000,
  logLevel: "info",
  enableEventStreaming: true,
  webhookUrl: "",
  enableIdempotency: true,
  version: "0.23.0",
};

router.get("/settings", (_req, res) => {
  res.json(SETTINGS);
});

router.patch("/settings", (req, res) => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  SETTINGS = { ...SETTINGS, ...body.data };
  res.json(SETTINGS);
});

export default router;
