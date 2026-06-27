# Core

- Repo: `OmegaBot-Platform`, pnpm workspace TypeScript monorepo; compact human/agent brief lives in `REPO_BRIEF.md`.
- Always preserve `AGENTS.md` RTK include; Codex shell commands should use `rtk` prefix.
- Main modules: backend API `artifacts/api-server` (`mem:backend/core`), frontend dashboard `artifacts/omegabot` (`mem:frontend/core`), validation/scripts `scripts`, API contract/libs under `lib/*`.
- Source of API truth: `lib/api-spec/openapi.yaml`; generated clients are outputs, not edit targets.
- Durable docs: `replit.md` has detailed screens/routes/security notes; `REPO_BRIEF.md` is compact Obsidian/Serena entry point.
- Existing local tool config: `.serena/project.yml` uses TypeScript + LSP and ignores generated/build/cache/dependency/local-state paths; `.obsidian/` exists as local vault metadata.