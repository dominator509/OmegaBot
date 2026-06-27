# OmegaBot Platform Repo Brief

Compact context for Codex, Serena, and Obsidian links. For broader UI/API inventory, see `replit.md`.

## Purpose

Operator-facing OmegaBot dashboard and API platform for a personal AI assistant. The app manages tasks, runs, commands, approvals, events, adapters, provider/model registry, LLM routes, integrations, GitHub change plans, artifacts, settings, and chat/control handoff.

## Stack

- pnpm workspace monorepo, Node 24, TypeScript 5.9.
- Backend: Express 5, Zod, Pino, Helmet, CORS, express-rate-limit, OpenAI/Anthropic SDKs.
- Frontend: React 19, Vite 7, Tailwind CSS v4, shadcn/Radix UI, TanStack Query, wouter, Recharts, Lucide.
- Data: Postgres for production platform state; JSON file fallback for local smoke/dev.
- API contract: OpenAPI in `lib/api-spec/openapi.yaml`; Orval generates React Query hooks and Zod client schemas.

## Entrypoints

- API app: `artifacts/api-server/src/app.ts`; route wiring: `artifacts/api-server/src/routes/index.ts`.
- API server main/build: `artifacts/api-server/src/index.ts`, `artifacts/api-server/build.mjs`.
- Web app: `artifacts/omegabot/src/App.tsx`, `artifacts/omegabot/src/main.tsx`.
- Production smoke: `scripts/src/production-smoke.ts`.
- OpenAPI spec/codegen: `lib/api-spec/`.

## Commands

All repo shell commands should be RTK-prefixed in Codex sessions.

- `rtk corepack pnpm run typecheck`
- `rtk corepack pnpm run build`
- `rtk corepack pnpm run smoke`
- `rtk corepack pnpm run verify`
- `rtk corepack pnpm --filter @workspace/api-spec run codegen`
- `rtk corepack pnpm --filter @workspace/api-server run dev`
- `rtk corepack pnpm --filter @workspace/omegabot run dev`
- `rtk corepack pnpm --filter @workspace/scripts run functional:test`

## Important Directories

- `artifacts/api-server/` - Express API, provider registry, auth/session/security, platform persistence.
- `artifacts/omegabot/` - dashboard UI, pages, layout, hooks, generated API consumption.
- `artifacts/mockup-sandbox/` - separate Vite mockup/sandbox app.
- `lib/api-spec/` - source OpenAPI contract and Orval config.
- `lib/api-client-react/src/generated/` - generated React Query client; regenerate, do not hand-edit.
- `lib/api-zod/src/generated/` - generated Zod/client schemas; regenerate, do not hand-edit.
- `lib/db/` - Drizzle/Postgres schema support.
- `scripts/src/` - smoke, functional, blackbox/whitebox/ad hoc validation assets.

## Security And Data Notes

- Production auth requires bearer API auth plus admin session env vars; `/api/healthz` remains public.
- Cookie-authenticated production mutations require trusted `Origin`/`Referer`; bearer machine requests bypass browser-origin checks.
- Provider API keys require `PROVIDER_SECRET_KEY` in production and are AES-GCM encrypted at rest.
- High-impact auth/settings/provider/approval events persist in `auditEvents` and are exposed by `GET /api/audit` without secret material.
- `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440`; do not weaken supply-chain guardrails.

## Do Not Touch Casually

- Do not hand-edit generated clients in `lib/api-client-react/src/generated/` or `lib/api-zod/src/generated/`; update OpenAPI and run codegen.
- Do not commit secrets, local state, `.serena/cache`, `.serena/project.local.yml`, `.obsidian/workspace.json`, build output, or dependency folders.
- Treat auth, provider secret storage, trusted-origin checks, audit logging, and production smoke coverage as production-risk areas.

## Current Unknowns

- TODO: Deployment target and final production environment variables are not fully documented in this repo.
- TODO: No dedicated lint script is documented; typecheck/build/smoke are the known quality gates.
- TODO: Broader roadmap appears distributed across reports and prior work rather than a single canonical roadmap file.
