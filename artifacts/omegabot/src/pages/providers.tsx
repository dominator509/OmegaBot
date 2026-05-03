import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, TestTube2, Key, Server, ChevronDown, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Loader2, Edit2, X, Eye, EyeOff,
  Cpu, ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "") + "/";

interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  capabilities: string[];
  costPer1kTokens: number;
  avgLatencyMs: number;
}

interface Provider {
  id: string;
  name: string;
  type: "openai-compat" | "anthropic";
  baseUrl: string;
  apiKey: string;
  hasApiKey: boolean;
  enabled: boolean;
  models: ProviderModel[];
  createdAt: string;
  updatedAt: string;
}

const PROVIDER_PRESETS: Record<string, { name: string; type: "openai-compat" | "anthropic"; baseUrl: string; docsUrl: string; color: string; description: string }> = {
  openai:    { name: "OpenAI",         type: "openai-compat", baseUrl: "https://api.openai.com/v1",                                  docsUrl: "https://platform.openai.com/api-keys",              color: "text-emerald-600 dark:text-emerald-400",  description: "GPT-4o, GPT-4.1, o3, o4-mini and more" },
  anthropic: { name: "Anthropic",      type: "anthropic",      baseUrl: "https://api.anthropic.com",                                  docsUrl: "https://console.anthropic.com/settings/keys",       color: "text-amber-600 dark:text-amber-400",      description: "Claude Opus, Sonnet, and Haiku models" },
  gemini:    { name: "Google Gemini",  type: "openai-compat", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",   docsUrl: "https://aistudio.google.com/app/apikey",            color: "text-blue-600 dark:text-blue-400",         description: "Gemini 2.5 Pro, 2.0 Flash and more" },
  venice:    { name: "Venice AI",      type: "openai-compat", baseUrl: "https://api.venice.ai/api/v1",                               docsUrl: "https://venice.ai/settings",                        color: "text-violet-600 dark:text-violet-400",    description: "Privacy-first, uncensored models" },
  deepseek:  { name: "DeepSeek",       type: "openai-compat", baseUrl: "https://api.deepseek.com/v1",                                docsUrl: "https://platform.deepseek.com/api_keys",            color: "text-cyan-600 dark:text-cyan-400",         description: "DeepSeek V3 and R1 reasoning models" },
  grok:      { name: "Grok (xAI)",     type: "openai-compat", baseUrl: "https://api.x.ai/v1",                                       docsUrl: "https://console.x.ai",                              color: "text-slate-600 dark:text-slate-300",      description: "Grok 3 and Grok 3 Mini by xAI" },
  ollama:    { name: "Ollama (Local)", type: "openai-compat", baseUrl: "http://localhost:11434/v1",                                   docsUrl: "https://ollama.com/download",                       color: "text-orange-600 dark:text-orange-400",    description: "Run open-source models locally" },
};

const CAPABILITY_COLORS: Record<string, string> = {
  text: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  vision: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  "function-calling": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  "json-mode": "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  reasoning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "extended-thinking": "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  "long-context": "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300",
};

function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE_URL}api/providers`);
      const data = await r.json() as { items: Provider[] };
      setProviders(data.items ?? []);
      setError(null);
    } catch {
      setError("Failed to load providers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return { providers, loading, error, reload: load, setProviders };
}

async function patchProvider(id: string, data: Partial<Provider>): Promise<Provider> {
  const r = await fetch(`${BASE_URL}api/providers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json() as Promise<Provider>;
}

async function deleteProvider(id: string): Promise<void> {
  await fetch(`${BASE_URL}api/providers/${id}`, { method: "DELETE" });
}

async function testProvider(id: string): Promise<{ ok: boolean; error?: string; latencyMs?: number; model?: string }> {
  const r = await fetch(`${BASE_URL}api/providers/${id}/test`, { method: "POST" });
  return r.json() as Promise<{ ok: boolean; error?: string; latencyMs?: number; model?: string }>;
}

async function deleteModel(providerId: string, modelId: string): Promise<Provider> {
  const r = await fetch(`${BASE_URL}api/providers/${providerId}/models/${modelId}`, { method: "DELETE" });
  return r.json() as Promise<Provider>;
}

async function addModel(providerId: string, model: Omit<ProviderModel, never>): Promise<Provider> {
  const r = await fetch(`${BASE_URL}api/providers/${providerId}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(model),
  });
  return r.json() as Promise<Provider>;
}

export default function Providers() {
  const { providers, loading, error, reload, setProviders } = useProviders();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; error?: string; model?: string }>>({});
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [editForm, setEditForm] = useState({ apiKey: "", baseUrl: "", name: "" });
  const [showAddModel, setShowAddModel] = useState<string | null>(null);
  const [newModel, setNewModel] = useState({ id: "", name: "", contextWindow: 128000, capabilities: "text", costPer1kTokens: 0, avgLatencyMs: 1000 });
  const [showNewProvider, setShowNewProvider] = useState(false);
  const [newProviderPreset, setNewProviderPreset] = useState<string>("openai");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const queryClient = useQueryClient();

  const enabledCount = useMemo(() => providers.filter((p) => p.enabled).length, [providers]);
  const totalModels = useMemo(() => providers.filter((p) => p.enabled).reduce((s, p) => s + p.models.length, 0), [providers]);

  async function handleToggle(provider: Provider) {
    try {
      const updated = await patchProvider(provider.id, { enabled: !provider.enabled });
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, ...updated } : p)));
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] });
      toast({ title: updated.enabled ? "Provider enabled" : "Provider disabled", description: provider.name });
    } catch {
      toast({ title: "Failed to update provider", variant: "destructive" });
    }
  }

  async function handleTest(provider: Provider) {
    setTesting((prev) => ({ ...prev, [provider.id]: true }));
    try {
      const result = await testProvider(provider.id);
      setTestResults((prev) => ({ ...prev, [provider.id]: result }));
      if (result.ok) {
        toast({ title: "Connection successful", description: `${provider.name} responded in ${result.latencyMs}ms using ${result.model}` });
      } else {
        toast({ title: "Connection failed", description: result.error ?? "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Test failed", variant: "destructive" });
    } finally {
      setTesting((prev) => ({ ...prev, [provider.id]: false }));
    }
  }

  function openEdit(provider: Provider) {
    setEditingProvider(provider);
    setEditForm({ apiKey: "", baseUrl: provider.baseUrl, name: provider.name });
  }

  async function handleEditSave() {
    if (!editingProvider) return;
    const payload: Partial<Provider> = { name: editForm.name, baseUrl: editForm.baseUrl };
    if (editForm.apiKey) payload.apiKey = editForm.apiKey;
    try {
      const updated = await patchProvider(editingProvider.id, payload);
      setProviders((prev) => prev.map((p) => (p.id === editingProvider.id ? { ...p, ...updated } : p)));
      toast({ title: "Provider updated", description: editingProvider.name });
      setEditingProvider(null);
    } catch {
      toast({ title: "Failed to update provider", variant: "destructive" });
    }
  }

  async function handleDeleteProvider(provider: Provider) {
    try {
      await deleteProvider(provider.id);
      setProviders((prev) => prev.filter((p) => p.id !== provider.id));
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] });
      toast({ title: "Provider removed", description: provider.name });
    } catch {
      toast({ title: "Failed to remove provider", variant: "destructive" });
    }
  }

  async function handleDeleteModel(provider: Provider, modelId: string) {
    try {
      const updated = await deleteModel(provider.id, modelId);
      setProviders((prev) => prev.map((p) => (p.id === provider.id ? { ...p, ...updated } : p)));
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] });
    } catch {
      toast({ title: "Failed to remove model", variant: "destructive" });
    }
  }

  async function handleAddModel(providerId: string) {
    if (!newModel.id || !newModel.name) return;
    try {
      const updated = await addModel(providerId, {
        ...newModel,
        capabilities: newModel.capabilities.split(",").map((c) => c.trim()).filter(Boolean),
      });
      setProviders((prev) => prev.map((p) => (p.id === providerId ? { ...p, ...updated } : p)));
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] });
      toast({ title: "Model added" });
      setShowAddModel(null);
      setNewModel({ id: "", name: "", contextWindow: 128000, capabilities: "text", costPer1kTokens: 0, avgLatencyMs: 1000 });
    } catch {
      toast({ title: "Failed to add model", variant: "destructive" });
    }
  }

  async function handleAddProvider() {
    const preset = PROVIDER_PRESETS[newProviderPreset];
    if (!preset) return;
    try {
      const r = await fetch(`${BASE_URL}api/providers/${newProviderPreset}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newProviderApiKey, enabled: Boolean(newProviderApiKey || newProviderPreset === "ollama") }),
      });
      const updated = await r.json() as Provider;
      setProviders((prev) => prev.map((p) => (p.id === newProviderPreset ? { ...p, ...updated } : p)));
      void queryClient.invalidateQueries({ queryKey: ["llm-models"] });
      toast({ title: "Provider configured", description: preset.name });
      setShowNewProvider(false);
      setNewProviderApiKey("");
    } catch {
      toast({ title: "Failed to configure provider", variant: "destructive" });
    }
  }

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">AI Providers</h1>
          <p className="text-sm text-muted-foreground">
            {enabledCount} provider{enabledCount !== 1 ? "s" : ""} enabled · {totalModels} model{totalModels !== 1 ? "s" : ""} available
          </p>
        </div>
        <div className="flex gap-2">
          {error && <Badge variant="destructive" className="text-xs">{error}</Badge>}
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowNewProvider(true)}>
            <Plus className="h-3 w-3" /> Configure Provider
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map((provider) => {
          const preset = PROVIDER_PRESETS[provider.id];
          const isExpanded = expanded[provider.id];
          const isTesting = testing[provider.id];
          const testResult = testResults[provider.id];

          return (
            <Card key={provider.id} className={cn("transition-all", provider.enabled ? "" : "opacity-70")}>
              <CardHeader className="p-4 pb-0">
                <div className="flex items-center gap-3">
                  <button
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    onClick={() => setExpanded((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("font-semibold text-sm", preset?.color)}>{provider.name}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{provider.type}</span>
                        {provider.enabled && <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">ACTIVE</span>}
                        {testResult && (
                          testResult.ok
                            ? <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" />{testResult.latencyMs}ms</span>
                            : <span className="text-[10px] text-red-500 flex items-center gap-0.5"><XCircle className="h-3 w-3" />Failed</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{provider.baseUrl}</div>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{provider.models.length} model{provider.models.length !== 1 ? "s" : ""}</span>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => handleTest(provider)}
                      disabled={isTesting}
                      title="Test connection"
                    >
                      {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />}
                    </Button>

                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(provider)} title="Edit">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={() => handleToggle(provider)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-3 pb-4 px-4">
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Server className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono">{provider.baseUrl}</span>
                      <span className="flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" />
                        {provider.hasApiKey ? (
                          <span className="flex items-center gap-1">
                            <span>{provider.apiKey}</span>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> No API key
                          </span>
                        )}
                      </span>
                      {preset && (
                        <a href={preset.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:underline text-primary">
                          Get API key <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Models</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[11px] gap-1 px-2"
                          onClick={() => setShowAddModel(provider.id)}
                        >
                          <Plus className="h-3 w-3" /> Add Model
                        </Button>
                      </div>

                      {showAddModel === provider.id && (
                        <div className="mb-3 p-3 border rounded-lg bg-muted/30 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Model ID</Label>
                              <Input className="h-7 text-xs font-mono" placeholder="e.g. gpt-4o" value={newModel.id} onChange={(e) => setNewModel((p) => ({ ...p, id: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Display Name</Label>
                              <Input className="h-7 text-xs" placeholder="e.g. GPT-4o" value={newModel.name} onChange={(e) => setNewModel((p) => ({ ...p, name: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Context Window</Label>
                              <Input className="h-7 text-xs" type="number" value={newModel.contextWindow} onChange={(e) => setNewModel((p) => ({ ...p, contextWindow: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Cost/1k tokens</Label>
                              <Input className="h-7 text-xs" type="number" step="0.0001" value={newModel.costPer1kTokens} onChange={(e) => setNewModel((p) => ({ ...p, costPer1kTokens: Number(e.target.value) }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Avg latency (ms)</Label>
                              <Input className="h-7 text-xs" type="number" value={newModel.avgLatencyMs} onChange={(e) => setNewModel((p) => ({ ...p, avgLatencyMs: Number(e.target.value) }))} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Capabilities (comma-separated)</Label>
                            <Input className="h-7 text-xs" placeholder="text, vision, function-calling" value={newModel.capabilities} onChange={(e) => setNewModel((p) => ({ ...p, capabilities: e.target.value }))} />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowAddModel(null)}>Cancel</Button>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddModel(provider.id)} disabled={!newModel.id || !newModel.name}>Add</Button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        {provider.models.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 group">
                            <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{m.name}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{m.id}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {m.capabilities.map((c) => (
                                  <span key={c} className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono", CAPABILITY_COLORS[c] ?? "bg-muted text-muted-foreground")}>{c}</span>
                                ))}
                                <span className="text-[10px] text-muted-foreground">{(m.contextWindow / 1000).toFixed(0)}k ctx</span>
                                {m.costPer1kTokens > 0 && <span className="text-[10px] font-mono text-muted-foreground">${m.costPer1kTokens.toFixed(4)}/1k</span>}
                                {m.costPer1kTokens === 0 && <span className="text-[10px] text-green-600 dark:text-green-400">free</span>}
                                <span className="text-[10px] text-muted-foreground">{m.avgLatencyMs}ms</span>
                              </div>
                            </div>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteModel(provider, m.id)}
                              title="Remove model"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {provider.models.length === 0 && (
                          <p className="text-xs text-muted-foreground italic py-2">No models configured.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingProvider} onOpenChange={() => setEditingProvider(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {editingProvider?.name}</DialogTitle>
          </DialogHeader>
          {editingProvider && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Base URL</Label>
                <Input value={editForm.baseUrl} onChange={(e) => setEditForm((p) => ({ ...p, baseUrl: e.target.value }))} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>API Key</Label>
                  {editingProvider.hasApiKey && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Key stored — enter new to replace</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showApiKey[editingProvider.id] ? "text" : "password"}
                    value={editForm.apiKey}
                    onChange={(e) => setEditForm((p) => ({ ...p, apiKey: e.target.value }))}
                    placeholder={editingProvider.hasApiKey ? "Enter new key to replace..." : "sk-..."}
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowApiKey((p) => ({ ...p, [editingProvider.id]: !p[editingProvider.id] }))}
                  >
                    {showApiKey[editingProvider.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {PROVIDER_PRESETS[editingProvider.id] && (
                  <a
                    href={PROVIDER_PRESETS[editingProvider.id]!.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Get API key from {editingProvider.name} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProvider(null)}>Cancel</Button>
            <Button onClick={() => void handleEditSave()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewProvider} onOpenChange={setShowNewProvider}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure AI Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={newProviderPreset} onValueChange={setNewProviderPreset}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_PRESETS).map(([id, p]) => (
                    <SelectItem key={id} value={id}>
                      <span className={p.color}>{p.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {PROVIDER_PRESETS[newProviderPreset] && (
                <p className="text-xs text-muted-foreground">{PROVIDER_PRESETS[newProviderPreset]!.description}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>API Key {newProviderPreset === "ollama" && <span className="text-muted-foreground">(not required)</span>}</Label>
              <Input
                type="password"
                value={newProviderApiKey}
                onChange={(e) => setNewProviderApiKey(e.target.value)}
                placeholder={newProviderPreset === "ollama" ? "ollama (or leave blank)" : "Paste your API key..."}
                className="font-mono text-sm"
              />
              {PROVIDER_PRESETS[newProviderPreset] && (
                <a
                  href={PROVIDER_PRESETS[newProviderPreset]!.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Get API key <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProvider(false)}>Cancel</Button>
            <Button onClick={() => void handleAddProvider()}>
              Configure {PROVIDER_PRESETS[newProviderPreset]?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
