# 快速開始指南

✅ **網站建構完成！** 以下是如何立即預覽與部署。

## 🚀 5 分鐘內預覽網站

### 方式 1：直接在瀏覽器打開（最簡單）
```bash
# 進入專案資料夾
cd c:\Users\Toby-Ng\Documents\EproTel

# Windows：直接雙擊打開
index.html

# 或右鍵 → 開啟方式 → 選擇瀏覽器
```

### 方式 2：使用本地伺服器（推薦用於測試）
```bash
# 打開 PowerShell 或 Command Prompt，進入專案資料夾
cd c:\Users\Toby-Ng\Documents\EproTel

# 啟動 Python 簡易伺服器
python -m http.server 8000

# 打開瀏覽器訪問
http://localhost:8000
```

## 📂 專案檔案結構
```
EproTel/
├── index.html                    ⭐ 首頁（企業介紹、服務概覽）
├── styles.css                    🎨 全站樣式（HSBC 風格藍色）
├── pages/
│   ├── about.html               📖 關於我們（公司歷史、團隊）
│   ├── services.html            💼 服務與產品（詳細服務、價格方案）
│   ├── cases.html               📊 成功案例（客戶案例、ROI）
│   └── contact.html             📧 聯絡我們（表單、地址、營業時間）
├── assets/
│   ├── images/                  🖼️ 圖片資源
│   └── logo/                    🔷 Logo 檔案（待下載）
├── scripts/
│   └── download-logo.ps1        ⬇️ Logo 下載器
├── README.md                    📚 專案說明
├── DEPLOYMENT.md                🚀 部署與 SEO 指南
└── QUICKSTART.md               👈 此檔案
```

## 🎨 設計特點
- ✅ **響應式設計**：桌面、平板、手機完全適配
- ✅ **HSBC 風格**：乾淨藍色配色（#0a66c2）
- ✅ **性能優化**：精簡 CSS、無外部框架、快速加載
- ✅ **無障礙設計**：語義化 HTML、ARIA 標籤、鍵盤導航
- ✅ **SEO 友善**：結構化標記、meta 標籤、sitemap

## 📄 頁面介紹

| 頁面 | URL | 內容 |
|------|-----|------|
| 首頁 | `/` | 企業介紹、服務區塊、案例卡、CTA、footer |
| 關於 | `/pages/about.html` | 公司故事、使命、團隊、核心價值 |
| 服務 | `/pages/services.html` | 4 個服務模組、詳細功能、3 檔價格方案 |
| 案例 | `/pages/cases.html` | 4 個完整案例（金融、零售、教育、製造）、指標卡 |
| 聯絡 | `/pages/contact.html` | 聯絡表單、營業時間、常見問題 |

## 🔧 自訂網站

### 1. 修改公司資訊
在 `index.html` 與所有 `pages/*.html` 中找到以下位置並修改：
```html
<!-- 修改電話 -->
電話：+852 1234 5678

<!-- 修改電郵 -->
電郵：info@example.com

<!-- 修改地址 -->
香港中環
```

### 2. 更新 Logo
- **方式 A**（保留遠端連結）：無需操作，已自動使用 `https://etsgroup.com.hk/ct/images/top-logo.gif`
- **方式 B**（使用本地 Logo）：
  1. 將 logo 檔案放入 `assets/logo/` 資料夾
  2. 在 HTML 中改為 `src="assets/logo/your-logo.png"`

### 3. 修改顏色主題
在 `styles.css` 開頭找到 `:root` 變數並修改：
```css
:root{
  --bg:#f7f9fb;        /* 背景色 */
  --brand:#0a66c2;     /* 主色（藍） */
  --accent:#0a4fa0;    /* 副色（深藍） */
  --text:#0b2340;      /* 文字色 */
  /* ... 其他變數 ... */
}
```

### 4. 添加真實圖片
- 將圖片放入 `assets/images/` 資料夾
- 在 HTML 中更改 `src="https://via.placeholder.com/..."` 為實際路徑

## 📊 使用 Placeholder 圖片

目前使用免費佔位符服務 `via.placeholder.com`（可用於開發）。上線前請：
1. 製作或購買真實圖片
2. 將 `<img src="https://via.placeholder.com/...">` 改為實際路徑
3. 壓縮圖片以提升性能（使用 TinyPNG、ImageOptim 等工具）

## ✉️ 設置聯絡表單

目前 `contact.html` 的表單已設置為 **Formspree** 範本。使用步驟：
1. 前往 https://formspree.io
2. 建立新表單，取得 Form ID（例如 `f/xxxxx`）
3. 在 `contact.html` 中找到 `action="https://formspree.io/f/YOUR_FORM_ID"`，替換 `YOUR_FORM_ID`
4. 表單提交後自動寄信至您設定的電郵

**替代方案**：
- Netlify Forms（若部署在 Netlify）
- PHP 表單處理（若伺服器支援 PHP）
- 第三方服務如 Basin、Getform

## 🌍 部署方案

### 方案 1：共用主機 / VPS（推薦）
1. 租賃虛擬主機（GoDaddy、Bluehost、香港伺服器商）
2. 上傳所有檔案到 `public_html` 資料夾
3. 配置 DNS 指向新伺服器
4. 設置 301 轉址（見 DEPLOYMENT.md）

### 方案 2：靜態網站主機（免費）
- **Netlify**: 拖放上傳，自動部署，支援 HTTPS、表單、分析
- **GitHub Pages**: 免費託管，版本控制，自動部署
- **Vercel**: 最快的 CDN，適合全球訪客

### 方案 3：雲端平臺
- **AWS S3 + CloudFront**：全球高速、可擴展
- **Azure Static Web Apps**：與 Microsoft 服務整合
- **Google Cloud Storage**：與 Google Analytics 無縫整合

## 📈 上線前檢查清單
- [ ] 修改公司資訊（電話、電郵、地址）
- [ ] 更新 logo 為本地或確認遠端連結有效
- [ ] 添加真實圖片並壓縮
- [ ] 設置聯絡表單的表單提交服務
- [ ] 在瀏覽器中測試所有頁面與連結
- [ ] 用手機測試響應式設計
- [ ] 檢查表單是否正常提交
- [ ] 審視內容文案與拼寫
- [ ] 在 https://www.responsivedesignchecker.com/ 測試全裝置相容性

## 🔍 性能優化建議

上線後，使用以下工具檢查並優化：
- **Google PageSpeed Insights**：檢查載入速度
- **GTmetrix**：詳細效能分析
- **Lighthouse**（Chrome DevTools）：無障礙性、SEO、效能評分

## 📞 後續支援

若需進階功能，可考慮：
- ✅ 整合 CMS（WordPress、Headless CMS）
- ✅ 轉為 React/Next.js（可提供範本）
- ✅ 連接客戶關係管理系統（CRM）
- ✅ 多語言支援（繁、簡、英）
- ✅ 部落格功能
- ✅ 線上預約系統

---

**祝您網站上線順利！** 有任何問題，請參考 README.md 或 DEPLOYMENT.md，或聯繫開發團隊。

最後更新：2026-06-12
