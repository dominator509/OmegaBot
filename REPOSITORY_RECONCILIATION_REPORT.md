# Repository Reconciliation Report

## Scope

- Compared architecture/roadmap docs against workspace manifests, API routes, OpenAPI source, generated clients, test scaffolding, and report artifacts.
- Fixed high-confidence drift in place and verified with typecheck, functional tests, and full build.

## Fixed Drift

- OpenAPI now includes the public provider registry, chat stream, control action, and LLM route update/delete endpoints that already existed in the Express router.
- Regenerated `@workspace/api-client-react` and `@workspace/api-zod` artifacts from the reconciled OpenAPI contract.
- Updated black-box interface artifacts from 33 documented endpoints to 45 documented endpoints.
- Updated `replit.md` from 13 screens to 14 screens and documented `/chat`, `/api/chat`, `/api/control`, provider `PUT`, and command-group creation.
- Fixed `scripts` typechecking so tests and ad-hoc probes can import API server TS sources intentionally.
- Fixed ad-hoc probe log paths so they write under `scripts/src/adhoc/logs` instead of accidentally creating a root-level `src/` tree.
- Removed stale accidental root `src/adhoc/logs` output.
- Cleaned corrupted characters in the white-box coverage report.

## Dead Ends / Stale Scaffolding

- The root-level `src/adhoc/logs` directory was accidental generated output and is removed.
- The old OpenAPI/generated-client state was stale relative to live backend routes; the spec and generated artifacts are now aligned.
- No proven unreachable production code was removed during this pass.

## Deliberately Not Changed

- `artifacts/omegabot/src/pages/chat.tsx` still uses direct `fetch` for SSE streaming. The generated client exposes the contract, but a streaming UI should continue to manage the event stream manually.
- Provider UI still uses direct `fetch` helpers. Generated hooks now exist, but swapping a working stateful management page to hooks would be a larger UI behavior change than this reconciliation required.
- Live third-party provider tests remain isolated from deterministic local test runs.

## Verification

- `corepack pnpm --filter @workspace/api-spec run codegen`
- `corepack pnpm --filter @workspace/scripts run functional:test`
- `corepack pnpm run typecheck`
- `corepack pnpm run build`
