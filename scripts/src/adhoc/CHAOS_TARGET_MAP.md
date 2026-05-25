# CHAOS_TARGET_MAP

## Top 5 Vulnerable Subsystems

1. `platform-state.ts` persistence queue and storage handoff
- Why vulnerable:
  - Centralized mutable state for tasks/commands/approvals/settings/providers.
  - Async persistence queue plus file/postgres branching.
  - Corruption/partial-write risk under rapid mutation.
- Attack vectors:
  - Massive payload writes + concurrent state mutations.
  - Mid-write secret config removal (`PROVIDER_SECRET_KEY`) to trigger persistence failure paths.

2. Auth/session/origin gate chain (`api-auth.ts` + `session-auth.ts` + `app.ts`)
- Why vulnerable:
  - Multiple bypass conditions (`OPTIONS`, `/healthz`, `/auth/*`, API token path, session path).
  - Origin/referer trust checks are critical for mutation endpoints.
- Attack vectors:
  - Out-of-order auth state use, stale/invalid/tampered cookies, mutation requests with missing/forged origins.

3. Route schema boundaries (`tasks`, `commands`, `providers`, `llm`, `settings`)
- Why vulnerable:
  - Heavy zod parsing with broad object payload surfaces.
  - Deep and large JSON bodies can pressure parse and persistence layers.
- Attack vectors:
  - Deeply nested objects, oversized strings, wrong primitive types, nulls in expected object fields.

4. Provider registry + model routing (`provider-registry.ts`, `providers.ts`, `llm.ts`, `chat.ts`)
- Why vulnerable:
  - Runtime model/provider selection and masking/encryption behavior.
  - Remote client creation paths prone to partial/missing config.
- Attack vectors:
  - Inconsistent provider/model references, invalid model IDs, toggled provider state during route creation.

5. Streaming chat/control path (`chat.ts`, `control.ts`)
- Why vulnerable:
  - Server-sent streaming lifecycle and event chunking.
  - Potential abrupt client disconnect/state drift during stream.
- Attack vectors:
  - Abort/read interruptions, malformed chat arrays, very large message bodies, high parallel stream starts.

## Stateful/Async Components
- API server boot/shutdown: `initializePlatformState()` / `closePlatformState()`
- Persistence queue: `persistPlatformState()` serialization
- Session cookie signing and expiration checks
- Concurrent mutation endpoints writing to workflow collections

## External/Boundary Surfaces
- File system state file (`OMEGABOT_STATE_FILE`)
- Postgres boundary (`DATABASE_URL` mode; not exercised in deterministic sandbox)
- Remote provider APIs for `/chat` and `/providers/:id/test` (simulated/fault-injected locally)
