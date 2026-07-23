# Backend Standard — grocery-api

Governing standard for this service. Every PR that touches `grocery-api` must
follow this document. If a change can't comply, the PR must say why and this
file must be updated in the same PR — the standard should never silently
drift from what the code actually does.

Stack: Node.js, Express 5, PostgreSQL via `pg` (no ORM), JWT auth, bcrypt,
Docker. References: [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices),
[Express error-handling guidance](https://github.com/expressjs/express/issues/6917).

---

## 1. Project structure

Routes stay thin, business logic lives in services, data access lives in
repositories. This is the target layout — grow into it as features are
added, don't create empty folders speculatively.

```
grocery-api/
  src/
    app.js                  # express app wiring only (middleware, routes mount)
    server.js                # http server bootstrap (listen), separate from app.js so tests can import app without binding a port
    config/
      env.js                 # reads + validates process.env once, exports a frozen config object
    routes/
      <feature>.routes.js    # path -> controller wiring only, no logic
    controllers/
      <feature>.controller.js  # HTTP layer: parse req, call service, shape res. No SQL, no business rules.
    services/
      <feature>.service.js   # core functions: business/domain logic, orchestrates repositories
    repositories/
      <feature>.repository.js  # all SQL for one table/feature, parameterized queries only
    middlewares/
      auth.js, error.js, validate.js
    validators/
      <feature>.schema.js    # request validation schemas
    utils/
      <name>.js              # helper functions: pure, stateless, no I/O
    errors/
      AppError.js             # base class for operational errors
  db/
    database.js               # pg Pool (unchanged)
    migrate.js                 # migration runner (unchanged)
    migrations/                # NNN_description.sql (unchanged, see §6)
  tests/
    unit/
    integration/
```

A "feature" = one resource/table area (`auth`, `users`, `products`,
`sales`, `stock`, `audit`). Keep each feature's route/controller/service/
repository files named identically so they're easy to trace.

**Current state**: only `src/app.js` and `db/` exist. New endpoints must be
added inside this structure, not appended to `app.js` directly. Splitting
`app.js` into `app.js` + `server.js` happens the first time routes are added.

---

## 2. Core functions vs helper functions

This distinction is deliberate — mixing the two is the most common
structure violation to watch for in review.

**Core function** (lives in `services/`)
- Implements one piece of domain/business logic for one feature (e.g.
  `createSale`, `adjustStock`, `authenticateUser`).
- Orchestrates one or more repository calls, applies business rules,
  decides success/failure — this is where domain errors are thrown.
- Has no knowledge of `req`/`res` — takes plain arguments, returns plain
  data or throws an `AppError`.
- Async, named as a verb phrase: `createSale`, `voidSale`, `restockProduct`.

**Helper function** (lives in `utils/`)
- Pure and stateless: same input always produces the same output, no
  database calls, no `req`/`res`, no reading `process.env` directly.
- Does one small, reusable thing: formatting, calculation, parsing,
  mapping — e.g. `formatCurrency`, `calculateSubtotal`, `generateSaleNo`,
  `sanitizeUsername`.
- Never contains business *rules* (e.g. "a sale needs at least one item"
  is a core function's job, not a helper's).
- Should be trivially unit-testable with no mocks.

Rule of thumb: if it touches the database, JWT, bcrypt, or `req`/`res`, it's
a core function or belongs in a repository/middleware. If it's a pure
transform of data already in memory, it's a helper.

---

## 3. Request flow / layering rules

```
route -> controller -> service (core fn) -> repository -> pg Pool
```

- Controllers never call `pool.query` directly.
- Services never touch `req`/`res` or throw raw Express responses — they
  throw `AppError` subclasses; the error middleware turns those into HTTP
  responses.
- Repositories never contain business logic — only queries and mapping
  DB rows to plain objects.
- A layer may only call the layer directly below it. Controllers don't
  reach into repositories; routes don't call services directly.

---

## 4. Async & error handling

- `async/await` only. No raw `.then()` chains, no callback-style `pg`
  usage, no mixing callback and promise style in the same function.
- Every async route handler must be wrapped so rejected promises reach
  Express's error middleware — don't rely on try/catch in every
  controller:

```js
// utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

- Domain/expected failures throw a typed `AppError` (`NotFoundError`,
  `ValidationError`, `UnauthorizedError`, ...) with an HTTP status and a
  safe message. Unexpected failures (DB down, bug) propagate as-is and are
  logged with full detail but returned to the client as a generic 500 —
  never leak stack traces or SQL to the response.
- One centralized error-handling middleware (`middlewares/error.js`),
  mounted last in `app.js`. No per-route ad hoc error formatting.
- Multi-statement writes (e.g. a sale + its sale_items + a stock
  transaction) run inside a single `pg` transaction (`BEGIN`/`COMMIT`/
  `ROLLBACK` via a client checked out from the pool), matching the
  transaction pattern already used in `db/migrate.js`.

---

## 5. API response format

All JSON responses use one envelope shape so clients don't special-case
endpoints:

```json
// success
{ "success": true, "data": { } }

// error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Product not found" } }
```

`/health` is exempt (infrastructure probe, not a client-facing resource).

---

## 6. Database & migrations

- Continues the pattern established in `db/migrations/`: plain numbered
  SQL files, zero-padded three digits, sequential, never renumbered or
  edited after being merged to `main` — a schema change is always a new
  file (`009_...sql`, `010_...sql`, ...).
- One migration = one logical change. Don't bundle unrelated table
  changes into a single file.
- All SQL uses parameterized queries (`$1, $2, ...`) via `pg` — string
  concatenation or template literals into SQL is forbidden, no exceptions,
  including for "trusted" internal values.
- Repositories are the only place SQL text lives. No inline queries in
  services or controllers.
- Foreign keys are declared at creation time following the dependency
  order already used in `db/migrations` (referenced table's migration
  number is always lower).

---

## 7. Configuration & secrets

- All configuration is read from `process.env` in exactly one place
  (`src/config/env.js`), validated and fail-fast at startup (throw if a
  required var is missing — don't let a missing `JWT_ACCESS_SECRET`
  surface as a runtime 500 later).
- No file besides `.env` (git-ignored) holds real secrets. `.env.example`
  stays in sync with every var `env.js` reads.
- Nothing outside `config/env.js` calls `process.env` directly.

---

## 8. Security

- Passwords: bcrypt only, cost factor from `BCRYPT_ROUNDS` env, never
  logged or returned in any response.
- Auth: JWT access + refresh tokens per existing `.env` config; access
  token verified in an `auth` middleware, permission checks against the
  `roles` / `permissions` / `role_permissions` tables happen in that
  middleware or a dedicated `authorize(permissionCode)` helper — not
  duplicated per controller.
- Add `helmet` and a rate limiter (e.g. `express-rate-limit`) on
  auth/write endpoints once those routes exist — not currently wired in
  `app.js`, required before any non-`/health` route ships.
- Validate and sanitize all request input at the route boundary
  (validators/ + a `validate` middleware) before it reaches a controller.
- `cors` origin list comes from config, never `*` outside local dev.

---

## 9. Logging

- No bare `console.log` in application code paths beyond the current
  bootstrap/health-check use in `app.js`. Once a logger is introduced
  (e.g. `pino`), all layers use it, with request-scoped context (method,
  path, user id if authenticated).
- Never log secrets, password hashes, or full JWTs.
- Errors are logged with stack trace server-side; client responses stay
  generic per §4.

---

## 10. Style & naming

- `camelCase` for variables/functions, `PascalCase` for classes/error
  types, `UPPER_SNAKE_CASE` for constants, `snake_case` only inside SQL
  (matching existing table/column names).
- Files: `kebab-case` or `<feature>.<layer>.js` (`sales.service.js`),
  consistent with the structure in §1.
- One export focus per file — a service file exports its feature's core
  functions, a utils file exports related helpers, not a grab-bag.
- ESLint + Prettier config should be added before the codebase grows past
  a handful of files; until then, match the formatting already present in
  `src/app.js` and `db/migrate.js` (2-space indent, double quotes,
  semicolons).

---

## 11. Testing

- Helper functions (`utils/`): unit tests, no mocks needed since they're
  pure.
- Core functions (`services/`): unit tests with the repository layer
  mocked/stubbed.
- Routes: integration tests with `supertest` against a real test
  database (migrated via `npm run migrate`), not a mocked `pg` Pool —
  mirrors how `db/migrate.js` was verified against the actual Postgres
  container rather than assumed correct.

---

## 12. Compliance

Any code change to `grocery-api` — new endpoint, refactor, migration,
dependency — must be checked against this document before merge. If the
right answer conflicts with a rule here, fix the rule in the same PR
instead of quietly deviating.

---

## 13. Development process

Features move through this project via a three-role loop — `ba` defines
acceptance criteria, `be-expert` implements against them and this
standard, `tester` verifies against the real database — with escalation
to a human only for genuine business decisions no existing doc answers.
Full process, branching rules, and exit criteria: see
[`docs/dev-workflow.md`](./docs/dev-workflow.md).
