import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, AlertTriangle, CheckCircle, XCircle, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useListApprovals, useApproveRequest, useRejectRequest } from "@workspace/api-client-react";
import { MOCK_APPROVALS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, RISK_COLORS, ADAPTER_COLORS, formatRelativeTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function timeLeft(expiresAt: string | undefined): string {
  if (!expiresAt) return "—";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m left`;
  return `${Math.floor(diff / 3600000)}h left`;
}

export default function Approvals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: raw, isError } = useListApprovals(undefined, { query: { queryKey: ["approvals"], retry: false, refetchInterval: 15000 } });
  const approveReq = useApproveRequest();
  const rejectReq = useRejectRequest();

  const allApprovals = useMemo(() => (isError || !raw) ? MOCK_APPROVALS : ((raw as unknown as { items: typeof MOCK_APPROVALS })?.items ?? MOCK_APPROVALS), [raw, isError]);
  const isDemo = isError || !raw;

  const byStatus = useMemo(() => ({
    pending: allApprovals.filter((a) => a.status === "pending"),
    approved: allApprovals.filter((a) => a.status === "approved"),
    rejected: allApprovals.filter((a) => a.status === "rejected"),
    expired: allApprovals.filter((a) => a.status === "expired"),
  }), [allApprovals]);

  const selected = allApprovals.find((a) => a.id === selectedId);

  function handleDecide() {
    if (!selectedId || !action) return;
    const title = allApprovals.find((a) => a.id === selectedId)?.title ?? "Request";
    if (action === "approve") {
      approveReq.mutate({ id: selectedId, data: { reason } }, {
        onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["approvals"] }); void queryClient.invalidateQueries({ queryKey: ["overview-summary"] }); toast({ title: "Approved", description: `"${title}" has been approved.` }); },
        onError: () => toast({ title: "Error", description: "Failed to approve. Please try again.", variant: "destructive" }),
      });
    } else {
      rejectReq.mutate({ id: selectedId, data: { reason } }, {
        onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["approvals"] }); void queryClient.invalidateQueries({ queryKey: ["overview-summary"] }); toast({ title: "Rejected", description: `"${title}" has been rejected.` }); },
        onError: () => toast({ title: "Error", description: "Failed to reject. Please try again.", variant: "destructive" }),
      });
    }
    setSelectedId(null);
    setReason("");
    setAction(null);
  }

  function openAction(id: string, act: "approve" | "reject") {
    setSelectedId(id);
    setAction(act);
    setReason("");
  }

  const ApprovalCard = ({ appr }: { appr: typeof MOCK_APPROVALS[0] }) => (
    <Card className={cn("p-4 hover:border-primary/40 transition-colors", appr.status === "pending" && "border-amber-500/30")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {appr.riskLevel === "critical" ? <AlertTriangle className="h-4 w-4 text-red-500" /> :
           appr.riskLevel === "high" ? <AlertTriangle className="h-4 w-4 text-orange-500" /> :
           <Shield className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm">{appr.title}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", RISK_COLORS[appr.riskLevel])}>{appr.riskLevel}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", STATUS_COLORS[appr.status])}>{appr.status}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{appr.description}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className={cn("px-1.5 py-0.5 rounded", ADAPTER_COLORS[appr.adapter] ?? "bg-slate-500/10 text-slate-600")}>{appr.adapter}</span>
            <span>Requested {formatRelativeTime(appr.requestedAt)}</span>
            {appr.status === "pending" && <span className="text-amber-500 font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{timeLeft(appr.expiresAt)}</span>}
            {appr.decidedBy && <span>by {appr.decidedBy}</span>}
          </div>
          {appr.reason && (
            <div className="mt-2 text-xs bg-muted/50 rounded px-2 py-1.5 italic text-muted-foreground">{appr.reason}</div>
          )}
          {appr.payload && (
            <div className="mt-2">
              <pre className="text-[10px] font-mono bg-muted p-2 rounded overflow-x-auto max-h-20">{JSON.stringify(appr.payload, null, 2)}</pre>
            </div>
          )}
          {appr.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="h-7 text-xs gap-1.5" onClick={() => openAction(appr.id, "approve")}>
                <CheckCircle className="h-3 w-3" /> Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5" onClick={() => openAction(appr.id, "reject")}>
                <XCircle className="h-3 w-3" /> Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            Approvals
            {byStatus.pending.length > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{byStatus.pending.length}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Human-in-the-loop gates for risky operations</p>
        </div>
        {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1.5">Pending {byStatus.pending.length > 0 && <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{byStatus.pending.length}</span>}</TabsTrigger>
          <TabsTrigger value="approved">Approved {byStatus.approved.length > 0 && <span className="text-muted-foreground text-[10px]">({byStatus.approved.length})</span>}</TabsTrigger>
          <TabsTrigger value="rejected">Rejected {byStatus.rejected.length > 0 && <span className="text-muted-foreground text-[10px]">({byStatus.rejected.length})</span>}</TabsTrigger>
          <TabsTrigger value="expired">Expired {byStatus.expired.length > 0 && <span className="text-muted-foreground text-[10px]">({byStatus.expired.length})</span>}</TabsTrigger>
        </TabsList>

        {(["pending", "approved", "rejected", "expired"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3">
            {byStatus[tab].length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No {tab} approvals.</div>
            ) : (
              byStatus[tab].map((appr) => <ApprovalCard key={appr.id} appr={appr} />)
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selectedId && !!action} onOpenChange={(open) => { if (!open) { setSelectedId(null); setAction(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Approve" : "Reject"} Request</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="py-2 space-y-4">
              <div className="bg-muted/40 p-3 rounded-lg">
                <div className="font-medium text-sm mb-1">{selected.title}</div>
                <p className="text-xs text-muted-foreground">{selected.description}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reason {action === "reject" && <span className="text-red-500">*</span>}</label>
                <Textarea
                  placeholder={action === "approve" ? "Optional note for the audit trail…" : "Explain why this request is rejected…"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-sm min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedId(null); setAction(null); }}>Cancel</Button>
            {action === "approve" ? (
              <Button onClick={handleDecide} className="gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Approve</Button>
            ) : (
              <Button variant="destructive" onClick={handleDecide} disabled={!reason} className="gap-1.5"><XCircle className="h-3.5 w-3.5" /> Reject</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
