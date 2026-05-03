import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type ChatItem = { role: "user" | "assistant"; content: string };

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    { role: "assistant", content: "Welcome to OmegaBot chat. Ask me about tasks, approvals, or how to operate the assistant." },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  async function sendMessage() {
    if (!canSend) return;
    const next = [...messages, { role: "user", content: input.trim() } as const];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json() as { messages?: ChatItem[]; reply?: string };
      if (data.messages?.length) setMessages(data.messages);
      else if (data.reply) setMessages((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
      void queryClient.invalidateQueries({ queryKey: ["overview-summary"] });
    } catch {
      toast({ title: "Chat failed", description: "The assistant could not respond. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Assistant Chat</h1>
          <p className="text-sm text-muted-foreground">Talk to OmegaBot like an operator console.</p>
        </div>
        <Badge variant="outline" className="text-xs text-muted-foreground">live chat</Badge>
      </div>

      <Card className="p-4 mb-4 min-h-[55vh] flex flex-col gap-3 bg-background/80">
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {message.content}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="border-t pt-4 space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask OmegaBot anything..."
            className="min-h-24 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Press Ctrl/Cmd + Enter to send.</p>
            <Button onClick={() => void sendMessage()} disabled={!canSend} className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
