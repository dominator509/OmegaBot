import { Router } from "express";
import { z } from "zod";

const router = Router();

const ControlActionBody = z.object({
  action: z.enum(["assistant_response", "approve", "reject", "create_task", "update_task", "run_task", "send_message"]),
  target: z.string().min(1).max(256).optional(),
  payload: z.record(z.unknown()).optional(),
  requiresApproval: z.boolean().optional(),
  reason: z.string().max(500).optional(),
});

router.post("/control", (req, res) => {
  const parsed = ControlActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid control request", details: parsed.error.flatten() });
    return;
  }

  const requiresApproval = parsed.data.requiresApproval ?? true;
  const actionState = requiresApproval ? "queued_for_approval" : "executed";

  res.json({
    ok: true,
    action: parsed.data.action,
    target: parsed.data.target ?? null,
    payload: parsed.data.payload ?? {},
    requiresApproval,
    state: actionState,
    message: requiresApproval ? "Queued for approval" : "Action executed",
  });
});

export default router;
