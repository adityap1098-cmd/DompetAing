#!/bin/bash
# ══════════════════════════════════════════════════════════
# DompetAing — PostgreSQL Backup Script
#
# Usage:
#   ./scripts/backup.sh           # Manual backup
#   crontab: 0 2 * * * /opt/dompetaing/scripts/backup.sh
#
# Backups saved to /backups/dompetaing_YYYY-MM-DD_HH-MM.sql.gz
# Retains last 7 days, deletes older backups automatically.
# ══════════════════════════════════════════════════════════

set -euo pipefail

BACKUP_DIR="/backups"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETAIN_DAYS=7
CONTAINER_NAME="dompetaing_postgres"
DB_NAME="dompetaing"
DB_USER="dompetaing"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Backup started ==="

# Check container is running
if ! docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q true; then
    log "ERROR: Container $CONTAINER_NAME is not running!"
    exit 1
fi

# Run pg_dump inside container → gzip → save to host
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists | gzip > "$BACKUP_FILE"; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "SUCCESS: $BACKUP_FILE ($FILE_SIZE)"
else
    log "ERROR: pg_dump failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Verify backup is not empty
if [ ! -s "$BACKUP_FILE" ]; then
    log "ERROR: Backup file is empty!"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# Cleanup old backups (older than RETAIN_DAYS)
DELETED=0
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +${RETAIN_DAYS} | while read -r old; do
    rm -f "$old"
    DELETED=$((DELETED + 1))
    log "DELETED old backup: $(basename "$old")"
done

# Show current backups
TOTAL=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -1 | cut -f1)
log "Total backups: $TOTAL files"
log "=== Backup completed ==="
