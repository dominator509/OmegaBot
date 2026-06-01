import { Router } from "express";
import { z } from "zod";
import {
  clearSession,
  createSession,
  credentialsAreValid,
  getSessionUser,
} from "../lib/session-auth.js";
import { recordAuditEvent } from "../lib/audit-log.js";

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.get("/auth/session", (req, res) => {
  const user = getSessionUser(req);
  res.json({ authenticated: Boolean(user), user });
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login request" });
    return;
  }

  if (!credentialsAreValid(parsed.data.username, parsed.data.password)) {
    await recordAuditEvent(req, {
      action: "auth.login",
      actor: parsed.data.username,
      outcome: "failure",
      targetType: "session",
    });
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const user = createSession(parsed.data.username, res);
  await recordAuditEvent(req, {
    action: "auth.login",
    actor: parsed.data.username,
    outcome: "success",
    targetType: "session",
  });
  res.json({ authenticated: true, user });
});

router.post("/auth/logout", async (req, res) => {
  await recordAuditEvent(req, {
    action: "auth.logout",
    outcome: "success",
    targetType: "session",
  });
  clearSession(req, res);
  res.json({ authenticated: false });
});

export default router;
