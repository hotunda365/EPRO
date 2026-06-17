# 部署與 SEO 指南

## 📋 部署檢查清單

### 1. 環境準備
- [ ] 確認目標域名 / 子域名
- [ ] 購買或配置伺服器（VPS / 虛擬主機）
- [ ] 設置 HTTPS SSL 證書
- [ ] 配置 DNS 記錄

### 2. 本地測試
- [ ] 執行 `python -m http.server 8000` 測試本地預覽
- [ ] 測試所有頁面連結
- [ ] 檢查響應式設計（桌面、平板、手機）
- [ ] 測試表單功能（聯絡表單）
- [ ] 檢查圖片與媒體加載

### 3. 檔案上傳
```bash
# 使用 FTP / SFTP 上傳所有檔案到伺服器
# 建議目錄結構（Web Root）
/public_html/
├── index.html
├── styles.css
├── pages/
│   ├── about.html
│   ├── services.html
│   ├── cases.html
│   └── contact.html
├── assets/
│   ├── images/
│   └── logo/
└── robots.txt
```

### 4. 伺服器設定

#### Apache (.htaccess)
```apache
# 啟用 GZIP 壓縮
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# 設置 301 轉址（舊網域 → 新網域）
RewriteEngine On
RewriteCond %{HTTP_HOST} ^etsgroup\.com\.hk$ [OR]
RewriteCond %{HTTP_HOST} ^eprotel\.com\.hk$
RewriteRule ^(.*)$ https://newdomain.com.hk/$1 [R=301,L]

# 移除 .html 副檔名
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^([^\.]+)$ $1.html [NC,L]
```

#### Nginx 設定
```nginx
server {
    listen 443 ssl http2;
    server_name newdomain.com.hk;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/html;
    index index.html;
    
    # 重定向舊域名
    if ($host = etsgroup.com.hk) {
        return 301 https://newdomain.com.hk$request_uri;
    }
    
    if ($host = eprotel.com.hk) {
        return 301 https://newdomain.com.hk$request_uri;
    }
    
    # GZIP 壓縮
    gzip on;
    gzip_types text/html text/css application/javascript;
    
    # 移除 .html
    try_files $uri $uri/ $uri.html =404;
}

# HTTP → HTTPS 轉址
server {
    listen 80;
    server_name newdomain.com.hk etsgroup.com.hk eprotel.com.hk;
    return 301 https://newdomain.com.hk$request_uri;
}
```

## 🔍 SEO 優化

### 1. 建立 sitemap.xml
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://newdomain.com.hk/</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://newdomain.com.hk/pages/about.html</loc>
    <lastmod>2026-06-12</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://newdomain.com.hk/pages/services.html</loc>
    <lastmod>2026-06-12</lastmod>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://newdomain.com.hk/pages/cases.html</loc>
    <lastmod>2026-06-12</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://newdomain.com.hk/pages/contact.html</loc>
    <lastmod>2026-06-12</lastmod>
    <priority>0.7</priority>
  </url>
</urlset>
```

### 2. 建立 robots.txt
```
User-agent: *
Allow: /
Disallow: /assets/
Sitemap: https://newdomain.com.hk/sitemap.xml
```

### 3. Meta 標籤優化
在每個頁面的 `<head>` 中新增：
```html
<!-- 在 index.html -->
<meta name="description" content="ETS • EproTel：香港領先的企業通訊與雲端解決方案供應商。擁有20年經驗，服務500+客戶。">
<meta name="keywords" content="企業通訊, VoIP, 雲端服務, 系統整合, 香港">
<meta property="og:title" content="ETS • EproTel - 專業企業通訊解決方案">
<meta property="og:description" content="整合通訊服務、雲端解決方案與企業網絡。">
<meta property="og:image" content="https://newdomain.com.hk/assets/og-image.png">
```

### 4. Google Search Console 設置
1. 前往 https://search.google.com/search-console
2. 新增網域屬性
3. 上傳 sitemap.xml
4. 驗證舊域名的 301 轉址是否正常
5. 監控搜尋效果與索引狀況

### 5. Google Analytics 設置
在所有頁面 `</head>` 前新增：
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 📊 301 轉址對映表

建立完整的舊 URL → 新 URL 對映：

```
舊 URL                              新 URL
─────────────────────────────────────────────────────────────
https://etsgroup.com.hk/            https://newdomain.com.hk/
https://etsgroup.com.hk/about       https://newdomain.com.hk/pages/about.html
https://eprotel.com.hk/             https://newdomain.com.hk/
https://eprotel.com.hk/services     https://newdomain.com.hk/pages/services.html
https://eprotel.com.hk/contact      https://newdomain.com.hk/pages/contact.html
...
```

## 🔗 內部連結檢查

使用工具檢查內部連結：
- Screaming Frog（免費版）
- Ahrefs 或 SEMrush
- Google Search Console 的「涵蓋率」報告

## ✅ 上線前檢查清單

- [ ] 所有頁面 HTTPS 可訪問
- [ ] sitemap.xml 已上傳到根目錄
- [ ] robots.txt 已配置
- [ ] Google Search Console 已驗證
- [ ] Google Analytics 正確追蹤
- [ ] 301 轉址已配置並驗證
- [ ] 舊域名的 HTTPS 憑證仍有效
- [ ] 聯絡表單可正常提交
- [ ] 所有圖片與資源加載完整
- [ ] 行動裝置測試完成（使用 Google Mobile-Friendly Test）

## 🚀 上線流程

1. **預部署**（Staging）：在測試伺服器完整測試
2. **通知關鍵客戶**：提前告知域名變更
3. **部署新網站**：上傳所有檔案到生產伺服器
4. **驗證 301 轉址**：確保舊 URL 正確轉向
5. **監控流量**：觀察 Analytics 中的流量變化
6. **Search Console 監控**：檢查爬蟲狀況與索引進度

## 📞 上線後支援

- **監控**：每天檢查 Search Console 報告
- **調整**：根據流量與用戶反饋優化
- **更新**：定期更新案例、服務內容與公司資訊
- **備份**：每週自動備份網站檔案與資料庫

---
**更新日期**: 2026-06-12
