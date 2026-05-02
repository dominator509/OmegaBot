import { useState, useMemo } from "react";
import { RefreshCw, ChevronDown, ChevronRight, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListEvents } from "@workspace/api-client-react";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { cn, ADAPTER_COLORS, LEVEL_COLORS, formatRelativeTime } from "@/lib/utils";

const LEVEL_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

export default function Events() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [adapterFilter, setAdapterFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [autoRefresh] = useState(true);

  const { data: raw, isError, refetch } = useListEvents(undefined, {
    query: { queryKey: ["events"], retry: false },
  });

  const events = useMemo(() => (isError || !raw) ? MOCK_EVENTS : ((raw as unknown as { items: typeof MOCK_EVENTS })?.items ?? MOCK_EVENTS), [raw, isError]);
  const isDemo = isError || !raw;

  const adapters = useMemo(() => {
    const set = new Set(events.map((e) => e.adapter).filter(Boolean));
    return Array.from(set) as string[];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = !search || e.message.toLowerCase().includes(search.toLowerCase()) || (e.taskName ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLevel = levelFilter === "all" || e.level === levelFilter;
      const matchAdapter = adapterFilter === "all" || e.adapter === adapterFilter;
      return matchSearch && matchLevel && matchAdapter;
    });
  }, [events, search, levelFilter, adapterFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Event Timeline</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} events</p>
        </div>
        <div className="flex gap-2 items-center">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          {autoRefresh && <span className="text-xs text-muted-foreground flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>live</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input placeholder="Search events…" className="h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {["info", "warning", "error", "success"].map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={adapterFilter} onValueChange={setAdapterFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Adapter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All adapters</SelectItem>
            {adapters.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <div className="absolute left-[22px] top-0 bottom-0 w-px bg-border" />
        <div className="space-y-1">
          {filtered.map((evt) => {
            const isExpanded = expanded === evt.id;
            const LevelIcon = LEVEL_ICONS[evt.level as keyof typeof LEVEL_ICONS] ?? Info;
            return (
              <div key={evt.id} className="relative pl-10">
                <div className={cn("absolute left-4 top-3 h-3 w-3 rounded-full border-2 border-background z-10",
                  evt.level === "success" ? "bg-green-500" :
                  evt.level === "error" ? "bg-red-500" :
                  evt.level === "warning" ? "bg-amber-500" : "bg-blue-500"
                )} />
                <div
                  className="group cursor-pointer hover:bg-muted/30 rounded-lg px-3 py-2 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : evt.id)}
                >
                  <div className="flex items-start gap-2">
                    <LevelIcon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", LEVEL_COLORS[evt.level])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm">{evt.message}</span>
                        {evt.adapter && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", ADAPTER_COLORS[evt.adapter] ?? "bg-slate-500/10 text-slate-600")}>{evt.adapter}</span>
                        )}
                        {evt.taskName && (
                          <span className="text-[10px] text-muted-foreground">{evt.taskName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono text-[10px] text-muted-foreground/60">{evt.type}</span>
                        <span>·</span>
                        <span>{formatRelativeTime(evt.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                  {isExpanded && evt.metadata && (
                    <div className="mt-2 ml-5">
                      <pre className="text-[11px] font-mono bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(evt.metadata, null, 2)}</pre>
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {evt.taskId && <span>Task: <span className="font-mono">{evt.taskId}</span></span>}
                        {evt.runId && <span>Run: <span className="font-mono">{evt.runId}</span></span>}
                        {evt.commandId && <span>Cmd: <span className="font-mono">{evt.commandId}</span></span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No events match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
