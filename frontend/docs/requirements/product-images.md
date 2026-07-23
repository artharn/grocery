# Requirements — Product Images (Frontend Phase 7)

Source: user request to display product images, backed by
`grocery-api`'s new `image_url` field on `products`
(`grocery-api/docs/requirements/product-crud.md` addendum, migration
`009_add_image_url_to_products.sql`).

**Deliberate scope for this phase**: the user confirmed images are
supplied as a URL for now, with device-upload planned for a later phase.
The frontend is built against that plan: every place that reads
`product.image_url` just renders `<img src={...}>` — when upload lands,
only the *write* side (an upload control producing a URL to hand to the
same form field) changes, not the display code.

## Acceptance criteria

1. **Product form** (`features/products/pages/ProductForm.tsx`, both
   create and edit): a new "Image URL" text input, optional, alongside
   the existing fields. A live thumbnail preview appears next to/below the
   field once a value is entered, so a bad URL is visible immediately
   rather than only after saving. An image that fails to load (bad URL,
   404, CORS-blocked host) shows a clear broken-image placeholder in the
   preview, not a silently blank box.
2. **Product list** (`features/products/pages/ProductList.tsx`): a small
   thumbnail per row (desktop table) / per card (mobile), to the left of
   the name. Products without an `image_url` show a neutral placeholder
   icon in the same slot — the layout doesn't shift based on whether a
   given product has an image.
3. **Sales POS and Inventory picker lists** (`features/sales/pages/
   SalesPos.tsx`, `features/inventory/pages/Inventory.tsx`): the same
   small thumbnail/placeholder pattern in the scan-filtered quick-pick
   rows, since visually confirming "is this the right product" at a
   counter is the actual value of showing an image at all — restricting
   this to the admin-only Products page would miss the point.
4. A broken/failed image load anywhere in the app (list thumbnail, cart
   line, etc.) falls back to the same neutral placeholder rather than a
   browser's default broken-image icon — one visual language app-wide.
5. Mobile: thumbnails are small and fixed-size everywhere (no layout
   reflow while an image loads or fails).

## Out of scope (this phase)

- File upload from device — explicitly deferred to a later phase per the
  user's own framing; this phase is URL-only.
- Image cropping/resizing/optimization — the browser renders whatever the
  URL serves, at a fixed small display size via CSS only.
- Multiple images per product — the backend has exactly one `image_url`
  column, singular.
