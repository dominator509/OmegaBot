import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Activity, CheckCircle, AlertTriangle, Clock, Cpu, Network, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetOverviewSummary } from "@workspace/api-client-react";
import { MOCK_OVERVIEW } from "@/lib/mock-data";
import { STATUS_COLORS, LEVEL_COLORS, formatRelativeTime, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PIE_COLORS: Record<string, string> = {
  running: "#3b82f6", completed: "#22c55e", failed: "#ef4444",
  awaiting_approval: "#f59e0b", pending: "#94a3b8", paused: "#64748b",
};

export default function Overview() {
  const { data: raw, isError, isLoading } = useGetOverviewSummary({
    query: { queryKey: ["overview-summary"], retry: false, refetchInterval: 30000 },
  });

  const data = useMemo(() => raw ?? MOCK_OVERVIEW, [raw]);
  const isDemo = isError || !raw;

  const runTrendFormatted = useMemo(() => {
    return (data.runTrend ?? []).map((r: { hour: string; count: number; failed: number }) => ({
      hour: new Date(r.hour).getHours() + ":00",
      count: r.count,
      failed: r.failed,
      success: r.count - r.failed,
    }));
  }, [data.runTrend]);

  const stats = [
    { label: "Active tasks", value: data.activeTasks, icon: Activity, color: "text-blue-500" },
    { label: "Completed today", value: data.completedToday, icon: CheckCircle, color: "text-green-500" },
    { label: "Failed today", value: data.failedToday, icon: AlertTriangle, color: "text-red-500" },
    { label: "Pending approvals", value: data.pendingApprovals, icon: Clock, color: "text-amber-500" },
    { label: "Adapters healthy", value: `${data.adaptersHealthy}/${data.adaptersTotal}`, icon: Network, color: "text-teal-500" },
    { label: "Runs today", value: data.totalRunsToday, icon: RefreshCw, color: "text-violet-500" },
    { label: "Tokens today", value: data.tokensUsedToday?.toLocaleString(), icon: Cpu, color: "text-pink-500" },
    { label: "Avg run duration", value: formatDuration(data.avgRunDurationMs), icon: Clock, color: "text-indigo-500" },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-muted-foreground">Platform health at a glance</p>
        </div>
        {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
        {isLoading && <Badge variant="outline" className="text-xs">Loading…</Badge>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-bold">{s.value ?? "—"}</div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Run Trend (last 12h)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={runTrendFormatted} barSize={12} barGap={2}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  cursor={{ fill: "hsl(var(--muted))" }}
                />
                <Bar dataKey="success" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Success" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={data.tasksByStatus ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={55} innerRadius={30}>
                  {(data.tasksByStatus ?? []).map((entry: { status: string; count: number }) => (
                    <Cell key={entry.status} fill={PIE_COLORS[entry.status] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  formatter={(val, name) => [val, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(data.tasksByStatus ?? []).map((s: { status: string; count: number }) => (
                <span key={s.status} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_COLORS[s.status])}>
                  {s.status} · {s.count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {(data.recentActivity ?? []).map((evt: { id: string; level: string; type: string; message: string; adapter?: string; timestamp: string }) => (
              <div key={evt.id} className="flex items-start gap-3 px-4 py-3 text-sm hover:bg-muted/30 transition-colors">
                <div className={cn("mt-0.5 text-[10px] font-semibold uppercase w-14 shrink-0", LEVEL_COLORS[evt.level ?? "info"])}>
                  {evt.level}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{evt.message}</span>
                  {evt.adapter && (
                    <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 font-normal">{evt.adapter}</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">{formatRelativeTime(evt.timestamp)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
