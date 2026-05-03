import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const ChatMessage = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1),
  conversationId: z.string().optional(),
});

const SYSTEM_PROMPT = `You are OmegaBot, an intelligent personal AI assistant and operator console. You help operators manage tasks, runs, approvals, adapters, LLM routing, and integrations on the OmegaBot platform.

You have deep knowledge of:
- Tasks: durable, named workflows bound to an adapter
- Runs: individual task executions with LLM usage, output, retry state and idempotency keys
- Commands: write operations within tasks that may require human approval
- Approvals: human-in-the-loop gates for risky or high-impact actions
- Adapters: pluggable connectors to external services (Gmail, GitHub, Slack, Notion, etc.)
- LLM Routing: directing model calls based on task priority, adapter, risk level
- Events: system event log for auditing and debugging

When helping operators, be concise, direct, and practical. Suggest dashboard actions when relevant (e.g. "Go to Approvals to review"). You are the AI brain of the platform.`;

router.post("/chat", async (req: Request, res: Response) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { messages } = parsed.data;

  const chatMessages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 2048,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullContent += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
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
