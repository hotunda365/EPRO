# EPRO API Documentation

## 概述

EPRO API 是為易寶通訊公司開發的 RESTful API 服務，使用 Node.js + Express + PostgreSQL。

## 基礎 URL

- **開發環境**：`http://localhost:3000/api`
- **生產環境**：`https://api.epro.zeabur.app/api`（部署後）

## 健康檢查

### 檢查服務狀態
```
GET /api/health
```

**回應**：
```json
{
  "status": "OK",
  "timestamp": "2024-06-17T10:00:00.000Z"
}
```

### 檢查數據庫連接
```
GET /api/db-status
```

**回應**：
```json
{
  "status": "Connected",
  "database_time": {
    "now": "2024-06-17T10:00:00.000Z"
  },
  "timestamp": "2024-06-17T10:00:00.000Z"
}
```

---

## API 端點

### 1. 用戶管理 (Users)

#### 獲取所有用戶
```
GET /api/users?page=1&limit=10
```

**參數**：
- `page`：頁碼（預設：1）
- `limit`：每頁數量（預設：10）

**回應**：
```json
{
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@epro.com",
      "role": "admin",
      "created_at": "2024-06-17T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

#### 獲取單個用戶
```
GET /api/users/:id
```

#### 創建用戶
```
POST /api/users
```

**請求體**：
```json
{
  "username": "newuser",
  "email": "user@epro.com",
  "password_hash": "hashed_password",
  "role": "user"
}
```

#### 更新用戶
```
PUT /api/users/:id
```

#### 刪除用戶
```
DELETE /api/users/:id
```

---

### 2. 公司信息 (Company)

#### 獲取公司信息
```
GET /api/company
```

**回應**：
```json
{
  "id": 1,
  "name": "EPRO TELECOM",
  "description": "易寶通訊公司",
  "logo_url": "https://...",
  "website": "https://epro.com",
  "phone": "+852-1234-5678",
  "email": "info@epro.com",
  "address": "Hong Kong",
  "established_year": 2010,
  "created_at": "2024-06-17T10:00:00Z",
  "updated_at": "2024-06-17T10:00:00Z"
}
```

#### 創建或更新公司信息
```
POST /api/company
```

**請求體**：
```json
{
  "name": "EPRO TELECOM",
  "description": "易寶通訊公司",
  "logo_url": "https://...",
  "website": "https://epro.com",
  "phone": "+852-1234-5678",
  "email": "info@epro.com",
  "address": "Hong Kong",
  "established_year": 2010
}
```

---

### 3. 聯繫表單提交 (Contact)

#### 獲取所有提交
```
GET /api/contact?page=1&limit=20&status=new
```

**參數**：
- `status`：篩選狀態（new, replied, closed）

#### 提交聯繫表單
```
POST /api/contact
```

**請求體**：
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+852-9876-5432",
  "subject": "Inquiry",
  "message": "I'm interested in your services"
}
```

#### 更新提交狀態
```
PATCH /api/contact/:id
```

**請求體**：
```json
{
  "status": "replied"
}
```

---

### 4. 博客/新聞 (Blog)

#### 獲取所有博客文章
```
GET /api/blog?page=1&limit=10&status=published
```

#### 獲取單篇文章
```
GET /api/blog/:slug
```

#### 創建文章
```
POST /api/blog
```

**請求體**：
```json
{
  "title": "Article Title",
  "slug": "article-title",
  "content": "Article content...",
  "author_id": 1,
  "featured_image": "https://...",
  "category": "News",
  "status": "draft",
  "published_at": "2024-06-17T10:00:00Z"
}
```

#### 更新文章
```
PUT /api/blog/:id
```

#### 刪除文章
```
DELETE /api/blog/:id
```

---

### 5. 服務/產品 (Services)

#### 獲取所有服務
```
GET /api/services?status=active
```

#### 獲取單個服務
```
GET /api/services/:id
```

#### 創建服務
```
POST /api/services
```

**請求體**：
```json
{
  "name": "Service Name",
  "description": "Service description",
  "icon_url": "https://...",
  "features": "Feature 1, Feature 2",
  "pricing": "$99/month",
  "status": "active",
  "order_index": 1
}
```

#### 更新服務
```
PUT /api/services/:id
```

#### 刪除服務
```
DELETE /api/services/:id
```

---

### 6. 案例研究 (Case Studies)

#### 獲取所有案例
```
GET /api/case-studies?page=1&limit=10&featured=false
```

**參數**：
- `featured`：只獲取精選案例（true/false）

#### 獲取單個案例
```
GET /api/case-studies/:slug
```

#### 創建案例
```
POST /api/case-studies
```

**請求體**：
```json
{
  "title": "Case Study Title",
  "slug": "case-study-slug",
  "client_name": "Client Name",
  "industry": "Industry",
  "description": "Overview",
  "challenge": "Challenge description",
  "solution": "Solution description",
  "result": "Results achieved",
  "image_url": "https://...",
  "featured": true,
  "status": "published"
}
```

#### 更新案例
```
PUT /api/case-studies/:id
```

#### 刪除案例
```
DELETE /api/case-studies/:id
```

---

## 錯誤回應

所有錯誤回應都遵循以下格式：

```json
{
  "error": "Error message",
  "message": "Detailed error information"
}
```

常見 HTTP 狀態碼：
- `200 OK`：請求成功
- `201 Created`：資源創建成功
- `400 Bad Request`：請求參數錯誤
- `404 Not Found`：資源不存在
- `409 Conflict`：衝突（如重複記錄）
- `500 Internal Server Error`：服務器錯誤

---

## 環境變數

```
DATABASE_URL=postgresql://root:password@host:port/database
NODE_ENV=production
PORT=3000
```

---

## 部署說明

### Zeabur 部署

1. 確保 PostgreSQL 服務已部署
2. 設置環境變數 `DATABASE_URL`
3. 部署後端服務：`zeabur deploy --project 6a321691302ffbcd03a948aa`
4. 查看日誌：`zeabur logs --project 6a321691302ffbcd03a948aa`

### 本地開發

```bash
cd backend
npm install
npm run dev
```

訪問 `http://localhost:3000/api/health` 測試連接

---

## 功能特性

✅ RESTful API 設計
✅ PostgreSQL 數據持久化
✅ CORS 支持
✅ 安全頭部（Helmet）
✅ 分頁支持
✅ 錯誤處理
✅ 健康檢查端點
✅ Docker 容器化
✅ 自動數據庫初始化

---

## 技術棧

- **運行時**：Node.js 18 LTS
- **框架**：Express.js
- **數據庫**：PostgreSQL
- **容器**：Docker
- **安全**：Helmet
- **跨域**：CORS
