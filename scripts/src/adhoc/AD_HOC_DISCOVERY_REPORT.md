# AD_HOC_DISCOVERY_REPORT

## Scope
Exploratory, adversarial, read-only application-logic testing across API seams in `artifacts/api-server` using deterministic chaos harnesses.

## Attack Vectors Executed
1. Phase 1 heuristic mapping (`CHAOS_TARGET_MAP`).
2. Phase 2 malformed payload injection.
3. Phase 3 concurrency/disruption abuse.
4. Phase 4 persona workflow derailment.

## Successful Disruptions (Failures to Degrade Gracefully)

### 1) Malformed Payload Accepted on Task Creation
- Vector: `p2-02` in `scripts/src/adhoc/phase2-malformed-injection.ts`
- Endpoint: `POST /api/tasks`
- Input: deeply nested unexpected payload structure.
- Observed: `201` created instead of strict rejection.
- Risk: payload smuggling and potential state bloat through weak schema boundaries.
- Evidence: `scripts/src/adhoc/logs/phase2-results.json`, `scripts/src/adhoc/logs/phase2-findings.md`.

### 2) Session Replay After Logout
- Vector: `p4-05-stale-cookie-reuse-after-logout` in `scripts/src/adhoc/phase4-persona-derailment.ts`
- Sequence: login (trusted origin) -> capture session cookie -> logout -> replay captured cookie.
- Observed:
  - `GET /api/auth/session` reported authenticated post-logout.
  - `PATCH /api/settings` with replayed cookie returned `200` post-logout.
- Risk: session revocation gap (captured cookie remains valid until expiry).
- Evidence: `scripts/src/adhoc/logs/phase4-results.json`, `scripts/src/adhoc/logs/phase4-findings.md`.

## Non-Failing but High-Value Checks
- Unauthorized mutation blocked with `401`.
- Session mutation without trusted origin blocked with `403`.
- Concurrency race on approvals resolved with single-winner (`200` + `409`) and no 5xx.
- Secret-flip/write-race and mid-flight abort vectors did not crash service.

## Repro Artifacts
- `scripts/src/adhoc/CHAOS_TARGET_MAP.md`
- `scripts/src/adhoc/phase2-malformed-injection.ts`
- `scripts/src/adhoc/phase3-concurrency-disruption.ts`
- `scripts/src/adhoc/phase4-persona-derailment.ts`
- `scripts/src/adhoc/logs/phase2-*`
- `scripts/src/adhoc/logs/phase3-*`
- `scripts/src/adhoc/logs/phase4-*`

## Notes
- Application code was not modified.
- External dependencies were not required; all vectors executed against local in-process server harnesses.
