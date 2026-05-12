#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Word Cloud - Alibaba Cloud Server Initialization Script
# ═══════════════════════════════════════════════════════════════
# Run this ONCE after creating the ECS instance.
# Usage: ssh root@YOUR_SERVER_IP 'bash -s' < setup.sh
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

echo "========================================"
echo " Word Cloud - Server Setup Script"
echo "========================================"
echo ""

# ── 1. System Update ─────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt update -qq && apt upgrade -y -qq
echo "  ✓ System updated"

# ── 2. Install Node.js 20 LTS ─────────────────────────────────────
echo "[2/8] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
apt install -y nodejs -qq
echo "  ✓ Node.js $(node -v) installed"
echo "  ✓ npm $(npm -v) installed"

# ── 3. Install Build Tools ────────────────────────────────────────
echo "[3/8] Installing build tools..."
apt install -y build-essential git -qq
echo "  ✓ Build tools installed"

# ── 4. Install PM2 Process Manager ────────────────────────────────
echo "[4/8] Installing PM2 process manager..."
npm install -g pm2 -q
pm2_path=$(which pm2 || echo "/usr/lib/node_modules/pm2/bin/pm2")
echo "  ✓ PM2 installed"

# ── 5. Install Nginx ──────────────────────────────────────────────
echo "[5/8] Installing Nginx..."
apt install -y nginx -qq
# Remove default site
rm -f /etc/nginx/sites-enabled/default
echo "  ✓ Nginx installed"

# ── 6. Configure Firewall ─────────────────────────────────────────
echo "[6/8] Configuring firewall..."
apt install -y ufw -qq
ufw --force reset >/dev/null 2>&1
ufw default deny incoming >/dev/null 2>&1
ufw default allow outgoing >/dev/null 2>&1
ufw allow 22/tcp comment 'SSH' >/dev/null 2>&1
ufw allow 80/tcp comment 'HTTP' >/dev/null 2>&1
ufw allow 443/tcp comment 'HTTPS' >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1
echo "  ✓ Firewall configured (SSH:22, HTTP:80, HTTPS:443)"

# ── 7. Create Application Directory ────────────────────────────────
echo "[7/8] Creating application directories..."
mkdir -p /opt/word-cloud
mkdir -p /var/log/word-cloud
mkdir -p /etc/nginx/sites-available
echo "  ✓ Directories created"

# ── 8. Clone Application Repository ────────────────────────────────
echo "[8/8] Cloning application..."
if [ -d "/opt/word-cloud/.git" ]; then
  echo "  - Repository already exists, pulling latest..."
  cd /opt/word-cloud && git pull
else
  cd /opt/word-cloud
  git clone https://github.com/lwj952745887/word.cloud.git .
fi

# Install production dependencies
npm install --omit=dev
echo "  ✓ Dependencies installed"

echo ""
echo "========================================"
echo " ✅ Server initialization complete!"
echo "========================================"
echo ""
echo "Next steps (manual):"
echo "  1. Copy nginx.conf:"
echo "     cp /opt/word-cloud/deploy/nginx.conf /etc/nginx/sites-available/word-cloud"
echo "     ln -sf /etc/nginx/sites-available/word-cloud /etc/nginx/sites-enabled/"
echo "     nginx -t && systemctl reload nginx"
echo ""
echo "  2. Start application:"
echo "     cp /opt/word-cloud/deploy/ecosystem.config.js /opt/word-cloud/"
echo "     cd /opt/word-cloud && pm2 start ecosystem.config.js"
echo "     pm2 save && pm2 startup"
echo ""
echo "  3. (Optional) Setup SSL with Let's Encrypt:"
echo "     apt install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d YOUR_DOMAIN"
echo ""
