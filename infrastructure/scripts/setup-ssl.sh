#!/bin/bash
# ============================================================
# ERP System - Let's Encrypt SSL Setup with Certbot
# Run as root on Ubuntu/Debian server
# ============================================================

set -euo pipefail

DOMAIN="${DOMAIN:-yourdomain.com}"
EMAIL="${CERTBOT_EMAIL:-admin@yourdomain.com}"

echo "=== SSL Certificate Setup for: $DOMAIN ==="

# Install Certbot
if ! command -v certbot &> /dev/null; then
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Stop Nginx temporarily for standalone verification
# Or use webroot if Nginx is running
if systemctl is-active --quiet nginx; then
    certbot certonly \
        --webroot \
        --webroot-path /var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
else
    certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN" \
        -d "www.$DOMAIN"
fi

echo ""
echo "=== SSL Certificate installed ==="
echo "Certificate location: /etc/letsencrypt/live/$DOMAIN/"

# ─── Auto-renewal cron ──────────────────────────────────────
# Add auto-renewal (runs twice daily, renews when <30 days left)
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "0 */12 * * * certbot renew --quiet --post-hook 'docker compose -f /opt/erp/docker-compose.prod.yml restart nginx'") | crontab -
    echo "Auto-renewal cron job added."
fi

# ─── DH parameters ──────────────────────────────────────────
if [ ! -f /etc/nginx/dhparam.pem ]; then
    echo "Generating DH parameters (this may take a few minutes)..."
    openssl dhparam -out /etc/nginx/dhparam.pem 4096
    echo "DH parameters generated."
fi

echo "SSL setup complete!"
