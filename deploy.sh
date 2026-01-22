#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/homepage"
BRANCH="main"
APP_NAME="homepage"

cd "$APP_DIR"

# Ensure pm2 uses the same home as the running pm2 instance (adjust if different)
export PM2_HOME=/home/ubuntu/.pm2

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
pm2 delete "$APP_NAME" || true
pm2 start ecosystem.config.cjs
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo "== Save PM2 process list =="
pm2 save
pm2 status "$APP_NAME"

echo "== Setup NGINX =="
sudo rm -f "/etc/nginx/sites-enabled/default"
sudo cp "nginx/sites-available/$APP_NAME" "/etc/nginx/sites-available/$APP_NAME"
sudo ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"
sudo nginx -t
sudo systemctl reload nginx

echo "== Done =="
echo ""
echo "To update the nginx site with your domain and setup domain certificate, run (replace DOMAIN):"
echo -en "DOMAIN=mydomain.com && \\ \nsudo sed -i \ \n  -e 's/listen 80 default_server;/listen 80;/' \ \n  -e 's/listen \[::\]:80 default_server;/listen [::]:80;/' \ \n  -e 's/server_name _;/server_name \${DOMAIN} www.\${DOMAIN};/' \ \n  /etc/nginx/sites-available/$APP_NAME && \\ \nsudo nginx -t && \\ \nsudo systemctl reload nginx && \\ \nsudo certbot --nginx -d \${DOMAIN} -d www.\${DOMAIN\n"