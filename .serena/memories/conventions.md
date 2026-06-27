# Conventions

- Do not hand-edit generated clients under `lib/api-client-react/src/generated` or `lib/api-zod/src/generated`; edit `lib/api-spec/openapi.yaml` then run codegen.
- Zod imports use `import { z } from "zod"`; avoid `zod/v4`.
- Express 5 wildcard routes need named params, e.g. `/api/*path`, not `/api/*`.
- Frontend query pattern: generated React Query hooks where possible; QueryClient retry 1 for queries, 0 for mutations, staleTime 30000, no refetch on window focus.
- React hooks: no early returns before hooks; compute hooks first, then loading/error guards.
- Frontend fallback pattern: pages may use `MOCK_*` data from `artifacts/omegabot/src/lib/mock-data.ts` when API is unavailable.
- Table expansion pattern uses keyed `React.Fragment` for adjacent rows.
- Security-sensitive edits must preserve bearer auth, admin session cookies, trusted-origin mutation checks, provider secret encryption, audit logging, and smoke coverage.