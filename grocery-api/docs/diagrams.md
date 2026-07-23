# Grocery POS — Diagrams

Architecture/relationship and sequence diagrams for `grocery-api`. Split
out from `docs/hld-api-spec.md` to keep the API reference (request/
response shapes, status codes, `curl` examples) separate from the
visual/behavioral design. For endpoint-by-endpoint detail — request
bodies, error codes, permission codes — see the HLD (API Spec).

---

## 1. API Relationship Diagram

How the endpoint groups depend on each other and on the underlying
tables:

```mermaid
flowchart TD
    Login["POST /auth/login"] --> Token(["JWT access + refresh token"])
    Token -->|Bearer required| Me["GET /auth/me"]
    Token -->|Bearer required| Products
    Token -->|Bearer required| Stock
    Token -->|Bearer required| Sales
    Token -->|Bearer required| Dashboard["GET /dashboard/metrics"]
    Token -->|Bearer required| Reports

    subgraph Products["Products"]
        direction TB
        PList["GET /products"]
        PGet["GET /products/:id"]
        PCreate["POST /products"]
        PUpdate["PUT /products/:id"]
        PDelete["DELETE /products/:id"]
    end

    subgraph Stock["Inventory"]
        direction TB
        SBalance["GET /products/:id/stock"]
        SList["GET /products/:id/stock-transactions"]
        SCreate["POST /products/:id/stock-transactions"]
    end

    subgraph Sales["Sales"]
        direction TB
        SaCreate["POST /sales"]
        SaList["GET /sales"]
        SaGet["GET /sales/:id"]
    end

    subgraph Reports["Reports"]
        direction TB
        RSales["GET /reports/sales"]
        RProducts["GET /reports/products"]
    end

    ProductsTbl[("products")]
    StockTbl[("stock_transactions")]
    SalesTbl[("sales")]
    SaleItemsTbl[("sale_items")]

    PCreate -.writes.-> ProductsTbl
    PUpdate -.writes.-> ProductsTbl
    PDelete -.soft-delete.-> ProductsTbl
    SCreate -.locks + reads.-> ProductsTbl
    SCreate -.writes.-> StockTbl
    SBalance -.SUM quantity.-> StockTbl

    SaCreate -.locks + reads price.-> ProductsTbl
    SaCreate -.writes SALE-type row.-> StockTbl
    SaCreate -.writes.-> SalesTbl
    SaCreate -.writes.-> SaleItemsTbl

    Dashboard -.aggregates.-> SalesTbl
    Dashboard -.aggregates.-> ProductsTbl
    Dashboard -.aggregates.-> StockTbl
    RSales -.aggregates.-> SalesTbl
    RProducts -.aggregates.-> SaleItemsTbl
```

---

## 2. Sequence Diagrams

One sequence diagram per domain, each covering **every** success and
error branch documented for its endpoints (400/401/403/404/409) — not
just the happy path. `alt`/`par` blocks show every user case; `C` =
Client, `API` = grocery-api, `DB` = Postgres. Bearer-token validation
(`401` on missing/invalid/expired token) is identical on every
authenticated call and shown once in §2.1 rather than repeated in every
later diagram.

### 2.1 Authentication — `POST /auth/login`, `GET /auth/me`

```mermaid
sequenceDiagram
    participant C as Client
    participant API as grocery-api
    participant DB as Postgres

    rect rgb(240, 248, 255)
    Note over C,DB: Login
    C->>API: POST /auth/login {username, password}
    alt missing/empty username or password
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: SELECT user WHERE username
        alt user not found, or is_active = false
            API-->>C: 401 UNAUTHORIZED
        else bcrypt.compare fails
            API-->>C: 401 UNAUTHORIZED
        else success
            API->>API: sign JWT (access + refresh)
            API-->>C: 200 {accessToken, refreshToken, user}
        end
    end
    end

    rect rgb(240, 248, 255)
    Note over C,DB: Every other endpoint in this spec starts here
    C->>API: any request + Authorization: Bearer token
    alt header missing/malformed, or token invalid/expired
        API-->>C: 401 UNAUTHORIZED
    else GET /auth/me specifically
        API-->>C: 200 {user}
    else valid token, continues to route-specific logic below
        API->>API: req.user = {id, username, roleId}
    end
    end
```

### 2.2 Products — CRUD

```mermaid
sequenceDiagram
    participant C as Client
    participant API as grocery-api
    participant DB as Postgres

    rect rgb(240, 255, 240)
    Note over C,DB: Browse (auth only, no permission needed)
    C->>API: GET /products [?includeInactive]
    API->>DB: SELECT * FROM products [WHERE is_active]
    API-->>C: 200 {products}

    C->>API: GET /products/:id
    API->>DB: SELECT * FROM products WHERE id
    alt not found
        API-->>C: 404 NOT_FOUND
    else found
        API-->>C: 200 {product}
    end
    end

    rect rgb(255, 250, 240)
    Note over C,DB: Create — requires PRODUCT_CREATE
    C->>API: POST /products {name, price, barcode?, cost?}
    alt caller lacks PRODUCT_CREATE
        API-->>C: 403 FORBIDDEN
    else invalid body
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: INSERT INTO products
        alt barcode already in use
            API-->>C: 400 VALIDATION_ERROR (unique violation)
        else success
            API-->>C: 201 {product}
        end
    end
    end

    rect rgb(255, 245, 245)
    Note over C,DB: Update — requires PRODUCT_UPDATE, partial update
    C->>API: PUT /products/:id {fields...}
    alt caller lacks PRODUCT_UPDATE
        API-->>C: 403 FORBIDDEN
    else no fields supplied, or a field is invalid
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: SELECT product WHERE id
        alt not found
            API-->>C: 404 NOT_FOUND
        else
            API->>DB: UPDATE products SET ...
            API-->>C: 200 {product}
        end
    end
    end

    rect rgb(245, 245, 255)
    Note over C,DB: Soft delete — requires PRODUCT_DELETE, idempotent
    C->>API: DELETE /products/:id
    alt caller lacks PRODUCT_DELETE
        API-->>C: 403 FORBIDDEN
    else
        API->>DB: SELECT product WHERE id
        alt not found
            API-->>C: 404 NOT_FOUND
        else
            API->>DB: UPDATE products SET is_active = FALSE
            API-->>C: 200 {product}
        end
    end
    end
```

### 2.3 Inventory (Stock)

```mermaid
sequenceDiagram
    participant C as Client
    participant API as grocery-api
    participant DB as Postgres

    rect rgb(240, 255, 240)
    Note over C,DB: Read balance / history (auth only)
    C->>API: GET /products/:id/stock
    API->>DB: SELECT product WHERE id
    alt not found
        API-->>C: 404 NOT_FOUND
    else
        API->>DB: SUM(stock_transactions.quantity)
        API-->>C: 200 {productId, balance}
    end

    C->>API: GET /products/:id/stock-transactions
    API->>DB: SELECT product WHERE id
    alt not found
        API-->>C: 404 NOT_FOUND
    else
        API->>DB: SELECT ledger WHERE product_id ORDER BY created_at DESC
        API-->>C: 200 {transactions}
    end
    end

    rect rgb(255, 250, 240)
    Note over C,DB: Record a movement — requires STOCK_ADJUST
    C->>API: POST /products/:id/stock-transactions {type, quantity, note?}
    alt caller lacks STOCK_ADJUST
        API-->>C: 403 FORBIDDEN
    else type = SALE, or invalid type/quantity
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: BEGIN
        API->>DB: SELECT product FOR UPDATE
        alt product not found
            API->>DB: ROLLBACK
            API-->>C: 404 NOT_FOUND
        else product.is_active = false
            API->>DB: ROLLBACK
            API-->>C: 409 CONFLICT (inactive product)
        else
            API->>DB: SUM(quantity) → currentBalance
            alt currentBalance + signedQuantity < 0
                API->>DB: ROLLBACK
                API-->>C: 409 CONFLICT (insufficient stock)
            else
                API->>DB: INSERT stock_transactions
                API->>DB: COMMIT
                API-->>C: 201 {transaction, balance}
            end
        end
    end
    end
```

### 2.4 Sales (Checkout)

The most consequential multi-table interaction in the system — every
item in one sale shares a single DB transaction, so any item's failure
rolls back the entire sale, including stock already deducted for earlier
items in the same request.

```mermaid
sequenceDiagram
    participant C as Client
    participant API as grocery-api
    participant DB as Postgres

    rect rgb(255, 250, 240)
    Note over C,DB: Checkout — requires SALE_CREATE
    C->>API: POST /sales {items:[{productId, quantity}, ...]}
    alt caller lacks SALE_CREATE
        API-->>C: 403 FORBIDDEN
    else items empty/malformed
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: BEGIN
        loop each item
            API->>DB: SELECT product FOR UPDATE (lock + read price)
            alt product not found
                API->>DB: ROLLBACK
                API-->>C: 404 NOT_FOUND (whole sale rejected)
            else product.is_active = false
                API->>DB: ROLLBACK
                API-->>C: 409 CONFLICT (whole sale rejected)
            else
                API->>DB: SUM(stock_transactions.quantity) → balance
                alt balance - quantity < 0
                    API->>DB: ROLLBACK
                    API-->>C: 409 CONFLICT (insufficient stock, whole sale rejected)
                else
                    API->>DB: INSERT stock_transactions (type=SALE, quantity=-N)
                end
            end
        end
        API->>DB: INSERT sales (sale_no, total_amount)
        API->>DB: INSERT sale_items (price snapshot from locked read)
        API->>DB: COMMIT
        API-->>C: 201 {sale, items}
    end
    end

    rect rgb(240, 255, 240)
    Note over C,DB: Read paths (auth only)
    C->>API: GET /sales
    API->>DB: SELECT sales ORDER BY created_at DESC
    API-->>C: 200 {sales}

    C->>API: GET /sales/:id
    API->>DB: SELECT sale + JOIN sale_items
    alt not found
        API-->>C: 404 NOT_FOUND
    else
        API-->>C: 200 {sale with items}
    end
    end
```

### 2.5 Dashboard & Reports

```mermaid
sequenceDiagram
    participant C as Client
    participant API as grocery-api
    participant DB as Postgres

    rect rgb(240, 255, 240)
    Note over C,DB: Dashboard — requires DASHBOARD_VIEW
    C->>API: GET /dashboard/metrics
    alt caller lacks DASHBOARD_VIEW
        API-->>C: 403 FORBIDDEN
    else
        par
            API->>DB: today's sales count + total (UTC day)
        and
            API->>DB: active product count
        and
            API->>DB: out-of-stock active products
        and
            API->>DB: top 5 products by quantity sold
        end
        API-->>C: 200 {todaySales, totalActiveProducts, outOfStockProducts, topProducts}
    end
    end

    rect rgb(255, 250, 240)
    Note over C,DB: Reports — require REPORT_VIEW, startDate & endDate required
    C->>API: GET /reports/sales?startDate&endDate
    alt caller lacks REPORT_VIEW
        API-->>C: 403 FORBIDDEN
    else missing/invalid dates, or startDate > endDate
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: totals + daily breakdown WHERE date BETWEEN
        API-->>C: 200 {totalSales, totalRevenue, dailyBreakdown}
    end

    C->>API: GET /reports/products?startDate&endDate
    alt caller lacks REPORT_VIEW
        API-->>C: 403 FORBIDDEN
    else missing/invalid dates, or startDate > endDate
        API-->>C: 400 VALIDATION_ERROR
    else
        API->>DB: per-product qty/revenue WHERE date BETWEEN, ORDER BY revenue DESC
        API-->>C: 200 {products}
    end
    end
```
