# Requirements — Sales / POS (Frontend Phase 3)

Source: original request ("รองรับการต่ออุปกรณ์เพื่อแสกน barcode หรือเปิดกล้อง
เพื่อแสดง qr เพื่อบันทึกหรือค้นหาสินค้า") applied to the checkout flow, mapped
onto `grocery-api`'s sales endpoints (`docs/hld-api-spec.md` §6) and the
scan-to-add pattern anticipated by `fe-standard.md` §5 ("stock adjustment,
sales/POS cart").

This phase reuses `BarcodeInput`/`CameraScanner` from Phase 2 but needs one
addition: an `onSubmit` (Enter-key) callback, because a POS cart must treat a
complete scan as "add this item now," not just "narrow a filter" (which is
how Products' search field uses the same component). `onChange` still fires
per keystroke for live filtering; `onSubmit` is new and optional, so Products
is unaffected.

## Acceptance criteria

1. **Scan/type-to-add**: a `BarcodeInput` at the top of the page, auto-focused.
   - Typing narrows a live-filtered list of active products (by barcode or
     name substring) shown below as tappable rows — same interaction as
     Products' search, for manual/no-scanner use.
   - A hardware scanner's terminating Enter, or a camera scan (which fills
     the field and is itself a "complete code" event), adds the *exact*
     barcode match to the cart immediately (or increments its quantity by 1
     if already in the cart) and clears the field for the next scan — a
     cashier should be able to scan item after item without touching the
     screen.
   - No exact match on submit: field is left as-is with an inline "no
     product with that barcode" message (not a silent no-op) so a bad scan
     is visible.
2. **Cart**: each line shows name, unit price (live catalog price, display
   only — the backend resolves the authoritative price at checkout,
   `hld-api-spec.md` §6), quantity (+/− stepper, min 1; 0 removes the line),
   and a computed line subtotal. A running total is always visible.
3. **Checkout** (`POST /sales`, requires `SALE_CREATE`): sends
   `{ items: [{ productId, quantity }] }` for the current cart. Disabled
   while the cart is empty or a checkout is already in flight (no
   double-submit).
4. **Receipt**: on success, replace the cart view with the server's actual
   response (`sale_no`, per-item server-resolved `price`/`subtotal`,
   `total_amount`) — not the client's pre-checkout estimate, since the two
   can legitimately differ (e.g. a price changed between load and checkout).
   A "New sale" action clears the receipt and starts an empty cart.
5. **Rejection is whole-sale, atomic** (per the backend): a 409 (inactive
   product or insufficient stock for *any* line) or 404 (a product was
   deleted from under the cart) shows the backend's message inline and
   leaves the cart exactly as it was — nothing is partially applied, so
   there's nothing to reconcile client-side. The user edits the offending
   line and retries.
6. **Superseded — see addendum below.** (Original decision, kept for
   history: any 403 (role lacks `SALE_CREATE`) surfaces as a clear inline
   message on the checkout attempt itself, button not hidden proactively.)
7. Mobile: cart lines stack as a simple list (no table) at phone width; the
   scan field and total/checkout bar stay usable one-handed.

## Out of scope (this phase)

- Sale history / receipt lookup (`GET /sales`, `GET /sales/:id`) — belongs
  with Reports, not the checkout flow itself.
- Stock viewing/adjustment UI — separate Inventory phase
  (`/products/:id/stock*`).
- Editing or voiding a completed sale — no such endpoint exists in the
  backend at all.

## Addendum — proactive permission hiding, loading state, and scan-to-create (post-launch)

Source: two follow-up bug reports. First, "scan does nothing" — traced to
two independent causes: (a) `CameraScanner`'s decode callback restarting
the camera stream on every unrelated re-render (fixed by holding it in a
ref instead of a `useEffect` dependency), and (b) `handleScanSubmit`
silently no-op-ing (`if (!code || !products) return`) when the product
list query hadn't resolved yet — most reproducible with a fast hardware
scanner used right after page load, before `useProducts` finishes. Second,
a request that a scan with no matching product should offer to create one,
gated by permission, mirroring the proactive-hiding pattern from
`auth-and-shell.md`'s addendum.

1. **Checkout button** is now hidden without `SALE_CREATE` (supersedes
   criterion 6 above), consistent with the rest of the app's proactive
   permission hiding — reactive 403 remains the real enforcement, this is
   UX only.
2. **Loading state**: `BarcodeInput` accepts a `loading` prop and shows a
   spinner (without disabling the field, so a fast scan mid-load is never
   dropped). `handleScanSubmit` checks `isLoading` from `useProducts`
   before searching and shows `sales.stillLoading` instead of silently
   returning when the catalog isn't ready yet.
3. **Not-found → offer to create**: on no exact barcode match, the inline
   error also gets a "+ Create product with this barcode" action when the
   user has `PRODUCT_CREATE` — absent for anyone without it, so a cashier
   without the permission just sees the plain not-found message. The
   action opens the shared `ProductForm` (promoted from `features/products/`
   to `components/`, per `fe-standard.md` §1/§7, since it's now opened by
   Products, Sales, and Inventory) with the scanned code prefilled as the
   barcode. On save, the new product is added straight to the cart — no
   dead end where the user has to re-scan what they just created.
