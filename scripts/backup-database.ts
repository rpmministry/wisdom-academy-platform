/**
 * Respaldo consistente de la base SQLite usando VACUUM INTO.
 * El archivo resultante se verifica con PRAGMA integrity_check.
 */

import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath, openRawDatabase } from '../src/server/db';

const source = getDatabasePath() || process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db');
if (source === ':memory:') {
  console.error('No se puede respaldar una base en memoria.');
  process.exit(1);
}
if (!fs.existsSync(source)) {
  console.error(`No existe la base de datos: ${source}`);
  process.exit(1);
}

const directory = process.env.WISDOM_BACKUP_DIR || path.join(process.cwd(), '.data', 'backups');
fs.mkdirSync(directory, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(directory, `wisdom-${stamp}.db`);

const database = openRawDatabase(source);
try {
  database.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const verification = openRawDatabase(target);
  try {
    const integrity = verification.prepare('PRAGMA integrity_check').get() as {
      integrity_check: string;
    };
    if (integrity.integrity_check !== 'ok') {
      throw new Error(`integrity_check devolvió: ${integrity.integrity_check}`);
    }
    const counts = {
      users: Number((verification.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }).total),
      orders: Number((verification.prepare('SELECT COUNT(*) AS total FROM orders').get() as { total: number }).total),
      entitlements: Number((verification.prepare('SELECT COUNT(*) AS total FROM entitlements').get() as { total: number }).total),
    };
    fs.writeFileSync(
      `${target}.manifest.json`,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          source: path.basename(source),
          integrity: 'ok',
          counts,
        },
        null,
        2
      ),
      { encoding: 'utf8', mode: 0o600 }
    );
    console.log(`Respaldo verificado: ${target}`);
    console.log(`Usuarios: ${counts.users} · Órdenes: ${counts.orders} · Derechos: ${counts.entitlements}`);
    console.log('No se copiaron contraseñas, tokens ni códigos en texto claro al manifiesto.');
  } finally {
    verification.close();
  }
} finally {
  database.close();
}
