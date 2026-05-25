# Phase 2 Results

- [PASS] P2-TASK-VALID POST /tasks => 201 (expected: 201, 23ms)
- [PASS] P2-TASK-MISSING-NAME POST /tasks => 400 (expected: 400, 7ms)
- [PASS] P2-TASK-EMPTY-NAME POST /tasks => 201 (expected: 400/201, 7ms) | boundary min length not declared for CreateTaskBody.name
- [PASS] P2-TASK-LONG-NAME POST /tasks => 201 (expected: 201/400/413, 6ms)
- [PASS] P2-CMD-VALID POST /commands => 201 (expected: 201, 7ms)
- [PASS] P2-CMD-BAD-TYPE POST /commands => 201 (expected: 400/201, 12ms)
- [PASS] P2-SETTINGS-TYPE-MISMATCH PATCH /settings => 400 (expected: 400, 6ms)
- [PASS] P2-CHANGEPLAN-MISSING-REPO POST /github/change-plans => 400 (expected: 400, 5ms)