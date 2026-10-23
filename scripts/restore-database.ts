/**
 * Restauración controlada de un respaldo SQLite.
 *
 * Uso:
 *   npm run db:restore -- --from .data/backups/wisdom-....db --confirm
 *
 * Antes de reemplazar, crea un respaldo de seguridad del archivo actual.
 * No está permitido ejecutar esta operación de forma implícita.
 */

import fs from 'node:fs';
import path from 'node:path';
import { openRawDatabase } from '../src/server/db';

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
}

const from = argument('--from');
const confirmed = process.argv.includes('--confirm');
const target =
  process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db');

if (!from) {
  console.error('Falta --from con la ruta del respaldo.');
  process.exit(1);
}
if (!confirmed) {
  console.error('Restauración bloqueada: añade --confirm tras revisar el respaldo.');
  process.exit(1);
}
const sourcePath = path.resolve(from);
const targetPath = path.resolve(target);
if (!fs.existsSync(sourcePath)) {
  console.error(`No existe el respaldo: ${sourcePath}`);
  process.exit(1);
}

const source = openRawDatabase(sourcePath);
try {
  const integrity = source.prepare('PRAGMA integrity_check').get() as {
    integrity_check: string;
  };
  if (integrity.integrity_check !== 'ok') {
    console.error('El respaldo no supera integrity_check. Restauración cancelada.');
    process.exit(1);
  }
} finally {
  source.close();
}

fs.mkdirSync(path.dirname(targetPath), { recursive: true });
if (fs.existsSync(targetPath)) {
  const safety = `${targetPath}.pre-restore-${Date.now()}`;
  fs.copyFileSync(targetPath, safety);
  console.log(`Respaldo de seguridad del archivo actual: ${safety}`);
}

for (const suffix of ['-wal', '-shm']) {
  const file = `${targetPath}${suffix}`;
  if (fs.existsSync(file)) fs.rmSync(file, { force: true });
}
fs.copyFileSync(sourcePath, targetPath);

const restored = openRawDatabase(targetPath);
try {
  const integrity = restored.prepare('PRAGMA integrity_check').get() as {
    integrity_check: string;
  };
  if (integrity.integrity_check !== 'ok') {
    throw new Error('La base restaurada no supera integrity_check.');
  }
  const migrations = restored.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
    version: number | null;
  };
  console.log(`Base restaurada y verificada: ${targetPath}`);
  console.log(`Versión de esquema: ${migrations.version ?? 'desconocida'}`);
} finally {
  restored.close();
}
