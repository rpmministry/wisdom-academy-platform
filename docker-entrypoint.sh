#!/bin/sh
set -eu

DB_PATH="${WISDOM_DB_PATH:-/data/wisdom.db}"
BACKUP_DIR="${WISDOM_BACKUP_DIR:-/data/backups}"

mkdir -p "$(dirname "$DB_PATH")" "$BACKUP_DIR" 2>/dev/null || true
if [ "$(id -u)" = "0" ]; then
  chown -R node:node /data 2>/dev/null || true
  chown -R node:node "$(dirname "$DB_PATH")" "$BACKUP_DIR" 2>/dev/null || true
fi

run_as_node() {
  if [ "$(id -u)" = "0" ] && command -v setpriv >/dev/null 2>&1; then
    setpriv --reuid=node --regid=node --init-groups "$@"
  else
    "$@"
  fi
}

if [ "${RUN_N2N_IMPORT:-0}" = "1" ] && [ ! -f /data/.n2n-semester-1-imported ]; then
  echo "Importando Programa de Teologia N2N..."
  if run_as_node npm run import:n2n-semester-1; then
    touch /data/.n2n-semester-1-imported 2>/dev/null || true
  else
    echo "ADVERTENCIA: la importacion N2N fallo; la aplicacion arrancara igualmente."
  fi
fi

if [ "$(id -u)" = "0" ] && command -v setpriv >/dev/null 2>&1; then
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
