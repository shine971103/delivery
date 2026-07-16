# 🧡 專送達外送平台 (Delivery System MVP)

「專送達」是一個專為現代高效率外送流程設計的單日最簡可行產品 (MVP) 外送協作平台。本專案採用**響應式網頁設計 (RWD)**，並整合了消費者、商家與外送員三大核心入口，實現流暢的端到端配送追蹤與高併發搶單安全防禦。

---

## 🛠️ 技術棧 (Technology Stack)

* **後端 (Backend)**: FastAPI (Python 3.13+), SQLAlchemy ORM, Uvicorn, Bcrypt Hashing, JWT 認證
* **前端 (Frontend)**: React.js (Vite 5), Vanilla CSS (現代橘橙色毛玻璃 Glassmorphism 風格)
* **資料庫 (Database)**: SQLite (本地開發測試), Render PostgreSQL (生產環境雲端資料庫)
* **部署平台 (Deployment)**: Render.com (基於 `render.yaml` 基礎設施即代碼 IaC 藍圖自動化一鍵部署)

---

## 🌟 核心功能特點 (Core Features)

1. **🛍️ 消費者點餐入口**
   - 瀏覽合作商家列表與個別餐廳菜單。
   - 本地購物車管理（自動防範跨店點餐，跨店點餐時自動提示並清空舊購物車）。
   - 固定外送費 **39 元** 結帳機制，且無最低起送價門檻。
   - 五階段圖形進度條追蹤訂單即時狀態（`pending` ➡️ `preparing` ➡️ `ready` ➡️ `delivering` ➡️ `delivered`）。
2. **🍳 商家管理入口**
   - 餐廳基本資料修改（店名、地址、簡介）。
   - 商品菜單管理（CRUD 支援，上架/下架切換，軟刪除 `deleted_at` 處理以防止歷史訂單崩潰）。
   - 新訂單接收大廳（每 5 秒背景輪詢，一鍵接單製作與完成呼叫外送員）。
3. **🛵 外送員配送入口**
   - 空閒外送員接單大廳（僅顯示狀態為 `ready` 且無人接單的任務）。
   - **高併發搶單防禦鎖**：後端採用 SQLAlchemy `with_for_update()` 資料庫交易行級鎖（Row Lock）。若兩位外送員同時搶同一筆訂單，最先成功者得，後搶者會收到 `409 Conflict` 錯誤，確保交易原子性。
   - 一鍵確認送達結案，內建外送員配送累積費車資收入統計面板。

---

## 💻 本地開發環境架設 (Local Setup)

### 1. 後端 (FastAPI) 啟動

1. **進入後端目錄並啟用虛擬環境**：
   ```powershell
   cd backend
   # 啟用虛擬環境 (Windows)
   ..\venv\Scripts\activate
   ```
2. **安裝相依套件**：
   ```powershell
   pip install -r requirements.txt
   ```
3. **啟動 API 伺服器**：
   ```powershell
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   * 後端 API 文件網址：[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. 前端 (React) 啟動

1. **進入前端目錄並啟動開發伺服器**：
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   * 前端網頁網址：[http://localhost:5173/](http://localhost:5173/)

---

## 🧪 自動化測試與測試數據植入

專案內置了完整的自動化測試與線上資料庫數據植入腳本：

1. **運行後端 API 端到端測試 (E2E Test)**：
   本機具備完整的 E2E 測試腳本，涵蓋註冊、登入、點單、併發搶單防禦等完整業務流程：
   ```powershell
   python backend/test_api.py
   ```
2. **生產環境資料庫數據植入 (DB Seeding)**：
   若資料庫為空，可運行以下腳本向您的 Render PostgreSQL 寫入一組測試數據（內含消費者、商家、外送員帳號，以及預設餐廳與餐點）：
   ```powershell
   python backend/seed_production.py
   ```

---

## ☁️ 雲端部署 (Render.com)

本專案配置有 `render.yaml` 部署藍圖，部署極為簡便：
1. 將程式碼推送到 GitHub 倉庫。
2. 登入 Render.com，點選 **New +** ➡️ **Blueprint**，連結您的 GitHub 倉庫並點選 **Apply**。
3. 部署完成後，請於 `delivery-frontend` 的 Environment 設定中加入 `VITE_API_URL` 指向您的後端 `delivery-backend` 網址即可！
