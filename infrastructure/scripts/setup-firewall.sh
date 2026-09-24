#!/bin/bash
# ============================================================
# ERP System - UFW Firewall Setup Script
# Run as root on Ubuntu/Debian server
# ============================================================

set -euo pipefail

echo "=== ERP Firewall Setup ==="

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    apt-get update && apt-get install -y ufw
fi

# Reset UFW to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# ─── Allow essential ports ──────────────────────────────────
# SSH (change port if you use non-standard SSH)
ufw allow 22/tcp comment 'SSH'

# HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP (redirects to HTTPS)'
ufw allow 443/tcp comment 'HTTPS'

# ─── Block everything else ──────────────────────────────────
# PostgreSQL — NEVER expose publicly
# Redis — NEVER expose publicly
# NestJS backend — accessed only via Nginx
# These are blocked by the default deny incoming policy

# ─── Rate limiting at kernel level (optional) ───────────────
# Limit SSH brute force at firewall level
ufw limit 22/tcp comment 'SSH rate limit'

# ─── Enable UFW ─────────────────────────────────────────────
ufw --force enable
ufw status verbose

echo ""
echo "=== Firewall configured ==="
echo "Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
echo "All other ports blocked."

# ─── Additional iptables rules ──────────────────────────────
# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP
# Drop TCP packets with RST+FIN
iptables -A INPUT -p tcp --tcp-flags FIN,RST FIN,RST -j DROP
# Drop SYN+FIN (stealth scan prevention)
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP
# Limit new TCP connections (anti-SYN flood)
iptables -A INPUT -p tcp --syn -m limit --limit 25/s --limit-burst 50 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

echo "iptables hardening applied."
