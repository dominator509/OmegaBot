# Phase 4 Findings

## Confirmed Disruption
- `p4-05-stale-cookie-reuse-after-logout` reproduced a session revocation failure.
- Reproduction sequence: login with trusted origin -> capture `omegabot_session` cookie -> logout -> replay captured cookie.
- Observed behavior: `/api/auth/session` returned `authenticated: true` and `PATCH /api/settings` returned `200` after logout.

## Security/State Impact
- Logout is currently client-side cookie clearing only; captured signed cookies remain valid until TTL expiry.
- This enables session replay if cookie material is obtained before logout.

## Additional Persona Results
- Unauthorized mutation pre-auth correctly blocked with `401`.
- Session mutation without trusted origin correctly blocked with `403`.
- API bearer token path remained functional (`200`).
