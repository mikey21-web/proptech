#!/bin/bash
set -e

# ClickProps CRM Database Backup Script
# Usage: ./scripts/backup.sh [backup_dir]

BACKUP_DIR="${1:-/opt/clickprops/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/clickprops_backup_$DATE.sql.gz"
RETENTION_DAYS=7

echo "💾 ClickProps CRM Database Backup"
echo "================================="

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database connection from environment
if [[ -z "$DATABASE_URL" ]]; then
    # Try to get from docker container
    DATABASE_URL=$(docker compose exec -T postgres printenv DATABASE_URL 2>/dev/null || echo "")
fi

if [[ -z "$DATABASE_URL" ]]; then
    echo "❌ DATABASE_URL not found in environment"
    exit 1
fi

# Parse database credentials from URL
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

if [[ -z "$DB_HOST" || -z "$DB_NAME" || -z "$DB_USER" ]]; then
    echo "❌ Could not parse database credentials from DATABASE_URL"
    exit 1
fi

echo "📊 Database: $DB_NAME"
echo "🏠 Host: $DB_HOST:${DB_PORT:-5432}"
echo "💾 Backup file: $BACKUP_FILE"

# Perform backup
echo "⏳ Creating backup..."
if [[ "$DB_HOST" == "postgres" || "$DB_HOST" == "localhost" ]]; then
    # Local Docker container
    docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    # Remote PostgreSQL
    PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Verify backup
if [[ -f "$BACKUP_FILE" && $(wc -c < "$BACKUP_FILE") -gt 1000 ]]; then
    echo "✅ Backup created successfully: $(ls -lh "$BACKUP_FILE")"
else
    echo "❌ Backup file creation failed"
    exit 1
fi

# Clean old backups
echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "clickprops_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# List remaining backups
echo "📋 Remaining backups:"
ls -lh "$BACKUP_DIR"/clickprops_backup_*.sql.gz 2>/dev/null || echo "No backups found"

# Create restore instructions
cat > "$BACKUP_DIR/restore_instructions.txt" << EOF
# ClickProps CRM Database Restore Instructions
# ===========================================
# To restore from backup $BACKUP_FILE:

# Method 1: Using docker compose
docker compose exec -T postgres gunzip -c $BACKUP_FILE | psql -U $DB_USER $DB_NAME

# Method 2: Direct PostgreSQL
gunzip -c $BACKUP_FILE | PGPASSWORD="$DB_PASS" psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER $DB_NAME

# Note: This will overwrite existing data!
EOF

echo "📝 Restore instructions saved to $BACKUP_DIR/restore_instructions.txt"
echo "✅ Backup process completed!"