# 外送系統 測試計畫與規格文件 (Test Plan & Specification Document)

- **文件版本**：v1.0.0
- **建立日期**：2026-07-16
- **撰寫人**：AI 測試規劃小助手 (test-planner)
- **依據需求版本**：`doc/requirements.md` v1.0.0
- **依據架構版本**：`doc/architecture.md` v1.0.0
- **依據模型版本**：`doc/data-model.md` v1.0.0
- **依據待辦版本**：`doc/todo.md` v1.0.0

---

## 1. 測試目標與範圍 (Objectives & Scope)
- **測試目標**：驗證外送系統三方（消費者、商家、外送員）之核心業務功能完整暢通，資料庫狀態流轉正確無誤，並確保本機與線上部署環境之穩定性與安全性。
- **測試範圍 (In Scope)**：
  - 會員註冊、登入與權限管理 (消費者、商家、外送員)。
  - 商家菜單商品管理及訂單接收。
  - 消費者瀏覽商家、選餐點、提交 COD 訂單（含外送費 39 元計算）。
  - 外送員於大廳瀏覽訂單、搶單（防重複搶單鎖）、配送及送達結案。
- **不在測試範圍內的項目 (Out of Scope)**：
  - 線上信用卡/第三方金流支付。
  - 即時通訊與客服聊天功能。
  - 外送員即時 GPS 地圖定位追蹤（地圖 API 整合）。

## 2. 測試策略 (Testing Strategy)
- **單元測試 (Unit Test)**：使用 Python `pytest` 測試後端核心計價邏輯、密碼 Hash 與 JWT Token 驗證邏輯。
- **整合測試 (Integration Test)**：驗證 API 路由與資料庫 SQLAlchemy 寫入/讀取/軟刪除之連動情形。
- **API 測試 (API Test)**：使用 FastAPI 內建的 `TestClient` 測試端點，並驗證 200, 401, 409, 422 等各類狀態碼回傳值。
- **前端元件測試 (Component Test)**：使用 Jest 測試 React 元件在收到載入中 (Loading)、API 錯誤 (Error) 時之畫面呈現。
- **端對端測試 (E2E Test) / 手動驗收測試 (UAT)**：人工在瀏覽器上模擬「消費者下單 ➡️ 商家接單製作 ➡️ 外送員搶單配送 ➡️ 送達結案」的端到端 Happy Path，以此作為完成今日上線的關鍵里程碑。

## 3. 測試環境與測試資料規則 (Test Environment & Data Rules)
- **本機 SQLite 環境**：
  - 使用記憶體資料庫 (`sqlite:///:memory:`) 或本地測試檔案進行單元與 API 整合測試。
  - 每次測試前執行 Table 初始化，測試後重置，確保測試資料隔離。
- **生產環境 Render PostgreSQL**：
  - 於 Render.com 預備環境的 PostgreSQL 資料庫執行系統整合與手動驗收測試。
  - 使用特定測試帳號（如 `test_customer@test.com`）進行點單，避免與未來真實營運資料混淆。

---

## 4. 主要測試案例 (Test Cases)

| 案例編號 | 追溯需求/待辦 ID | 優先級 | 前置條件 | 測試步驟 | 輸入資料 | 預期結果 | 驗收標準 (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | REQ-3.1 / TODO-1 | P0 | 無 | 1. 於註冊頁輸入信箱、密碼並選取角色。<br>2. 提交註冊。<br>3. 前往登入頁面進行登入。 | email: `rider@test.com`<br>pwd: `123456`<br>role: `rider` | 註冊成功，登入時回傳有效 JWT Token。 | 密碼於資料庫以 Bcrypt 雜湊儲存，不留明文。 |
| **TC-002** | REQ-3.1 / TODO-2 | P0 | 商家登入成功 | 1. 點擊「新增商品」。<br>2. 輸入名稱、售價與簡介並提交。 | name: `經典牛肉麵`<br>price: `150` | 商品成功新增，並正確顯示於商品清單中。 | 資料庫 `products` 寫入成功，且 `is_available` 預設為 TRUE。 |
| **TC-003** | REQ-3.1 / TODO-3 | P0 | 消費者登入成功，且系統已有合作商家 | 1. 瀏覽商家列表。<br>2. 點入該商家選單，將「牛肉麵」數量 2 加入購物車。<br>3. 輸入送餐地址並提交訂單。 | address: `台北市信義路五段7號` | 下單成功，系統加計 39 元外送費，總金額顯示為 339 元。訂單狀態為 `pending`。 | 資料庫 `orders` 正確寫入 `delivery_fee=39` 與 `total_amount=339`，狀態為 `pending`。 |
| **TC-004** | REQ-3.1 / TODO-2 | P0 | 商家已有消費者下單之 `pending` 訂單 | 1. 商家查看店內訂單。<br>2. 點擊「接單（開始製作）」。<br>3. 製作完成後點擊「餐點已完成」。 | 點擊接單與餐點完成按鈕 | 點擊接單後狀態變為 `preparing`；完成後狀態變為 `ready`（等待外送員取餐）。 | 資料庫 `orders.status` 隨點擊正確流轉，並能在前端顯示對應狀態。 |
| **TC-005** | REQ-3.1 / TODO-4 | P0 | 外送員登入成功，且系統已有 `ready` 訂單 | 1. 外送員點入訂單大廳。<br>2. 點擊該筆訂單進行「搶單」。 | 點擊搶單按鈕 | 搶單成功，訂單狀態變更為 `delivering`，且該筆訂單綁定外送員 ID。 | 資料庫 `orders.rider_id` 寫入外送員 ID，且該筆訂單在訂單大廳中消失。 |
| **TC-006** | REQ-3.1 / TODO-4 | P0 | 兩名外送員同時嘗試搶接同一筆 `ready` 訂單 | 1. 外送員 A 與 B 同時點擊同筆訂單的搶單按鈕。 | 同時點擊搶單 | 外送員 A 搶單成功（狀態變為 `delivering`），外送員 B 畫面顯示「該訂單已被接走」並回傳 `409`。 | 利用資料庫 Transaction / 唯一鍵防止重複搶單，外送員 B 不得寫入 rider_id。 |
| **TC-007** | REQ-3.1 / TODO-4 | P0 | 外送員已成功搶接訂單，狀態為 `delivering` | 1. 前往目的地送餐。<br>2. 收取現金（COD）。<br>3. 點擊「確認送達」。 | 點擊確認送達按鈕 | 訂單狀態更新為 `delivered`，交易流程順暢結案。 | 資料庫 `orders.status` 變更為 `delivered`，不可再被任何 API 修改。 |

---

## 5. FastAPI 後端 API 測試重點 (FastAPI Backend Testing)
- **成功情境 (200 OK / 201 Created)**：驗證正常的註冊、登入、選單載入與點單流程，回傳的 JSON 結構應與設計規格書一致。
- **輸入欄位驗證失敗 (422 Unprocessable Entity)**：傳送錯誤的資料格式（例如：註冊 email 格式不符、點單商品數量為負數）時，FastAPI/Pydantic 是否正確攔截並回傳 422。
- **未授權/權限不足 (401 Unauthorized / 403 Forbidden)**：
  - 未攜帶 Token 存取敏感 API（例如商家新增商品）時應回傳 401。
  - 消費者帳號嘗試呼叫外送員大廳 API 搶單時，應回傳 403。
- **找不到資源 (404 Not Found)**：請求不存在的商家 ID 或訂單 ID 時，API 應回傳 404 及「Resource not found」訊息。
- **併發衝突處理 (409 Conflict)**：當外送員搶單時訂單已被他人接走，後端應拋出 `HTTPException(status_code=409, detail="Order already accepted by another rider")`。
- **伺服器錯誤 (500 Internal Server Error)**：模擬資料庫斷線時，FastAPI 應回傳 500 且不在回傳的 JSON 中洩漏代碼 Exception 的 Traceback 資訊。

## 6. React 前端測試重點 (React Frontend Testing)
- **RWD 畫面呈現 (Rendering)**：手動將瀏覽器視窗切換為 iPhone/Pixel 等行動寬度，驗證卡片式佈局、選單按鈕與訂單狀態標籤有無跑版或重疊。
- **使用者互動 (Interactions)**：點擊購物車「+」與「-」按鈕時，商品數量與價格總計是否即時聯動。
- **表單驗證 (Form Validation)**：未填寫送餐地址即點擊結帳時，應即時顯示「請填寫送餐地址」的前端防呆提示。
- **載入與錯誤狀態 (Loading/Error States)**：模擬 API 延遲時，頁面應出現 Skeleton（骨架屏）或 Spinner（旋轉載入圖示）；當 API 失敗時，應跳出 Toast 錯誤提示。
- **API 串接整合 (API Integration)**：檢查前端 `fetch`/`axios` 是否正確帶上 `Authorization: Bearer <Token>` 請求頭。

## 7. 資料庫測試重點 (Database Testing)
- **Unique 限制**：測試註冊重複的 email 時，資料庫是否拋出 IntegrityError（唯一性限制異常）。
- **外鍵完整性限制 (FK Constraints)**：測試當 `users` 刪除時，若其下有未完成之訂單，資料庫是否正確拒絕刪除（Restrict）或已配置軟刪除防護。
- **資料值域驗證 (Check Constraints)**：商品定價 `products.price` 不得小於 0，訂單明細數量 `order_items.quantity` 必須大於 0。
- **索引驗證**：於 SQLite 與 PostgreSQL 中對頻繁查詢的語句（如大廳檢索待接訂單）執行 `EXPLAIN QUERY PLAN`，確保有正常使用 `idx_orders_status_rider` 索引。

## 8. 安全性測試 (Security Testing)
- **機密防護檢索**：全專案原始碼掃描，確保無硬編碼的 JWT 密鑰或資料庫密碼被提交。
- **越權存取防禦 (IDOR/Authz)**：嘗試修改 API 的 Token ID，測試是否能讀取或修改其他會員的訂單，確保後端有針對 `current_user.id` 進行擁有人比對。
- **輸入防禦 (XSS & SQL Injection)**：在送餐地址或商品描述中輸入特殊字元（如 `' OR '1'='1` 或 `<script>alert(1)</script>`），驗證後端與資料庫已正確使用參數化查詢與轉義防護。

## 9. 缺陷回報格式與測試完成標準 (Defect Report & Exit Criteria)

### 9.1 缺陷回報格式 (Defect Report Format)
若於測試中發現 Bug，請建立以下格式的缺陷報告：
- **缺陷 ID**：`BUG-DELIVERY-[三位數編號]`
- **標題**：[簡述 Bug，例如：消費者提交訂單時未包含 39 元外送費]
- **嚴重程度**：`Blocker` (流程阻礙) / `Critical` (主要功能毀損) / `Major` (功能異常) / `Minor` (UI 微瑕)
- **重現步驟**：
  1. 登入為消費者。
  2. 將商品加入購物車並結帳。
  3. 送出訂單後查看訂單明細。
- **預期結果**：總金額應包含商品小計 + 39 元外送費。
- **實際結果**：總金額僅有商品小計。

### 9.2 測試完成/退出標準 (Exit Criteria)
- **P0 測試案例**（TC-001 至 TC-007）執行通過率達 **100%**。
- 無未修復之 `Blocker` 或 `Critical` 等級缺陷。
- 在本地與 Render 線上部署環境，各角色能順利跑通至少一次完整的端到端點單與配送流程。

## 10. 待確認事項 (Items to be Confirmed)
> [!NOTE]
> 由於核心業務與架構規範在先前皆已鎖定，目前測試案例的驗收標準已完全涵蓋 39 元外送費與搶單併發防護。
> 
> 目前無待確認之測試規格事項。
