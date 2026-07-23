# Requirements — Reporting Module (Phase 4)

Source: Notion `[Phase 4] Implement reporting module` (empty task page).
Scope inferred from what's queryable across `sales`, `sale_items`,
`products`, building on `dashboard-metrics.md`'s "right now" snapshot —
this task is the date-ranged counterpart.

## Business context

Dashboard metrics answers "how's business today, right now." Reporting
answers "how did business do over a period I choose" — a fixed date
range, not a fixed "today" boundary.

## Acceptance criteria

1. `GET /reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — sales
   report for an inclusive date range. Both query params are **required**
   (no implicit default range — an unstated default like "last 30 days"
   is its own ambiguous decision, so the caller states the range
   explicitly). **[inferred — confirm]**
   - 400 if either param is missing or not a valid `YYYY-MM-DD` date.
   - 400 if `startDate` is after `endDate`.
   - Returns: `{ startDate, endDate, totalSales, totalRevenue, dailyBreakdown: [{ date, count, revenue }] }`,
     `dailyBreakdown` covering every day in range with sales (days with
     zero sales are omitted, not padded with zero rows).
   - Range boundaries use the same UTC-day convention as
     `dashboard-metrics.md`'s `todaySales` for consistency.
2. `GET /reports/products?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` —
   product performance for the same range. Same required-params/
   validation rules as `/reports/sales`.
   - Returns: `{ startDate, endDate, products: [{ productId, name, quantitySold, revenue }] }`,
     ordered by `revenue` descending. Only products with at least one
     sale in the range appear (no zero-rows for unsold products).
3. Both endpoints require authentication **and** a `REPORT_VIEW`
   permission — same sensitivity reasoning as `DASHBOARD_VIEW` in the
   dashboard metrics task (revenue data, not just catalog browsing).
   **[inferred — confirm, consistent with the prior task's precedent]**
4. Response envelope follows `be-standard.md` §5.

## Out of scope (this task)

- Stock-movement reporting by date range — the inventory module's
  existing `GET /products/:productId/stock-transactions` already gives
  full per-product history; a cross-product date-ranged version would be
  a separate, larger feature not asked for here.
- CSV/PDF export — no such requirement anywhere on the board.
- Saved/scheduled reports.
- Pagination — consistent with every other Phase 3/4 endpoint.

## Known pre-existing gap this inherits

Same as every prior phase: no seed/register task exists, so
`REPORT_VIEW`-gated access is implemented and tested with temporary seed
data but unusable end-to-end on a fresh database.
