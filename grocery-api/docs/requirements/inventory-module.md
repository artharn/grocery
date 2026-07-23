# Requirements — Inventory Module (Phase 3)

Source: Notion `[Phase 3] Implement inventory module` (empty task page).
Scope inferred from the `stock_transactions` table in the Data Dictionary
and the `products` feature built in the previous Phase 3 task.

## Business context

`stock_transactions` is an append-only ledger of stock movements per
product (`type`: `IN` / `OUT` / `SALE` / `ADJUST`, signed `quantity`).
There is no `quantity`/`stock` column on `products` — current stock is
always the sum of its ledger entries, never a cached counter. This keeps
one source of truth and matches how the table is documented ("Amount
changed (positive or negative)").

## Acceptance criteria

1. `GET /products/:productId/stock` returns the current balance
   (`SUM(quantity)`, `0` if no transactions yet) for a product. 404 if the
   product doesn't exist. Works for inactive (soft-deleted) products too —
   historical stock stays viewable.
2. `GET /products/:productId/stock-transactions` lists that product's
   ledger, newest first. 404 if the product doesn't exist.
3. `POST /products/:productId/stock-transactions` records a movement.
   Body: `{ type, quantity, note? }`.
   - `type` must be one of `IN`, `OUT`, `ADJUST`. **`SALE` is rejected**
     (400) — reserved for the sales module to write automatically as part
     of completing a sale, never created directly through this endpoint.
   - `IN`: `quantity` must be a positive integer; stored as `+quantity`.
   - `OUT`: `quantity` must be a positive integer (the amount to remove);
     stored as `-quantity`.
   - `ADJUST`: `quantity` must be a nonzero integer, positive or negative
     (a stocktake correction can go either direction); stored as-is.
   - `note` is optional, free text.
   - `created_by` is always the authenticated caller — never
     client-supplied.
4. **Stock can never go negative.** `OUT` or `ADJUST` transactions that
   would drive the running balance below 0 are rejected with 409
   (`STOCK_CONFLICT`), leaving no row written. **[inferred — confirm:
   chose "block" over "allow negative/backorder" as the safer POS
   default; easy to relax later since it's a single check in the
   service.]**
5. Transactions cannot be recorded against an inactive (`is_active =
   false`) product — 409 (`STOCK_CONFLICT`). **[inferred — confirm]**
6. All three endpoints require authentication. The two `GET` endpoints
   need no specific permission (any authenticated staff can check stock).
   `POST` requires a single `STOCK_ADJUST` permission covering all three
   movement types (`IN`/`OUT`/`ADJUST`) — not split per type, unlike
   product CRUD's per-action codes. **[inferred — confirm]**
7. Response envelope follows `be-standard.md` §5.

## Out of scope (this task)

- Automatic `SALE`-type transactions — that's the next Phase 3 task
  (sales module), which will call into this module's write path
  internally rather than duplicating the ledger-insert logic.
- Low-stock alerts/reordering — no such requirement exists anywhere on
  the board.
- Pagination on the transaction history list — no other endpoint in the
  project paginates yet; adding it here alone would be inconsistent.

## Known pre-existing gap this inherits

Same as `product-crud.md`: no seed/register task exists, so `STOCK_ADJUST`
permission-gated writes are implemented and tested with temporary seed
data but unusable end-to-end on a fresh database.
