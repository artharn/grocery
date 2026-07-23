# Requirements — Sales Module (Phase 3)

Source: Notion `[Phase 3] Implement sales module` (empty task page). Scope
inferred from `sales` + `sale_items` in the Data Dictionary, building on
the `products` and inventory (`stock_transactions`) modules from the
previous two Phase 3 tasks.

## Business context

A sale (checkout) is one or more line items against products. Completing
a sale must, atomically: record the sale + its line items, and deduct the
sold quantity from each product's stock via a `SALE`-type
`stock_transactions` row (the type the inventory module reserved for
exactly this). Either all of it happens or none of it does — a sale can
never be recorded with only some of its stock deducted.

## Acceptance criteria

1. `POST /sales` creates a sale. Body: `{ items: [{ productId, quantity }, ...] }`.
   - `items` must be a non-empty array; each entry needs a positive
     integer `productId` and positive integer `quantity`.
   - **Price is never client-supplied.** For each item, the unit price is
     read from the product's current `price` at the moment of sale
     (inside the same transaction that locks the product row) — matches
     `sale_items.price`'s documented meaning, "unit price at time of
     sale," and prevents a client from dictating its own price.
     **[inferred — confirm: this is a security-motivated default, not
     stated explicitly anywhere, but no POS should let the client set its
     own price.]**
   - `subtotal = price × quantity` per item; `sale.total_amount` = sum of
     subtotals. Rounded to 2 decimal places.
   - A unique `sale_no` is generated server-side (format
     `SALE-YYYYMMDD-XXXXXX`) — never client-supplied.
   - `created_by` is always the authenticated caller.
2. **Atomicity**: if any item's product doesn't exist, is inactive, or
   has insufficient stock, the *entire* sale is rejected — no sale row,
   no sale_items rows, no stock deducted for any item, even the ones that
   would have succeeded individually.
   - Unknown `productId` → 404.
   - Inactive product → 409 (can't sell a discontinued item).
   - Insufficient stock for any item → 409 (reuses the inventory module's
     "stock can never go negative" rule — a sale is just a specific kind
     of stock movement).
3. On success, each sold item also produces a `SALE`-type
   `stock_transactions` row (`quantity = -quantity sold`), so stock
   history and current balance reflect the sale exactly like a manual
   `OUT` would — this is the inventory module's reserved system path for
   `SALE`.
4. `GET /sales` lists sales, newest first.
5. `GET /sales/:id` returns one sale with its line items. 404 if it
   doesn't exist.
6. All three endpoints require authentication. `GET` endpoints need no
   specific permission (any authenticated staff can view sales history).
   `POST /sales` requires a `SALE_CREATE` permission. **[inferred —
   confirm, same pattern as the previous two Phase 3 tasks.]**
7. Response envelope follows `be-standard.md` §5.

## Out of scope (this task)

- Refunds/voids — no such column or status exists on `sales`, and
  nothing on the board asks for it.
- Payment methods/tender/change calculation — not in the data
  dictionary.
- Receipts/printing.
- Pagination on `GET /sales` — consistent with the same decision already
  made for the inventory module's transaction list.

## Known pre-existing gap this inherits

Same as the previous two Phase 3 docs: no seed/register task exists, so
`SALE_CREATE`-gated writes are implemented and tested with temporary seed
data but unusable end-to-end on a fresh database.
