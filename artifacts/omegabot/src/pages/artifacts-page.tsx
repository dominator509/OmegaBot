import { useState, useMemo } from "react";
import { Search, Download, FileText, FileCode, FileJson, Table, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListArtifactsStore } from "@workspace/api-client-react";
import { MOCK_ARTIFACTS } from "@/lib/mock-data";
import { cn, STATUS_COLORS, ADAPTER_COLORS, formatRelativeTime, formatBytes } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ElementType> = {
  markdown: FileText,
  text: FileText,
  json: FileJson,
  code: FileCode,
  csv: Table,
  image: FileCode,
  binary: FileCode,
};

const TYPE_COLORS: Record<string, string> = {
  markdown: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  text: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  json: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  code: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  csv: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  image: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  binary: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

const PREVIEW_CONTENT: Record<string, string> = {
  "art-001": `# Weekly Email Summary — Week of Apr 28, 2025\n\n## Key Highlights\n- **47 emails** processed across **8 threads**\n- **3 action items** identified requiring follow-up\n- **2 meeting requests** pending response\n\n## Action Items\n1. Reply to John about Q4 roadmap planning session\n2. Review auth regression ticket shared by Dave\n3. Respond to vendor contract renewal inquiry\n\n## Meeting Requests\n- Q4 Planning Session — Proposed: May 8, 2:00 PM\n- Engineering sync — Proposed: May 6, 10:00 AM\n\n## Summary by Sender\n| Sender | Count | Priority |\n|--------|-------|----------|\n| John Smith | 5 | High |\n| Dave Chen | 3 | Medium |\n| Alice Wong | 8 | Low |`,
  "art-002": `{\n  "exported_at": "2025-04-30T10:00:00Z",\n  "calendar": "primary",\n  "events": [\n    {\n      "id": "evt_001",\n      "title": "Q4 Planning Session",\n      "start": "2025-05-08T14:00:00Z",\n      "end": "2025-05-08T15:00:00Z",\n      "attendees": ["john@example.com", "alice@example.com"],\n      "location": "Zoom"\n    },\n    {\n      "id": "evt_002",\n      "title": "Engineering Sync",\n      "start": "2025-05-06T10:00:00Z",\n      "end": "2025-05-06T11:00:00Z",\n      "attendees": ["team@example.com"]\n    }\n  ],\n  "total": 14\n}`,
  "art-006": `Daily Standup — May 1, 2025\n\nHey #engineering,\n\nHere's my update for today:\n\n✅ Yesterday:\n- Completed auth refactor PR review\n- Fixed DB connection pool configuration\n\n🔄 Today:\n- Finishing rate limiting implementation\n- Code review for feature/dashboard-v2\n\n🚫 Blockers:\n- Waiting on design approval for new onboarding flow\n\n—`,
};

export default function ArtifactsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: raw, isError } = useListArtifactsStore(undefined, { query: { queryKey: ["artifacts"], retry: false } });
  const artifacts = useMemo(() => (isError || !raw) ? MOCK_ARTIFACTS : ((raw as unknown as { items: typeof MOCK_ARTIFACTS })?.items ?? MOCK_ARTIFACTS), [raw, isError]);
  const isDemo = isError || !raw;

  const types = useMemo(() => Array.from(new Set(artifacts.map((a) => a.type))), [artifacts]);
  const filtered = useMemo(() => artifacts.filter((a) => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.taskName ?? "").toLowerCase().includes(search.toLowerCase()) || (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  }), [artifacts, search, typeFilter]);

  const selectedArtifact = artifacts.find((a) => a.id === selectedId);
  const previewContent = selectedId ? PREVIEW_CONTENT[selectedId] : undefined;
  const canPreview = selectedArtifact && ["markdown", "text", "json", "code"].includes(selectedArtifact.type);

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Artifacts</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} artifacts</p>
        </div>
        {isDemo && <Badge variant="outline" className="text-xs text-muted-foreground">demo data</Badge>}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search artifacts…" className="pl-8 h-8 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("flex gap-4 flex-1 overflow-hidden", selectedId ? "flex-row" : "flex-col")}>
        <div className={cn("overflow-y-auto", selectedId ? "w-80 shrink-0" : "flex-1")}>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2.5 font-medium">Artifact</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Source task</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Size</th>
                  <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((art) => {
                  const TypeIcon = TYPE_ICONS[art.type] ?? FileCode;
                  return (
                    <tr
                      key={art.id}
                      className={cn("hover:bg-muted/20 cursor-pointer transition-colors", selectedId === art.id && "bg-primary/5")}
                      onClick={() => setSelectedId(selectedId === art.id ? null : art.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-medium font-mono text-xs">{art.name}</div>
                            {art.tags && art.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">
                                {art.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="text-[10px] bg-muted px-1 rounded">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TYPE_COLORS[art.type] ?? "bg-slate-500/10 text-slate-600")}>{art.type}</span>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">{art.taskName ?? "—"}</td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground font-mono">{formatBytes(art.size)}</td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-muted-foreground">{formatRelativeTime(art.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">No artifacts found.</div>
            )}
          </div>
        </div>

        {selectedId && selectedArtifact && (
          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{selectedArtifact.name}</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", TYPE_COLORS[selectedArtifact.type] ?? "")}>{selectedArtifact.type}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(selectedArtifact.size)}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Download className="h-3 w-3" /> Download
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {canPreview && previewContent ? (
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">{previewContent}</pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                  <FileCode className="h-8 w-8" />
                  <span className="text-sm">Preview not available for this file type.</span>
                  <Button size="sm" variant="outline" className="gap-1.5 mt-2">
                    <Download className="h-3.5 w-3.5" /> Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
