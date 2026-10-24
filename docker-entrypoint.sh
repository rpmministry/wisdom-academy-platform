#!/bin/sh
set -eu

DB_PATH="${WISDOM_DB_PATH:-/data/wisdom.db}"
BACKUP_DIR="${WISDOM_BACKUP_DIR:-/data/backups}"

mkdir -p "$(dirname "$DB_PATH")" "$BACKUP_DIR"
chown -R node:node /data
chown -R node:node "$(dirname "$DB_PATH")" "$BACKUP_DIR" 2>/dev/null || true

run_as_node() {
  if command -v setpriv >/dev/null 2>&1; then
    setpriv --reuid=node --regid=node --init-groups "$@"
  else
    "$@"
  fi
}

if [ "${RUN_N2N_IMPORT:-0}" = "1" ] && [ ! -f /data/.n2n-semester-1-imported ]; then
  echo "Importando Programa de Teologia N2N..."
  if run_as_node npm run import:n2n-semester-1; then
    touch /data/.n2n-semester-1-imported
  else
    echo "ADVERTENCIA: la importacion N2N fallo; la aplicacion arrancara igualmente."
  fi
fi

if command -v setpriv >/dev/null 2>&1; then
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
