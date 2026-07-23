# Requirements — Reports (Frontend Phase 6)

Source: `grocery-api`'s two report endpoints (`docs/hld-api-spec.md` §8,
`GET /reports/sales` and `GET /reports/products`) — the last remaining
feature area, completing full API coverage.

Both endpoints share the same required `startDate`/`endDate` query params
and the same validation rule, so this is one page with a single date-range
control driving two report sections, not two separate pages.

## Acceptance criteria

1. **Date range**: two native date inputs, `startDate` and `endDate`,
   defaulted to the last 7 days (today − 6 to today) on first load so the
   page shows something useful immediately rather than an empty picker.
2. **Client-side validation** mirrors the backend's own rule
   (`hld-api-spec.md` §8: "`startDate > endDate`" → 400): if `startDate` is
   after `endDate`, show an inline message and don't fetch — same
   validate-before-round-trip pattern as Products/Inventory forms. Both
   dates are always required (native `<input type="date">` has no "clear"
   affordance that leaves it truly empty once a default is set, so this
   mainly guards the ordering, not presence).
3. Changing either date re-fetches both reports for the new range
   (`GET /reports/sales`, `GET /reports/products`, both requiring
   `REPORT_VIEW`) — one shared range, two queries.
4. **Sales report** renders `totalSales`, `totalRevenue`, and the
   `dailyBreakdown` list (date, count, revenue per day). Per the backend
   (`hld-api-spec.md` §8: "omits days with zero sales, not zero-padded"),
   an empty `dailyBreakdown` means no sales in range at all — shown as an
   explicit empty state, not a blank table.
5. **Products report** renders the `products` list (name, quantity sold,
   revenue), already ordered by revenue descending per the backend — no
   client-side re-sort. Empty list → explicit empty state ("no products
   sold in this range").
6. Any 403 (role lacks `REPORT_VIEW`) surfaces as a clear inline message
   in place of both report sections — same reactive-403 pattern as every
   other feature; the nav link stays visible.
7. Mobile: date inputs stack above the report sections, which stack
   vertically; no side-scrolling tables.

## Out of scope (this phase)

- Export/download (CSV, PDF, etc.) — no such endpoint exists.
- Any date range beyond what the two native `<input type="date">` pickers
  support (e.g. presets like "this month") — not requested, and the
  backend takes explicit dates either way, so presets would just be sugar
  around the same two inputs.
