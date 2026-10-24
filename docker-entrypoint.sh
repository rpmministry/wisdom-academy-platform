#!/bin/sh
set -eu

DB_PATH="${WISDOM_DB_PATH:-/data/wisdom.db}"
BACKUP_DIR="${WISDOM_BACKUP_DIR:-/data/backups}"

mkdir -p "$(dirname "$DB_PATH")" "$BACKUP_DIR"
chown -R node:node /data
chown -R node:node "$(dirname "$DB_PATH")" "$BACKUP_DIR" 2>/dev/null || true

if [ "${RUN_N2N_IMPORT:-0}" = "1" ] && [ ! -f /data/.n2n-semester-1-imported ]; then
  echo "Importando Programa de Teologia N2N..."
  gosu node npm run import:n2n-semester-1
  touch /data/.n2n-semester-1-imported
fi

exec gosu node "$@"
