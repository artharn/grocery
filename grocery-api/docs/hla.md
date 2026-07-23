# Grocery POS — High-Level Architecture (HLA)

Scope: Phase 1–4 (Foundation, Authentication, Catalog/Inventory/Sales,
Dashboard/Reporting). Source of truth for implementation details is the
repo (`grocery-api/be-standard.md`, `docs/phase-*.md`,
`docs/requirements/*.md`); this document is the architecture rollup.

---

## 1. Purpose & Scope

`grocery-api` is the backend for a single-store Grocery POS: product
catalog, stock ledger, sales/checkout, role-based auth, and
owner-facing dashboard/reporting. This HLA covers everything built to
date (Phases 1–4) — all `[Phase N]` and `[Migration N]` tasks on the
project's Notion board are Done as of this writing.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js (`node:22-alpine` in Docker) |
| Framework | Express 5 |
| Database | PostgreSQL 17, accessed via `pg` (no ORM) |
| Auth | JWT (access + refresh), `jsonwebtoken` |
| Password hashing | `bcryptjs` (pure JS — avoids native build tooling in alpine) |
| Migrations | Custom SQL runner (`db/migrate.js`), not an external migration library — see §10 |
| Reverse proxy | nginx |
| Orchestration | Docker Compose (3 services: `postgres`, `api`, `nginx`) |

## 3. System Context

```
Client → nginx (:80) → api (:3000, Express) → postgres (:5432)
```

`docker-compose.yml` defines all three services on one network.
`api` reads its configuration from a single root-level `.env` (see §8).

## 4. Layered Architecture

Every feature follows the same request path, enforced by
`be-standard.md`:

```
route → controller → service → repository → pg Pool
```

- **Routes** (`src/routes/`) — path-to-handler wiring only.
- **Controllers** (`src/controllers/`) — HTTP concerns: parse `req`,
  call a service, shape `res`. No SQL, no business rules.
- **Services** (`src/services/`) — business/domain logic. Orchestrate
  repositories, throw typed `AppError`s. This is where bcrypt/JWT
  wrapping and multi-step business rules live.
- **Repositories** (`src/repositories/`) — all SQL for one
  table/feature. Parameterized queries only.
- **Middlewares** (`src/middlewares/`) — `authenticate` (JWT
  verification), `authorize(code)` (permission check), `error` (central
  error handler).
- **Utils** (`src/utils/`) — pure, stateless helpers (`asyncHandler`,
  `generateSaleNo`).
- **Errors** (`src/errors/AppError.js`) — typed operational errors:
  `NotFoundError` (404), `ValidationError` (400), `UnauthorizedError`
  (401), `ForbiddenError` (403), `ConflictError` (409).

## 5. Module Breakdown by Phase

### Phase 1 — Foundation
- `src/config/env.js`: single place `process.env` is read, fail-fast on
  missing required vars, resolves `.env` by absolute path (works
  regardless of process cwd or Docker).
- `db/database.js`: the `pg` Pool, sourced from `config/env.js`.
- `db/migrations/000`–`008`: one file per table, applied in FK-dependency
  order by `db/migrate.js`, tracked in a `schema_migrations` table.

### Phase 2 — Authentication
- `services/password.service.js`, `token.service.js`: bcrypt/JWT
  wrappers.
- `services/auth.service.js`: `login(username, password)`.
- `middlewares/auth.js`: verifies the access token, sets `req.user =
  { id, username, roleId }`.
- `middlewares/permission.js`: `authorize(permissionCode)` — checks
  `roles`/`permissions`/`role_permissions` for the caller's role.
- Routes: `POST /auth/login`, `GET /auth/me`.

### Phase 3 — Catalog, Inventory, Sales
- **Products**: full CRUD, soft delete only (`is_active`).
- **Inventory**: `stock_transactions` is an append-only ledger
  (`IN`/`OUT`/`ADJUST`/`SALE`); current stock is always `SUM(quantity)`,
  never a cached counter. Stock can never go negative — enforced via a
  row-locked (`SELECT ... FOR UPDATE`) transaction in
  `stock.repository.js`.
- **Sales**: one sale = one DB transaction. Locks every referenced
  product, resolves price **server-side** from the locked row (never
  client-supplied), deducts stock via a `SALE`-type ledger row per item,
  writes `sales` + `sale_items`. Any failure rolls back the entire sale
  — partial sales are impossible. `sale.repository.js` reuses
  `stock.repository.js`'s locking/balance primitives rather than
  duplicating the negative-stock rule.

### Phase 4 — Dashboard & Reporting
- **Dashboard** (`GET /dashboard/metrics`): "right now" snapshot —
  today's sales, active product count, out-of-stock products, top-5
  products by all-time quantity sold.
- **Reporting** (`GET /reports/sales`, `GET /reports/products`):
  date-ranged counterpart — explicit `startDate`/`endDate` required, no
  implicit default range.
- Both gated behind dedicated permissions (`DASHBOARD_VIEW`,
  `REPORT_VIEW`) rather than authentication-only, since they expose
  revenue data — the one deliberate deviation from the "reads only need
  auth" pattern used everywhere else.

## 6. Data Model

9 tables (full column-level detail: Notion "Grocery POS - Data
Dictionary"):

```
roles ─┬─< role_permissions >─┬─ permissions
       │                       │
       └─< users               │
             │
             ├─< stock_transactions >─ products
             ├─< sales >─< sale_items >─ products
             └─< audit_logs
```

- `roles`, `permissions`, `role_permissions` — RBAC.
- `users` — auth identity, FK to `roles`.
- `products` — catalog, soft-delete via `is_active`.
- `stock_transactions` — append-only stock ledger.
- `sales` / `sale_items` — checkout records, `sale_items.price` is a
  point-in-time snapshot (never re-derived from current `products.price`
  after the fact).
- `audit_logs` — schema exists (Phase 1 migration); no write path built
  yet in any phase (see §10).

## 7. Security Architecture

- Passwords: bcrypt, cost factor from `BCRYPT_ROUNDS` env var.
- Auth: JWT access + refresh tokens issued at login; access token
  verified per-request (stateless — no DB lookup, no revocation list).
- Authorization: permission-code based, checked per-route via
  `authorize(code)`, resolved against `role_permissions` on every
  request (not cached in the JWT).
- All SQL parameterized — no string-built queries anywhere in the
  codebase.
- Sale pricing resolved server-side only; client-supplied price fields
  are silently ignored (verified by test).

## 8. Configuration

Single `.env` at the **repo root** (not inside `grocery-api/`), read
once by `src/config/env.js`. `docker-compose.yml`'s `env_file` injects
it directly into the `api` container; outside Docker, `env.js` resolves
the same file by absolute path regardless of the process's working
directory.

## 9. Cross-Cutting Concerns

- **Errors**: every route wrapped in `asyncHandler`; all failures reach
  one central `middlewares/error.js`. `AppError` subclasses map to a
  consistent `{ success: false, error: { code, message } }` body;
  unexpected errors return a generic 500, never leaking stack traces or
  SQL.
- **Response envelope**: `{ success: true, data }` /
  `{ success: false, error }` on every endpoint except `/health` (an
  infra probe, exempted by `be-standard.md` §5).
- **Transactions**: any multi-statement write (stock movements, sales)
  runs inside a single `pg` transaction via a checked-out client —
  never split across separate `pool.query` calls.
- **Migrations**: append-only, numbered, never edited after being
  applied.

## 10. Development Process

Features are built via a three-role loop, not ad hoc: `ba` (requirements
→ `docs/requirements/<feature>.md`) → `be-expert` (implementation) →
`tester` (real-DB test cases, never mocks) → loop until 100% test pass
**and** 100% requirement coverage. Full process:
`docs/dev-workflow.md`. Custom agent definitions: `.claude/agents/ba.md`,
`be-expert.md`, `tester.md`.

## 11. Known Gaps & Risks

- **No register path** (still open) — there's no self-serve way to
  create a user; new accounts require a manual DB seed. **Partially
  resolved** 2026-07-23: 2 real users (OWNER, CASHIER) were seeded
  directly into the local dev database — credentials intentionally not
  committed here; see the "Grocery POS - Seed Users" Notion page. Note:
  those credentials don't work through `docker-compose`/nginx yet, since
  the running `api` container predates Phase 2–4 and needs a rebuild.
- **`audit_logs` has no writer.** The table exists; nothing writes to
  it yet.
- **No refresh-token exchange endpoint.** `token.service.verifyRefreshToken`
  exists; there's no `POST /auth/refresh` route consuming it.
- **`authenticate` is stateless** — deactivating a user doesn't invalidate
  their already-issued access token until it expires.
- **Migration tooling deviates from plan.** The Notion board specified
  `node-pg-migrate`; a custom runner was built instead (documented in
  `docs/phase-1-foundation.md`). Functionally equivalent, but the tool
  choice itself wasn't what was originally specified.
- **No pagination anywhere.** Consistent choice across every list
  endpoint, but will need revisiting at scale.
