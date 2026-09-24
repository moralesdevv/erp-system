#!/bin/bash
# ============================================================
# ERP System - Automated Backup Script
# Schedule with cron for production use
# ============================================================

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/erp/backups}"
APP_DIR="${APP_DIR:-/opt/erp}"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=3

# Load env vars
if [ -f "$APP_DIR/.env" ]; then
    source "$APP_DIR/.env"
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-erp-system-postgres-1}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE=$(date +"%Y%m%d")

# ─── Create backup directories ──────────────────────────────
mkdir -p "$BACKUP_DIR/database/daily"
mkdir -p "$BACKUP_DIR/database/weekly"
mkdir -p "$BACKUP_DIR/database/monthly"
mkdir -p "$BACKUP_DIR/uploads"
mkdir -p "$BACKUP_DIR/configs"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# ─── Database backup ────────────────────────────────────────
backup_database() {
    log "Starting database backup..."

    local backup_file="$BACKUP_DIR/database/daily/erp_db_${TIMESTAMP}.sql.gz"

    docker exec "$POSTGRES_CONTAINER" pg_dump \
        -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" \
        --no-password \
        --clean \
        --if-exists \
        --create \
        | gzip -9 > "$backup_file"

    local size=$(du -sh "$backup_file" | cut -f1)
    log "Database backup complete: $backup_file ($size)"

    # Verify backup
    if ! gzip -t "$backup_file" 2>/dev/null; then
        log "ERROR: Database backup file is corrupted!"
        rm -f "$backup_file"
        exit 1
    fi
}

# ─── Uploads backup ─────────────────────────────────────────
backup_uploads() {
    log "Starting uploads backup..."

    local backup_file="$BACKUP_DIR/uploads/uploads_${TIMESTAMP}.tar.gz"
    local uploads_dir="$APP_DIR/backend/uploads"

    if [ -d "$uploads_dir" ]; then
        tar -czf "$backup_file" -C "$APP_DIR/backend" uploads
        local size=$(du -sh "$backup_file" | cut -f1)
        log "Uploads backup complete: $backup_file ($size)"
    else
        log "No uploads directory found, skipping."
    fi
}

# ─── Config backup ──────────────────────────────────────────
backup_configs() {
    log "Starting configs backup..."

    local backup_file="$BACKUP_DIR/configs/configs_${TIMESTAMP}.tar.gz"

    # Exclude .env files with actual secrets — back up examples only
    tar -czf "$backup_file" \
        --exclude='**/*.env' \
        --exclude='**/node_modules' \
        --exclude='**/.next' \
        --exclude='**/dist' \
        -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")/nginx" \
        -C "$(dirname "$APP_DIR")" "$(basename "$APP_DIR")/infrastructure" 2>/dev/null || true

    log "Config backup complete: $backup_file"
}

# ─── Weekly backup (copy from daily) ────────────────────────
weekly_backup() {
    if [ "$(date +%u)" -eq 7 ]; then # Sunday
        log "Creating weekly backup..."
        cp "$BACKUP_DIR/database/daily/erp_db_${TIMESTAMP}.sql.gz" \
           "$BACKUP_DIR/database/weekly/erp_db_weekly_${DATE}.sql.gz"
    fi
}

# ─── Monthly backup (copy from daily) ───────────────────────
monthly_backup() {
    if [ "$(date +%d)" -eq 1 ]; then # First of month
        log "Creating monthly backup..."
        cp "$BACKUP_DIR/database/daily/erp_db_${TIMESTAMP}.sql.gz" \
           "$BACKUP_DIR/database/monthly/erp_db_monthly_${DATE}.sql.gz"
    fi
}

# ─── Cleanup old backups ─────────────────────────────────────
cleanup_old_backups() {
    log "Cleaning up old backups..."

    find "$BACKUP_DIR/database/daily" -name "*.sql.gz" -mtime "+$RETENTION_DAILY" -delete
    find "$BACKUP_DIR/database/weekly" -name "*.sql.gz" -mtime "+$((RETENTION_WEEKLY * 7))" -delete
    find "$BACKUP_DIR/database/monthly" -name "*.sql.gz" -mtime "+$((RETENTION_MONTHLY * 30))" -delete
    find "$BACKUP_DIR/uploads" -name "*.tar.gz" -mtime "+$RETENTION_DAILY" -delete

    log "Cleanup complete."
}

# ─── Main ───────────────────────────────────────────────────
log "=== ERP Backup started ==="

backup_database
backup_uploads
backup_configs
weekly_backup
monthly_backup
cleanup_old_backups

log "=== ERP Backup completed ==="
