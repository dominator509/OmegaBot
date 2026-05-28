# EXTERNAL_INTERFACE_MAP

Source of truth: `lib/api-spec/openapi.yaml` (OpenAPI 3.1, server base `/api`).

## Authorization Requirements
- Contract does not define security schemes in OpenAPI.
- Documented behavior indicates environment-dependent auth: health check public; production may require bearer/session.

## Public Endpoints
- `GET /healthz`
- `GET /auth/session`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PATCH /tasks/{id}`
- `GET /tasks/{id}/runs`
- `GET /runs`
- `GET /commands`
- `POST /commands`
- `GET /commands/{id}`
- `GET /command-groups`
- `POST /command-groups`
- `GET /approvals`
- `POST /approvals/{id}/approve`
- `POST /approvals/{id}/reject`
- `GET /events`
- `GET /adapters`
- `GET /adapters/{id}/health`
- `GET /llm/models`
- `GET /llm/routes`
- `POST /llm/routes`
- `PATCH /llm/routes/{id}`
- `DELETE /llm/routes/{id}`
- `GET /llm/usage`
- `GET /providers`
- `GET /providers/{id}`
- `PUT /providers/{id}`
- `PATCH /providers/{id}`
- `DELETE /providers/{id}`
- `POST /providers/{id}/models`
- `DELETE /providers/{id}/models/{modelId}`
- `POST /providers/{id}/test`
- `POST /chat`
- `POST /control`
- `GET /integrations`
- `GET /github/change-plans`
- `POST /github/change-plans`
- `GET /github/change-plans/{id}`
- `GET /artifacts`
- `GET /settings`
- `PATCH /settings`
- `GET /overview/summary`