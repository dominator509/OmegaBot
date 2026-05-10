import { Router } from "express";
import { z } from "zod";
import { CreateLlmRouteBody } from "@workspace/api-zod";
import { providerRegistry } from "../lib/provider-registry.js";
import { getWorkflowItems, setWorkflowItems } from "../lib/platform-state.js";

const PatchLlmRouteBody = z.object({
  name: z.string().min(1).max(256).optional(),
  condition: z.string().min(1).max(1024).optional(),
  targetModelId: z.string().min(1).max(128).optional(),
  priority: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

const router = Router();

const ROUTES: Record<string, unknown>[] = [
  {
    id: "route-001",
    name: "High-risk actions → GPT-4o",
    condition: "task.isHighRisk == true",
    targetModelId: "gpt-4o",
    targetModelName: "GPT-4o",
    priority: 1,
    enabled: true,
    matchCount: 23,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: "route-002",
    name: "Simple reads → GPT-4o Mini",
    condition: "command.type == 'read' AND task.priority != 'critical'",
    targetModelId: "gpt-4o-mini",
    targetModelName: "GPT-4o Mini",
    priority: 2,
    enabled: true,
    matchCount: 189,
    createdAt: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    id: "route-003",
    name: "Long-context tasks → Gemini 2.0 Flash",
    condition: "task.tags includes 'long-context'",
    targetModelId: "gemini-2.0-flash",
    targetModelName: "Gemini 2.0 Flash",
    priority: 3,
    enabled: true,
    matchCount: 7,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: "route-004",
    name: "Calendar tasks → Claude Haiku",
    condition: "task.adapter == 'gcal'",
    targetModelId: "claude-3-5-haiku-20241022",
    targetModelName: "Claude 3.5 Haiku",
    priority: 4,
    enabled: true,
    matchCount: 41,
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  },
  {
    id: "route-005",
    name: "Code review tasks → Claude Sonnet",
    condition: "task.tags includes 'code-review'",
    targetModelId: "claude-sonnet-4-5",
    targetModelName: "Claude Sonnet 4.5",
    priority: 5,
    enabled: false,
    matchCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const USAGE = {
  totalTokens: 1284200,
  promptTokens: 892400,
  completionTokens: 391800,
  totalRequests: 847,
  avgLatencyMs: 1140,
  last24hTokens: 48300,
  last7dTokens: 312400,
  byModel: [
    { modelId: "gpt-4o", modelName: "GPT-4o", tokens: 612000, requests: 312, cost: 3.06 },
    { modelId: "gpt-4o-mini", modelName: "GPT-4o Mini", tokens: 384200, requests: 421, cost: 0.058 },
    { modelId: "claude-3-5-haiku-20241022", modelName: "Claude 3.5 Haiku", tokens: 142800, requests: 89, cost: 0.114 },
    { modelId: "claude-sonnet-4-5", modelName: "Claude Sonnet 4.5", tokens: 98400, requests: 18, cost: 0.295 },
    { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", tokens: 46800, requests: 7, cost: 0.005 },
  ],
};

router.get("/llm/models", (_req, res) => {
  const providerModels = providerRegistry.getAllModels();

  if (providerModels.length > 0) {
    const items = providerModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.providerId,
      providerName: m.providerName,
      contextWindow: m.contextWindow,
      isDefault: false,
      status: m.status,
      costPer1kTokens: m.costPer1kTokens,
      avgLatencyMs: m.avgLatencyMs,
      capabilities: m.capabilities,
    }));
    res.json({ items, total: items.length });
    return;
  }

  const fallback = [
    { id: "gpt-4o", name: "GPT-4o", provider: "openai", providerName: "OpenAI", contextWindow: 128000, isDefault: true, status: "available", costPer1kTokens: 0.005, avgLatencyMs: 1200, capabilities: ["text", "vision", "function-calling", "json-mode"] },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", providerName: "OpenAI", contextWindow: 128000, isDefault: false, status: "available", costPer1kTokens: 0.00015, avgLatencyMs: 450, capabilities: ["text", "vision", "function-calling"] },
    { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", providerName: "Anthropic", contextWindow: 200000, isDefault: false, status: "available", costPer1kTokens: 0.003, avgLatencyMs: 980, capabilities: ["text", "vision", "function-calling", "extended-thinking"] },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", providerName: "Anthropic", contextWindow: 200000, isDefault: false, status: "available", costPer1kTokens: 0.0008, avgLatencyMs: 380, capabilities: ["text", "vision", "function-calling"] },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "gemini", providerName: "Google Gemini", contextWindow: 1048576, isDefault: false, status: "available", costPer1kTokens: 0.0001, avgLatencyMs: 320, capabilities: ["text", "vision", "long-context"] },
  ];
  res.json({ items: fallback, total: fallback.length });
});

router.get("/llm/routes", (_req, res) => {
  const routes = getWorkflowItems("llmRoutes", ROUTES);
  res.json({ items: routes, total: routes.length });
});

router.post("/llm/routes", async (req, res, next) => {
  const body = CreateLlmRouteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const allModels = providerRegistry.getAllModels();
  const match = allModels.find((m) => m.id === body.data.targetModelId);
  const routes = getWorkflowItems("llmRoutes", ROUTES);
  const route = {
    id: `route-${Date.now()}`,
    name: body.data.name,
    condition: body.data.condition,
    targetModelId: body.data.targetModelId,
    targetModelName: match ? match.name : body.data.targetModelId,
    priority: body.data.priority ?? routes.length + 1,
    enabled: body.data.enabled ?? true,
    matchCount: 0,
    createdAt: new Date().toISOString(),
  };
  try {
    await setWorkflowItems("llmRoutes", [...routes, route]);
    res.status(201).json(route);
  } catch (error) {
    next(error);
  }
});

router.patch("/llm/routes/:id", async (req, res, next) => {
  const routes = getWorkflowItems("llmRoutes", ROUTES);
  const idx = routes.findIndex((r) => (r as Record<string, unknown>).id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  const body = PatchLlmRouteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const targetModelId = body.data.targetModelId;
  if (targetModelId && !providerRegistry.getAllModels().some((m) => m.id === targetModelId)) {
    res.status(400).json({ error: "Target model not found" });
    return;
  }
  routes[idx] = { ...routes[idx], ...body.data, id: req.params.id };
  try {
    await setWorkflowItems("llmRoutes", routes);
    res.json(routes[idx]);
  } catch (error) {
    next(error);
  }
});

router.delete("/llm/routes/:id", async (req, res, next) => {
  const routes = getWorkflowItems("llmRoutes", ROUTES);
  const idx = routes.findIndex((r) => (r as Record<string, unknown>).id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Route not found" });
    return;
  }
  routes.splice(idx, 1);
  try {
    await setWorkflowItems("llmRoutes", routes);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/llm/usage", (_req, res) => {
  res.json(USAGE);
});

export default router;
