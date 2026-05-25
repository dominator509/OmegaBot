# Phase 2 Malformed Injection Results

Total attacks: 6
5xx failures: 0

- p2-01 PATCH /settings => 400 | graceful=true
- p2-02 POST /tasks => 201 | graceful=true
- p2-03 POST /tasks => 413 | graceful=true
- p2-04 POST /providers/mal-int/models => 404 | graceful=true
- p2-05 POST /llm/routes => 400 | graceful=true
- p2-06 POST /control => 400 | graceful=true

