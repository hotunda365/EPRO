# Zeabur 部署指南

## 📝 部署信息
- **項目編號**: `6a321691302ffbcd03a948aa`
- **區域**: 香港 (HKG)
- **項目類型**: 靜態網站
- **部署方式**: Zeabur CLI（推薦）

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

### 方案 3：Zeabur CLI（推薦）⭐

**使用預製部署腳本：**

Windows (PowerShell)：
```powershell
.\deploy-zeabur.ps1
```

Windows (Command Prompt)：
```cmd
deploy-zeabur.bat
```

Linux/macOS：
```bash
chmod +x deploy-zeabur.sh
./deploy-zeabur.sh
```

**或手動執行以下步驟：**

1. **安裝 Zeabur CLI**
   ```bash
   npm install -g zeabur
   ```

2. **登入 Zeabur**
   ```bash
   zeabur login
   ```

3. **驗證 Git 狀態**
   ```bash
   git status
   ```

4. **部署到 Zeabur**
   ```bash
   zeabur deploy --project 6a321691302ffbcd03a948aa
   ```

5. **查看部署日誌**
   ```bash
   zeabur logs --project 6a321691302ffbcd03a948aa
   ```

## ⚙️ 環境配置

### 環境變數
- `NODE_ENV=production`

### 域名設置

### CLI 常見問題

| 問題 | 解決方案 |
|------|---------|
| `zeabur: command not found` | 執行 `npm install -g zeabur` 重新安裝 |
| `Not authenticated` | 執行 `zeabur login` 並用有效帳號登入 |
| `Project not found` | 確認項目編號 `6a321691302ffbcd03a948aa` 正確 |
| 部署卡住 | 檢查網路連接，或執行 `zeabur logs --project 6a321691302ffbcd03a948aa` 查看詳細日誌 |

## 📋 部署檢查清單

部署成功後，請驗證以下項目：
- [ ] 首頁 (index.html) 正常加載
- [ ] About 頁 (/pages/about.html) 正常加載
- [ ] 所有資源（CSS、圖片、影片）正確加載
- [ ] 頁面間導航正常工作
- [ ] 響應式設計在手機/平板正常顯示
- [ ] Console 中無錯誤
- [ ] 頁腳顯示正確（黑色法律頁腳可見，中間面板已隱藏）

## 📊 部署後驗證

```bash
# 查看部署狀態
zeabur project info --project 6a321691302ffbcd03a948aa

# 查看實時日誌
zeabur logs --project 6a321691302ffbcd03a948aa -f

# 列出所有部署
zeabur deploy list --project 6a321691302ffbcd03a948aa
```
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
