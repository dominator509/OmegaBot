import { Link } from "wouter";
import { ArrowRight, Activity, ListTodo, Command, CheckCircle, Network, Cpu, FileCode, GitBranch, Zap, Shield, Key, GitMerge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useGetOverviewSummary } from "@workspace/api-client-react";
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
    query: { queryKey: ["overview-summary"], retry: false },
  });

  const version = MOCK_SETTINGS.version;

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
          Ω
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OmegaBot</h1>
          <p className="text-sm text-muted-foreground">Personal AI Assistant Platform</p>
        </div>
        <Badge variant="outline" className="ml-auto font-mono text-xs">v{version}</Badge>
      </div>

      <p className="text-muted-foreground mt-4 mb-6 text-base leading-relaxed max-w-2xl">
        OmegaBot is a modular, observable, approval-gated personal AI assistant platform. It connects to your tools via adapters, runs durable tasks with LLM routing, gates risky actions behind human approval, and provides full audit trails of everything that happened.
      </p>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Active tasks", value: overview.activeTasks },
            { label: "Pending approvals", value: overview.pendingApprovals },
            { label: "Adapters healthy", value: `${overview.adaptersHealthy}/${overview.adaptersTotal}` },
            { label: "Tokens today", value: overview.tokensUsedToday?.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border rounded-lg p-3">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 mb-8">
        <Link href="/overview">
          <Button className="gap-2">
            Open Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline" className="gap-2">
            View Tasks <ListTodo className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <Separator className="mb-8" />

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Core Concepts</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {concepts.map((c) => (
          <Link key={c.title} href={c.href}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  {c.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Design Principles</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {principles.map((p) => (
          <div key={p.title} className="flex gap-3 p-4 bg-card border rounded-lg">
            <p.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium mb-1">{p.title}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Navigation</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        {[
          { href: "/approvals", label: "Approvals", icon: CheckCircle, badge: "3 pending" },
          { href: "/events", label: "Events", icon: Activity },
          { href: "/llm", label: "LLM Routing", icon: Cpu },
          { href: "/github", label: "GitHub Plans", icon: GitBranch },
          { href: "/adapters", label: "Adapters", icon: Network },
          { href: "/integrations", label: "Integrations", icon: Zap },
          { href: "/artifacts", label: "Artifacts", icon: FileCode },
          { href: "/settings", label: "Settings", icon: Command },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex items-center gap-2 p-3 bg-card border rounded-lg hover:border-primary/40 transition-colors cursor-pointer text-sm">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{item.label}</span>
              {item.badge && <Badge variant="outline" className="ml-auto text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0 py-0">{item.badge}</Badge>}
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>OmegaBot v{version}</span>
        <span>·</span>
        <span>API-first</span>
        <span>·</span>
        <span>Adapter-based</span>
        <span>·</span>
        <span>Approval-gated</span>
      </div>
    </div>
  );
}
