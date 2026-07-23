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
4. **Revised during implementation** (was: hide nav entries by
   permission). The backend has no endpoint exposing the current user's
   *permissions* — `GET /auth/me` returns only `roleId`, not permission
   codes — so the frontend cannot know what a role can do without either
   a new backend endpoint or hardcoding role→permission mappings that
   would drift from the backend's actual `role_permissions` table (the
   real source of truth). Decision: nav shows **all** feature areas
   (Products, Inventory, Sales, Dashboard, Reports) to every
   authenticated user regardless of role. Any page whose underlying API
   call 403s (e.g. a `CASHIER` opening Dashboard) shows a clear
   "You don't have permission to view this" message instead of a broken
   or empty page — reactive, not proactive, and never duplicates
   backend authorization logic client-side.
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
