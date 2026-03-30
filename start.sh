#!/bin/bash
# のびSHOP 起動スクリプト
# IPアドレスを自動取得してconfig.jsonを更新してからサーバーを起動

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo "{\"ip\":\"$IP\",\"url\":\"http://$IP:3333\"}" > "$(dirname "$0")/public/config.json"
echo "✅ アプリURL: http://$IP:3333"
echo "📱 iPhoneからは QR タブを開いてスキャンしてください"
npx serve -p 3333 "$(dirname "$0")/public"
