import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, GitBranch, AlertTriangle, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListChangePlans, useCreateChangePlan } from "@workspace/api-client-react";
import { MOCK_CHANGE_PLANS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, RISK_COLORS, formatRelativeTime } from "@/lib/utils";

export default function GitHub() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlan, setNewPlan] = useState({ title: "", description: "", repository: "", riskLevel: "medium" });

  const { data: raw, isError } = useListChangePlans(undefined, { query: { queryKey: ["change-plans"], retry: false } });
  const createPlan = useCreateChangePlan();
  const queryClient = useQueryClient();

  const plans = useMemo(() => (isError || !raw) ? MOCK_CHANGE_PLANS : ((raw as unknown as { items: typeof MOCK_CHANGE_PLANS })?.items ?? MOCK_CHANGE_PLANS), [raw, isError]);
  const isDemo = isError || !raw;
  const selectedPlan = plans.find((p) => p.id === selected);

  function handleCreate() {
    createPlan.mutate(
      { data: { title: newPlan.title, description: newPlan.description, repository: newPlan.repository, riskLevel: newPlan.riskLevel as "low" | "medium" | "high" | "critical" } },
      { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["change-plans"] }) }
    );
    setShowCreate(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">GitHub Change Plans</h1>
          <p className="text-sm text-muted-foreground">{plans.length} plans</p>
        </div>
        <div className="flex gap-2">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" /> New Plan
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <div className="space-y-2">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "border rounded-lg p-4 cursor-pointer hover:border-primary/40 transition-colors",
                  selected === plan.id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelected(plan.id === selected ? null : plan.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-sm leading-tight">{plan.title}</span>
                  <div className="flex gap-1 shrink-0">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", RISK_COLORS[plan.riskLevel])}>{plan.riskLevel}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", STATUS_COLORS[plan.status])}>{plan.status.replace("_", " ")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{plan.repository}</span>
                  {plan.prNumber && (
                    <a href={plan.prUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                      <ExternalLink className="h-3 w-3" />PR #{plan.prNumber}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  {plan.filesChanged > 0 && <span><FileCode className="h-3 w-3 inline mr-0.5" />{plan.filesChanged} files</span>}
                  {plan.additions > 0 && <span className="text-green-600 dark:text-green-400">+{plan.additions}</span>}
                  {plan.deletions > 0 && <span className="text-red-600 dark:text-red-400">-{plan.deletions}</span>}
                  <span className="ml-auto">{formatRelativeTime(plan.updatedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedPlan ? (
            <div className="border rounded-lg p-5 space-y-4">
              <div>
                <h2 className="font-semibold text-base mb-1">{selectedPlan.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-muted-foreground">Repository</span><div className="font-mono font-medium">{selectedPlan.repository}</div></div>
                <div><span className="text-muted-foreground">Branch</span><div className="font-mono font-medium">{selectedPlan.branch}</div></div>
                <div><span className="text-muted-foreground">Risk level</span><div><span className={cn("px-2 py-0.5 rounded font-semibold text-[11px]", RISK_COLORS[selectedPlan.riskLevel])}>{selectedPlan.riskLevel}</span></div></div>
                <div><span className="text-muted-foreground">Status</span><div><span className={cn("px-2 py-0.5 rounded font-semibold text-[11px]", STATUS_COLORS[selectedPlan.status])}>{selectedPlan.status.replace("_", " ")}</span></div></div>
                <div><span className="text-muted-foreground">Files changed</span><div className="font-medium">{selectedPlan.filesChanged}</div></div>
                <div>
                  <span className="text-muted-foreground">Changes</span>
                  <div className="flex gap-2">
                    <span className="text-green-600 dark:text-green-400 font-medium">+{selectedPlan.additions}</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">-{selectedPlan.deletions}</span>
                  </div>
                </div>
                <div><span className="text-muted-foreground">Created</span><div>{formatRelativeTime(selectedPlan.createdAt)}</div></div>
                <div><span className="text-muted-foreground">Updated</span><div>{formatRelativeTime(selectedPlan.updatedAt)}</div></div>
              </div>
              {selectedPlan.reviewers && selectedPlan.reviewers.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">Reviewers</div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedPlan.reviewers.map((r) => (
                      <span key={r} className="text-xs bg-muted px-2 py-0.5 rounded font-mono">@{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {!!(selectedPlan as Record<string, unknown>).diff && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diff Preview</div>
                  <pre className="text-[11px] font-mono bg-muted p-3 rounded overflow-x-auto max-h-64 leading-relaxed">
                    {((selectedPlan as Record<string, unknown>).diff as string).split("\n").map((line: string, i: number) => (
                      <div key={i} className={cn(
                        line.startsWith("+") && !line.startsWith("+++") ? "text-green-600 dark:text-green-400" :
                        line.startsWith("-") && !line.startsWith("---") ? "text-red-600 dark:text-red-400" :
                        line.startsWith("@@") ? "text-blue-600 dark:text-blue-400" :
                        line.startsWith("diff") ? "font-bold" : ""
                      )}>
                        {line}
                      </div>
                    ))}
                  </pre>
                </div>
              )}
              {selectedPlan.status === "pending_review" && (
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1.5">Approve Plan</Button>
                  <Button size="sm" variant="destructive" className="gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Reject Plan
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg flex items-center justify-center h-64 text-muted-foreground text-sm">
              Select a change plan to view details
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Change Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input placeholder="e.g. Refactor auth middleware" value={newPlan.title} onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="What does this change do?" value={newPlan.description} onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Repository</Label>
              <Input placeholder="e.g. org/backend-api" value={newPlan.repository} onChange={(e) => setNewPlan({ ...newPlan, repository: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Risk Level</Label>
              <Select value={newPlan.riskLevel} onValueChange={(v) => setNewPlan({ ...newPlan, riskLevel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low", "medium", "high", "critical"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newPlan.title || !newPlan.repository}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
