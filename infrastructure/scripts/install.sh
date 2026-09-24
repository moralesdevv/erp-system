#!/bin/bash
# ============================================================
# ERP System - Production Server Installation Script
# Run as root on a fresh Ubuntu 22.04 LTS server
# ============================================================

set -euo pipefail

APP_DIR="/opt/erp"
BACKUP_DIR="/opt/erp/backups"

echo "=== ERP System Production Installation ==="

# ─── System update ──────────────────────────────────────────
apt-get update && apt-get upgrade -y

# ─── Install dependencies ───────────────────────────────────
apt-get install -y \
    curl wget git unzip \
    ufw fail2ban \
    nginx certbot python3-certbot-nginx \
    ca-certificates gnupg lsb-release

# ─── Install Docker ─────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker $SUDO_USER
fi

# ─── Install Docker Compose ─────────────────────────────────
if ! command -v docker compose &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

# ─── Create app directory ───────────────────────────────────
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"

# ─── Setup firewall ─────────────────────────────────────────
bash "$APP_DIR/infrastructure/scripts/setup-firewall.sh"

# ─── Setup Fail2Ban ─────────────────────────────────────────
cp "$APP_DIR/infrastructure/fail2ban/jail.local" /etc/fail2ban/jail.local
cp "$APP_DIR/infrastructure/fail2ban/filter.d/erp-api.conf" /etc/fail2ban/filter.d/erp-api.conf
systemctl enable fail2ban && systemctl restart fail2ban

# ─── Setup backup cron ──────────────────────────────────────
chmod +x "$APP_DIR/infrastructure/scripts/backup.sh"
(crontab -l 2>/dev/null; echo "0 */6 * * * $APP_DIR/infrastructure/scripts/backup.sh >> /var/log/erp-backup.log 2>&1") | crontab -

# ─── Setup SSL ──────────────────────────────────────────────
# Requires DOMAIN and CERTBOT_EMAIL to be set
bash "$APP_DIR/infrastructure/scripts/setup-ssl.sh"

# ─── Start application ──────────────────────────────────────
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Installation complete ==="
echo "ERP system running at https://$DOMAIN"
echo "IMPORTANT: Change the default admin password immediately!"
