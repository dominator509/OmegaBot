import { Router } from "express";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { getSettings, updateSettings } from "../lib/platform-state.js";

const router = Router();

router.get("/settings", (_req, res) => {
  res.json(getSettings());
});

router.patch("/settings", async (req, res, next) => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    res.json(await updateSettings(body.data));
  } catch (error) {
    next(error);
  }
});

export default router;
