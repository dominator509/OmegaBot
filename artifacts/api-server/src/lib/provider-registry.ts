import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type ProviderType = "openai-compat" | "anthropic";

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  capabilities: string[];
  costPer1kTokens: number;
  avgLatencyMs: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: ProviderModel[];
  createdAt: string;
  updatedAt: string;
}

export interface ProviderConfigPublic extends Omit<ProviderConfig, "apiKey"> {
  apiKey: string;
  hasApiKey: boolean;
}

const VALID_TYPES: ProviderType[] = ["openai-compat", "anthropic"];

const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai-compat",
    baseUrl: "https://api.openai.com/v1",
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "",
    enabled: Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
    models: [
      { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, capabilities: ["text", "vision", "function-calling", "json-mode"], costPer1kTokens: 0.005, avgLatencyMs: 1200 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, capabilities: ["text", "vision", "function-calling", "json-mode"], costPer1kTokens: 0.00015, avgLatencyMs: 450 },
      { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1047576, capabilities: ["text", "vision", "function-calling", "json-mode"], costPer1kTokens: 0.002, avgLatencyMs: 900 },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1047576, capabilities: ["text", "vision", "function-calling"], costPer1kTokens: 0.0004, avgLatencyMs: 400 },
      { id: "o3", name: "o3", contextWindow: 200000, capabilities: ["text", "reasoning"], costPer1kTokens: 0.01, avgLatencyMs: 5000 },
      { id: "o4-mini", name: "o4-mini", contextWindow: 200000, capabilities: ["text", "reasoning", "function-calling"], costPer1kTokens: 0.0011, avgLatencyMs: 2000 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "",
    enabled: false,
    models: [
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", contextWindow: 200000, capabilities: ["text", "vision", "function-calling", "extended-thinking"], costPer1kTokens: 0.015, avgLatencyMs: 2000 },
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextWindow: 200000, capabilities: ["text", "vision", "function-calling", "extended-thinking"], costPer1kTokens: 0.003, avgLatencyMs: 980 },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, capabilities: ["text", "vision", "function-calling"], costPer1kTokens: 0.0008, avgLatencyMs: 380 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "gemini",
    name: "Google Gemini",
    type: "openai-compat",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKey: "",
    enabled: false,
    models: [
      { id: "gemini-2.5-pro-preview-05-06", name: "Gemini 2.5 Pro", contextWindow: 1048576, capabilities: ["text", "vision", "function-calling", "long-context", "reasoning"], costPer1kTokens: 0.00125, avgLatencyMs: 1500 },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1048576, capabilities: ["text", "vision", "function-calling", "long-context"], costPer1kTokens: 0.0001, avgLatencyMs: 320 },
      { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextWindow: 1048576, capabilities: ["text", "vision"], costPer1kTokens: 0.000075, avgLatencyMs: 250 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "venice",
    name: "Venice AI",
    type: "openai-compat",
    baseUrl: "https://api.venice.ai/api/v1",
    apiKey: "",
    enabled: false,
    models: [
      { id: "venice-uncensored", name: "Venice Uncensored", contextWindow: 32768, capabilities: ["text"], costPer1kTokens: 0.0005, avgLatencyMs: 800 },
      { id: "llama-3.3-70b", name: "Llama 3.3 70B", contextWindow: 131072, capabilities: ["text", "function-calling"], costPer1kTokens: 0.0003, avgLatencyMs: 700 },
      { id: "mistral-31-24b", name: "Mistral 24B", contextWindow: 131072, capabilities: ["text", "function-calling"], costPer1kTokens: 0.0002, avgLatencyMs: 600 },
      { id: "qwen-2.5-vl", name: "Qwen 2.5 VL", contextWindow: 32768, capabilities: ["text", "vision"], costPer1kTokens: 0.0003, avgLatencyMs: 750 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "openai-compat",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    enabled: false,
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat (V3)", contextWindow: 64000, capabilities: ["text", "function-calling", "json-mode"], costPer1kTokens: 0.00027, avgLatencyMs: 600 },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner (R1)", contextWindow: 64000, capabilities: ["text", "reasoning"], costPer1kTokens: 0.00055, avgLatencyMs: 2500 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    type: "openai-compat",
    baseUrl: "https://api.x.ai/v1",
    apiKey: "",
    enabled: false,
    models: [
      { id: "grok-3", name: "Grok 3", contextWindow: 131072, capabilities: ["text", "function-calling", "reasoning"], costPer1kTokens: 0.003, avgLatencyMs: 1100 },
      { id: "grok-3-mini", name: "Grok 3 Mini", contextWindow: 131072, capabilities: ["text", "function-calling", "reasoning"], costPer1kTokens: 0.0003, avgLatencyMs: 500 },
      { id: "grok-2-vision-1212", name: "Grok 2 Vision", contextWindow: 32768, capabilities: ["text", "vision", "function-calling"], costPer1kTokens: 0.002, avgLatencyMs: 900 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    type: "openai-compat",
    baseUrl: "http://localhost:11434/v1",
    apiKey: "ollama",
    enabled: false,
    models: [
      { id: "llama3.2", name: "Llama 3.2 (3B)", contextWindow: 131072, capabilities: ["text"], costPer1kTokens: 0.0, avgLatencyMs: 2000 },
      { id: "llama3.2:1b", name: "Llama 3.2 (1B)", contextWindow: 131072, capabilities: ["text"], costPer1kTokens: 0.0, avgLatencyMs: 800 },
      { id: "mistral", name: "Mistral 7B", contextWindow: 32768, capabilities: ["text", "function-calling"], costPer1kTokens: 0.0, avgLatencyMs: 1800 },
      { id: "gemma3", name: "Gemma 3 (4B)", contextWindow: 128000, capabilities: ["text", "vision"], costPer1kTokens: 0.0, avgLatencyMs: 1500 },
      { id: "qwen2.5-coder", name: "Qwen 2.5 Coder (7B)", contextWindow: 32768, capabilities: ["text", "function-calling"], costPer1kTokens: 0.0, avgLatencyMs: 2200 },
      { id: "deepseek-r1", name: "DeepSeek R1 (7B)", contextWindow: 131072, capabilities: ["text", "reasoning"], costPer1kTokens: 0.0, avgLatencyMs: 3000 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let PROVIDERS: ProviderConfig[] = JSON.parse(JSON.stringify(DEFAULT_PROVIDERS));

function isValidProviderType(type: string): type is ProviderType {
  return VALID_TYPES.includes(type as ProviderType);
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? "••••••••" : "";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function toPublic(p: ProviderConfig): ProviderConfigPublic {
  return {
    ...p,
    apiKey: maskKey(p.apiKey),
    hasApiKey: Boolean(p.apiKey),
  };
}

export const providerRegistry = {
  list(): ProviderConfigPublic[] {
    return PROVIDERS.map(toPublic);
  },

  getAll(): ProviderConfig[] {
    return PROVIDERS;
  },

  getById(id: string): ProviderConfig | undefined {
    return PROVIDERS.find((p) => p.id === id);
  },

  upsert(data: Partial<ProviderConfig> & { id: string }): ProviderConfigPublic {
    const existing = PROVIDERS.find((p) => p.id === data.id);
    if (existing) {
      const updated: ProviderConfig = {
        ...existing,
        ...data,
        apiKey: data.apiKey !== undefined ? (data.apiKey || existing.apiKey) : existing.apiKey,
        updatedAt: new Date().toISOString(),
      };
      PROVIDERS = PROVIDERS.map((p) => (p.id === data.id ? updated : p));
      return toPublic(updated);
    }
    const created: ProviderConfig = {
      id: data.id,
      name: data.name ?? data.id,
      type: isValidProviderType(data.type ?? "openai-compat") ? (data.type ?? "openai-compat") : "openai-compat",
      baseUrl: data.baseUrl ?? "",
      apiKey: data.apiKey ?? "",
      enabled: data.enabled ?? false,
      models: data.models ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    PROVIDERS.push(created);
    return toPublic(created);
  },

  patch(id: string, data: Partial<Omit<ProviderConfig, "id" | "createdAt">>): ProviderConfigPublic | null {
    const existing = PROVIDERS.find((p) => p.id === id);
    if (!existing) return null;
    const updated: ProviderConfig = {
      ...existing,
      ...data,
      type: data.type && isValidProviderType(data.type) ? data.type : existing.type,
      apiKey: data.apiKey !== undefined ? (data.apiKey || existing.apiKey) : existing.apiKey,
      updatedAt: new Date().toISOString(),
    };
    PROVIDERS = PROVIDERS.map((p) => (p.id === id ? updated : p));
    return toPublic(updated);
  },

  remove(id: string): boolean {
    const before = PROVIDERS.length;
    PROVIDERS = PROVIDERS.filter((p) => p.id !== id);
    return PROVIDERS.length < before;
  },

  getAllModels(): Array<{ providerId: string; providerName: string } & ProviderModel & { status: string }> {
    return PROVIDERS.filter((p) => p.enabled).flatMap((p) =>
      p.models.map((m) => ({
        ...m,
        providerId: p.id,
        providerName: p.name,
        status: "available",
      }))
    );
  },

  getProviderForModel(modelId: string): ProviderConfig | undefined {
    return PROVIDERS.find((p) => p.enabled && p.models.some((m) => m.id === modelId));
  },

  createOpenAIClient(provider: ProviderConfig): OpenAI {
    return new OpenAI({
      apiKey: provider.apiKey || "no-key",
      baseURL: provider.baseUrl,
    });
  },

  createAnthropicClient(provider: ProviderConfig): Anthropic {
    return new Anthropic({
      apiKey: provider.apiKey,
    });
  },
};
