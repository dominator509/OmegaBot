# Phase 2 Findings

## Confirmed Anomaly
- Vector: `p2-02` malformed/nested payload injection on `POST /api/tasks`
- Observed: endpoint returned `201 Created` for request containing unexpected deeply nested `payload` object.
- Expected (chaos hypothesis): reject or strip with explicit validation error.
- Risk:
  - Silent acceptance of high-entropy nested structures can become a storage pressure vector.
  - Potential for future schema drift where unexpected nested fields are persisted/forwarded unintentionally.

## Graceful Behaviors Confirmed
- Oversized request body bounded by parser limit (`413`).
- Invalid types/nulls correctly rejected with `400`.
- Unknown control action rejected with `400`.
