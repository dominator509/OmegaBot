# Backend Core

- Module root: `artifacts/api-server`.
- Entrypoints: `src/app.ts` for Express app/middleware, `src/index.ts` for server start, `src/routes/index.ts` for route registration, `build.mjs` for esbuild bundle.
- State/data: `src/lib/platform-state.ts` persists mutable platform state; production uses Postgres tables, local smoke/dev can use JSON fallback.
- Provider registry: `src/lib/provider-registry.ts`; provider API keys are masked in responses and encrypted at rest when persisted.
- Security middleware lives around `src/app.ts` and auth/session helpers; preserve helmet, rate limits, bearer auth, admin session, trusted-origin mutation checks, and JSON error/404 shape.
- Audit logging: `src/lib/audit-log.ts` stores high-impact auth/settings/provider/approval events under workflow key `auditEvents`; avoid logging secret values.
- Routes are Express 5; wildcard syntax must use named params.