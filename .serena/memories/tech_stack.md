# Tech Stack

- Runtime/package: Node 24, pnpm 10.33.2 via Corepack, TypeScript ~5.9.2, ESM packages.
- Workspace packages from `pnpm-workspace.yaml`: `artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`.
- Backend: Express 5, Zod, Pino/Pino HTTP, Helmet, CORS, express-rate-limit, cookie-parser, OpenAI SDK, Anthropic SDK, pg, drizzle-orm; built with esbuild using `artifacts/api-server/build.mjs`.
- Frontend: React 19.1, Vite 7, Tailwind CSS v4, Radix/shadcn-style UI, TanStack Query, wouter, Recharts, Lucide, framer-motion.
- API contract/codegen: Orval in `lib/api-spec`; generated React Query client in `lib/api-client-react/src/generated`; generated Zod/client helpers in `lib/api-zod/src/generated`.
- Data/security: production Postgres platform state; local JSON fallback; provider API keys AES-GCM encrypted with `PROVIDER_SECRET_KEY`; auth/session/trusted-origin/audit hardening documented in `REPO_BRIEF.md` and `replit.md`.
- Supply-chain guardrail: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440`; do not weaken casually.