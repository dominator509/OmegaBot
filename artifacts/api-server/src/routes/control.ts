import { Router } from "express";
import { z } from "zod";

const router = Router();

const ControlActionBody = z.object({
  action: z.string().min(1),
  target: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  requiresApproval: z.boolean().optional(),
});

router.post("/control", (req, res) => {
  const parsed = ControlActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid control request", details: parsed.error.flatten() });
    return;
  }

  res.json({
    ok: true,
    action: parsed.data.action,
    target: parsed.data.target ?? null,
    payload: parsed.data.payload ?? {},
    requiresApproval: parsed.data.requiresApproval ?? false,
    message: parsed.data.requiresApproval
      ? "Queued for approval"
      : "Action executed",
  });
});

export default router;
