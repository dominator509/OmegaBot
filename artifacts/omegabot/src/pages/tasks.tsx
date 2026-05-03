import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Shield, Key, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListTasks, useListRuns, useCreateTask } from "@workspace/api-client-react";
import { MOCK_TASKS, MOCK_RUNS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, PRIORITY_COLORS, ADAPTER_COLORS, formatRelativeTime, formatDuration, truncate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", description: "", priority: "medium", adapter: "gmail" });

  const { data: tasksData, isError: tasksError } = useListTasks(undefined, { query: { queryKey: ["tasks"], retry: false, refetchInterval: 30000 } });
  const { data: runsData, isError: runsError } = useListRuns(undefined, { query: { queryKey: ["runs"], retry: false, refetchInterval: 30000 } });
  const { data: taskRunsData } = useListRuns(undefined, { query: { queryKey: ["runs-for-task", expandedTask], retry: false, enabled: !!expandedTask } });
  const createTask = useCreateTask();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tasks = useMemo(() => (tasksError || !tasksData) ? MOCK_TASKS : ((tasksData as unknown as { items: typeof MOCK_TASKS })?.items ?? MOCK_TASKS), [tasksData, tasksError]);
  const allRuns = useMemo(() => (runsError || !runsData) ? MOCK_RUNS : ((runsData as unknown as { items: typeof MOCK_RUNS })?.items ?? MOCK_RUNS), [runsData, runsError]);
  const isDemo = tasksError || !tasksData;

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tasks, search, statusFilter]);

  const getTaskRuns = (taskId: string) => allRuns.filter((r) => r.taskId === taskId);

  function handleCreate() {
    const name = newTask.name;
    createTask.mutate(
      { data: { name, description: newTask.description, priority: newTask.priority as "low" | "medium" | "high" | "critical", adapter: newTask.adapter } },
      {
        onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["tasks"] }); void queryClient.invalidateQueries({ queryKey: ["overview-summary"] }); toast({ title: "Task created", description: `"${name}" has been added.` }); },
        onError: () => toast({ title: "Error", description: "Failed to create task.", variant: "destructive" }),
      }
    );
    setShowCreate(false);
    setNewTask({ name: "", description: "", priority: "medium", adapter: "gmail" });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Tasks & Runs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} tasks</p>
        </div>
        <div className="flex gap-2 items-center">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tasks…" className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["running", "completed", "failed", "pending", "paused", "awaiting_approval"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium w-6"></th>
              <th className="text-left px-4 py-2.5 font-medium">Task</th>
              <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Status</th>
              <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Priority</th>
              <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Adapter</th>
              <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Runs</th>
              <th className="text-left px-3 py-2.5 font-medium hidden xl:table-cell">Last run</th>
              <th className="text-left px-3 py-2.5 font-medium hidden xl:table-cell">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((task) => {
              const isExpanded = expandedTask === task.id;
              const taskRuns = getTaskRuns(task.id);
              return (
                <React.Fragment key={task.id}>
                  <tr
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{task.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{truncate(task.description, 60)}</div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {task.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={cn("text-xs px-2 py-1 rounded font-medium", STATUS_COLORS[task.status])}>{task.status}</span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={cn("text-xs px-2 py-1 rounded font-medium", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className={cn("text-xs px-2 py-1 rounded font-medium", ADAPTER_COLORS[task.adapter] ?? "bg-slate-500/10 text-slate-600")}>{task.adapter}</span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-muted-foreground">{task.runCount}</td>
                    <td className="px-3 py-3 hidden xl:table-cell text-xs text-muted-foreground">{formatRelativeTime(task.lastRunAt)}</td>
                    <td className="px-3 py-3 hidden xl:table-cell">
                      <div className="flex gap-1">
                        {task.writeSafe && (
                          <span title="Write-safe" className="text-green-500"><Shield className="h-3.5 w-3.5" /></span>
                        )}
                        {task.idempotencyKey && (
                          <span title={`Idempotency: ${task.idempotencyKey}`} className="text-muted-foreground"><Key className="h-3.5 w-3.5" /></span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${task.id}-detail`} className="bg-muted/10">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Task Details</div>
                            <div className="space-y-1.5 text-xs">
                              <div><span className="text-muted-foreground w-28 inline-block">ID</span> <span className="font-mono">{task.id}</span></div>
                              <div><span className="text-muted-foreground w-28 inline-block">Idempotency key</span> <span className="font-mono">{task.idempotencyKey ?? "—"}</span></div>
                              <div><span className="text-muted-foreground w-28 inline-block">Write-safe</span> <span>{task.writeSafe ? "Yes" : "No"}</span></div>
                              <div><span className="text-muted-foreground w-28 inline-block">Created</span> <span>{formatRelativeTime(task.createdAt)}</span></div>
                              <div><span className="text-muted-foreground w-28 inline-block">Tags</span> <span>{task.tags?.join(", ") || "—"}</span></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1.5">
                              <RefreshCw className="h-3 w-3" /> Runs ({taskRuns.length})
                            </div>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {taskRuns.length === 0 ? (
                                <div className="text-xs text-muted-foreground">No runs yet</div>
                              ) : taskRuns.map((run) => (
                                <div key={run.id} className="flex items-center gap-2 text-xs bg-card border rounded p-2">
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STATUS_COLORS[run.status])}>{run.status}</span>
                                  <span className="font-mono text-muted-foreground">{run.llmModel}</span>
                                  <span className="text-muted-foreground">{formatDuration(run.durationMs)}</span>
                                  <span className="text-muted-foreground ml-auto">{run.tokenCount} tokens</span>
                                  {run.isStale && <span className="text-[10px] bg-orange-500/15 text-orange-600 px-1 rounded">stale</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No tasks match your filters.</div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-name">Name</Label>
              <Input id="task-name" placeholder="e.g. Summarize weekly emails" value={newTask.name} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Input id="task-desc" placeholder="What should this task do?" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Adapter</Label>
                <Select value={newTask.adapter} onValueChange={(v) => setNewTask({ ...newTask, adapter: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["gmail", "gcal", "github", "slack", "notion", "web", "custom"].map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newTask.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
