# Requirements — Dashboard Metrics (Phase 4)

Source: Notion `[Phase 4] Dashboard metrics` (empty task page). Scope
inferred from what's actually queryable across `sales`, `sale_items`,
`products`, and `stock_transactions` after Phase 3 — no metrics were
specified anywhere on the board.

## Business context

A single at-a-glance endpoint for an owner/manager: how's the business
doing right now, and what needs attention.

## Acceptance criteria

1. `GET /dashboard/metrics` returns:
   ```json
   {
     "todaySales": { "count": 0, "totalAmount": 0 },
     "totalActiveProducts": 0,
     "outOfStockProducts": [{ "id": 1, "name": "..." }],
     "topProducts": [{ "productId": 1, "name": "...", "totalQuantitySold": 0 }]
   }
   ```
2. `todaySales` — count and summed `total_amount` of `sales` rows whose
   `created_at` falls on the current UTC calendar day. **[inferred —
   confirm: "today" = UTC day boundary; the project has no per-user/store
   timezone configuration anywhere to derive a different boundary from.]**
3. `totalActiveProducts` — count of `products` where `is_active = true`.
4. `outOfStockProducts` — active products whose current stock balance
   (`SUM(stock_transactions.quantity)`) is `<= 0`. **[inferred — confirm:
   scoped to "out of stock" only, not a configurable "low stock"
   threshold — `products` has no threshold column, and adding one is a
   schema decision bigger than this task; a real low-stock-threshold
   feature is future work, not silently added here.]**
5. `topProducts` — top 5 products by total quantity sold across all sales
   (all-time, `sale_items.quantity` summed per product), descending.
   Empty array if no sales exist yet.
6. Requires authentication **and** a `DASHBOARD_VIEW` permission — this
   is the one place in the project so far that deliberately does *not*
   follow the "reads only need authentication" pattern from Phases 2–3.
   **[inferred — confirm: revenue and sales-count data is more sensitive
   than browsing the product catalog or checking stock levels, so it's
   gated like a write endpoint even though it's read-only. Easy to
   relax to authentication-only later — it's a single permission check.]**
7. Response envelope follows `be-standard.md` §5.

## Out of scope (this task)

- Configurable low-stock thresholds (needs a schema change, not decided
  here).
- Historical/date-ranged metrics, exports, charts — that's the next
  Phase 4 task (reporting module).
- Per-cashier or per-shift breakdowns (no such grouping exists in the
  data model).

## Known pre-existing gap this inherits

Same as every prior phase: no seed/register task exists, so
`DASHBOARD_VIEW`-gated access is implemented and tested with temporary
seed data but unusable end-to-end on a fresh database.
