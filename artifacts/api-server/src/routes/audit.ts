import { Router } from "express";
import { listAuditEvents } from "../lib/audit-log.js";

const router = Router();

router.get("/audit", (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
  const events = listAuditEvents().slice(0, limit);
  res.json({ items: events, total: events.length });
});

export default router;
