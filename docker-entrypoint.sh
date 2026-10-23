#!/bin/sh
set -eu

DB_PATH="${WISDOM_DB_PATH:-/data/wisdom.db}"
BACKUP_DIR="${WISDOM_BACKUP_DIR:-/data/backups}"

mkdir -p "$(dirname "$DB_PATH")" "$BACKUP_DIR"
chown -R node:node /data
chown -R node:node "$(dirname "$DB_PATH")" "$BACKUP_DIR" 2>/dev/null || true

exec gosu node "$@"
