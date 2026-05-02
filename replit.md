# Workspace

## Overview

pnpm workspace monorepo using TypeScript. OmegaBot — a full operator-facing dashboard for a personal AI assistant platform.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: No DB (in-memory mock data on server)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec/`)
- **Frontend**: React + Vite, Tailwind CSS v4, shadcn/ui, wouter, TanStack Query, Recharts, Lucide
- **Build**: esbuild (CJS bundle for API server)

## Artifacts

| Artifact | Dir | Path | Port |
|---|---|---|---|
| API Server | `artifacts/api-server` | `/api` | `$PORT` (8080) |
| OmegaBot Web | `artifacts/omegabot` | `/` | `$PORT` (25662) |

## Pages (12 screens)

| Route | Component | Description |
|---|---|---|
| `/` | `start-here.tsx` | Landing / handoff with live stats, concept cards, quick nav |
| `/overview` | `overview.tsx` | Dashboard with run trend chart, tasks-by-status donut, recent activity |
| `/tasks` | `tasks.tsx` | Expandable task table with runs, tags, create dialog |
| `/commands` | `commands.tsx` | Command table + command groups sidebar, expandable payload/result |
| `/approvals` | `approvals.tsx` | Tabbed view (pending/approved/rejected/expired), approve/reject dialogs |
| `/events` | `events.tsx` | Timeline with level icons, metadata drill-down, adapter/level filters |
| `/adapters` | `adapters.tsx` | Adapter health card grid, click-to-detail dialog |
| `/llm` | `llm.tsx` | Models table, route priority list, usage bar chart + cost table |
| `/integrations` | `integrations.tsx` | Integration cards grouped by category, connect/configure actions |
| `/github` | `github.tsx` | Change plan list + master-detail diff viewer |
| `/artifacts` | `artifacts-page.tsx` | Artifact file table, inline text/JSON/markdown preview panel |
| `/settings` | `settings.tsx` | General, LLM, Approvals, Runtime, Features settings with save |

## API Routes

All routes under `/api/` are in-memory (no DB), served by `artifacts/api-server/src/routes/`:

- `GET/POST /api/tasks` · `GET /api/runs`
- `GET/POST /api/commands` · `GET /api/command-groups`
- `GET /api/approvals` · `POST /api/approvals/:id/approve|reject`
- `GET /api/events`
- `GET /api/adapters`
- `GET /api/llm/models` · `GET/POST /api/llm/routes` · `GET /api/llm/usage`
- `GET /api/integrations`
- `GET/POST /api/github/change-plans`
- `GET /api/artifacts`
- `GET/PUT /api/settings`
- `GET /api/overview/summary`

## Key Files

- `artifacts/omegabot/src/App.tsx` — routing + all 12 page imports
- `artifacts/omegabot/src/components/layout/sidebar-layout.tsx` — sidebar nav
- `artifacts/omegabot/src/lib/mock-data.ts` — all mock data sets (fallback)
- `artifacts/omegabot/src/lib/utils.ts` — helpers + color maps (STATUS_COLORS, PRIORITY_COLORS, etc.)
- `artifacts/omegabot/src/index.css` — full blue-slate theme (light + dark CSS variables)
- `artifacts/api-server/src/routes/index.ts` — all routes wired
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-spec/` — OpenAPI spec source

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/omegabot run dev` — run frontend locally

## Design Notes

- All pages fall back to `MOCK_*` data from `mock-data.ts` if the API is unavailable (shows "demo data" badge)
- Theme: blue-slate palette, dark sidebar, light content area. Dark mode via CSS variables + `.dark` class.
- Type cast pattern for API responses: `(data as unknown as { items: T[] })?.items ?? MOCK_DATA`
- React Fragment key pattern for expandable table rows: `<React.Fragment key={id}>...`
