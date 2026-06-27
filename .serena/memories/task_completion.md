# Task Completion

- For app/API behavior changes: run `rtk corepack pnpm run verify` when feasible; it builds and runs production smoke.
- For OpenAPI route/schema changes: run `rtk corepack pnpm --filter @workspace/api-spec run codegen` before verification.
- Minimum local gate for scoped TS-only edits: `rtk corepack pnpm run typecheck`.
- Frontend build-specific changes: include `rtk corepack pnpm --filter @workspace/omegabot run build` or full `verify`.
- Backend build-specific changes: include `rtk corepack pnpm --filter @workspace/api-server run build` or full `verify`.
- Before handoff: `rtk git diff --name-only` and `rtk git status --short`; note any pre-existing untracked local config such as `.serena/` or `.obsidian/`.
- Do not install packages during validation unless explicitly requested; current repo already has dependencies present.