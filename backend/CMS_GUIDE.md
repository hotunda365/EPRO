# EPRO CMS 操作與部署指南

## 架構

- 公開網站：Nginx 靜態 HTML/CSS/JavaScript，API 失效時保留靜態內容。
- CMS API：Node.js 22、Express、PostgreSQL。
- 管理介面：由 API 同源提供，路徑為 `/admin/`。
- 媒體：開發環境使用 `backend/uploads/`；正式環境使用 S3 相容物件儲存。

## 本機啟動

```powershell
cd backend
npm install
npm run migrate
npm run seed
npm start
```

公開 API：`http://localhost:3000/api/v1/public`

管理介面：`http://localhost:3000/admin/`

靜態網站另以專案根目錄啟動：

```powershell
python -m http.server 8000
```

網站：`http://localhost:8000`

## 建立首位管理員

不要把密碼寫入版本控制。請在自己的終端直接設定：

```powershell
$env:ADMIN_EMAIL="your-admin-address"
$env:ADMIN_DISPLAY_NAME="Website Administrator"
$env:ADMIN_PASSWORD="type-a-strong-password-here"
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

密碼至少 12 個字元，並包含大寫、小寫字母及數字。

正式環境亦可把三個 `ADMIN_*` 值設為 Zeabur secrets。服務只會在資料庫完全沒有管理員時建立首位 admin；建立後應移除 `ADMIN_PASSWORD`。

## 權限角色

| 角色 | 權限 |
|---|---|
| `viewer` | 查看內容及版本 |
| `editor` | 新增、編輯草稿及送審 |
| `publisher` | editor 權限，加上發布、封存及還原 |
| `admin` | publisher 權限，加上管理帳戶及系統設定 |

## 管理模組

- 網站設定：品牌、聯絡、SEO、頁尾及系統設定。
- 導覽與頁尾：主導覽、品牌切換、頁尾及法律連結。
- 公司與頁面：Hero、一般內容及 SEO。
- 聯絡資料：地址、電話、傳真、聯絡人及電郵。
- 里程碑：年份、月份、事件及排序。
- 董事局及管理層：姓名、職銜、履歷及排序。
- 業務與服務：核心業務、附屬業務、服務及功能列表。
- 案例：客戶、行業、挑戰、方案及成果。
- 最新消息：標題、摘要、HTML 內文、分類及發布時間。
- 投資者文件：財務報告、公告、通函、月報表及 PDF。
- 媒體庫：圖片與 PDF。
- 管理員及審計紀錄。

## 發布流程

1. 新內容一律建立為 `draft`。
2. 編輯已發布內容時，公開網站繼續顯示上一個發布快照。
3. 可把內容改為 `review` 供審批。
4. publisher 或 admin 執行「發布」後，公開 API 才切換到新版本。
5. `archived` 內容立即停止公開。
6. 每次新增、修改、發布、封存及還原均寫入版本與審計紀錄。

更新使用 `version` 樂觀鎖；若另一位編輯先儲存，API 回傳 `409`，需要重新載入後再修改。

## 媒體

允許 JPEG、PNG、WebP、GIF 及 PDF，單檔上限 10 MB。API 會檢查檔案 magic bytes，不只信任瀏覽器 MIME。

正式環境設定：

```text
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
```

Bucket 可保持私有；公開網站透過 `/api/v1/public/media/:id` 讀取。

## API 邊界

公開，只回傳已發布內容：

```text
GET /api/v1/public/bootstrap
GET /api/v1/public/pages/:slug
GET /api/v1/public/contacts
GET /api/v1/public/milestones
GET /api/v1/public/people
GET /api/v1/public/services
GET /api/v1/public/case-studies
GET /api/v1/public/news
GET /api/v1/public/investor-documents
```

管理 API 需要 HttpOnly session cookie；所有寫入另需 `X-CSRF-Token`：

```text
POST /api/v1/auth/login
GET  /api/v1/auth/me
POST /api/v1/auth/logout
GET  /api/v1/admin/dashboard
GET|POST|PATCH|DELETE /api/v1/admin/resources/:resource
POST /api/v1/admin/resources/:resource/:id/publish
GET  /api/v1/admin/resources/:resource/:id/revisions
POST /api/v1/admin/resources/:resource/:id/restore/:version
```

原有 `/api/users`、`/api/blog` 等 legacy 寫入路由預設不掛載。只有明確設定 `ENABLE_LEGACY_API=true` 才會以 `/api/legacy/*` 暫時啟用，不建議在正式環境使用。

## 主要環境變數

以 `.env.example` 為準。正式環境至少設定：

```text
DATABASE_URL=
NODE_ENV=production
COOKIE_SECURE=true
CORS_ORIGINS=https://epro.zeabur.app
AUTO_MIGRATE=true
AUTO_SEED=true
```

不要把 `.env`、資料庫 URL、管理員密碼或 S3 secret 提交到 Git。

## 測試

```powershell
cd backend
npm test
```

整合測試會建立一次性管理員及內容，驗證登入、CSRF、草稿、發布快照、版本衝突、還原、審計與登出，結束後自動清理。

## Zeabur 部署

1. 建立 PostgreSQL 服務並把 `DATABASE_URL` 注入 API 服務。
2. 部署 `backend/` 為 API 服務，Node 22，port 3000。
3. 設定上列 production 環境變數及首位管理員 secrets。
4. 如需上載文件，設定 S3 相容儲存 secrets。
5. 將 API 綁定 `https://api.epro.zeabur.app`，並確認 `/api/ready` 回傳 `ready`。
6. 部署專案根目錄為 Nginx 前端服務，port 8080。
7. 前台 `scripts/cms.js` 在正式域名使用 `https://api.epro.zeabur.app/api/v1`。
8. 登入 `/admin/`，確認三品牌、聯絡資料及發布流程。

## 備份與復原

- 每日 PostgreSQL 備份，至少保留 30 天。
- S3 啟用版本控制或生命週期備份。
- 每季執行一次資料庫還原演練。
- `schema_migrations` 會保存已執行 migration 及 checksum；不要修改已套用的 SQL migration，應新增下一個版本。