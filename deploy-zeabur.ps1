# Zeabur CLI 部署腳本
# 項目編號: 6a321691302ffbcd03a948aa

# 1. 安裝 Zeabur CLI（如未安裝）
Write-Host "正在檢查 Zeabur CLI..." -ForegroundColor Cyan
npm list -g zeabur 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "正在安裝 Zeabur CLI..." -ForegroundColor Yellow
    npm install -g zeabur
}

# 2. 登入 Zeabur（首次需要）
Write-Host "正在登入 Zeabur..." -ForegroundColor Cyan
zeabur login

# 3. 確認當前目錄是 git repository
Write-Host "正在檢查 git 狀態..." -ForegroundColor Cyan
git status

# 4. 推送到 Zeabur
Write-Host "正在推送到 Zeabur 項目 (6a321691302ffbcd03a948aa)..." -ForegroundColor Cyan
zeabur deploy --project 6a321691302ffbcd03a948aa

Write-Host "部署完成！" -ForegroundColor Green
Write-Host "請訪問 Zeabur 控制台查看部署狀態: https://dash.zeabur.com" -ForegroundColor Blue
