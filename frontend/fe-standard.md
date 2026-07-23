# Frontend Standard — grocery-frontend

Governing standard for this app, mirroring `grocery-api/be-standard.md`'s
role for the backend. Any code change here should be checked against this
document; if it can't comply, fix the rule in the same change instead of
quietly deviating.

Stack: React 19 + TypeScript, Vite, Tailwind CSS v4, React Router,
TanStack Query, `@zxing/browser` for camera-based scanning (works on
both QR and 1D barcodes, decodes straight off a `<video>` element via
`requestAnimationFrame` — switched from `html5-qrcode` because that
library's manual setTimeout+canvas scan loop hits a long-unresolved
upstream iOS Safari bug where the stream visibly plays but decode never
fires). Deploys to Vercel as a static SPA.

---

## 1. Project structure

Feature-based, not layer-based: a page and the hook(s) it owns live
together under `features/<name>/`, rather than in parallel top-level
`hooks/`/`pages/` trees where tracing "what uses what" means jumping
between unrelated folders. This is the current mainstream React
recommendation (bulletproof-react and similar) once an app has more than
a couple of distinct feature areas — this one has six.

```
frontend/
  src/
    api/            # SHARED typed API clients — one file per backend
                     # resource, stateless fetch wrappers with no React/
                     # query-cache state, so sharing them across features
                     # costs nothing (unlike sharing hooks or components)
      client.ts     # the only place that calls fetch directly: base URL,
                     # auth header, envelope parsing
      auth.ts, products.ts, stock.ts, sales.ts, dashboard.ts, reports.ts
    types/          # SHARED — TS types mirroring
                     # grocery-api/docs/hld-api-spec.md request/response shapes
    context/
      AuthContext.tsx   # SHARED app-wide auth state — every route depends
                     # on it via ProtectedRoute/Layout, so it cannot live
                     # inside features/auth/ without inverting the
                     # dependency direction (shared components would then
                     # import from a feature)
    hooks/
      useProducts.ts # the ONE cross-feature hook: the product list is read
                     # by Products, Inventory, and Sales, so it's promoted
                     # to shared rather than one feature importing another's
                     # hook. Anything used by 2+ features goes here; a hook
                     # used by exactly one feature lives in that feature.
    components/     # SHARED reusable, route-agnostic UI
      Layout.tsx, ProtectedRoute.tsx, BarcodeInput.tsx, CameraScanner.tsx,
      ConfirmDialog.tsx
    features/       # one folder per backend resource area — the same
                     # boundary the backend uses (auth, products,
                     # inventory, sales, dashboard, reports)
      <feature>/
        hooks/       # TanStack Query hooks used ONLY within this feature
        pages/       # route-level screens for this feature
    App.tsx          # routes only
    main.tsx          # entrypoint
  docs/
    requirements/    # BA-style acceptance criteria per feature, same pattern as grocery-api
  fe-standard.md
```

**Features never import from each other.** If a new page under
`features/X/` needs something from `features/Y/`, that's a signal the
piece belongs in the shared layer (`hooks/`, `components/`, `api/`, or
`lib/`), not that `X` should reach into `Y`. `api/<feature>.ts` stays
shared regardless, since it's just typed request/response functions with
no caching or feature-specific behavior attached — the coupling that
actually matters is in hooks (which carry query-key/cache semantics) and
pages (which are the feature's UI by definition).

## 2. API layer

- **One fetch wrapper** (`api/client.ts`) is the only place that calls
  `fetch` directly. It:
  - Reads the base URL from `import.meta.env.VITE_API_BASE_URL` — never
    hardcode a URL in a component or page.
  - Attaches `Authorization: Bearer <accessToken>` when a token is present.
  - Parses the backend's envelope (`be-standard.md` §5): on
    `{ success: true, data }` returns `data`; on `{ success: false, error }`
    throws a typed `ApiError` carrying `code`, `message`, and the HTTP
    status.
- Every other file calls the backend through `api/<feature>.ts` functions,
  never through raw `fetch`.
- Request/response shapes are typed in `types/`, matching
  `grocery-api/docs/hld-api-spec.md` exactly — if the backend spec is
  wrong or the API changes, fix the type here and re-check every caller,
  don't silently `any` around a mismatch.

## 3. Data fetching & state

- Server state (products, stock, sales, dashboard, reports) goes through
  **TanStack Query** via `features/<feature>/hooks/use<Feature>.ts` (or the
  shared `hooks/` for a hook used by 2+ features, per §1) — no manual
  `useEffect`+`useState` fetch-on-mount patterns.
- Client/auth state (current user, tokens) lives in `AuthContext`, not
  TanStack Query.
- Mutations (create/update/delete/checkout) invalidate the relevant query
  keys on success so lists refresh — don't hand-roll optimistic state
  unless a specific screen needs it.
- The shared `QueryClient` never retries a 4xx `ApiError` (400/403/404/409
  etc.) — those are never transient, so retrying just delays the
  reactive-403/error message the user is waiting on for no benefit. 5xx and
  network errors still get the default retry, since those genuinely can be
  transient.

## 4. Auth

- Tokens (`accessToken`, `refreshToken`) are stored in `localStorage`.
  **Known tradeoff**: this is XSS-exposed compared to an httpOnly cookie;
  accepted here because it matches this project's existing pragmatic
  security posture (dev-grade secrets already handled this way elsewhere)
  and there's no backend session/cookie support to pair with anyway. If
  this app ever handles real customer data, revisit this.
- `ProtectedRoute` redirects to `/login` when there's no token; it does
  **not** attempt to validate the token client-side beyond "is it
  present" — an expired/invalid token surfaces as a 401 from the API,
  which the client reacts to by clearing state and redirecting to
  `/login`.
- UI hides/disables actions the current user's role lacks permission for
  (e.g. hide "Delete product" without `PRODUCT_DELETE`), but this is UX
  only — the backend's `403` is the real enforcement. Never assume a
  hidden button means the action is actually blocked.

## 5. Barcode / QR input

Every "find or enter a product by code" flow (product search, stock
adjustment, sales/POS cart) supports two input modes through one shared
component (`components/BarcodeInput.tsx`):

1. **Plain text field, auto-focused.** Hardware barcode scanners (HID/
   keyboard-wedge devices) work with zero extra code — they just emit
   fast keystrokes + Enter into whatever's focused.
2. **"Scan with camera" button** opens `CameraScanner.tsx`, a modal using
   `@zxing/browser` against the device camera (works on both QR and 1D
   barcodes), and fills the same field on a successful decode.

Never build a flow that requires the camera — it's always an alternative
to typing/hardware-scanning into the same field, since not every device
running this app has a usable camera or camera permission.

## 6. Mobile

Tailwind mobile-first: unprefixed utility classes are the mobile layout,
`sm:`/`md:`/`lg:` add up for larger screens. Every page must be usable at
a phone viewport width (~375px) — this is a POS tool meant to run on
phones/tablets at a counter, not just desktop.

## 7. Styling & naming

- Tailwind utility classes directly in JSX; no separate CSS files per
  component unless something genuinely can't be expressed with utilities.
- Components: PascalCase filename matching the exported component, one
  default export per file.
- Pages live under `features/<Feature>/pages/`, named for the screen
  (e.g. `ProductList.tsx`), not generic (`index.tsx`). A page-like
  component used by 2+ features (e.g. `ProductForm.tsx`, opened from
  Products, Sales, and Inventory) is promoted to shared `components/`
  per §1, not duplicated per feature.

## 8. Deployment (Vercel)

- Vite static build (`vite build`), zero-config on Vercel.
- `vercel.json` rewrites all routes to `/index.html` (client-side routing
  via React Router needs this — without it, a hard refresh on `/products`
  404s).
- `VITE_API_BASE_URL` is set as a Vercel project environment variable,
  never committed.

## 9. Verification

Per `grocery-api/be-standard.md`'s "verify, don't assume": every page is
checked in a real browser against the real running backend (`npm run
dev` + manual/automated browser check) before being marked done — type
checks and a successful build are necessary but not sufficient to claim
a feature works.

## 10. Compliance

Same rule as the backend: any change here gets checked against this
document, and if the right answer conflicts with a rule, the rule gets
fixed in the same change rather than quietly ignored.
