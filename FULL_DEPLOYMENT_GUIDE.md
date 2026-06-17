# 🚀 EPRO 完整部署指南

## 📦 項目結構

```
EPRO/
├── 前端服務（靜態網站）
│   ├── index.html
│   ├── styles.css
│   ├── pages/
│   ├── assets/
│   ├── Dockerfile (Nginx)
│   ├── nginx.conf
│   ├── zeabur.json
│   └── .dockerignore
│
└── backend/
    ├── 後端 API（Node.js + Express + PostgreSQL）
    ├── server.js
    ├── package.json
    ├── Dockerfile
    ├── zeabur.json
    ├── .env (DATABASE_URL set)
    ├── db/
    │   ├── connection.js
    │   └── init.js
    └── routes/
        ├── users.js
        ├── company.js
        ├── contact.js
        ├── blog.js
        ├── services.js
        └── caseStudies.js
```

## 🔐 部署憑據

**GitHub 倉庫**：https://github.com/hotunda365/EPRO

**Zeabur 項目**：
- 項目編號：`6a321691302ffbcd03a948aa`
- 區域：Hong Kong (hkg)

**PostgreSQL 服務**：
- Host: `129.226.91.250`
- Port: `30216`
- Database: `zeabur`
- Username: `root`

---

## 🎯 部署選項

### 選項 1：Zeabur 控制台自動部署（推薦）

**優點**：最簡單，GitHub 自動觸發部署
**缺點**：需要在 Zeabur 控制台配置

**步驟**：

1. **登入 Zeabur 控制台**
   - 打開 https://dash.zeabur.com
   - 登入你的 Zeabur 帳號

2. **連結 GitHub 倉庫**
   - 選擇項目 `6a321691302ffbcd03a948aa`
   - 點擊「添加服務」→「From Git」
   - 選擇 `hotunda365/EPRO` 倉庫
   - 配置：
     - **Root Path**: `/` （前端）或 `/backend` （後端）
     - **Builder**: Docker
     - **Port**: 3000

3. **自動部署**
   - 每次推送到 GitHub `main` 分支時自動觸發
   - 查看「部署」頁籤監控進度

---

### 選項 2：Zeabur CLI 部署

**前置需求**：
- Node.js 16+
- npm

**步驟**：

#### 部署前端

```bash
# 1. 安裝 Zeabur CLI
npm install -g zeabur

# 2. 登入 Zeabur
zeabur login

# 3. 在項目根目錄部署
zeabur deploy --project 6a321691302ffbcd03a948aa

# 4. 監看部署日誌
zeabur logs --project 6a321691302ffbcd03a948aa -f
```

#### 部署後端 API

```bash
# 1. 進入 backend 目錄
cd backend

# 2. 部署後端
zeabur deploy --project 6a321691302ffbcd03a948aa

# 3. 監看部署日誌
zeabur logs --project 6a321691302ffbcd03a948aa -f
```

---

### 選項 3：Docker Compose（本地測試）

**用途**：在本地測試完整堆棧再部署

```bash
# 1. 安裝 Docker Desktop

# 2. 構建並啟動所有服務
docker-compose up --build

# 3. 訪問
# 前端：http://localhost:3000
# 後端 API：http://localhost:3001
# 數據庫：localhost:5432
```

---

## ✅ 部署檢查清單

### 前端服務檢查

- [ ] **文件完整**
  - `Dockerfile` (Nginx)
  - `nginx.conf` (Nginx 配置)
  - `zeabur.json` (Zeabur 配置)
  - `.dockerignore` (減小鏡像)
  - `index.html` 和所有頁面

- [ ] **配置正確**
  - `zeabur.json` 指定 `"builder": "docker"`
  - Port 設置為 `3000`
  - nginx 監聽 `3000`

- [ ] **GitHub 推送**
  - 所有文件已推送到 `main` 分支
  - 檢查：`https://github.com/hotunda365/EPRO`

### 後端服務檢查

- [ ] **環境變數**
  - `.env` 包含 `DATABASE_URL`
  - `backend/.gitignore` 已配置（`.env` 不會上傳）

- [ ] **依賴**
  - `backend/package.json` 包含所有必需依賴
  - Express, pg, cors, helmet, dotenv 等

- [ ] **數據庫**
  - PostgreSQL 服務已在 Zeabur 部署
  - `backend/db/init.js` 會自動創建表

- [ ] **GitHub 推送**
  - `backend/` 文件夾已推送到 `main` 分支

---

## 🔍 部署後驗證

### 前端驗證

```bash
# 訪問前端
curl https://epro.zeabur.app/

# 檢查 CSS 加載
curl https://epro.zeabur.app/styles.css

# 檢查資源
curl https://epro.zeabur.app/assets/logo/eprotel-logo.png
```

### 後端驗證

```bash
# 健康檢查
curl https://api.epro.zeabur.app/api/health

# 數據庫連接
curl https://api.epro.zeabur.app/api/db-status

# 測試 API
curl https://api.epro.zeabur.app/api/services
```

---

## 🐛 故障排查

### 502 Bad Gateway

**原因可能**：

1. **服務未啟動**
   - 檢查 Zeabur 日誌：`zeabur logs --project 6a321691302ffbcd03a948aa`
   - 查看「部署」頁籤，確認部署完成

2. **Port 配置錯誤**
   - 確保 `zeabur.json` 中 Port 是 `3000`
   - Nginx/Express 監聽 `3000`

3. **Dockerfile 錯誤**
   - 驗證 `Dockerfile` 語法
   - 檢查所有 COPY 路徑存在
   - 確認 EXPOSE 和 CMD 正確

**解決步驟**：

```bash
# 查看詳細錯誤日誌
zeabur logs --project 6a321691302ffbcd03a948aa

# 本地測試
docker build -t epro-frontend .
docker run -p 3000:3000 epro-frontend

# 或後端
cd backend
docker build -t epro-api .
docker run -p 3000:3000 epro-api
```

---

## 📝 環境變數配置

### 前端（無需環境變數）
- 靜態網站，所有配置在代碼中

### 後端（需要環境變數）

在 Zeabur 控制台設置：

```
DATABASE_URL=postgresql://root:jtbesiX87DJEnK6wd9yA4cmuV3gR0215@129.226.91.250:30216/zeabur
NODE_ENV=production
PORT=3000
```

---

## 🔗 有用的連結

- **GitHub 倉庫**：https://github.com/hotunda365/EPRO
- **Zeabur 控制台**：https://dash.zeabur.com
- **項目編號**：6a321691302ffbcd03a948aa
- **前端 URL**（部署後）：https://epro.zeabur.app
- **API URL**（部署後）：https://api.epro.zeabur.app

---

## 💡 推薦流程

1. **本地測試**（可選）
   ```bash
   npm install
   npm run dev  # 前端
   cd backend && npm install && npm run dev  # 後端
   ```

2. **推送到 GitHub**
   ```bash
   git add .
   git commit -m "準備部署"
   git push origin main
   ```

3. **Zeabur 部署**
   - 選項 A：自動部署（連結 GitHub）
   - 選項 B：CLI 手動部署（`zeabur deploy`）

4. **驗證**
   - 訪問前端：https://epro.zeabur.app
   - 測試 API：https://api.epro.zeabur.app/api/health

---

## 🆘 需要幫助？

如遇到問題：

1. **查看 Zeabur 日誌**
   ```bash
   zeabur logs --project 6a321691302ffbcd03a948aa -f
   ```

2. **本地測試**
   ```bash
   docker build -t epro .
   docker run -p 3000:3000 epro
   ```

3. **驗證 Git 狀態**
   ```bash
   git log --oneline -5
   git status
   git remote -v
   ```

4. **聯繫 Zeabur 支持**
   - https://zeabur.com/docs
   - Zeabur 控制台內的支持聊天
