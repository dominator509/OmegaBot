import React, { useState, useMemo } from "react";
import { AlertTriangle, Shield, Key, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListCommands, useListCommandGroups, useCreateCommand } from "@workspace/api-client-react";
import { MOCK_COMMANDS, MOCK_GROUPS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, ADAPTER_COLORS, formatRelativeTime, truncate } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  read: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  write: "bg-green-500/10 text-green-600 dark:text-green-400",
  delete: "bg-red-500/10 text-red-600 dark:text-red-400",
  external_call: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  webhook: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

export default function Commands() {
  const [expandedCmd, setExpandedCmd] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCmd, setNewCmd] = useState({ name: "", description: "", type: "read", adapter: "gmail", isHighRisk: false, requiresApproval: false });

  const { data: cmdsData, isError: cmdsError } = useListCommands({ query: { queryKey: ["commands"], retry: false } });
  const { data: grpsData, isError: grpsError } = useListCommandGroups({ query: { queryKey: ["command-groups"], retry: false } });
  const createCommand = useCreateCommand();

  const commands = useMemo(() => (cmdsError || !cmdsData) ? MOCK_COMMANDS : ((cmdsData as unknown as { items: typeof MOCK_COMMANDS })?.items ?? MOCK_COMMANDS), [cmdsData, cmdsError]);
  const groups = useMemo(() => (grpsError || !grpsData) ? MOCK_GROUPS : ((grpsData as unknown as { items: typeof MOCK_GROUPS })?.items ?? MOCK_GROUPS), [grpsData, grpsError]);
  const isDemo = cmdsError || !cmdsData;

  function handleCreate() {
    createCommand.mutate({
      data: {
        name: newCmd.name,
        description: newCmd.description,
        type: newCmd.type as "read" | "write" | "delete" | "external_call" | "webhook",
        adapter: newCmd.adapter,
        isHighRisk: newCmd.isHighRisk,
        requiresApproval: newCmd.requiresApproval,
      },
    });
    setShowCreate(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Commands</h1>
          <p className="text-sm text-muted-foreground">{commands.length} commands · {groups.length} groups</p>
        </div>
        <div className="flex gap-2">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New Command
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Commands</div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="w-6 px-3 py-2.5"></th>
                  <th className="text-left px-3 py-2.5 font-medium">Command</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Adapter</th>
                  <th className="text-left px-3 py-2.5 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commands.map((cmd) => {
                  const isExpanded = expandedCmd === cmd.id;
                  return (
                    <React.Fragment key={cmd.id}>
                      <tr
                        className="hover:bg-muted/20 cursor-pointer"
                        onClick={() => setExpandedCmd(isExpanded ? null : cmd.id)}
                      >
                        <td className="px-3 py-3 text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{cmd.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{truncate(cmd.description, 55)}</div>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <span className={cn("text-xs px-2 py-1 rounded font-medium", TYPE_COLORS[cmd.type] ?? "bg-slate-500/10 text-slate-600")}>{cmd.type}</span>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <span className={cn("text-xs px-2 py-1 rounded font-medium", STATUS_COLORS[cmd.status])}>{cmd.status.replace("_", " ")}</span>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className={cn("text-xs px-2 py-1 rounded font-medium", ADAPTER_COLORS[cmd.adapter] ?? "bg-slate-500/10 text-slate-600")}>{cmd.adapter}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5">
                            {cmd.isHighRisk && <span title="High risk"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /></span>}
                            {cmd.writeSafe && <span title="Write safe"><Shield className="h-3.5 w-3.5 text-green-500" /></span>}
                            {cmd.idempotencyKey && <span title={`Key: ${cmd.idempotencyKey}`}><Key className="h-3.5 w-3.5 text-muted-foreground" /></span>}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${cmd.id}-detail`} className="bg-muted/10">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Details</div>
                                <div className="space-y-1.5">
                                  <div><span className="text-muted-foreground w-28 inline-block">ID</span> <span className="font-mono">{cmd.id}</span></div>
                                  <div><span className="text-muted-foreground w-28 inline-block">Idempotency key</span> <span className="font-mono">{cmd.idempotencyKey ?? "—"}</span></div>
                                  <div><span className="text-muted-foreground w-28 inline-block">Created</span> {formatRelativeTime(cmd.createdAt)}</div>
                                  <div><span className="text-muted-foreground w-28 inline-block">Executed</span> {cmd.executedAt ? formatRelativeTime(cmd.executedAt) : "—"}</div>
                                  <div><span className="text-muted-foreground w-28 inline-block">Requires approval</span> {cmd.requiresApproval ? "Yes" : "No"}</div>
                                </div>
                              </div>
                              <div>
                                {cmd.payload && (
                                  <>
                                    <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Payload</div>
                                    <pre className="bg-muted p-2 rounded text-[11px] font-mono overflow-x-auto">{JSON.stringify(cmd.payload, null, 2)}</pre>
                                  </>
                                )}
                                {cmd.result && (
                                  <>
                                    <div className="text-xs font-semibold text-muted-foreground mb-2 mt-3 uppercase tracking-wide">Result</div>
                                    <pre className="bg-muted p-2 rounded text-[11px] font-mono overflow-x-auto">{JSON.stringify(cmd.result, null, 2)}</pre>
                                  </>
                                )}
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
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Command Groups</div>
          <div className="space-y-3">
            {groups.map((group) => (
              <Card key={group.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-sm">{group.name}</div>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", STATUS_COLORS[group.status])}>{group.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{group.description}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{group.completedCount}/{group.commandCount} done</span>
                  {group.failedCount > 0 && <span className="text-red-500">{group.failedCount} failed</span>}
                  <span className="ml-auto">{formatRelativeTime(group.createdAt)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(group.completedCount / Math.max(group.commandCount, 1)) * 100}%` }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Command</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder="e.g. Send email reply" value={newCmd.name} onChange={(e) => setNewCmd({ ...newCmd, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="What does this command do?" value={newCmd.description} onChange={(e) => setNewCmd({ ...newCmd, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={newCmd.type} onValueChange={(v) => setNewCmd({ ...newCmd, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["read", "write", "delete", "external_call", "webhook"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Adapter</Label>
                <Select value={newCmd.adapter} onValueChange={(v) => setNewCmd({ ...newCmd, adapter: v })}>
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
            <Button onClick={handleCreate} disabled={!newCmd.name}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
