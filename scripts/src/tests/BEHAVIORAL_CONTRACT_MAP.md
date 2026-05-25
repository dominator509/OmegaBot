# BEHAVIORAL_CONTRACT_MAP

## Workflow: Authentication and Authorization Gate
- Inputs:
  - `POST /api/auth/login` with `{ username, password }`
  - Session cookie `omegabot_session`
  - Optional `Authorization: Bearer <API_AUTH_TOKEN>`
  - Mutation origin/referer headers for session-based writes
- State mutation:
  - Login sets signed session cookie (stateless cookie payload + HMAC)
  - Logout clears cookie
  - No database mutation for auth itself
- Outputs:
  - `GET /api/auth/session` returns authenticated state and user expiry
  - Unauthorized requests to protected endpoints return `401`
  - Session mutation requests with untrusted origin return `403`

## Workflow: Settings State Management
- Inputs:
  - `GET /api/settings`
  - `PATCH /api/settings` with schema-valid partial settings payload
- State mutation:
  - In-memory `settings` map updated and persisted via `persistPlatformState`
  - Persistence backend selected by env:
    - Postgres when `DATABASE_URL` is set
    - File store at `OMEGABOT_STATE_FILE` otherwise
- Outputs:
  - Read returns current settings
  - Patch returns updated settings
  - Invalid body returns `400`

## Workflow: Workflow Collections (tasks, commands, approvals, llmRoutes)
- Inputs:
  - CRUD-like route payloads validated by zod schemas
- State mutation:
  - Route handlers call `getWorkflowItems` and `setWorkflowItems`
  - `setWorkflowItems` updates in-memory state and persists
- Outputs:
  - Collections return `{ items, total }` (approvals include `pendingCount`)
  - Not-found state returns `404` where applicable
  - Invalid payloads return `400`

## Workflow: Provider Registry and Secret Persistence
- Inputs:
  - `PUT/PATCH/DELETE /api/providers/:id`
  - `POST/DELETE /api/providers/:id/models(/:modelId)`
- State mutation:
  - Provider registry updated in memory
  - Persisted state encrypts provider `apiKey` with `PROVIDER_SECRET_KEY`
- Outputs:
  - API returns masked key in public responses and `hasApiKey` boolean
  - Restarted process rehydrates providers and decrypts secrets in memory

## Stateful Components and Storage Boundaries
- `artifacts/api-server/src/lib/platform-state.ts`
  - Mutable process state: `settings`, `workflow`, provider registry snapshot
  - Persistence queue serializes writes to avoid concurrent write corruption
- `artifacts/api-server/src/lib/provider-registry.ts`
  - Mutable provider list and provider/client lookup
- `artifacts/api-server/src/lib/session-auth.ts`
  - Signed session token encode/decode and trusted origin checks

## External Boundaries Requiring Isolation/Mocks
- Postgres (`pg.Pool`) boundary in `platform-state.ts`
- Remote provider APIs (`openai`, `anthropic`) used by `/api/chat` and `/api/providers/:id/test`
- Tests must avoid real network calls by:
  - Not invoking remote-provider endpoints in deterministic suite
  - Forcing file-state mode (`DATABASE_URL` unset, temp state file)

## Concurrency/Integrity Invariants
- Concurrent `setWorkflowItems` calls must not corrupt persisted JSON
- Persisted file must remain valid JSON under load
- Latest committed workflow update must be recoverable on restart
- Shutdown must await queued persistence flush

