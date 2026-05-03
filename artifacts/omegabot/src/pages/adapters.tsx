import { useState, useMemo } from "react";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useListAdapters } from "@workspace/api-client-react";
import { MOCK_ADAPTERS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, ADAPTER_COLORS, formatRelativeTime } from "@/lib/utils";

const HEALTH_ICONS = {
  healthy: CheckCircle,
  degraded: AlertTriangle,
  unhealthy: XCircle,
  unknown: HelpCircle,
  error: XCircle,
};

const HEALTH_COLORS = {
  healthy: "text-green-500",
  degraded: "text-amber-500",
  unhealthy: "text-red-500",
  unknown: "text-slate-400",
  error: "text-red-500",
};

export default function Adapters() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: raw, isError } = useListAdapters({ query: { queryKey: ["adapters"], retry: false, refetchInterval: 30000 } });
  const adapters = useMemo(() => (isError || !raw) ? MOCK_ADAPTERS : ((raw as unknown as { items: typeof MOCK_ADAPTERS })?.items ?? MOCK_ADAPTERS), [raw, isError]);
  const isDemo = isError || !raw;

  const selected = adapters.find((a) => a.id === selectedId);

  const summary = useMemo(() => ({
    healthy: adapters.filter((a) => (a.health as Record<string, unknown>)?.status === "healthy").length,
    degraded: adapters.filter((a) => (a.health as Record<string, unknown>)?.status === "degraded").length,
    unhealthy: adapters.filter((a) => ["unhealthy", "error"].includes(((a.health as Record<string, unknown>)?.status as string) ?? "")).length,
  }), [adapters]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Adapters</h1>
          <p className="text-sm text-muted-foreground">{adapters.length} adapters</p>
        </div>
        <div className="flex gap-2 items-center">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><span className="w-2 h-2 rounded-full bg-green-500"></span>{summary.healthy} healthy</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{summary.degraded} degraded</span>
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400"><span className="w-2 h-2 rounded-full bg-red-500"></span>{summary.unhealthy} unhealthy</span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {adapters.map((adapter) => {
          const health = adapter.health as Record<string, unknown>;
          const HealthIcon = HEALTH_ICONS[(health?.status as keyof typeof HEALTH_ICONS) ?? "unknown"];
          const healthColor = HEALTH_COLORS[(health?.status as keyof typeof HEALTH_COLORS) ?? "unknown"];
          return (
            <Card
              key={adapter.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedId(adapter.id as string)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">{adapter.name as string}</CardTitle>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium mt-1 inline-block", ADAPTER_COLORS[adapter.type as string] ?? "bg-slate-500/10 text-slate-600")}>{adapter.type as string}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("text-xs px-2 py-0.5 rounded font-medium", STATUS_COLORS[adapter.status as string])}>{adapter.status as string}</span>
                    <div className={cn("flex items-center gap-1 text-xs", healthColor)}>
                      <HealthIcon className="h-3 w-3" />
                      <span>{health?.latencyMs ? `${health.latencyMs}ms` : (health?.status as string ?? "unknown")}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-3">{adapter.description as string}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Commands</span><div className="font-medium">{adapter.commandCount as number}</div></div>
                  <div><span className="text-muted-foreground">Error rate</span><div className={cn("font-medium", (adapter.errorRate as number) > 0.1 ? "text-red-500" : (adapter.errorRate as number) > 0.05 ? "text-amber-500" : "text-green-500")}>{((adapter.errorRate as number) * 100).toFixed(0)}%</div></div>
                  <div><span className="text-muted-foreground">Last activity</span><div className="font-medium">{formatRelativeTime(adapter.lastActivity as string)}</div></div>
                  <div><span className="text-muted-foreground">Credentials</span>
                    <div className="font-medium flex items-center gap-1">
                      {adapter.credentialsConfigured ? (
                        <><Shield className="h-3 w-3 text-green-500" /> Configured</>
                      ) : (
                        <><Shield className="h-3 w-3 text-red-500" /> Missing</>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name as string}</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const health = selected.health as Record<string, unknown>;
            const HealthIcon = HEALTH_ICONS[(health?.status as keyof typeof HEALTH_ICONS) ?? "unknown"];
            const healthColor = HEALTH_COLORS[(health?.status as keyof typeof HEALTH_COLORS) ?? "unknown"];
            return (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-2">
                    <div><span className="text-muted-foreground text-xs">Status</span><div><span className={cn("text-xs px-2 py-0.5 rounded font-medium", STATUS_COLORS[selected.status as string])}>{selected.status as string}</span></div></div>
                    <div><span className="text-muted-foreground text-xs">Type</span><div className="font-medium">{selected.type as string}</div></div>
                    <div><span className="text-muted-foreground text-xs">Version</span><div className="font-mono text-xs">{selected.version as string}</div></div>
                    <div><span className="text-muted-foreground text-xs">Commands run</span><div className="font-medium">{selected.commandCount as number}</div></div>
                    <div><span className="text-muted-foreground text-xs">Error rate</span><div className="font-medium">{((selected.errorRate as number) * 100).toFixed(1)}%</div></div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Health</span>
                      <div className={cn("flex items-center gap-1 text-sm font-medium", healthColor)}>
                        <HealthIcon className="h-3.5 w-3.5" />
                        <span>{health?.status as string}</span>
                        {!!health?.latencyMs && <span className="text-muted-foreground font-normal ml-1">{health.latencyMs as number}ms</span>}
                      </div>
                      {!!health?.message && <div className="text-xs text-muted-foreground mt-0.5">{health.message as string}</div>}
                    </div>
                    <div><span className="text-muted-foreground text-xs">Last checked</span><div className="text-xs">{formatRelativeTime(health?.lastChecked as string)}</div></div>
                    <div><span className="text-muted-foreground text-xs">Last activity</span><div className="text-xs">{formatRelativeTime(selected.lastActivity as string)}</div></div>
                    <div>
                      <span className="text-muted-foreground text-xs">Credentials</span>
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <Shield className={cn("h-3 w-3", selected.credentialsConfigured ? "text-green-500" : "text-red-500")} />
                        {selected.credentialsConfigured ? "Configured" : "Missing"}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Permissions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.permissions as string[]).map((p) => (
                      <span key={p} className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
