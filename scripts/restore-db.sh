#!/bin/bash
set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz>}"
COMPOSE_FILE="/opt/clickprops/docker-compose.prod.yml"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "🔄 Restoring database from: $BACKUP_FILE"

# Extract and restore
gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-clickprops}"

echo "✅ Database restore complete"
echo "📝 Next: Restart app with: docker compose -f docker-compose.prod.yml up -d app"
