# Frontend Core

- Module root: `artifacts/omegabot`.
- Entrypoints: `src/main.tsx`, `src/App.tsx`; Vite config in `vite.config.ts` with manual chunks for production bundle hygiene.
- Routing: wouter routes for dashboard pages listed in `replit.md`; sidebar layout in `src/components/layout/sidebar-layout.tsx`.
- Data access: generated React Query hooks from `@workspace/api-client-react`; mock fallback data in `src/lib/mock-data.ts` is used when API is unavailable.
- UI stack: React 19, Tailwind v4, Radix/shadcn-style components, Recharts, Lucide icons.
- Keep hooks before conditional returns; use skeleton components from `src/components/page-skeleton.tsx` for loading states.
- Auth UX uses backend admin session endpoints and should stay aligned with generated OpenAPI client.