# ETS • EproTel 網站合併專案

兩家公司網站（etsgroup.com.hk 與 eprotel.com.hk）合併為一個統一品牌網站。

## 📂 專案結構

```
EproTel/
├── index.html              # 首頁（HTML 靜態版）
├── styles.css              # 全站樣式
├── pages/                  # 其他頁面
│   ├── about.html          # 關於我們
│   ├── services.html       # 服務與產品
│   ├── cases.html          # 案例分享
│   └── contact.html        # 聯絡我們
├── assets/                 # 靜態資源
│   ├── images/             # 圖片
│   └── logo/               # Logo 相關檔案
├── scripts/                # 工具腳本
│   └── download-logo.ps1   # Logo 下載器
└── README.md               # 此檔案
```

## 🚀 快速開始

### 1. 本地預覽（靜態 HTML 版）
```bash
# Windows：直接雙擊 index.html
start index.html

# 或啟動簡易伺服器（Python）
python -m http.server 8000

# 瀏覽器打開
# http://localhost:8000
```

### 2. Node.js 開發環境（推薦）
若要進階開發（Next.js/React）：
```bash
# 初始化 Node 專案
npm init -y

# 安裝依賴（如果有 Next.js 版本）
npm install next react react-dom
npm run dev
# 瀏覽 http://localhost:3000
```

## 🎨 品牌設定

- **主色**: 跟隨 logo 紅色，現行 CSS token 為 `#E31937`
- **強調色**: `#C41530`（主色 hover / deeper red）
- **副色**: `#45596C`（深藍灰）
- **背景**: `#ffffff`（白色）
- **字體**: Noto Sans TC（繁體）、Inter（英文）

### Primary Color Rule
- Website primary color must follow the red used in the logo.
- Primary CTA, active states, key highlights and core brand accents should use the logo red family.
- Do not revert the site-wide primary palette to blue unless the logo and group brand direction change.

### Secondary Color Reference
- 網站 secondary color 參考為深藍灰色系，接近 `#45596C`。
- 此色適合用於次級內容底色、資訊面板、活動區塊或輔助強調，不應取代主品牌紅色的 CTA 角色。
- 如需更新實際 CSS token，應優先套用到非主要按鈕、資訊卡背景或支援型區塊。

### 集團網站關係
- Header 最上方切換列中的 **易通訊集團**、**易寶通訊**、**易寶人才** 代表同一集團旗下的三個不同公司或品牌入口。
- 這三個名稱屬於集團導覽，不等同於主導覽列中的內容頁分類。
- 後續若調整 header 文案或連結，應維持「三家公司，同一集團」這個資訊架構。

### Logo
目前使用遠端 URL（etsgroup.com.hk）。若要本地化，請：
1. 手動下載：https://etsgroup.com.hk/ct/images/top-logo.gif
2. 存至 `assets/logo/top-logo.gif`
3. 更新 `index.html` 的 src 路徑為 `assets/logo/top-logo.gif`

## 📄 頁面清單

- **首頁** (`index.html`)：企業介紹、服務概覽、CTA
- **關於我們** (`pages/about.html`)：公司歷史、團隊、願景
- **服務** (`pages/services.html`)：詳細服務、價格方案
- **案例** (`pages/cases.html`)：客戶案例、成功故事
- **聯絡** (`pages/contact.html`)：聯絡表單、地址、營業時間

## 🔍 SEO & 部署

### DNS 與域名切換
1. 確保新域名/子域名已配置
2. 上傳所有檔案至伺服器
3. 設置 301 重定向（舊 URL → 新 URL）

### Sitemap & Search Console
```xml
<!-- sitemap.xml 範例 -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://newdomain.com.hk/</loc>
    <lastmod>2026-06-12</lastmod>
  </url>
  <url>
    <loc>https://newdomain.com.hk/pages/about.html</loc>
  </url>
</urlset>
```

## 🛠️ 後續工作

- [ ] 收集兩站的詳細內容（文案、圖片、案例）
- [ ] 建立內容對映表（舊 URL → 新 URL）
- [ ] 設置 301 轉址規則（.htaccess 或 Nginx）
- [ ] 測試響應式與行動版
- [ ] 連接分析工具（Google Analytics、Search Console）
- [ ] 驗收與上線

## 📧 聯絡

若有疑問，請聯絡網站開發團隊。

---
**最後更新**: 2026-06-12
