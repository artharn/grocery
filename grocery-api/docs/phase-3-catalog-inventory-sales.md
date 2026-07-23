# Phase 3 — Product Catalog, Inventory, Sales

Status: complete — all 3 tasks implemented, tested, and requirement-
coverage-confirmed via the `ba` / `be-expert` / `tester` loop
(`docs/dev-workflow.md`).

Source tasks (Notion "Grocery POS" board, all previously "Not started"):
- `[Phase 3] Implement product CRUD`
- `[Phase 3] Implement inventory module`
- `[Phase 3] Implement sales module`

All 3 task pages were empty (title + status only) — scope for each came
from its table in the Phase 1 data dictionary plus the access-control
pattern from Phase 2. Full acceptance criteria, inferred decisions, and
what's out of scope live in `docs/requirements/product-crud.md`,
`inventory-module.md`, and `sales-module.md` respectively — this doc is
the rollup.

**Notion status was not updated** — the Notion MCP connection was down
for this entire phase. Update the 3 task checkboxes to Done once it
reconnects; `docs/requirements/*.md` is the record in the meantime.

## 1. Product CRUD

`GET/POST/PUT/DELETE /products`, `GET /products/:id`. Soft delete only
(`is_active = false`), never a hard delete — matches the column's
documented purpose. Read endpoints need only authentication; writes need
`PRODUCT_CREATE` / `PRODUCT_UPDATE` / `PRODUCT_DELETE` respectively.

Files: `repositories/product.repository.js`, `services/product.service.js`,
`validators/product.validator.js`, `controllers/product.controller.js`,
`routes/product.routes.js`.

**26/26 test cases passed**, 100% of 9 acceptance criteria covered.

## 2. Inventory module

`GET /products/:productId/stock` (current balance = `SUM(quantity)` over
the ledger, never a cached column), `GET /products/:productId/stock-transactions`
(history), `POST /products/:productId/stock-transactions` (`IN`/`OUT`/
`ADJUST`; `SALE` is rejected — reserved for the sales module). Stock can
never go negative; transactions are blocked on inactive products. Writes
need `STOCK_ADJUST`; reads need only authentication.

Files: `repositories/stock.repository.js`, `services/stock.service.js`,
`validators/stock.validator.js`, `controllers/stock.controller.js`,
`routes/stock.routes.js`.

`stock.repository.js` exposes `lockProductForUpdate` / `applyStockMovement`
as reusable primitives (not just the single-movement `recordTransaction`)
specifically so the sales module could reuse the exact same "no negative
stock, no inactive product" enforcement inside its own multi-item
transaction instead of duplicating that rule. After this refactor, the
full inventory test suite was re-verified with no regressions.

**24/24 test cases passed**, 100% of 7 acceptance criteria covered.

## 3. Sales module

`POST /sales` (checkout), `GET /sales` (list), `GET /sales/:id` (detail
with line items). One sale, one DB transaction: locks every referenced
product, resolves each unit price **server-side** from the locked product
row (a client-supplied `price` field is silently ignored — verified by
test), deducts stock via a `SALE`-type `stock_transactions` row per item,
then writes `sales` + `sale_items`. Any failure — unknown product,
inactive product, insufficient stock for *any* item — rolls back the
*entire* sale, including stock already deducted for earlier items in the
same request. `sale_no` is generated server-side
(`SALE-YYYYMMDD-XXXXXX`, format + uniqueness verified). Writes need
`SALE_CREATE`; reads need only authentication.

Files: `repositories/sale.repository.js`, `services/sale.service.js`,
`validators/sale.validator.js`, `controllers/sale.controller.js`,
`routes/sale.routes.js`, `utils/generateSaleNo.js`.

**19/19 test cases passed** (plus 4 regression checks against the
inventory module), 100% of 7 acceptance criteria covered. Atomicity was
tested explicitly: a multi-item sale where the second item fails leaves
the first item's stock balance completely unchanged.

## Known gaps carried forward

Same root cause across all three (documented per-feature too): no
register/seed task exists anywhere on the board, so every permission-
gated write in this phase is implemented and tested with temporary seed
data (created and deleted around each test run) but unusable end-to-end
on a fresh database. This blocks Phase 3 exactly as it already blocked
Phase 2.

## Out of scope, carried into future phases if needed

- Refunds/voids, payment/tender handling, receipts (sales)
- Low-stock alerts/reordering (inventory)
- Bulk import/export, product categories (products)
- Pagination anywhere (consistent across all Phase 3 endpoints)
