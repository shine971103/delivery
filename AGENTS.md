# 外送系統 - AI 協作與開發規範 (AGENTS.md)

- **適用對象**：AI 開發代理 (Agents)、人類開發者
- **更新日期**：2026-07-16
- **專案目標**：於單日之內完成最簡可行產品 (MVP) 開發與測試。

---

## 1. 專案技術棧 (Technology Stack)
- **後端 (Backend)**：FastAPI (Python 3.10+)
- **前端 (Frontend)**：React.js (響應式網頁 RWD Web，行動裝置優先)
- **本地開發資料庫 (Local)**：SQLite (檔案儲存)
- **生產環境資料庫 (Production)**：Render PostgreSQL
- **部署平台 (Deployment)**：Render.com (FastAPI Web Service + React Static Site)

## 2. 資安與憑證規範 (Security & Credentials)
> [!CAUTION]
> 嚴禁將任何金鑰、密碼、Token、資料庫連線字串硬編碼於程式碼中，或將含有真實敏感設定之檔案提交至 Git 儲存庫！
- **環境變數管理**：所有敏感性設定（包括 `DATABASE_URL`、`JWT_SECRET` 等）必須一律由系統環境變數讀取。
- **設定檔範本**：請參考專案根目錄之 `.env.example` 來配置本地開發變數。
- **Git 排除**：本地的 `.env` 檔案必須絕對加入 `.gitignore` 中，以防止意外提交。

## 3. 代碼撰寫與提交規範 (Coding & Commit Guidelines)
- **程式碼風格**：
  - 後端：遵循 PEP 8 規範，使用 Pydantic 作為資料驗證層，SQLAlchemy 作為 ORM 框架。
  - 前端：使用 Functional Components 與 React Hooks。
- **Git 提交訊息格式**：`[Type] 簡短描述` (例如：`feat: 實作外送員大廳接單 API`, `fix: 修復消費者訂單金額加計外送費邏輯`)。
- **提交前要求**：程式碼提交前，應執行基本的語法檢查與格式化。

## 4. AI 協作指引 (AI Agent Guidelines)
- **修改前檢查**：AI 代理在進行任何檔案修改或新增前，必須詳閱並同步 `doc/project-memory.md`（專案決策與記憶）與 `doc/todo.md`（任務進度與驗收條件）。
- **杜絕通靈**：如遇未確認之業務規則或模糊需求，必須立刻向使用者提問，絕不自行臆測或填充虛擬規則。
- **任務更新**：在開始進行任務時，需將 `doc/todo.md` 中對應項目的狀態更新為 `[ / ] In Progress`；完成並通過驗證後更新為 `[x] Done`。
