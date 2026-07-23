# Requirements — Inventory (Frontend Phase 4)

Source: `grocery-api`'s stock endpoints (`docs/hld-api-spec.md` §5,
`grocery-api/docs/requirements/inventory-module.md`), the one remaining
feature area not yet covered by the frontend per `fe-standard.md` §1
("Products, Inventory, Sales" are distinct areas — stock viewing/adjustment
was explicitly out of scope for the Products phase).

There's no dedicated "list all balances" endpoint — stock is always
per-product (`GET /products/:id/stock`), so this is a master–detail screen:
pick a product (reusing the same `BarcodeInput` scan/search pattern as
Products and Sales), then view/act on that one product's ledger.

## Acceptance criteria

1. **Product picker**: `BarcodeInput` (scan or type) filters the product
   list by name/barcode, same interaction as Products/Sales. Unlike those
   two, this list includes inactive products by default (no toggle needed)
   — the backend explicitly keeps stock viewable for inactive products
   (`hld-api-spec.md` §5: "Works for inactive products too"), and hiding
   them here would contradict that.
2. **Selecting a product** loads and shows:
   - Current balance (`GET /products/:id/stock`).
   - Full transaction ledger, newest first (`GET
     /products/:id/stock-transactions`) — type, signed quantity, note,
     timestamp. `OUT` entries come back with a negative `quantity` from the
     backend (it stores the sign); render the sign as given rather than
     re-deriving it from `type`, so what's displayed always matches what's
     stored.
3. **Record a movement** (`POST /products/:id/stock-transactions`, requires
   `STOCK_ADJUST`): a form with `type` (`IN` / `OUT` / `ADJUST` only —
   `SALE` is system-generated and never offered as a choice here) and
   `quantity`.
   - `IN`/`OUT`: quantity input takes a positive magnitude (label makes
     clear `OUT` removes that many units — the sign flip is the backend's
     job, per `inventory-module.md` criterion 3).
   - `ADJUST`: quantity input accepts any nonzero integer (+/-) directly,
     since a stocktake correction can go either way.
   - `note`: optional free text.
   - On success, balance and ledger both refresh (query invalidation) and
     the form resets — no page reload needed to see the effect of the
     movement just recorded.
4. **409** (`hld-api-spec.md` §5: inactive product, or balance would go
   negative) shows the backend's message inline; balance/ledger are left as
   they were (the write never happened, so there's nothing to reconcile).
5. Any 403 (role lacks `STOCK_ADJUST`) surfaces inline on the specific
   submit attempt — same reactive-403 pattern as Products/Sales; the form
   is not hidden proactively, since the two `GET` endpoints need no
   permission at all (any authenticated user can view stock) and only the
   `POST` is gated.
6. Mobile: picker, balance, ledger, and form all stack in a single column
   usable at phone width.

## Out of scope (this phase)

- Any "all products below threshold" or low-stock dashboard view — no such
  backend endpoint exists (`inventory-module.md`'s own out-of-scope note).
  The existing Dashboard's `outOfStockProducts` (Phase 5) is a separate,
  already-aggregated endpoint, not something this page computes.
- Editing or deleting a past transaction — the ledger is append-only, no
  such endpoint exists.
