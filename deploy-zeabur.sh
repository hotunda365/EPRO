#!/bin/bash
# Zeabur CLI 部署腳本（Linux/macOS）
# 項目編號: 6a321691302ffbcd03a948aa

echo "正在檢查 Zeabur CLI..."
if ! command -v zeabur &> /dev/null; then
    echo "正在安裝 Zeabur CLI..."
    npm install -g zeabur
fi

echo "正在登入 Zeabur..."
zeabur login

echo "正在檢查 git 狀態..."
git status

echo "正在推送到 Zeabur 項目..."
zeabur deploy --project 6a321691302ffbcd03a948aa

echo "部署完成！"
echo "請訪問 Zeabur 控制台查看部署狀態: https://dash.zeabur.com"
