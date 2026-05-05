import { useEffect, useMemo, useState } from "react";
import { Save, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useGetSettings, useUpdateSettings, useListLlmModels } from "@workspace/api-client-react";
import { MOCK_SETTINGS, MOCK_LLM_MODELS } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Settings = typeof MOCK_SETTINGS & {
  autopilotEnabled?: boolean;
  autopilotRiskAccepted?: boolean;
};

export default function Settings() {
  const { data: rawSettings, isError } = useGetSettings({ query: { queryKey: ["settings"], retry: false } });
  const { data: rawModels, isError: modelsError } = useListLlmModels({ query: { queryKey: ["llm-models"], retry: false, staleTime: 60000 } });
  const updateSettings = useUpdateSettings();
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initial = useMemo(
    () => (isError || !rawSettings) ? MOCK_SETTINGS : { ...MOCK_SETTINGS, ...(rawSettings as Settings) },
    [rawSettings, isError],
  );
  const liveModels = useMemo(
    () => (modelsError || !rawModels) ? MOCK_LLM_MODELS : ((rawModels as unknown as { items: typeof MOCK_LLM_MODELS })?.items ?? MOCK_LLM_MODELS),
    [rawModels, modelsError]
  );
  const [form, setForm] = useState<Settings>(MOCK_SETTINGS);
  const isDemo = isError || !rawSettings;
  const autopilotEnabled = Boolean(form.autopilotEnabled && form.autopilotRiskAccepted);

  useEffect(() => {
    setForm({ ...MOCK_SETTINGS, ...initial });
  }, [initial]);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const { autopilotEnabled: _autopilotEnabled, autopilotRiskAccepted: _autopilotRiskAccepted, ...payload } = form;
    updateSettings.mutate({ data: payload }, {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["settings"] });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        toast({ title: "Settings saved", description: "Your configuration has been updated." });
      },
      onError: () => toast({ title: "Save failed", description: "Could not save settings. Please try again.", variant: "destructive" }),
    });
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Platform configuration</p>
        </div>
        <div className="flex gap-2 items-center">
          {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
          {saved && <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Saved</span>}
          <Button size="sm" className="gap-1.5" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" /> Autonomy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">Autopilot mode</div>
                <p className="text-xs text-muted-foreground">Lets the AI perform permitted dashboard actions automatically.</p>
              </div>
              <Switch checked={Boolean(form.autopilotEnabled)} onCheckedChange={(v) => set("autopilotEnabled", v)} />
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-200">
              <div className="font-semibold mb-1">Risk disclaimer</div>
              <p>Full autonomy can create, modify, approve, and execute actions within the permissions you grant. Use only if you understand the consequences. High-risk actions should still require explicit approval.</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">I understand the risk</div>
                <p className="text-xs text-muted-foreground">Required before enabling autopilot.</p>
              </div>
              <Switch checked={Boolean(form.autopilotRiskAccepted)} onCheckedChange={(v) => set("autopilotRiskAccepted", v)} />
            </div>
            <div className="text-xs text-muted-foreground">Autopilot is {autopilotEnabled ? "enabled" : "disabled"}. The assistant can only act within the controls exposed by the dashboard and backend.</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="systemName">System name</Label>
                <Input id="systemName" value={form.systemName ?? ""} onChange={(e) => set("systemName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Version</Label>
                <Input value={form.version ?? ""} readOnly className="text-muted-foreground bg-muted/30" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Log level</Label>
              <Select value={form.logLevel ?? "info"} onValueChange={(v) => set("logLevel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["debug", "info", "warn", "error"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Webhook URL</Label>
              <Input placeholder="https://your-server.com/webhook" value={form.webhookUrl ?? ""} onChange={(e) => set("webhookUrl", e.target.value)} />
              <p className="text-xs text-muted-foreground">Receive event notifications at this endpoint</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">LLM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Default LLM model</Label>
              <Select value={form.defaultLlmModelId ?? "gpt-4o"} onValueChange={(v) => set("defaultLlmModelId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {liveModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} — {m.provider}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Used when no routing rule matches</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Approvals & Safety</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Require approval for high-risk actions</div>
                <p className="text-xs text-muted-foreground">Gate commands marked isHighRisk behind human approval</p>
              </div>
              <Switch checked={Boolean(form.requireApprovalForHighRisk)} onCheckedChange={(v) => set("requireApprovalForHighRisk", v)} />
            </div>
            <div className="space-y-1.5">
              <Label>Approval timeout (minutes)</Label>
              <Input type="number" value={form.approvalTimeoutMinutes ?? 60} onChange={(e) => set("approvalTimeoutMinutes", Number(e.target.value))} className="w-32" />
              <p className="text-xs text-muted-foreground">Requests not acted on within this time are auto-rejected</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Runtime</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Max concurrent tasks</Label>
                <Input type="number" value={form.maxConcurrentTasks ?? 5} onChange={(e) => set("maxConcurrentTasks", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Max retries</Label>
                <Input type="number" value={form.maxRetries ?? 3} onChange={(e) => set("maxRetries", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Retry delay (ms)</Label>
                <Input type="number" value={form.retryDelayMs ?? 5000} onChange={(e) => set("retryDelayMs", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Staleness threshold (ms)</Label>
                <Input type="number" value={form.stalenessThresholdMs ?? 3600000} onChange={(e) => set("stalenessThresholdMs", Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
