# 外送系統 資料模型設計文件 (Data Model Design Document)

- **文件版本**：v1.0.0
- **建立日期**：2026-07-16
- **撰寫人**：AI 資料模型設計小助手 (data-modeler)
- **依據需求版本**：`doc/requirements.md` v1.0.0
- **依據架構版本**：`doc/architecture.md` v1.0.0

---

## 1. 實體關係圖 (Entity Relationship Diagram)
以下為系統的關聯式資料庫實體關係圖 (ERD)：

```mermaid
erDiagram
    USERS ||--o{ RESTAURANTS : manages
    USERS ||--o{ ORDERS : places
    USERS ||--o{ ORDERS : delivers
    RESTAURANTS ||--o{ PRODUCTS : offers
    RESTAURANTS ||--o{ ORDERS : receives
    ORDERS ||--o{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : detailed_by

    USERS {
        int id PK
        string email UNIQUE
        string password_hash
        string role
        timestamp created_at
        timestamp deleted_at
    }
    RESTAURANTS {
        int id PK
        int user_id FK
        string name
        string address
        string description
        timestamp created_at
        timestamp deleted_at
    }
    PRODUCTS {
        int id PK
        int restaurant_id FK
        string name
        int price
        string description
        boolean is_available
        timestamp created_at
        timestamp deleted_at
    }
    ORDERS {
        int id PK
        int customer_id FK
        int restaurant_id FK
        int rider_id FK
        string address
        int delivery_fee
        int total_amount
        string status
        timestamp created_at
        timestamp updated_at
    }
    ORDER_ITEMS {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        int price_at_order
    }
```

---

## 2. 核心實體清單 (Core Entities)

| 實體/資料表名稱 | 邏輯名稱 | 描述說明 | 主鍵 (PK) |
| :--- | :--- | :--- | :--- |
| `users` | 使用者帳號表 | 儲存平台所有使用者（消費者、商家、外送員）之登入憑證與角色。 | `id` |
| `restaurants` | 商家資料表 | 儲存商家的店名、地址、簡介與所屬帳號關係。 | `id` |
| `products` | 菜單商品表 | 儲存商家上架的所有餐點、價格與供應狀態。 | `id` |
| `orders` | 訂單主表 | 紀錄每一筆外送交易的狀態、金額、地址、消費者、商家與配送外送員。 | `id` |
| `order_items` | 訂單明細表 | 紀錄單筆訂單內，消費者所點購的商品品項、數量與當下單價。 | `id` |

---

## 3. 實體詳細欄位與資料型別 (Entity Fields & Data Types)

### 3.1 實體：`users` (使用者帳號表)
- **說明**：存放三方角色的註冊資訊。

| 欄位名稱 (Physical) | 欄位名稱 (Logical) | 邏輯型別 | SQL 型別建議 | 屬性限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | 使用者 ID | Integer | `INT` / `BIGINT` | PK, Auto Inc, Not Null | 唯一識別碼 |
| `email` | 電子信箱 | String | `VARCHAR(255)` | Unique, Not Null | 登入帳號 |
| `password_hash` | 密碼雜湊值 | String | `VARCHAR(255)` | Not Null | 經 Bcrypt 加密後之密碼值 |
| `role` | 帳號角色 | String | `VARCHAR(20)` | Not Null | 僅允許 'customer', 'merchant', 'rider' |
| `created_at` | 建立時間 | DateTime | `TIMESTAMP` | Not Null, Default NOW | 帳號創立時間 |
| `deleted_at` | 軟刪除時間 | DateTime | `TIMESTAMP` | Nullable | 註銷/停用時間（保留歷史訂單紀錄） |

### 3.2 實體：`restaurants` (商家資料表)
- **說明**：與 `users` 表呈一對一或一對多關係（由 user_id 關聯，role 必須為 merchant）。

| 欄位名稱 (Physical) | 欄位名稱 (Logical) | 邏輯型別 | SQL 型別建議 | 屬性限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | 商家 ID | Integer | `INT` / `BIGINT` | PK, Auto Inc, Not Null | 唯一識別碼 |
| `user_id` | 商家帳號 ID | Integer | `INT` / `BIGINT` | FK (users.id), Not Null | 該店家的擁有者帳號 |
| `name` | 商家名稱 | String | `VARCHAR(100)` | Not Null | 店家招牌名稱 |
| `address` | 商家地址 | String | `VARCHAR(255)` | Not Null | 供外送員取餐之實體地址 |
| `description` | 商家簡介 | String | `TEXT` | Nullable | 店家特色或公告簡介 |
| `created_at` | 建立時間 | DateTime | `TIMESTAMP` | Not Null, Default NOW | 商家創立時間 |
| `deleted_at` | 軟刪除時間 | DateTime | `TIMESTAMP` | Nullable | 商家歇業/下架時間 |

### 3.3 實體：`products` (菜單商品表)
- **說明**：商家底下的單一餐點。

| 欄位名稱 (Physical) | 欄位名稱 (Logical) | 邏輯型別 | SQL 型別建議 | 屬性限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | 商品 ID | Integer | `INT` / `BIGINT` | PK, Auto Inc, Not Null | 唯一識別碼 |
| `restaurant_id` | 所屬商家 ID | Integer | `INT` / `BIGINT` | FK (restaurants.id), Not Null | 關聯所屬商家 |
| `name` | 商品名稱 | String | `VARCHAR(100)` | Not Null | 餐點名稱（如：牛肉麵） |
| `price` | 商品價格 | Integer | `INT` | Not Null | 餐點售價（必須大於等於 0） |
| `description` | 商品描述 | String | `VARCHAR(255)` | Nullable | 餐點成分或口味說明 |
| `is_available` | 供應狀態 | Boolean | `BOOLEAN` | Not Null, Default TRUE | 是否可點購（無庫存時設為 FALSE） |
| `created_at` | 建立時間 | DateTime | `TIMESTAMP` | Not Null, Default NOW | 商品新增時間 |
| `deleted_at` | 軟刪除時間 | DateTime | `TIMESTAMP` | Nullable | 商品永久下架時間 |

### 3.4 實體：`orders` (訂單主表)
- **說明**：記錄外送交易。`rider_id` 在接單前為 NULL。

| 欄位名稱 (Physical) | 欄位名稱 (Logical) | 邏輯型別 | SQL 型別建議 | 屬性限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | 訂單 ID | Integer | `INT` / `BIGINT` | PK, Auto Inc, Not Null | 唯一識別碼 |
| `customer_id` | 消費者 ID | Integer | `INT` / `BIGINT` | FK (users.id), Not Null | 下單消費者帳號 |
| `restaurant_id` | 商家 ID | Integer | `INT` / `BIGINT` | FK (restaurants.id), Not Null | 點餐商家 |
| `rider_id` | 外送員 ID | Integer | `INT` / `BIGINT` | FK (users.id), Nullable | 接單配送之外送員（未接單時為空） |
| `address` | 送餐地址 | String | `VARCHAR(255)` | Not Null | 消費者填寫之實體送餐目的地 |
| `delivery_fee` | 外送費 | Integer | `INT` | Not Null, Default 39 | 固定 39 元外送費 |
| `total_amount` | 訂單總金額 | Integer | `INT` | Not Null | 餐點小計 + 外送費之總額 |
| `status` | 訂單狀態 | String | `VARCHAR(50)` | Not Null, Default 'pending' | 'pending' / 'preparing' / 'ready' / 'delivering' / 'delivered' |
| `created_at` | 建立時間 | DateTime | `TIMESTAMP` | Not Null, Default NOW | 訂單提交時間 |
| `updated_at` | 更新時間 | DateTime | `TIMESTAMP` | Not Null, Default NOW | 狀態最後異動時間 |

### 3.5 實體：`order_items` (訂單明細表)
- **說明**：記錄訂單內的餐點清單，並保存點餐當下的售價以防店家後續改價影響歷史帳目。

| 欄位名稱 (Physical) | 欄位名稱 (Logical) | 邏輯型別 | SQL 型別建議 | 屬性限制 | 說明 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | 明細 ID | Integer | `INT` / `BIGINT` | PK, Auto Inc, Not Null | 唯一識別碼 |
| `order_id` | 訂單 ID | Integer | `INT` / `BIGINT` | FK (orders.id), Not Null | 所屬訂單 |
| `product_id` | 商品 ID | Integer | `INT` / `BIGINT` | FK (products.id), Not Null | 點購之商品 |
| `quantity` | 購買數量 | Integer | `INT` | Not Null | 必須大於 0 |
| `price_at_order` | 點購時單價 | Integer | `INT` | Not Null | 鎖定點購當下價格 |

---

## 4. 資料驗證規則 (Data Validation Rules)
- **電子信箱 (`users.email`)**：
  - 格式限制：必須符合標準 Email 正則表達式（例如：`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`）。
- **角色型別 (`users.role`)**：
  - 值域限制：僅允許為 `customer` (消費者)、`merchant` (合作商家)、`rider` (外送員)。
- **訂單狀態 (`orders.status`)**：
  - 值域限制：必須在 `pending`、`preparing`、`ready`、`delivering`、`delivered` 狀態集中流轉。
  - 狀態流轉驗證（狀態機限制）：
    - `pending` ➡️ `preparing` (由商家接單觸發)
    - `preparing` ➡️ `ready` (由商家餐點完成觸發)
    - `ready` ➡️ `delivering` (由外送員點擊接單觸發，且此時 `rider_id` 必須從空值更新為該外送員 ID)
    - `delivering` ➡️ `delivered` (由外送員確認送達並收款觸發)
- **商品定價與數量 (`products.price`, `order_items.quantity`)**：
  - 值域限制：商品定價與訂購數量皆必須為非負整數，且數量必須大於 0。

---

## 5. 索引建議 (Index Recommendations)

| 資料表 | 索引名稱 | 索引欄位 | 索引類型 | 建立理由/主要查詢場景 |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `idx_users_email` | `email` | UNIQUE | 用於登入認證，加快帳號檢索速度。 |
| `orders` | `idx_orders_status_rider` | `status`, `rider_id` | COMPOSITE | 外送大廳頻繁查詢「狀態為 `ready` 且 `rider_id` 為空」的待接訂單。 |
| `orders` | `idx_orders_customer` | `customer_id` | SINGLE | 用於消費者端頻繁查詢「我的歷史訂單與進度」。 |
| `products` | `idx_products_restaurant` | `restaurant_id` | SINGLE | 用於消費者點進某商家時，快速載入該店家的菜單。 |

---

## 6. 資料生命週期 (Data Lifecycle)
- **軟刪除機制 (Soft Delete)**：
  - `users`、`restaurants` 與 `products` 均配有 `deleted_at` 欄位。當使用者註銷、商家關閉或商品下架時，資料庫並不實際執行 `DELETE`，而是標記 `deleted_at = NOW()`。
  - 理由：防止歷史訂單（`orders` 及 `order_items`）因關聯實體被實體刪除而造成外鍵失效、破壞報表完整性。
- **訂單結案保護**：
  - 狀態為 `delivered` 的訂單，其資料便不再允許任何 API 對其進行修改，僅供歷史查詢。

---

## 7. 敏感資料處理方式 (Sensitive Data Handling)
- **密碼雜湊儲存**：
  - 使用者密碼儲存於 `users.password_hash` 中，後端採用 `bcrypt` 對密碼進行單向雜湊加密（Salted Hash）。任何情況下，資料庫與後端日誌皆不得出現明文密碼。
- **遮罩處理 (Masking)**：
  - 當查詢使用者資料時，API 回傳格式中應對 `email` 進行遮罩保護（例如將 `john.doe@example.com` 遮蔽為 `jo**@example.com`），僅在必要安全上下文（如登入驗證、後台對帳）中才回傳完整資料。

---

## 8. 待確認事項 (Items to be Confirmed)
> [!NOTE]
> 由於核心業務邏輯已於架構設計階段全部確認，目前資料模型已完美覆蓋：
> - 39 元外送費（`orders.delivery_fee`）與總金額計算邏輯。
> - 搶單鎖與外送員接單機制（複合索引加速大廳檢索）。
> 
> 目前無待確認之資料庫模型設計事項。
