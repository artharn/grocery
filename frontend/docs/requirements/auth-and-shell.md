# Requirements — Auth & App Shell (Frontend Phase 1)

Source: user request — "web app ที่ต่อกับ api grocery มีหน้า login ในตอน
เริ่ม" (web app connecting to the grocery API, with a login page at the
start). This is the foundation every other frontend phase builds on,
mirroring how `grocery-api`'s Phase 2 (auth) came before Phase 3
(features).

## Acceptance criteria

1. `/login` — username/password form. On submit, calls
   `POST /auth/login`. Success: store `accessToken`/`refreshToken`/`user`
   from the response, redirect to `/` (dashboard or first available
   page). Failure: show the backend's error message inline (`"Invalid
   username or password"` for 401, field-level message for 400) — never
   a generic "something went wrong" when the API already gave a specific
   reason.
2. All routes except `/login` are wrapped in `ProtectedRoute` — no token
   → redirect to `/login`. A 401 from any API call (expired/invalid
   token) clears stored auth state and redirects to `/login` too, from
   anywhere in the app.
3. App shell: a persistent layout (top bar + nav) shown on every
   authenticated page, with the current username visible and a logout
   action (clears local auth state, redirects to `/login` — no backend
   call needed since there's no `/auth/logout` or session to invalidate,
   per `grocery-api`'s stateless-JWT design).
4. **Superseded — see addendum below.** (Original decision, kept for
   history: nav showed all feature areas to every authenticated user
   regardless of role, reacting to a 403 rather than hiding entry points,
   because the backend didn't expose the user's permissions.)
5. Mobile-first layout: nav collapses to a usable pattern (bottom tabs or
   hamburger) below tablet width, per `fe-standard.md` §6.
6. Loading and error states are visible, not silent — a pending login
   request disables the submit button and shows a spinner/state; a
   network failure (backend unreachable) shows a distinct message from
   "wrong password".

## Out of scope (this phase)

- Registration/forgot-password — no such endpoint exists on the backend
  at all (documented gap in `grocery-api/docs/hla.md` §11).
- Refresh-token exchange — no `POST /auth/refresh` endpoint exists yet
  either (same doc). Access tokens expire per `JWT_ACCESS_EXPIRES_IN`
  (15m per `.env`); when one expires mid-session, the resulting 401 just
  logs the user out per criterion 2 — there's nothing to silently refresh
  against.
- The actual Products/Inventory/Sales/Dashboard/Reports pages — separate
  phases, this phase only needs enough of a shell to navigate to
  placeholder routes for them.

## Addendum — proactive permission-based UI hiding (post-launch)

Source: user request that users without a permission should not see the
entry point (button/nav link) for the gated action at all, not just react
to a 403 after clicking it. This was blocked when criterion 4 (above) was
first written, for exactly the reason stated there — closed now by a
backend change: `POST /auth/login` and `GET /auth/me` both include
`permissions` (the live list of the role's permission codes) on the
`user` object (`grocery-api/docs/phase-2-authentication.md` §6).

1. `AuthContext` exposes `hasPermission(code): boolean`, derived from
   `user.permissions` — the single source every gated UI element checks.
2. **Nav links**: `Dashboard` and `Reports` are hidden entirely without
   `DASHBOARD_VIEW`/`REPORT_VIEW` respectively, since every data call on
   those pages needs that one permission — there's nothing to see without
   it. `Products`, `Inventory`, `Sales` stay visible to every authenticated
   user, since browsing each of those needs no permission — only specific
   actions within them do (criterion 3 below).
3. **Action entry points**, hidden (not just disabled) without the
   matching permission:
   - Products: "+ New product" (`PRODUCT_CREATE`), "Edit"
     (`PRODUCT_UPDATE`), "Deactivate" (`PRODUCT_DELETE`) — per row.
   - Inventory: the entire record-a-movement form (`STOCK_ADJUST`) —
     balance and history stay visible to everyone, since viewing stock
     needs no permission.
   - Sales: the "Checkout" button (`SALE_CREATE`) — scanning/cart-building
     stays available to everyone, since only the actual `POST /sales`
     call is gated.
4. `/` (Dashboard) is still the default post-login route, but its own nav
   link is now conditionally hidden — a user without `DASHBOARD_VIEW`
   landing there is redirected straight to `/products` instead of seeing
   a page they have no link to and no access to.
5. **Still UX-only, per fe-standard.md §4**: hiding an entry point never
   replaces the backend's own 403 enforcement on the underlying request.
   If `hasPermission` and the backend's actual `role_permissions` ever
   disagree (e.g. a stale token from before a permission change), the
   backend's 403 on the real request is still authoritative — the visible
   symptom would just be a control that's missing until the next
   login/`/auth/me` refresh, not a security gap.
