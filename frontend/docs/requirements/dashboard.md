# Requirements — Dashboard (Frontend Phase 5)

Source: `grocery-api`'s single dashboard endpoint (`docs/hld-api-spec.md`
§7, `GET /dashboard/metrics`) — a read-only landing page, no forms.

## Acceptance criteria

1. `GET /dashboard/metrics` (requires `DASHBOARD_VIEW`) loads on mount, no
   user input needed — this is the app's default route (`/`).
2. Renders all four fields from the response as-is (no client-side
   recomputation, since the backend already aggregates them):
   - `todaySales`: count and total amount, as a headline stat pair.
   - `totalActiveProducts`: a single stat.
   - `outOfStockProducts`: a list of `{id, name}` — empty state ("No
     out-of-stock products") when the array is empty, since an empty list
     here is good news, not a loading/error state.
   - `topProducts`: a ranked list of `{productId, name,
     totalQuantitySold}` — same empty-state treatment if there's no sales
     history yet.
3. Any 403 (role lacks `DASHBOARD_VIEW`) replaces the metrics with a clear
   inline message — same reactive-403 pattern as every other feature; the
   nav link itself is never hidden (Phase 1 decision, `auth-and-shell.md`).
4. Mobile: stat cards and lists stack in a single column at phone width.

## Out of scope (this phase)

- Any client-side date range or filtering — the endpoint takes no
  parameters (it's always "today" / "current" per its own field names);
  historical ranges are Reports' job (`GET /reports/*`), not Dashboard's.
- Auto-refresh/polling — not requested, and TanStack Query's default
  refetch-on-window-focus already covers the common "I switched back to
  this tab" case without extra code.
