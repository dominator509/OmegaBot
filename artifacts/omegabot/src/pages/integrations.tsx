import { useState, useMemo } from "react";
import { CheckCircle, Clock, XCircle, ExternalLink, Webhook } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListIntegrations } from "@workspace/api-client-react";
import { MOCK_INTEGRATIONS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, formatRelativeTime } from "@/lib/utils";

const STATUS_ICONS = {
  connected: CheckCircle,
  pending: Clock,
  disconnected: XCircle,
  error: XCircle,
};

const STATUS_ICON_COLORS = {
  connected: "text-green-500",
  pending: "text-amber-500",
  disconnected: "text-slate-400",
  error: "text-red-500",
};

const CATEGORY_COLORS: Record<string, string> = {
  productivity: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  communication: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  developer: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  storage: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  calendar: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  ai: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  custom: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
};

export default function Integrations() {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: raw, isError } = useListIntegrations({ query: { queryKey: ["integrations"], retry: false } });
  const integrations = useMemo(() => (isError || !raw) ? MOCK_INTEGRATIONS : ((raw as unknown as { items: typeof MOCK_INTEGRATIONS })?.items ?? MOCK_INTEGRATIONS), [raw, isError]);
  const isDemo = isError || !raw;

  const categories = useMemo(() => {
    const set = new Set(integrations.map((i) => i.category));
    return Array.from(set) as string[];
  }, [integrations]);

  const filtered = useMemo(() =>
    categoryFilter === "all" ? integrations : integrations.filter((i) => i.category === categoryFilter),
    [integrations, categoryFilter]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, typeof MOCK_INTEGRATIONS> = {};
    filtered.forEach((i) => {
      if (!map[i.category]) map[i.category] = [];
      map[i.category].push(i);
    });
    return map;
  }, [filtered]);

  const connected = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Integrations</h1>
          <p className="text-sm text-muted-foreground">{connected} connected · {integrations.length} total</p>
        </div>
        <div className="flex gap-2 items-center">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", CATEGORY_COLORS[category] ?? "bg-slate-500/10 text-slate-600")}>{category}</span>
              <span className="text-muted-foreground/60">{items.length}</span>
            </h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {items.map((int) => {
                const StatusIcon = STATUS_ICONS[int.status as keyof typeof STATUS_ICONS] ?? XCircle;
                const iconColor = STATUS_ICON_COLORS[int.status as keyof typeof STATUS_ICON_COLORS] ?? "text-slate-400";
                return (
                  <Card key={int.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("h-4 w-4 shrink-0", iconColor)} />
                        <span className="font-medium text-sm">{int.name}</span>
                        {int.isBuiltin && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">built-in</span>}
                      </div>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", STATUS_COLORS[int.status])}>{int.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{int.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {int.permissions.slice(0, 3).map((p) => (
                        <span key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{p}</span>
                      ))}
                    </div>
                    {int.status === "connected" && (
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {int.lastSync && <div>Last sync: {formatRelativeTime(int.lastSync)}</div>}
                        {int.webhookUrl && (
                          <div className="flex items-center gap-1">
                            <Webhook className="h-3 w-3" />
                            <span className="font-mono truncate">{int.webhookUrl}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {int.status === "connected" ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1">Configure</Button>
                      ) : (
                        <Button size="sm" className="h-7 text-xs flex-1 gap-1">
                          <ExternalLink className="h-3 w-3" /> Connect
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
