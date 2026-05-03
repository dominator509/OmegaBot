import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Star, ToggleLeft, ToggleRight, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useListLlmModels, useListLlmRoutes, useGetLlmUsage, useCreateLlmRoute } from "@workspace/api-client-react";
import { MOCK_LLM_MODELS, MOCK_LLM_ROUTES, MOCK_LLM_USAGE } from "@/lib/mock-data";
import { cn, STATUS_COLORS, formatNumber } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  anthropic: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  google: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  local: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

export default function LlmRouting() {
  const [showCreate, setShowCreate] = useState(false);
  const [newRoute, setNewRoute] = useState({ name: "", condition: "", targetModelId: "gpt-4o", priority: 10, enabled: true });

  const { data: modelsRaw, isError: mErr } = useListLlmModels({ query: { queryKey: ["llm-models"], retry: false, refetchInterval: 60000 } });
  const { data: routesRaw, isError: rErr } = useListLlmRoutes({ query: { queryKey: ["llm-routes"], retry: false, refetchInterval: 60000 } });
  const { data: usageRaw, isError: uErr } = useGetLlmUsage({ query: { queryKey: ["llm-usage"], retry: false, refetchInterval: 60000 } });
  const createRoute = useCreateLlmRoute();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const models = useMemo(() => (mErr || !modelsRaw) ? MOCK_LLM_MODELS : ((modelsRaw as unknown as { items: typeof MOCK_LLM_MODELS })?.items ?? MOCK_LLM_MODELS), [modelsRaw, mErr]);
  const routes = useMemo(() => (rErr || !routesRaw) ? MOCK_LLM_ROUTES : ((routesRaw as unknown as { items: typeof MOCK_LLM_ROUTES })?.items ?? MOCK_LLM_ROUTES), [routesRaw, rErr]);
  const usage = useMemo(() => (uErr || !usageRaw) ? MOCK_LLM_USAGE : usageRaw as typeof MOCK_LLM_USAGE, [usageRaw, uErr]);
  const isDemo = mErr || !modelsRaw;

  function handleCreate() {
    const name = newRoute.name;
    createRoute.mutate({ data: { name, condition: newRoute.condition, targetModelId: newRoute.targetModelId, priority: newRoute.priority, enabled: newRoute.enabled } }, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["llm-routes"] }); toast({ title: "Route created", description: `"${name}" routing rule has been added.` }); },
      onError: () => toast({ title: "Error", description: "Failed to create route.", variant: "destructive" }),
    });
    setShowCreate(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">LLM Routing</h1>
          <p className="text-sm text-muted-foreground">{models.length} models · {routes.length} routes</p>
        </div>
        <div className="flex gap-2">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total tokens", value: formatNumber(usage.totalTokens) },
          { label: "Total requests", value: formatNumber(usage.totalRequests) },
          { label: "Avg latency", value: `${usage.avgLatencyMs}ms` },
          { label: "Tokens today", value: formatNumber(usage.last24hTokens) },
          { label: "Tokens last 7d", value: formatNumber(usage.last7dTokens) },
          { label: "Active models", value: models.filter((m) => m.status === "available").length.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-0.5">{s.label}</div>
            <div className="text-lg font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="models">
        <TabsList className="mb-4">
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="models">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Model</th>
                  <th className="text-left px-3 py-2.5 font-medium">Provider</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Context</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Cost/1k</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Avg latency</th>
                  <th className="text-left px-3 py-2.5 font-medium">Capabilities</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {models.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{m.name}</span>
                        {m.isDefault && <span title="Default model"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /></span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded font-medium", PROVIDER_COLORS[m.provider] ?? "bg-slate-500/10 text-slate-600")}>{m.provider}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={cn("text-xs px-2 py-1 rounded font-medium", STATUS_COLORS[m.status])}>{m.status}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground">{formatNumber(m.contextWindow)}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs font-mono">${m.costPer1kTokens.toFixed(4)}</td>
                    <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground">{m.avgLatencyMs}ms</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {m.capabilities.slice(0, 3).map((c) => (
                          <span key={c} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{c}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="routes">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-muted-foreground">Routes evaluated in priority order. First match wins.</span>
            <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setShowCreate(true)}>
              <Plus className="h-3 w-3" /> Add Route
            </Button>
          </div>
          <div className="space-y-2">
            {routes.sort((a, b) => a.priority - b.priority).map((route) => (
              <div key={route.id} className={cn("border rounded-lg p-4 transition-colors", route.enabled ? "" : "opacity-60")}>
                <div className="flex items-start gap-3">
                  <div className="text-xs font-bold text-muted-foreground w-6 shrink-0 mt-0.5">#{route.priority}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{route.name}</span>
                      {route.enabled ? (
                        <span title="Enabled"><ToggleRight className="h-4 w-4 text-green-500" /></span>
                      ) : (
                        <span title="Disabled"><ToggleLeft className="h-4 w-4 text-muted-foreground" /></span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono bg-muted px-2 py-0.5 rounded">{route.condition}</span>
                      <span className="flex items-center gap-1">
                        <Cpu className="h-3 w-3" /> {route.targetModelName}
                      </span>
                      <span>{route.matchCount} matches</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Token Usage by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={usage.byModel ?? []} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                  <YAxis type="category" dataKey="modelName" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={130} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                    formatter={(val: number) => [formatNumber(val), "tokens"]}
                  />
                  <Bar dataKey="tokens" fill="hsl(var(--chart-1))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Model</th>
                  <th className="text-right px-3 py-2.5 font-medium">Tokens</th>
                  <th className="text-right px-3 py-2.5 font-medium">Requests</th>
                  <th className="text-right px-3 py-2.5 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(usage.byModel ?? []).map((m) => (
                  <tr key={m.modelId} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{m.modelName}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono">{formatNumber(m.tokens)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{m.requests}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-mono">${m.cost.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Routing Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. High-risk → GPT-4o" value={newRoute.name} onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Input placeholder="e.g. task.isHighRisk == true" value={newRoute.condition} onChange={(e) => setNewRoute({ ...newRoute, condition: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Target Model</Label>
                <Select value={newRoute.targetModelId} onValueChange={(v) => setNewRoute({ ...newRoute, targetModelId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input type="number" value={newRoute.priority} onChange={(e) => setNewRoute({ ...newRoute, priority: Number(e.target.value) })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newRoute.name || !newRoute.condition}>Add Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
