#!/usr/bin/env bash
# Daily MongoDB backup for the Dockerized single-VPS setup.
# Dumps the database from the running "mongo" container into ./backups and
# keeps the last 14 days. Schedule it with cron, e.g.:
#   0 3 * * * /var/www/SmileMakerStore/deploy/backup.sh >> /var/log/smilemaker-backup.log 2>&1
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
STAMP="$(date +%F_%H-%M)"
mkdir -p "$BACKUP_DIR"

# Dump inside the container, then copy the archive out to the host.
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T mongo \
  sh -c 'mongodump --db smilemaker --archive --gzip' > "$BACKUP_DIR/smilemaker_$STAMP.gz"

echo "Backup written: $BACKUP_DIR/smilemaker_$STAMP.gz"

# Retention: delete backups older than 14 days.
find "$BACKUP_DIR" -name 'smilemaker_*.gz' -mtime +14 -delete
echo "Old backups pruned."

# Restore later with:
#   docker compose exec -T mongo sh -c 'mongorestore --archive --gzip --drop' < backups/FILE.gz
