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
- **Validation**: Zod (import from `zod`, not `zod/v4`)
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
- `GET/PATCH /api/settings`
- `GET /api/overview/summary`
- `GET /api/healthz`

## Key Files

- `artifacts/omegabot/src/App.tsx` — routing + all 12 page imports + QueryClient config + ErrorBoundary
- `artifacts/omegabot/src/components/error-boundary.tsx` — React Error Boundary (class component)
- `artifacts/omegabot/src/components/page-skeleton.tsx` — PageSkeleton, CardGridSkeleton, StatsSkeleton
- `artifacts/omegabot/src/components/layout/sidebar-layout.tsx` — sidebar nav with live data hooks
- `artifacts/omegabot/src/lib/mock-data.ts` — all mock data sets (fallback when API is down)
- `artifacts/omegabot/src/lib/utils.ts` — helpers + color maps (STATUS_COLORS, PRIORITY_COLORS, etc.)
- `artifacts/omegabot/src/index.css` — full blue-slate theme (light + dark CSS variables)
- `artifacts/api-server/src/app.ts` — Express app with helmet, CORS, rate limiting, error/404 handlers
- `artifacts/api-server/src/routes/index.ts` — all routes wired
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-spec/` — OpenAPI spec source

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/omegabot run dev` — run frontend locally

## Security (Production Hardening)

The API server (`artifacts/api-server/src/app.ts`) includes:
- **`helmet`**: Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, COOP, etc.)
- **`express-rate-limit`**: 200 req/min general, 60 req/min for mutations (POST/PATCH/PUT/DELETE). Rate limits only active when `NODE_ENV=production`.
- **CORS**: Configurable via `ALLOWED_ORIGINS` env var (comma-separated list). Falls back to permissive in development.
- **Body size limit**: 512kb max for JSON and URL-encoded bodies.
- **Global error handler**: Returns JSON `{ error: message }` with correct status codes; stack traces hidden in production.
- **404 handler**: Unmatched `/api/*path` routes return `{ error: "Not found" }` with 404.

## Design Notes

- All pages fall back to `MOCK_*` data from `mock-data.ts` if the API is unavailable (shows "demo data" badge)
- Theme: blue-slate palette, dark sidebar, light content area. Dark mode via CSS variables + `.dark` class.
- Type cast pattern for API responses: `(data as unknown as { items: T[] })?.items ?? MOCK_DATA`
- React Fragment key pattern for expandable table rows: `<React.Fragment key={id}>...`
- **Hooks rule**: Never add early returns before hook calls. Place all `useMemo`/`useState`/`useQuery` hooks first, then guard on `isLoading && !data` to show skeleton.
- **Express 5 wildcard**: Use `/api/*path` not `/api/*` (path-to-regexp v8 requires named params).
- **Zod import**: Use `import { z } from "zod"` — NOT `"zod/v4"` (api-server doesn't have zod as a direct dep; use `@workspace/api-zod` imports instead).
- **QueryClient config**: `retry: 1` for queries, `retry: 0` for mutations. `staleTime: 30000`. `refetchOnWindowFocus: false`.

## Auto-polling Intervals

| Page | Interval |
|---|---|
| Overview | 30s |
| Approvals | 15s |
| Events | 20s |
| Tasks & Runs | 30s |
| Commands | 30s |
| LLM | 60s |
| Adapters | 30s |
| Start Here | 60s |
| Sidebar summary | 30s |
| Sidebar settings | 300s (staleTime) |

## Query Cache Invalidation

After mutations, these query keys are invalidated:
- Create task → `["tasks"]`, `["overview-summary"]`
- Approve/reject → `["approvals"]`, `["overview-summary"]`
- Create command → `["commands"]`, `["command-groups"]`
- Create LLM route → `["llm-routes"]`
- Save settings → `["settings"]`
- Create change plan → `["change-plans"]`
