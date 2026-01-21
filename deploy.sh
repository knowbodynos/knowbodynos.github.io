#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/homepage"
BRANCH="main"
APP_NAME="homepage"

cd "$APP_DIR"

echo "== Install deps =="
sudo apt update && sudo apt -y upgrade
sudo apt -y install git curl nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt -y install nodejs
sudo npm i -g pm2

# Create a .env.production.local file

echo "== Build =="
npm install
npm ci
npm run build

echo "== Start app via PM2 =="
if pm2 pid "$APP_NAME" > /dev/null; then
    pm2 reload "$APP_NAME" || pm2 restart "$APP_NAME"
else
    pm2 start ecosystem.config.cjs
    pm2 startup
fi

echo "== Save PM2 process list =="
pm2 save
pm2 status "$APP_NAME"

echo "== Setup NGINX =="
sudo cp "nginx/sites-available/homepage" "/etc/nginx/sites-available/$APP_NAME"
sudo ln -s "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo nginx -t
sudo systemctl reload nginx

echo "== Done =="
echo "Setup domain certificate by running the following command:"
echo "sudo certbot --nginx -d example.com -d www.example.com"