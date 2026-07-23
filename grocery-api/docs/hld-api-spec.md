# Grocery POS — HLD: API Specification

Covers every endpoint implemented across Phase 1–4, as of the current
`grocery-api` codebase. Ground truth is the route files
(`src/routes/*.js`); this document mirrors them.

`curl` examples below assume the local Docker Compose stack
(`http://localhost` via nginx, port 80 — nginx proxies everything at
root to `api:3000`, so `http://localhost:3000` works identically). Set
`$ACCESS_TOKEN` from a login response before running any authenticated
example: `export ACCESS_TOKEN=<accessToken>`.

Architecture/relationship flowchart and the per-domain sequence diagrams
(covering every success and error branch, not just the happy path) live
in a separate doc: `docs/diagrams.md`.

---

## 1. Conventions

- **Base path**: routes are mounted at the app root (no `/api` prefix).
- **Auth header**: `Authorization: Bearer <accessToken>` on every
  endpoint except `POST /auth/login` and `GET /health`.
- **Response envelope** (`be-standard.md` §5), used on every endpoint
  except `/health`:
  ```json
  // success
  { "success": true, "data": { ... } }
  // error
  { "success": false, "error": { "code": "...", "message": "..." } }
  ```
- **Error codes**:

  | HTTP | code | Meaning |
  |---|---|---|
  | 400 | `VALIDATION_ERROR` | malformed/missing request input |
  | 401 | `UNAUTHORIZED` | missing/invalid/expired token, or bad credentials |
  | 403 | `FORBIDDEN` | authenticated, but caller's role lacks the required permission |
  | 404 | `NOT_FOUND` | resource doesn't exist |
  | 409 | `CONFLICT` | valid request, but violates current state (stock would go negative, product inactive, etc.) |
  | 500 | `INTERNAL_ERROR` | unexpected server error (never leaks stack trace/SQL) |

- **Permission codes** (checked against `role_permissions` per request,
  not cached in the JWT):

  | Code | Gates |
  |---|---|
  | `PRODUCT_CREATE` | `POST /products` |
  | `PRODUCT_UPDATE` | `PUT /products/:id` |
  | `PRODUCT_DELETE` | `DELETE /products/:id` |
  | `STOCK_ADJUST` | `POST /products/:productId/stock-transactions` |
  | `SALE_CREATE` | `POST /sales` |
  | `DASHBOARD_VIEW` | `GET /dashboard/metrics` |
  | `REPORT_VIEW` | `GET /reports/sales`, `GET /reports/products` |

  All other authenticated endpoints (every `GET` except dashboard/reports)
  require only a valid token — no specific permission.

- **JWT payload** (both access and refresh tokens):
  ```json
  { "sub": 1, "username": "qa_owner", "roleId": 1, "iat": ..., "exp": ... }
  ```

---

## 2. Health

### `GET /health`
No auth. Infra probe — exempt from the standard envelope.

```bash
curl http://localhost/health
```

Success `200`:
```json
{ "status": "OK", "database": "CONNECTED With apply env", "time": "<timestamptz>" }
```
Failure `500`: `{ "status": "ERROR", "database": "DISCONNECTED", "message": "..." }`

---

## 3. Auth

### `POST /auth/login`
No auth required.

```bash
curl -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"<username>","password":"<password>"}'
```

| Status | code | When |
|---|---|---|
| 200 | — | valid credentials, `is_active = true` |
| 400 | `VALIDATION_ERROR` | missing/empty `username` or `password` |
| 401 | `UNAUTHORIZED` | unknown user, wrong password, or inactive — same message for all three |

Success `200`:
```json
{ "success": true, "data": {
  "accessToken": "<jwt>", "refreshToken": "<jwt>",
  "user": { "id": 1, "username": "qa_owner", "roleId": 1 }
} }
```

### `GET /auth/me`
Auth required, no specific permission.

```bash
curl http://localhost/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`: `{ "success": true, "data": { "user": { "id", "username", "roleId" } } }`
| 401 | `UNAUTHORIZED` | missing/malformed header, invalid/expired token |

---

## 4. Products

### `GET /products`
Auth only. Query: `?includeInactive=true` (default excludes inactive).

```bash
curl http://localhost/products \
  -H "Authorization: Bearer $ACCESS_TOKEN"

curl "http://localhost/products?includeInactive=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`: `{ "success": true, "data": { "products": [ {product}, ... ] } }`

Product shape: `{ id, barcode, name, price, cost, is_active, created_at, updated_at }`

### `GET /products/:id`
Auth only. Returns regardless of `is_active`.

```bash
curl http://localhost/products/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

| 400 | `VALIDATION_ERROR` | `id` not a positive integer |
| 404 | `NOT_FOUND` | no such product |

### `POST /products`
Auth + `PRODUCT_CREATE`.

```bash
curl -X POST http://localhost/products \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rice 5kg","price":120,"barcode":"BC-001","cost":90}'
```

Request: `{ "name": "string ≤255", "price": "number ≥0", "barcode?": "string ≤100 unique", "cost?": "number ≥0" }`
| 201 | — | created, `is_active` defaults `true` |
| 400 | `VALIDATION_ERROR` | missing/invalid `name`/`price`/`barcode`/`cost` |
| 400 | `VALIDATION_ERROR` | `barcode` already in use (unique constraint) |
| 401/403 | — | missing token / lacking `PRODUCT_CREATE` |

### `PUT /products/:id`
Auth + `PRODUCT_UPDATE`. Partial update — any subset of `name`/`price`/`barcode`/`cost`. `is_active` not settable here.

```bash
curl -X PUT http://localhost/products/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"price":130}'
```

| 200 | — | updated |
| 400 | `VALIDATION_ERROR` | no fields supplied, or a supplied field is invalid |
| 404 | `NOT_FOUND` | no such product |

### `DELETE /products/:id`
Auth + `PRODUCT_DELETE`. **Soft delete** (`is_active = false`) — row is never removed. Idempotent: deleting an already-inactive product succeeds.

```bash
curl -X DELETE http://localhost/products/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

| 200 | — | now inactive |
| 404 | `NOT_FOUND` | no such product |

---

## 5. Inventory (Stock)

### `GET /products/:productId/stock`
Auth only. Works for inactive products too (historical stock stays viewable).

```bash
curl http://localhost/products/1/stock \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`: `{ "success": true, "data": { "productId": 1, "balance": 12 } }`
| 404 | `NOT_FOUND` | no such product |

### `GET /products/:productId/stock-transactions`
Auth only. Full ledger for the product, newest first.

```bash
curl http://localhost/products/1/stock-transactions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`: `{ "success": true, "data": { "transactions": [ {tx}, ... ] } }`

Transaction shape: `{ id, product_id, type, quantity, note, created_by, created_at }`

### `POST /products/:productId/stock-transactions`
Auth + `STOCK_ADJUST`.

```bash
curl -X POST http://localhost/products/1/stock-transactions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"IN","quantity":50,"note":"initial stock"}'
```

Request: `{ "type": "IN" | "OUT" | "ADJUST", "quantity": "integer", "note?": "string" }`
- `IN` / `OUT`: `quantity` must be a **positive** integer (magnitude); stored signed (`+`/`-`) internally.
- `ADJUST`: `quantity` may be any nonzero integer, positive or negative.
- `type: "SALE"` is rejected — system-generated only, via `POST /sales`.

| 201 | — | recorded; response includes the new running `balance` |
| 400 | `VALIDATION_ERROR` | invalid `type`/`quantity`, or `type: "SALE"` |
| 404 | `NOT_FOUND` | no such product |
| 409 | `CONFLICT` | product inactive, or would drive balance below 0 |

---

## 6. Sales

### `POST /sales`
Auth + `SALE_CREATE`. **Atomic**: one DB transaction locks every referenced product, resolves price server-side (client-supplied price ignored), deducts stock, writes the sale — or none of it happens.

```bash
curl -X POST http://localhost/sales \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":2},{"productId":2,"quantity":1}]}'
```

Request: `{ "items": [ { "productId": 1, "quantity": 2 }, ... ] }` (non-empty array; each item positive-integer `productId`/`quantity`)

| 201 | — | sale created |
| 400 | `VALIDATION_ERROR` | empty/malformed `items` |
| 404 | `NOT_FOUND` | an item's `productId` doesn't exist — whole sale rejected |
| 409 | `CONFLICT` | an item's product is inactive, or insufficient stock — whole sale rejected |

Success `201`:
```json
{ "success": true, "data": {
  "sale": { "id", "sale_no", "total_amount", "created_by", "created_at" },
  "items": [ { "id", "sale_id", "product_id", "quantity", "price", "subtotal" }, ... ]
} }
```
`sale_no` format: `SALE-YYYYMMDD-XXXXXX` (server-generated, unique).

### `GET /sales`
Auth only. Newest first.

```bash
curl http://localhost/sales \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`: `{ "success": true, "data": { "sales": [ {sale}, ... ] } }`

### `GET /sales/:id`
Auth only. Includes line items.

```bash
curl http://localhost/sales/1 \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

| 404 | `NOT_FOUND` | no such sale |

---

## 7. Dashboard

### `GET /dashboard/metrics`
Auth + `DASHBOARD_VIEW`.

```bash
curl http://localhost/dashboard/metrics \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`:
```json
{ "success": true, "data": {
  "todaySales": { "count": 0, "totalAmount": 0 },
  "totalActiveProducts": 0,
  "outOfStockProducts": [ { "id", "name" } ],
  "topProducts": [ { "productId", "name", "totalQuantitySold" } ]
} }
```
- `todaySales`: UTC calendar-day boundary.
- `outOfStockProducts`: active products with balance `≤ 0`.
- `topProducts`: top 5 by all-time quantity sold, descending.

---

## 8. Reports

### `GET /reports/sales?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
Auth + `REPORT_VIEW`. Both params **required**, inclusive range.

```bash
curl "http://localhost/reports/sales?startDate=2026-07-01&endDate=2026-07-23" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

| 400 | `VALIDATION_ERROR` | missing/malformed date, or `startDate > endDate` |

Success `200`:
```json
{ "success": true, "data": {
  "startDate": "...", "endDate": "...",
  "totalSales": 0, "totalRevenue": 0,
  "dailyBreakdown": [ { "date", "count", "revenue" } ]
} }
```
`dailyBreakdown` omits days with zero sales (not zero-padded).

### `GET /reports/products?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
Auth + `REPORT_VIEW`. Same validation as above.

```bash
curl "http://localhost/reports/products?startDate=2026-07-01&endDate=2026-07-23" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Success `200`:
```json
{ "success": true, "data": {
  "startDate": "...", "endDate": "...",
  "products": [ { "productId", "name", "quantitySold", "revenue" } ]
} }
```
Ordered by `revenue` descending; only products with ≥1 sale in range appear.

---

## 9. Endpoint Index

| Method | Path | Auth | Permission |
|---|---|---|---|
| GET | `/health` | — | — |
| POST | `/auth/login` | — | — |
| GET | `/auth/me` | ✓ | — |
| GET | `/products` | ✓ | — |
| GET | `/products/:id` | ✓ | — |
| POST | `/products` | ✓ | `PRODUCT_CREATE` |
| PUT | `/products/:id` | ✓ | `PRODUCT_UPDATE` |
| DELETE | `/products/:id` | ✓ | `PRODUCT_DELETE` |
| GET | `/products/:productId/stock` | ✓ | — |
| GET | `/products/:productId/stock-transactions` | ✓ | — |
| POST | `/products/:productId/stock-transactions` | ✓ | `STOCK_ADJUST` |
| POST | `/sales` | ✓ | `SALE_CREATE` |
| GET | `/sales` | ✓ | — |
| GET | `/sales/:id` | ✓ | — |
| GET | `/dashboard/metrics` | ✓ | `DASHBOARD_VIEW` |
| GET | `/reports/sales` | ✓ | `REPORT_VIEW` |
| GET | `/reports/products` | ✓ | `REPORT_VIEW` |

17 endpoints total.
