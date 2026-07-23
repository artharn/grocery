# Phase 4 — Dashboard Metrics & Reporting

Status: complete — both tasks implemented, tested, and requirement-
coverage-confirmed via the `ba` / `be-expert` / `tester` loop
(`docs/dev-workflow.md`).

Source tasks (Notion "Grocery POS" board, both previously "Not started"):
- `[Phase 4] Dashboard metrics`
- `[Phase 4] Implement reporting module`

Both task pages were empty — scope for each came from what's queryable
across `sales`, `sale_items`, `products`, and `stock_transactions` after
Phase 3. Full acceptance criteria and inferred decisions live in
`docs/requirements/dashboard-metrics.md` and `reporting-module.md`; this
doc is the rollup.

## 1. Dashboard metrics

`GET /dashboard/metrics` — a "right now" snapshot: today's sales
(count + total, UTC day boundary), count of active products, out-of-stock
active products, and top 5 products by all-time quantity sold.

Files: `repositories/dashboard.repository.js`,
`services/dashboard.service.js`, `controllers/dashboard.controller.js`,
`routes/dashboard.routes.js`.

Deliberately gated behind a `DASHBOARD_VIEW` permission rather than
following the "reads only need authentication" pattern from Phases 2–3 —
revenue data is more sensitive than catalog browsing.

**8/8 test cases passed**, 100% of 7 acceptance criteria covered,
including the `LIMIT 5` truncation boundary (verified with 6 distinct
sold products) and confirming an inactive product with zero stock is
excluded from `outOfStockProducts`.

## 2. Reporting module

`GET /reports/sales?startDate&endDate` and `GET /reports/products?startDate&endDate`
— the date-ranged counterpart to dashboard metrics. Both params required
(no implicit default range), validated as real `YYYY-MM-DD` dates with
`startDate <= endDate`. Sales report returns totals + a daily breakdown;
products report returns per-product quantity/revenue for the range,
ordered by revenue, omitting products with no sales in range. Same
`REPORT_VIEW` permission pattern as `DASHBOARD_VIEW`.

Files: `repositories/report.repository.js`, `services/report.service.js`,
`validators/report.validator.js`, `controllers/report.controller.js`,
`routes/report.routes.js`.

**A real bug was caught and fixed during testing**: the daily breakdown
initially returned dates off by one (relying on `pg`'s `date`-type
parsing + `.toISOString()`, a known footgun where the driver parses
`date` columns using the host's local timezone before JS converts back to
UTC). Fixed by formatting the date as text in SQL (`TO_CHAR`) instead of
round-tripping through a JS `Date` at all — verified correct across a
3-day backdated fixture and both single-day boundary cases.

**15/15 test cases passed**, 100% of 4 acceptance criteria covered,
including range-boundary inclusivity and confirming an unsold product is
excluded from the products report.

## Known gaps carried forward

Same root cause as every prior phase: no register/seed task exists
anywhere on the board, so `DASHBOARD_VIEW`/`REPORT_VIEW`-gated reads are
implemented and tested with temporary seed data but unusable end-to-end
on a fresh database.

## Out of scope, noted for any future phase

- Configurable low-stock thresholds (needs a schema change)
- Historical/date-ranged stock-movement reporting, CSV/PDF export, saved
  reports
- Pagination anywhere (consistent across the whole project)

## Board status note

This completes every `[Phase N]`-labeled task on the board (Phases 1–4).
The `[Migration 000]`–`[Migration 009]` tasks are still showing stale
statuses from before Notion was reconnected this session — out of this
loop's scope (see `docs/phase-1-foundation.md` for the documented
deviation: a custom SQL runner was used instead of `node-pg-migrate`, and
file numbering is offset by one from the Notion task numbers).
