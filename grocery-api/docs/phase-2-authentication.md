# Phase 2 — Authentication

Status: complete (as scoped by the 5 Notion tasks below). Built on top of
[Phase 1](./phase-1-foundation.md) and follows the layering defined in
`be-standard.md`.

Source tasks (Notion "Grocery POS" board, all previously "Not started"):
- `[Phase 2] Implement bcrypt`
- `[Phase 2] Implement JWT (access + refresh)`
- `[Phase 2] Implement login API`
- `[Phase 2] Implement auth middleware`
- `[Phase 2] Implement permission middleware`

All 5 task pages were empty (title + status only, no body) — scope was
derived from the titles plus the `roles` / `permissions` / `role_permissions`
/ `users` tables from the Phase 1 data dictionary.

## 1. What was built

| Layer | File | Purpose |
|---|---|---|
| Service | `src/services/password.service.js` | `hashPassword`, `verifyPassword` — wraps `bcryptjs`, cost factor from `config.bcrypt.rounds` |
| Service | `src/services/token.service.js` | `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken`, `verifyRefreshToken` — wraps `jsonwebtoken` |
| Repository | `src/repositories/user.repository.js` | `findByUsername(username)` |
| Repository | `src/repositories/permission.repository.js` | `roleHasPermission(roleId, code)` — `EXISTS` query joining `role_permissions` + `permissions` |
| Service | `src/services/auth.service.js` | `login(username, password)` — core login flow |
| Service | `src/services/permission.service.js` | `hasPermission(roleId, code)` |
| Middleware | `src/middlewares/auth.js` | `authenticate` — verifies the `Bearer` access token, sets `req.user` |
| Middleware | `src/middlewares/permission.js` | `authorize(permissionCode)` — must run after `authenticate`; 403s if the role lacks the permission |
| Validator | `src/validators/auth.validator.js` | `validateLogin` — rejects missing/empty `username`/`password` with a 400 before it reaches the controller |
| Controller | `src/controllers/auth.controller.js` | `login`, `me` |
| Route | `src/routes/auth.routes.js` | `POST /auth/login`, `GET /auth/me` |
| Errors | `src/errors/AppError.js` | added `ForbiddenError` (403) alongside the existing `NotFoundError`/`ValidationError`/`UnauthorizedError` |

`password.service.js` and `token.service.js` live in `services/`, not
`utils/` — per `be-standard.md` §2, anything touching bcrypt or JWT is
explicitly excluded from the "helper function" definition even though
these particular wrappers are small.

Dependencies added: `bcryptjs` (pure-JS — avoids needing a native build
toolchain in the `node:22-alpine` Docker image that `bcrypt` would require)
and `jsonwebtoken`.

## 2. API reference

### `POST /auth/login`

Request:
```json
{ "username": "string", "password": "string" }
```

Responses:

| Status | Code | When |
|---|---|---|
| 200 | — | valid credentials, active user |
| 400 | `VALIDATION_ERROR` | `username` or `password` missing/empty |
| 401 | `UNAUTHORIZED` | unknown username, wrong password, or user `is_active = false` (same message for all three — doesn't reveal which) |

200 response body:
```json
{
  "success": true,
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "user": { "id": 1, "username": "qa_owner", "roleId": 1 }
  }
}
```

### `GET /auth/me`

Requires `Authorization: Bearer <accessToken>`.

| Status | Code | When |
|---|---|---|
| 200 | — | valid, unexpired access token |
| 401 | `UNAUTHORIZED` | missing/malformed header, or invalid/expired token |

200 response body:
```json
{ "success": true, "data": { "user": { "id": 1, "username": "qa_owner", "roleId": 1 } } }
```

`/auth/me` is not one of the 5 literal ticket items — it was added because
it's the only way to exercise `authenticate` end-to-end (no other
protected resource exists yet; Phase 3 modules will be the first real
consumers). It intentionally does nothing beyond echoing the token's
identity claims.

### JWT payload shape

Both access and refresh tokens carry the same claims (different secrets/
expiry per `config.jwt`):
```json
{ "sub": 1, "username": "qa_owner", "roleId": 1, "iat": ..., "exp": ... }
```

## 3. Using the middleware in future routes

```js
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

router.post(
  "/products",
  authenticate,
  authorize("PRODUCT_CREATE"),
  productController.create
);
```

`authorize()` assumes `authenticate` already ran and set `req.user.roleId`
— calling it without `authenticate` first throws `UnauthorizedError`.

## 4. Verification performed

Ran against the real `grocery-postgres` container (not assumed):
seeded a temporary `OWNER` role + `PRODUCT_CREATE` permission +
`role_permissions` row + one active user, then verified:

- `POST /auth/login` — wrong password → 401; missing `password` → 400;
  correct credentials → 200 with both tokens.
- `GET /auth/me` — no header → 401; garbage token → 401; valid token → 200
  with the expected identity.
- `permission.service.hasPermission` — true for the granted permission,
  false for an ungranted one.
- `authorize()` middleware — allowed → `next()` with no error; ungranted
  permission → `next(ForbiddenError)` (403); no `req.user` → `next(UnauthorizedError)` (401).

All seed rows were deleted afterward and `npm run migrate` re-confirmed as
a clean no-op — the database is back to empty.

## 5. Known gaps / open questions

- **No user can currently log in.** There's no register or seed-user task
  anywhere on the Notion board, and `users`/`roles`/`permissions` are
  empty on a fresh database. Something (a seed migration, an admin
  bootstrap script, or a register endpoint) needs to exist before this is
  usable outside of manual testing.
- **No refresh-token exchange endpoint.** The ticket said "Implement JWT
  (access + refresh)," which was read as *issuing* both tokens at login —
  there is no `POST /auth/refresh` to exchange a refresh token for a new
  access token yet. `token.service.verifyRefreshToken` exists and is ready
  to support that if it's wanted.
- **`authenticate` is stateless.** It only verifies the JWT signature/
  expiry — it does not re-check `is_active` against the database on every
  request, so revoking/deactivating a user doesn't invalidate their
  already-issued access token until it expires.
