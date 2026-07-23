# Requirements — Product CRUD (Phase 3)

Source: Notion `[Phase 3] Implement product CRUD` (empty task page — title
only). Scope inferred from the `products` table in the Data Dictionary and
the access-control pattern already built in Phase 2.

## Business context

Products are the catalog the POS sells from. Staff need to create, browse,
update, and retire products; retired products must not disappear from
history (sales already made against them, audit trail) so removal is a
soft delete, matching the `is_active` "Soft delete flag" documented on the
table.

## Acceptance criteria

1. `GET /products` lists products. By default returns only
   `is_active = true` rows. A `?includeInactive=true` query param includes
   inactive ones too. **[inferred — confirm]**
2. `GET /products/:id` returns one product regardless of `is_active`
   (so a deactivated product can still be viewed/reactivated). 404 if the
   id doesn't exist or isn't a valid positive integer.
3. `POST /products` creates a product. Required: `name` (non-empty string,
   ≤255 chars), `price` (number ≥ 0). Optional: `barcode` (string, ≤100
   chars, unique — 400 if already taken), `cost` (number ≥ 0 if given).
   `is_active` defaults to `true`, not settable on create.
4. `PUT /products/:id` updates any of `name`/`price`/`cost`/`barcode` on
   an existing product (partial update — only supplied fields change).
   404 if the product doesn't exist. Same validation rules as create for
   any field that's supplied.
5. `DELETE /products/:id` **soft**-deletes: sets `is_active = false`. Does
   not remove the row. 404 if the product doesn't exist. Idempotent-ish:
   deleting an already-inactive product succeeds (no error) and stays
   inactive.
6. All five endpoints require authentication (`Authorize: Bearer
   <accessToken>`) — this is an internal POS API, not public.
   **[inferred — confirm]**
7. Read endpoints (`GET /products`, `GET /products/:id`) only require
   authentication — no specific permission code, any authenticated staff
   member can browse the catalog (cashiers need this to sell).
   **[inferred — confirm]**
8. Write endpoints require a specific permission on the caller's role,
   checked via the existing `authorize()` middleware:
   `POST /products` → `PRODUCT_CREATE`, `PUT /products/:id` →
   `PRODUCT_UPDATE`, `DELETE /products/:id` → `PRODUCT_DELETE`.
9. Response envelope follows `be-standard.md` §5
   (`{ success, data }` / `{ success, error }`) — no exemption like
   `/health` has, since these are real client-facing resources.

## Out of scope (this task)

- Stock/quantity management — that's `stock_transactions`, covered by the
  next Phase 3 task (inventory module).
- Bulk import/export.
- Product categories/tags (no such column exists in the data dictionary).

## Known pre-existing gap this inherits

Per `docs/phase-2-authentication.md` §5: there is still no way to create a
real user/role/permission on a fresh database (no register or seed task
exists on the board). Permission-gated endpoints here are implemented and
testable with temporary seed data, but unusable end-to-end until that gap
is closed.
