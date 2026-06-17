@echo off
REM Zeabur CLI 部署腳本 (Batch)
REM 項目編號: 6a321691302ffbcd03a948aa

setlocal enabledelayedexpansion

echo 正在檢查 Zeabur CLI...
npm list -g zeabur >nul 2>&1
if errorlevel 1 (
    echo 正在安裝 Zeabur CLI...
    call npm install -g zeabur
)

echo 正在登入 Zeabur...
call zeabur login

echo 正在檢查 git 狀態...
call git status

echo 正在推送到 Zeabur 項目...
call zeabur deploy --project 6a321691302ffbcd03a948aa

echo.
echo 部署完成！
echo 請訪問 Zeabur 控制台查看部署狀態: https://dash.zeabur.com
pause
