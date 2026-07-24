# Frontend Standard — grocery-frontend

Governing standard for this app, mirroring `grocery-api/be-standard.md`'s
role for the backend. Any code change here should be checked against this
document; if it can't comply, fix the rule in the same change instead of
quietly deviating.

Stack: React 19 + TypeScript, Vite, Tailwind CSS v4, React Router,
TanStack Query. Camera-based barcode/QR scanning is driven by a custom
`requestVideoFrameCallback` loop in `CameraScanner.tsx` (see §5) rather
than any library's own built-in scan loop, racing five separate decode
engines per frame. Deploys to Vercel as a static SPA.

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
2. **"Scan with camera" button** opens `CameraScanner.tsx`, a modal
   against the device camera, and fills the same field on a successful
   decode.

Never build a flow that requires the camera — it's always an alternative
to typing/hardware-scanning into the same field, since not every device
running this app has a usable camera or camera permission.

### Camera scan pipeline (`CameraScanner.tsx`)

Decode reliability on real devices (particularly iOS Safari) took
several rounds to get right; the current design exists for specific,
verified reasons — don't simplify it without re-checking the history
below.

- **Frame capture**: a manual `requestVideoFrameCallback` loop (falling
  back to `requestAnimationFrame` where unsupported), not
  `getUserMedia`-managed libraries' own built-in timer loops. Both
  `html5-qrcode` and `@zxing/browser`'s `decodeFromConstraints` schedule
  decode attempts on a plain `setTimeout` and capture frames via
  `canvas.drawImage(video)` — confirmed on a real iPhone that this
  pattern lets the video stream visibly keep playing while every
  `drawImage()` capture silently returns a stale/frozen frame, so decode
  never fires (Android Chrome is unaffected). `requestVideoFrameCallback`
  fires only when a genuinely new frame is composited, sidestepping this.
- **Scan region**: only a centered square crop (`SCAN_REGION_FRACTION`,
  70% of the video's shorter native dimension) is decoded, matched by an
  on-screen guide box computed from the same math. Decoding the full raw
  frame works but is slower per attempt and gives the user nothing to aim
  at.
- **Best-effort continuous autofocus** (`focusMode: "continuous"` in
  `getUserMedia`'s `advanced` constraints) plus an on-screen distance
  hint — the constraint mainly helps Android (iOS Safari exposes no
  camera focus control to web JS at all), so the hint is the one lever
  that helps on every platform for the "held too close to focus" failure
  mode.
- **Five decode engines race on every frame**, ordered cheapest/
  synchronous first so a frame already solved skips the heavier async
  attempts below it:
  1. `jsQR` — pure-JS, QR-only, different algorithm than zxing's own QR
     decoder.
  2. `@zxing/browser`'s `BrowserMultiFormatReader` (zxing-js port) —
     synchronous, broad format support.
  3. Native `BarcodeDetector` (feature-detected; mainly Chromium/Android,
     not Safari) — hardware-accelerated where available. Not yet in TS's
     bundled DOM types, so it's ambient-typed locally in
     `CameraScanner.tsx`.
  4. `zxing-wasm` — the actual ZXing C++ engine via WebAssembly; an
     unrelated codebase to the zxing-js port above despite the shared
     name, generally the most accurate of the five. Self-hosted (the
     `.wasm` binary is bundled via a Vite `?url` import and served
     same-origin via `prepareZXingModule`'s `locateFile` override)
     rather than left on its default jsDelivr CDN fetch — a POS scanner
     shouldn't depend on a third-party CDN being reachable to decode a
     barcode.
  5. `@ericblade/quagga2` — 1D-barcode specialist using a different
     computer-vision approach again (peak/valley signal analysis); the
     heaviest of the five (its own image-processing pipeline plus a
     canvas→dataURL encode per attempt), so it only starts once nothing
     cheaper already found a result this frame. Pulls in `sharp` as an
     *optional* Node-only dependency for a file-loading code path this
     app never uses — confirmed the bundled browser build
     (`dist/quagga.min.js`, resolved via its `package.json` `browser`
     field) contains zero references to `sharp`/`ndarray-pixels`, so
     there's no runtime exposure in the shipped app. It still physically
     installs (with a native postinstall script) in `node_modules` on
     any machine that runs `npm install` here, which is a real if narrow
     supply-chain surface worth knowing about — `npm audit` will flag it.
  All five funnel into one idempotent `succeed(text)` call guarded by a
  shared `stopped` flag, so only the first result wins regardless of
  which decoder(s) eventually resolve.
- **Code-split**: `CameraScanner` is `React.lazy()`-loaded from
  `BarcodeInput.tsx`, not statically imported. Five decoding libraries
  plus a ~1MB WASM binary is too much to add to every page's initial
  bundle — it's only fetched the first time a user taps the camera
  button. (This dropped the main bundle from ~850KB to ~370KB when
  introduced.)

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
