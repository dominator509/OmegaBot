import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, StopCircle, RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useGetSettings } from "@workspace/api-client-react";

type Role = "user" | "assistant";
type ChatItem = { role: Role; content: string; streaming?: boolean };

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    { role: "assistant", content: "I can chat, review the dashboard, and execute permitted actions. Enable autopilot in Settings for full autonomy with risk acknowledgment." },
  ]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { toast } = useToast();
  const { data: settings } = useGetSettings({ query: { queryKey: ["settings"], retry: false, staleTime: 300000 } });
  const autopilotEnabled = Boolean((settings as { autopilotEnabled?: boolean; autopilotRiskAccepted?: boolean } | undefined)?.autopilotEnabled && (settings as { autopilotEnabled?: boolean; autopilotRiskAccepted?: boolean } | undefined)?.autopilotRiskAccepted);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function stopStreaming() {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      }
      return prev;
    });
  }

  function clearChat() {
    setMessages([{ role: "assistant", content: "Chat cleared. How can I help you?" }]);
    setInput("");
  }

  async function performControlAction(action: string, target?: string) {
    const response = await fetch(`${BASE}/api/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target, requiresApproval: !autopilotEnabled }),
    });
    if (!response.ok) throw new Error("Control action failed");
    return response.json() as Promise<{ message?: string; state?: string }>;
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatItem = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.map((m) => ({ role: m.role, content: m.content })) }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          const event = JSON.parse(raw) as { content?: string; done?: boolean; error?: string };
          if (event.error) throw new Error(event.error);
          if (event.content) {
            assistantText += event.content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [...prev.slice(0, -1), { ...last, content: last.content + event.content }];
            });
          }
          if (event.done) {
            const shouldRequestApproval = Boolean(assistantText.match(/approve|delete|merge|send|write/i));
            if (shouldRequestApproval) {
              try {
                await performControlAction("assistant_response", text);
              } catch {
                toast({ title: "Action queued", description: "The assistant response was generated, but control action needs approval.", variant: "destructive" });
              }
            }
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (!last || last.role !== "assistant") return prev;
              return [...prev.slice(0, -1), { ...last, streaming: false }];
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast({ title: "Response failed", description: "The assistant could not respond. Please try again.", variant: "destructive" });
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.streaming) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">OmegaBot Chat</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">gpt-5.1</span>
          {autopilotEnabled && <span className="text-xs text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> autopilot</span>}
        </div>
        <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-xs text-muted-foreground">
          <RotateCcw className="h-3.5 w-3.5" /> New chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex gap-3 max-w-3xl mx-auto", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn("h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted border")}>{msg.role === "user" ? "U" : "Ω"}</div>
            <div className={cn("flex-1 rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")}>{msg.content || (msg.streaming ? <span className="flex gap-1 items-center text-muted-foreground"><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" /><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" /><span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" /></span> : "")}{msg.streaming && msg.content && <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-text-bottom" />}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t px-4 py-4 bg-background">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Controlled actions require permission; enable autopilot with explicit risk acknowledgment in Settings.</span>
            <Button variant="outline" size="sm" disabled className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> {autopilotEnabled ? "Autopilot on" : "Autopilot off"}
            </Button>
          </div>
          <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ask OmegaBot anything… (Ctrl+Enter to send)" className="min-h-20 max-h-40 resize-none text-sm" disabled={streaming} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Ctrl / ⌘ + Enter to send</p>
            <div className="flex gap-2">
              {streaming ? <Button variant="outline" size="sm" onClick={stopStreaming} className="gap-1.5"><StopCircle className="h-3.5 w-3.5" /> Stop</Button> : <Button size="sm" onClick={() => void sendMessage()} disabled={!input.trim()} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Send</Button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
