# Requirements — Products (Frontend Phase 2)

Source: user request (product catalog features + "รองรับการต่ออุปกรณ์
เพิ่อแสกน barcode หรือเปิดกล้องเพื่อแสดง qr เพื่อบันทึกหรือค้นหาสินค้า" —
support a barcode scanner device or camera/QR to record or search
products) mapped onto `grocery-api`'s product endpoints
(`docs/hld-api-spec.md` §4).

This is the first phase that needs the shared barcode/QR input from
`fe-standard.md` §5 — both "search by barcode" (list page) and "fill
barcode when registering a product" (create/edit form) reuse the same
`BarcodeInput` component.

## Acceptance criteria

1. `GET /products` — list page shows all active products by default
   (name, barcode, price, cost). A toggle switches to "show inactive
   too" (`?includeInactive=true`), per the API's own default.
2. **Barcode search**: a `BarcodeInput` at the top of the list filters
   the loaded products by barcode/name as you type, and also accepts a
   camera scan (via `CameraScanner`) that fills the same field — either
   input mode narrows the same list, client-side, no extra API call
   (the list is already loaded).
3. **Create** (`POST /products`, requires `PRODUCT_CREATE`): a form
   with `name` (required), `price` (required, ≥0), `barcode` (optional,
   unique — via `BarcodeInput` so it can be scanned instead of typed),
   `cost` (optional, ≥0). Client-side validation mirrors the backend's
   rules (required/≥0) so obviously-invalid input never round-trips;
   the backend's actual error (e.g. "barcode is already in use") is
   still shown verbatim on submit, since the backend is the real
   authority (e.g. race conditions on uniqueness).
4. **Edit** (`PUT /products/:id`, requires `PRODUCT_UPDATE`): same form,
   pre-filled, partial update — only changed fields are sent.
5. **Soft delete** (`DELETE /products/:id`, requires `PRODUCT_DELETE`):
   a confirm step (in-app, not the native `window.confirm` — matches
   the app's own visual language and doesn't block automated testing)
   before calling the API. Deactivated products drop out of the default
   list immediately (query invalidation), reappear when "show inactive"
   is on.
6. Any 403 (user's role lacks the permission) surfaces as a clear inline
   message on the specific action attempted — per the Phase 1 decision,
   buttons are shown to everyone and failures are reactive, not hidden
   proactively.
7. Mobile: the product table becomes a stacked card list below tablet
   width — a wide table is unusable on a phone screen.

## Barcode/camera scanning specifics

- `BarcodeInput`: text field + camera icon button, per `fe-standard.md`
  §5. Auto-focused on the list page so a hardware scanner can be used
  immediately without clicking into the field first.
- `CameraScanner`: modal, requests camera permission, decodes both QR
  and 1D barcodes via `html5-qrcode`, calls back with the decoded text
  and closes. Shows a clear message if camera permission is denied or
  no camera is available — never a silent failure.

## Known gap discovered during implementation

There is no way to reactivate a soft-deleted product anywhere in the
backend API — `PUT /products/:id` explicitly excludes `is_active`, and
no other endpoint touches it (confirmed against
`grocery-api/src/services/product.service.js` and the validator — no
`is_active` handling in the update path at all). The confirm dialog
before deactivating says so explicitly rather than implying it's
reversible. This is a backend gap, not a frontend limitation — worth a
`PUT /products/:id/reactivate` or similar if this app needs it later.

## Out of scope (this phase)

- Stock/inventory view or adjustment from this page — that's a separate
  phase (stock endpoints are `/products/:id/stock*`, a distinct feature
  area per `fe-standard.md` §1).
- Bulk import, product categories — not in the backend API at all.
- Pagination — the backend doesn't paginate `GET /products` either
  (`be-standard.md` §1 decision), so there's nothing to paginate against.
