#!/bin/bash
# ══════════════════════════════════════════════════════════
# DompetAing — PostgreSQL Restore Script
#
# Usage:
#   ./scripts/restore.sh /backups/dompetaing_2026-04-01_02-00.sql.gz
# ══════════════════════════════════════════════════════════

set -euo pipefail

CONTAINER_NAME="dompetaing_postgres"
DB_NAME="dompetaing"
DB_USER="dompetaing"

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    echo ""
    echo "Available backups:"
    ls -lht /backups/${DB_NAME}_*.sql.gz 2>/dev/null || echo "  No backups found"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: File not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE all data in database '$DB_NAME'!"
echo "Backup file: $BACKUP_FILE"
echo ""
read -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo "Restoring..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" --quiet 2>&1 | tail -5

echo "✅ Restore completed from: $(basename "$BACKUP_FILE")"
