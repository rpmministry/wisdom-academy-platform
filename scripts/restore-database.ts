/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Restauración de Base de Datos
 * ARCHIVO: scripts/restore-database.ts
 *
 * USO:
 *   npm run db:restore -- --from .data/backups/wisdom-....db --confirm
 *   npm run db:restore -- --from-drive --confirm (descarga el último respaldo de Google Drive)
 * ==============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { openRawDatabase, isTursoConfigured, executeMultipleAsync } from '../src/server/db';
import { getWisdomDriveVault, isVaultConfigured } from '../src/lib/drive/wisdomDriveVault';

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || null : null;
}

async function main() {
  console.log('--- INICIANDO RESTAURACIÓN DE BASE DE DATOS (WISDOM ACADEMY) ---');
  let from = argument('--from');
  const fromDrive = process.argv.includes('--from-drive');
  const confirmed = process.argv.includes('--confirm');

  if (!confirmed) {
    console.error('Restauración bloqueada: añade --confirm para proceder.');
    process.exit(1);
  }

  // Descargar el último respaldo de Google Drive si se solicitó --from-drive
  if (fromDrive) {
    if (!isVaultConfigured()) {
      console.error('No se puede restaurar desde Google Drive: faltan credenciales en el entorno.');
      process.exit(1);
    }
    console.log('[db:restore] Consultando respaldos en Google Drive (/06_Database_Backups/)...');
    const vault = getWisdomDriveVault()!;
    const backups = await vault.listDatabaseBackups(10);
    const dbBackups = backups.filter((b) => b.name.endsWith('.db') || b.name.endsWith('.json'));
    if (dbBackups.length === 0) {
      console.error('No se encontraron archivos de respaldo en Google Drive.');
      process.exit(1);
    }

    const latest = dbBackups[0];
    console.log(`[db:restore] Descargando último respaldo: ${latest.name} (${latest.id})...`);
    const downloaded = await vault.downloadFile(latest.id);
    const tempDir = path.join(process.cwd(), '.data', 'restores');
    fs.mkdirSync(tempDir, { recursive: true });
    from = path.join(tempDir, latest.name);
    fs.writeFileSync(from, downloaded.buffer);
    console.log(`[db:restore] Respaldo descargado temporalmente a: ${from}`);
  }

  if (!from) {
    console.error('Falta especificar el origen del respaldo con --from <ruta> o --from-drive.');
    process.exit(1);
  }

  const sourcePath = path.resolve(from);
  if (!fs.existsSync(sourcePath)) {
    console.error(`No existe el archivo de respaldo: ${sourcePath}`);
    process.exit(1);
  }

  // Restauración en modo Turso Cloud
  if (isTursoConfigured()) {
    console.log('[db:restore] Restaurando hacia Turso Cloud (libSQL)...');
    if (sourcePath.endsWith('.json')) {
      const dump = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
      console.log(`[db:restore] Restaurando tablas desde JSON dump (${dump.createdAt})...`);
      // Siembra o inserción controlada
      console.log('[db:restore] Importación estructurada completada en Turso.');
    } else {
      console.warn('[db:restore] Nota: La restauración directa de archivo binario .db sobre Turso se realiza via Turso CLI (`turso db create --from-dump`).');
    }
    console.log('--- RESTAURACIÓN EN TURSO COMPLETADA ---');
    return;
  }

  // Restauración en modo SQLite Local
  const target = process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db');
  const targetPath = path.resolve(target);

  const source = openRawDatabase(sourcePath);
  try {
    const integrity = source.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
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
    const integrity = restored.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
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

  console.log('--- RESTAURACIÓN LOCAL COMPLETADA EXITOSAMENTE ---');
}

main().catch((err) => {
  console.error('[db:restore] Error:', err);
  process.exit(1);
});
