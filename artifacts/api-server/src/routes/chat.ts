import { Router } from "express";
import { z } from "@workspace/api-zod";

const router = Router();

const ChatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const ChatRequest = z.object({
  messages: z.array(ChatMessage).min(1),
});

router.post("/chat", (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const lastUserMessage = [...parsed.data.messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const lower = lastUserMessage.toLowerCase();

  const reply = lower.includes("openclaw") || lower.includes("chat")
    ? "Yes — this is now an interactive assistant workspace. You can chat here, inspect tasks, approve actions, and route work through OmegaBot."
    : lower.includes("task")
      ? "I can help create or inspect tasks, runs, and approvals. Tell me what you want automated."
      : lower.includes("approve")
        ? "I can review pending approvals and explain the risk before you act."
        : lower.includes("settings")
          ? "I can help tune runtime and safety settings, including approval thresholds and LLM routing."
          : "I’m here and ready. Ask me to review tasks, explain approvals, or help operate OmegaBot.";

  res.json({
    reply,
    messages: [
      ...parsed.data.messages,
      { role: "assistant", content: reply },
    ],
  });
});

export default router;
