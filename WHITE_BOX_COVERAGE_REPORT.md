# WHITE_BOX_COVERAGE_REPORT

## Execution
- Date: 2026-05-25
- Command: corepack pnpm --filter @workspace/scripts exec node --import tsx --test --experimental-test-coverage ./src/tests/whitebox*.test.ts
- Result: 17 tests passed, 0 failed.

## Coverage Summary
- Statement (line): **82.36%**
- Branch: **78.74%**
- Function: **52.74%**

## High-Value Module Coverage
- artifacts/api-server/src/lib/session-auth.ts: line 94.82%, branch 84.38%, funcs 91.30%
- artifacts/api-server/src/lib/secret-store.ts: line 97.10%, branch 90.48%, funcs 100.00%
- artifacts/api-server/src/lib/api-auth.ts: line 96.55%, branch 80.00%, funcs 100.00%
- artifacts/api-server/src/lib/platform-state.ts: line 59.10%, branch 76.09%, funcs 78.13%

## Remaining Gaps (Primary)
1. platform-state.ts postgres/legacy branches are under-covered in file-storage test mode.
2. Route modules with static fixture data (providers.ts, overview.ts, chat.ts, llm.ts) have low function coverage because white-box tests focused on security/state-critical paths first.
3. tasks.ts has remaining branch gaps around non-critical list/filter/update branches not yet force-triggered in this phase.

## Dead Code / Unreachable Notes
- No mathematically unreachable dead code was proven during this run.
- Several uncovered lines are environment-gated (Postgres-only branches requiring live DATABASE_URL and schema I/O), not logically dead.

## White-Box Validation Outcomes
- Regressions previously found are now guarded by tests:
  - Unknown task payload keys are rejected (400) and not persisted.
  - Replayed pre-logout session cookies are rejected after revocation.
- Exception boundaries were validated for malformed persisted JSON and persistence-time secret-key failures.
