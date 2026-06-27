# Suggested Commands

- Prefix shell commands with `rtk` in Codex sessions.
- Full verification: `rtk corepack pnpm run verify`.
- Typecheck only: `rtk corepack pnpm run typecheck`.
- Build all: `rtk corepack pnpm run build`.
- Production smoke: `rtk corepack pnpm run smoke`.
- API codegen after OpenAPI edits: `rtk corepack pnpm --filter @workspace/api-spec run codegen`.
- API dev: `rtk corepack pnpm --filter @workspace/api-server run dev`.
- Web dev: `rtk corepack pnpm --filter @workspace/omegabot run dev`.
- Functional node tests: `rtk corepack pnpm --filter @workspace/scripts run functional:test`.
- Windows-friendly inspection: prefer `rtk rg ...`; for file reads use `rtk powershell -NoProfile -Command "Get-Content <path>"`. Escape PowerShell `$` as backtick-dollar inside quoted commands.