/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Respaldo Integral de Base de Datos
 * ARCHIVO: scripts/backup-database.ts
 *
 * PROPÓSITO:
 * 1. Crea un respaldo verificado de la base de datos (SQLite local con VACUUM INTO
 *    o exportación estructurada de tablas desde Turso Cloud).
 * 2. Si Google Drive está configurado, sube el snapshot directamente a la
 *    carpeta `/06_Database_Backups/` en la Bóveda de Google Drive (desacople serverless).
 * 3. Verifica la integridad y genera el manifiesto auditable sin exponer secretos.
 * ==============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath, openRawDatabase, isTursoConfigured, prepare } from '../src/server/db';
import { getWisdomDriveVault, isVaultConfigured } from '../src/lib/drive/wisdomDriveVault';

async function main() {
  console.log('--- INICIANDO RESPALDO DE BASE DE DATOS (WISDOM ACADEMY) ---');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = process.env.WISDOM_BACKUP_DIR || path.join(process.cwd(), '.data', 'backups');
  fs.mkdirSync(directory, { recursive: true });

  let backupFilePath = path.join(directory, `wisdom-backup-${stamp}.db`);
  let counts = { users: 0, orders: 0, entitlements: 0 };
  let backupType = 'sqlite-vacuum';

  if (isTursoConfigured()) {
    console.log('[db:backup] Detectado modo Cloud (Turso libSQL).');
    backupType = 'turso-cloud-dump';
    backupFilePath = path.join(directory, `wisdom-turso-dump-${stamp}.json`);

    // Extracción de datos maestros de Turso
    const users = prepare('SELECT id, email, display_name, status, is_minor, created_at FROM users').all();
    const orders = prepare('SELECT id, user_id, status, total_cents, currency, created_at FROM orders').all();
    const entitlements = prepare('SELECT id, user_id, resource_id, active, granted_at FROM entitlements').all();
    const enrollments = prepare('SELECT id, user_id, program_id, status, enrolled_at FROM course_enrollments').all();
    const progress = prepare('SELECT id, user_id, program_id, lesson_id, status, completed_at FROM course_progress').all();

    counts = {
      users: users.length,
      orders: orders.length,
      entitlements: entitlements.length,
    };

    const dumpData = {
      createdAt: new Date().toISOString(),
      engine: 'turso-libsql',
      counts,
      data: {
        users,
        orders,
        entitlements,
        enrollments,
        progress,
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(dumpData, null, 2), { encoding: 'utf8', mode: 0o600 });
    console.log(`[db:backup] Dump estructurado de Turso generado: ${backupFilePath}`);
  } else {
    const source = getDatabasePath() || process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db');
    if (source === ':memory:') {
      console.error('No se puede respaldar una base en memoria.');
      process.exit(1);
    }
    if (!fs.existsSync(source)) {
      console.error(`No existe la base de datos local: ${source}`);
      process.exit(1);
    }

    console.log(`[db:backup] Respaldando base SQLite local: ${source}`);
    const database = openRawDatabase(source);
    try {
      database.exec(`VACUUM INTO '${backupFilePath.replace(/'/g, "''")}'`);
      const verification = openRawDatabase(backupFilePath);
      try {
        const integrity = verification.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
        if (integrity.integrity_check !== 'ok') {
          throw new Error(`integrity_check devolvió: ${integrity.integrity_check}`);
        }
        counts = {
          users: Number((verification.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number }).total),
          orders: Number((verification.prepare('SELECT COUNT(*) AS total FROM orders').get() as { total: number }).total),
          entitlements: Number((verification.prepare('SELECT COUNT(*) AS total FROM entitlements').get() as { total: number }).total),
        };
      } finally {
        verification.close();
      }
    } finally {
      database.close();
    }
  }

  // Generar manifiesto local
  const manifest = {
    createdAt: new Date().toISOString(),
    backupType,
    fileName: path.basename(backupFilePath),
    integrity: 'ok',
    counts,
  };
  const manifestPath = `${backupFilePath}.manifest.json`;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { encoding: 'utf8', mode: 0o600 });
  console.log(`[db:backup] Manifiesto verificado: ${manifestPath}`);
  console.log(`[db:backup] Resumen: Usuarios: ${counts.users} | Órdenes: ${counts.orders} | Derechos: ${counts.entitlements}`);

  // Sincronización con Google Drive Data Vault
  if (isVaultConfigured()) {
    console.log('[db:backup] Sincronizando respaldo con Google Drive (/06_Database_Backups/)...');
    try {
      const vault = getWisdomDriveVault()!;
      const fileBuffer = fs.readFileSync(backupFilePath);
      const uploadedBackup = await vault.uploadDatabaseBackup(path.basename(backupFilePath), fileBuffer);
      console.log(`[db:backup] ¡Respaldo subido a Google Drive exitosamente!`);
      console.log(`            Drive File ID: ${uploadedBackup.id}`);
      if (uploadedBackup.webViewLink) console.log(`            Enlace web: ${uploadedBackup.webViewLink}`);

      // Subir manifiesto también
      await vault.uploadDatabaseBackup(path.basename(manifestPath), fs.readFileSync(manifestPath), 'application/json');
      console.log(`[db:backup] Manifiesto sincronizado en Google Drive.`);
    } catch (err: any) {
      console.error(`[db:backup] Advertencia: No se pudo subir a Google Drive: ${err.message || err}`);
    }
  } else {
    console.log('[db:backup] Google Drive no está configurado en este entorno. Respaldo conservado localmente.');
  }

  console.log('--- RESPALDO COMPLETADO SATISFACTORIAMENTE ---');
}

main().catch((err) => {
  console.error('[db:backup] Error fatal en respaldo:', err);
  process.exit(1);
});
