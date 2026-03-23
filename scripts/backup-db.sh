#!/bin/bash
set -euo pipefail

# ============================================
# ClickProps - PostgreSQL Backup Script
# Run via cron: 0 2 * * * /opt/clickprops/scripts/backup-db.sh
# ============================================

BACKUP_DIR="/opt/clickprops/backups"
COMPOSE_FILE="/opt/clickprops/docker-compose.prod.yml"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/clickprops_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting database backup..."

# Dump database from running container
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-clickprops}" clickprops | gzip > "${BACKUP_FILE}"

# Verify backup
if [ -s "${BACKUP_FILE}" ]; then
  SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "[$(date)] Backup complete: ${BACKUP_FILE} (${SIZE})"
else
  echo "[$(date)] ERROR: Backup file is empty!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Remove old backups
find "${BACKUP_DIR}" -name "clickprops_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned up backups older than ${RETENTION_DAYS} days"
