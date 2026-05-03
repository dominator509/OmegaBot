import { Link } from "wouter";
import { ArrowRight, Activity, ListTodo, Command, CheckCircle, Network, Cpu, FileCode, GitBranch, Zap, Shield, Key, GitMerge, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGetOverviewSummary, useGetSettings } from "@workspace/api-client-react";
import { MOCK_SETTINGS } from "@/lib/mock-data";

const concepts = [
  { icon: ListTodo, title: "Tasks", desc: "Durable, named workflows bound to an adapter. Each task can run many times, be paused, retried, or approval-gated.", href: "/tasks", color: "text-blue-500" },
  { icon: Activity, title: "Runs", desc: "A single execution of a task. Carries LLM usage, output, retry state, idempotency key, and stale detection.", href: "/tasks", color: "text-violet-500" },
  { icon: Command, title: "Commands", desc: "Individual write or external-call operations within a task. Can be high-risk, require approval, and carry idempotency keys.", href: "/commands", color: "text-indigo-500" },
  { icon: CheckCircle, title: "Approvals", desc: "Human-in-the-loop gates for risky actions. Approval requests expire if not acted on and support full audit trails.", href: "/approvals", color: "text-amber-500" },
  { icon: Network, title: "Adapters", desc: "Pluggable connectors to external services (Gmail, GitHub, Slack, Notion…). Each adapter reports its own health and permissions.", href: "/adapters", color: "text-teal-500" },
  { icon: Cpu, title: "LLM Routing", desc: "Model routing engine. Route calls to different models based on task priority, adapter, risk level, or custom conditions.", href: "/llm", color: "text-pink-500" },
];

const principles = [
  { icon: Shield, title: "Write-safety by default", desc: "All write operations are explicitly flagged. Read-only commands are always safe to retry." },
  { icon: Key, title: "Idempotency everywhere", desc: "Every command and run carries an idempotency key. Duplicate operations are detected and deduplicated." },
  { icon: GitMerge, title: "Approval-gated execution", desc: "High-risk operations pause and wait for human approval before proceeding. Expired approvals are auto-rejected." },
  { icon: Zap, title: "Adapter isolation", desc: "Each adapter is independently connected, health-monitored, and permissioned. Adapter failures don't cascade." },
];

export default function StartHere() {
  const { data: overview } = useGetOverviewSummary({
    query: { queryKey: ["overview-summary"], retry: false, refetchInterval: 60000 },
  });
  const { data: settings } = useGetSettings({
    query: { queryKey: ["settings"], retry: false, staleTime: 300000 },
  });

  const version = (settings as { version?: string } | undefined)?.version ?? MOCK_SETTINGS.version;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">Ω</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OmegaBot</h1>
          <p className="text-sm text-muted-foreground">Personal AI Assistant Platform</p>
        </div>
        <Badge variant="outline" className="ml-auto font-mono text-xs">v{version}</Badge>
      </div>

      <p className="text-muted-foreground mt-4 mb-6 text-base leading-relaxed max-w-2xl">
        OmegaBot is a modular, observable, approval-gated personal AI assistant platform. It connects to your tools via adapters, runs durable tasks with LLM routing, gates risky actions behind human approval, and provides full audit trails of everything that happened.
      </p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <Button asChild>
          <Link href="/chat">Open Chat <MessageSquare className="h-4 w-4" /></Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/overview">Open Dashboard <ArrowRight className="h-4 w-4" /></Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/tasks">View Tasks</Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{overview?.activeTasks ?? 0}</div><div className="text-sm text-muted-foreground">Active tasks</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{overview?.pendingApprovals ?? 0}</div><div className="text-sm text-muted-foreground">Pending approvals</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{overview?.adaptersHealthy ?? 0}/{overview?.adaptersTotal ?? 0}</div><div className="text-sm text-muted-foreground">Adapters healthy</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{(overview?.tokensUsedToday ?? 0).toLocaleString()}</div><div className="text-sm text-muted-foreground">Tokens today</div></CardContent></Card>
      </div>

      <Separator className="my-8" />

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {concepts.map((c) => (
          <Link key={c.title} href={c.href}>
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><c.icon className={`h-4 w-4 ${c.color}`} />{c.title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{c.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {principles.map((p) => (
          <Card key={p.title}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><p.icon className="h-4 w-4 text-primary" />{p.title}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">{p.desc}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
