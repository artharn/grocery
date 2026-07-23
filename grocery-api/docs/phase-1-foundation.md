# Phase 1 — Foundation

Status: complete. Covers environment configuration and the initial database
schema — the prerequisites everything else in the project builds on.

Source tasks (Notion "Grocery POS" board):
- `[Phase 1] Create .env and .env.example`
- `[Migration 000]` through `[Migration 009]` (schema setup + one migration
  per table)

## 1. Environment configuration

- `.env` (git-ignored) lives at the **repo root**, next to
  `docker-compose.yml` — not inside `grocery-api/`.
- `.env.example` (tracked) mirrors every variable `.env` defines, with
  secrets blanked out.
- `grocery-api/src/config/env.js` is the single place that reads
  `process.env`. It resolves `.env` by an absolute path
  (`path.join(__dirname, "../../../.env")`) rather than relying on
  `process.cwd()`, so it loads correctly whether the process is started
  from the repo root, from inside `grocery-api/`, or via Docker Compose's
  `env_file` injection. It fails fast (throws at startup) if any required
  var is missing.
- `grocery-api/db/database.js` (the `pg` Pool) sources its connection
  settings from `config/env.js` rather than reading `process.env`
  directly, so there's exactly one place env vars are read from.

Variables validated as required today: `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
`JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_ROUNDS`.

## 2. Database schema

Schema reference: Notion "Grocery POS - Data Dictionary" page — 9 tables:
`roles`, `permissions`, `role_permissions`, `users`, `products`,
`stock_transactions`, `sales`, `sale_items`, `audit_logs`.

Implemented as plain, numbered SQL migration files in
`grocery-api/db/migrations/`, applied in order by a custom runner
(`grocery-api/db/migrate.js`, `npm run migrate`). The runner tracks what's
been applied in a `schema_migrations` table and is safe to re-run — already
applied files are skipped.

| File | Table | Depends on |
|---|---|---|
| `000_create_roles.sql` | `roles` | — |
| `001_create_permissions.sql` | `permissions` | — |
| `002_create_role_permissions.sql` | `role_permissions` | roles, permissions |
| `003_create_users.sql` | `users` | roles |
| `004_create_products.sql` | `products` | — |
| `005_create_stock_transactions.sql` | `stock_transactions` | products, users |
| `006_create_sales.sql` | `sales` | users |
| `007_create_sale_items.sql` | `sale_items` | sales, products |
| `008_create_audit_logs.sql` | `audit_logs` | users |

Per `be-standard.md` §6: migrations are never renumbered or edited after
being applied — any future schema change is a new file (`009_...sql`, ...).

### Deviation from the original Notion plan

The Notion board planned `[Migration 000] Setup node-pg-migrate` (i.e. use
the `node-pg-migrate` npm package) with table migrations numbered `001`
through `009`. What was actually built instead:

- A **custom, dependency-free SQL runner** (`db/migrate.js`) rather than
  `node-pg-migrate` — the schema is small and static enough that a ~50-line
  runner avoids pulling in an extra dependency and its CLI/config surface.
- Numbering starts at `000` for the **first table** (`roles`) instead of
  reserving `000` for tool setup, so file numbers are offset by one from
  the Notion task numbers (Notion's `Migration 001` = `000_create_roles.sql`
  in the repo, and so on through `Migration 009` = `008_create_audit_logs.sql`).

This was a deliberate implementation choice, not an oversight — flagging it
here so the Notion task numbering and the repo's file numbering aren't
assumed to match 1:1.

## 3. Verification performed

- All 9 migrations applied cleanly against the real `grocery-postgres`
  Docker container; confirmed via `\dt` that all 9 tables (+
  `schema_migrations`) exist.
- Re-running `npm run migrate` is a no-op (idempotent).
- Confirmed `env.js` fails fast when a required variable is missing.
