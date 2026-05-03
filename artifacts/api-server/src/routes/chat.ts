import { Router, type Request, type Response } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { providerRegistry } from "../lib/provider-registry.js";

const defaultOpenAI = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1",
});

const router = Router();

const ChatMessage = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1).max(100),
  conversationId: z.string().max(128).optional(),
  model: z.string().max(128).optional(),
  providerId: z.string().max(64).optional(),
});

const SYSTEM_PROMPT = `You are OmegaBot, an intelligent personal AI assistant and operator console. You help operators manage tasks, runs, approvals, adapters, LLM routing, and integrations on the OmegaBot platform.

You have deep knowledge of:
- Tasks: durable, named workflows bound to an adapter
- Runs: individual task executions with LLM usage, output, retry state and idempotency keys
- Commands: write operations within tasks that may require human approval
- Approvals: human-in-the-loop gates for risky or high-impact actions
- Adapters: pluggable connectors to external services (Gmail, GitHub, Slack, Notion, etc.)
- LLM Routing: directing model calls based on task priority, adapter, risk level
- AI Providers: OpenAI, Anthropic, Google Gemini, Venice AI, DeepSeek, Grok, and Ollama
- Events: system event log for auditing and debugging

When helping operators, be concise, direct, and practical. Suggest dashboard actions when relevant (e.g. "Go to Approvals to review"). You are the AI brain of the platform.`;

async function streamOpenAICompat(
  client: ReturnType<typeof providerRegistry.createOpenAIClient>,
  model: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  res: Response
): Promise<string> {
  let fullContent = "";
  const stream = await client.chat.completions.create({
    model,
    max_completion_tokens: 2048,
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }
  return fullContent;
}

async function streamAnthropic(
  client: ReturnType<typeof providerRegistry.createAnthropicClient>,
  model: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  res: Response
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const userMsgs = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let fullContent = "";
  const stream = await client.messages.create({
    model,
    max_tokens: 2048,
    system: systemMsg,
    messages: userMsgs,
    stream: true,
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const content = event.delta.text;
      fullContent += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }
  return fullContent;
}

router.post("/chat", async (req: Request, res: Response) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { messages, model: requestedModel, providerId: requestedProviderId } = parsed.data;

  const chatMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    let fullContent = "";

    if (requestedModel && requestedProviderId) {
      const provider = providerRegistry.getById(requestedProviderId);
      if (!provider || !provider.enabled) {
        res.write(`data: ${JSON.stringify({ error: `Provider '${requestedProviderId}' is not configured or enabled` })}\n\n`);
        res.end();
        return;
      }
      if (provider.type === "anthropic") {
        const client = providerRegistry.createAnthropicClient(provider);
        fullContent = await streamAnthropic(client, requestedModel, chatMessages, res);
      } else {
        const client = providerRegistry.createOpenAIClient(provider);
        fullContent = await streamOpenAICompat(client, requestedModel, chatMessages, res);
      }
    } else if (requestedModel) {
      const provider = providerRegistry.getProviderForModel(requestedModel);
      if (provider) {
        if (provider.type === "anthropic") {
          const client = providerRegistry.createAnthropicClient(provider);
          fullContent = await streamAnthropic(client, requestedModel, chatMessages, res);
        } else {
          const client = providerRegistry.createOpenAIClient(provider);
          fullContent = await streamOpenAICompat(client, requestedModel, chatMessages, res);
        }
      } else {
        fullContent = await streamOpenAICompat(defaultOpenAI, requestedModel, chatMessages, res);
      }
    } else {
      fullContent = await streamOpenAICompat(defaultOpenAI, "gpt-4.1", chatMessages, res);
    }

    const assistantMessage = { role: "assistant", content: fullContent };
    res.write(`data: ${JSON.stringify({ done: true, message: assistantMessage })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Chat stream error");
    res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
    res.end();
  }
});

export default router;
