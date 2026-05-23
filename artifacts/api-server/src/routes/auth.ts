import { Router } from "express";
import { z } from "zod";
import {
  clearSession,
  createSession,
  credentialsAreValid,
  getSessionUser,
} from "../lib/session-auth.js";

const router = Router();

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.get("/auth/session", (req, res) => {
  const user = getSessionUser(req);
  res.json({ authenticated: Boolean(user), user });
});

router.post("/auth/login", (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login request" });
    return;
  }

  if (!credentialsAreValid(parsed.data.username, parsed.data.password)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const user = createSession(parsed.data.username, res);
  res.json({ authenticated: true, user });
});

router.post("/auth/logout", (req, res) => {
  clearSession(req, res);
  res.json({ authenticated: false });
});

export default router;
