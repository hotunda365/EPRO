# Zeabur 部署指南

## 📝 部署信息
- **服務器編號**: server-6a3214c32a3ed2e7779aa127
- **區域**: 香港 (HKG)
- **項目類型**: 靜態網站

## 🚀 部署步驟

### 方案 1：使用 Git 連結（推薦）

1. **確保項目已推送到 GitHub/GitLab**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **在 Zeabur 控制台**
   - 登入 Zeabur
   - 創建新項目
   - 選擇「From Git」
   - 連結你的 Git 倉庫
   - 選擇服務器編號: `server-6a3214c32a3ed2e7779aa127`
   - 點擊「Deploy」

### 方案 2：Docker 部署

1. **確保本地已安裝 Docker**

2. **構建 Docker 鏡像**
   ```bash
   docker build -t eprotecom .
   ```

3. **推送到 Docker Hub（如使用 Docker）**
   ```bash
   docker tag eprotecom YOUR_DOCKER_USERNAME/eprotecom
   docker push YOUR_DOCKER_USERNAME/eprotecom
   ```

4. **在 Zeabur 部署**
   - 選擇「Docker Image」部署方式
   - 輸入鏡像地址
   - 配置環境變數（如需要）

### 方案 3：直接上傳

1. **準備部署文件**
   - 確保所有 HTML、CSS、資源文件都已準備好

2. **使用 Zeabur CLI**
   ```bash
   npm install -g zeabur
   zeabur login
   zeabur deploy --server-id server-6a3214c32a3ed2e7779aa127
   ```

## ⚙️ 環境配置

### 環境變數
- `NODE_ENV=production`

### 域名設置
1. 在 Zeabur 控制台配置自定義域名
2. 更新 DNS 記錄指向 Zeabur 提供的地址

## 📊 部署檢查

部署後請驗證：
- [ ] 首頁 (index.html) 正常加載
- [ ] About 頁 (/pages/about.html) 正常加載
- [ ] 所有資源（CSS、圖片）正確加載
- [ ] 頁面間導航正常工作
- [ ] 響應式設計在手機/平板正常顯示
- [ ] Console 中無錯誤

## 🔗 常用連結
- Zeabur 控制台: https://dash.zeabur.com
- 文檔: https://zeabur.com/docs

## 💡 優化建議

### 性能
- 啟用 Gzip 壓縮
- 使用 CDN 加速靜態資源
- 壓縮圖片大小

### SEO
- 確保 robots.txt 配置正確
- 添加 sitemap.xml
- 配置正確的 meta 標籤

## 🆘 故障排除

### 部署失敗
- 檢查 zeabur.json 配置語法
- 確保所有必需文件已上傳
- 查看 Zeabur 部署日誌

### 頁面無法加載
- 驗證文件路徑大小寫正確
- 確保 HTML 文件引用的資源路徑正確
- 檢查瀏覽器 Console 中的錯誤信息

### DNS 問題
- 等待 DNS 生效（通常 24-48 小時）
- 使用 `nslookup` 或 `dig` 命令驗證
