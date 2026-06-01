import { Router } from "express";
import { z } from "zod";
import { providerRegistry } from "../lib/provider-registry.js";
import { persistPlatformState } from "../lib/platform-state.js";
import { recordAuditEvent } from "../lib/audit-log.js";

const router = Router();

const ProviderModelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().int().positive(),
  capabilities: z.array(z.string()),
  costPer1kTokens: z.number().min(0),
  avgLatencyMs: z.number().int().positive(),
});

const ProviderTypeSchema = z.enum(["openai-compat", "anthropic"]);

const UpsertProviderBody = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  type: ProviderTypeSchema.optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  enabled: z.boolean().optional(),
  models: z.array(ProviderModelSchema).optional(),
});

const PatchProviderBody = z.object({
  name: z.string().min(1).max(128).optional(),
  type: ProviderTypeSchema.optional(),
  baseUrl: z.string().url().optional().or(z.literal("")),
  apiKey: z.string().optional(),
  enabled: z.boolean().optional(),
  models: z.array(ProviderModelSchema).optional(),
});

const AddModelBody = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().int().positive().default(128000),
  capabilities: z.array(z.string()).default(["text"]),
  costPer1kTokens: z.number().min(0).default(0),
  avgLatencyMs: z.number().int().positive().default(1000),
});

router.get("/providers", (_req, res) => {
  const providers = providerRegistry.list();
  res.json({ items: providers, total: providers.length });
});

router.get("/providers/:id", (req, res) => {
  const provider = providerRegistry.getById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const items = providerRegistry.list();
  const public_ = items.find((p) => p.id === req.params.id);
  if (!public_) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  res.json(public_);
});

router.put("/providers/:id", async (req, res, next) => {
  const body = UpsertProviderBody.safeParse({ ...req.body, id: req.params.id });
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const result = providerRegistry.upsert(body.data as Parameters<typeof providerRegistry.upsert>[0]);
    await persistPlatformState();
    await recordAuditEvent(req, {
      action: "provider.upsert",
      outcome: "success",
      targetType: "provider",
      targetId: req.params.id,
      metadata: {
        enabled: result.enabled,
        hasApiKey: result.hasApiKey,
      },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch("/providers/:id", async (req, res, next) => {
  const body = PatchProviderBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  try {
    const result = providerRegistry.patch(req.params.id, body.data);
    if (!result) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    await persistPlatformState();
    await recordAuditEvent(req, {
      action: "provider.patch",
      outcome: "success",
      targetType: "provider",
      targetId: req.params.id,
      metadata: {
        fields: Object.keys(body.data).filter((key) => key !== "apiKey"),
        apiKeyUpdated: body.data.apiKey !== undefined,
        enabled: result.enabled,
      },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/providers/:id", async (req, res, next) => {
  const removed = providerRegistry.remove(req.params.id);
  if (!removed) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  try {
    await persistPlatformState();
    await recordAuditEvent(req, {
      action: "provider.delete",
      outcome: "success",
      targetType: "provider",
      targetId: req.params.id,
    });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/providers/:id/models", async (req, res, next) => {
  const provider = providerRegistry.getById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const body = AddModelBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const models = [...provider.models.filter((m) => m.id !== body.data.id), body.data];
  try {
    const result = providerRegistry.patch(req.params.id, { models });
    await persistPlatformState();
    await recordAuditEvent(req, {
      action: "provider.model.add",
      outcome: "success",
      targetType: "provider",
      targetId: req.params.id,
      metadata: { modelId: body.data.id },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/providers/:id/models/:modelId", async (req, res, next) => {
  const provider = providerRegistry.getById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const models = provider.models.filter((m) => m.id !== req.params.modelId);
  try {
    const result = providerRegistry.patch(req.params.id, { models });
    await persistPlatformState();
    await recordAuditEvent(req, {
      action: "provider.model.delete",
      outcome: "success",
      targetType: "provider",
      targetId: req.params.id,
      metadata: { modelId: req.params.modelId },
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/providers/:id/test", async (req, res) => {
  const provider = providerRegistry.getById(req.params.id);
  if (!provider) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  if (!provider.apiKey && provider.id !== "ollama") {
    res.status(400).json({ ok: false, error: "No API key configured" });
    return;
  }

  const testModel = provider.models[0]?.id;
  if (!testModel) {
    res.status(400).json({ ok: false, error: "No models configured to test with" });
    return;
  }

  const t0 = Date.now();
  try {
    if (provider.type === "anthropic") {
      const client = providerRegistry.createAnthropicClient(provider);
      await client.messages.create({
        model: testModel,
        max_tokens: 8,
        messages: [{ role: "user", content: "hi" }],
      });
    } else {
      const client = providerRegistry.createOpenAIClient(provider);
      await client.chat.completions.create({
        model: testModel,
        max_tokens: 8,
        messages: [{ role: "user", content: "hi" }],
      });
    }
    res.json({ ok: true, latencyMs: Date.now() - t0, model: testModel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.json({ ok: false, error: msg.slice(0, 300), latencyMs: Date.now() - t0 });
  }
});

export default router;
