/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Importador Directo de SQLite a Turso Cloud
 * ARCHIVO: scripts/import-local-sqlite-to-turso.ts
 *
 * PROPÓSITO:
 * Permite migrar todos los datos de un archivo SQLite local (ej. `.data/wisdom.db`
 * o una copia descargada de Northflank) directamente hacia Turso Cloud (libSQL)
 * usando Node.js, SIN necesidad de instalar herramientas de línea de comandos
 * como sqlite3 o Turso CLI.
 *
 * USO:
 *   npm run db:push-to-turso
 *   npm run db:push-to-turso -- --from ruta/a/tu/wisdom.db
 * ==============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import { openRawDatabase, getTursoClient, isTursoConfigured, applyTursoMigrations } from '../src/server/db';

function getArg(name: string): string | null {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
}

const TABLES_IN_ORDER = [
  'settings',
  'roles',
  'permissions',
  'role_permissions',
  'users',
  'identities',
  'user_roles',
  'user_permissions',
  'sessions',
  'resources',
  'products',
  'product_resources',
  'orders',
  'order_items',
  'transactions',
  'webhook_events',
  'enrollments',
  'entitlements',
  'global_access_grants',
  'discounts',
  'discount_codes',
  'discount_resources',
  'discount_redemptions',
  'gift_codes',
  'gift_code_resources',
  'gift_redemptions',
  'invitations',
  'invitation_redemptions',
  'student_profiles',
  'guardian_students',
  'grade_records',
  'crm_contacts',
  'audit_log',
  'rate_limits',
  'academic_years',
  'academic_calendar_events',
  'academic_plans',
  'academic_plan_subjects',
  'course_programs',
  'course_modules',
  'course_lessons',
  'course_materials',
  'lesson_progress',
  'weekly_reviews',
  'assessments',
  'assessment_questions',
  'assessment_attempts',
  'assessment_answers',
  'course_grade_reports',
  'course_import_runs',
  'drive_folders',
  'weekly_meetings',
  'checkout_registrations',
  'order_status_history',
  'auth_tokens',
];

async function main() {
  console.log('================================================================');
  console.log(' WISDOM ACADEMY · MIGRACIÓN DIRECTA DE SQLITE A TURSO CLOUD');
  console.log('================================================================');

  if (!isTursoConfigured()) {
    console.error('\n✖ ERROR: TURSO_DATABASE_URL no está configurada.');
    console.error('  Asegúrate de colocar TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en tu archivo .env');
    process.exit(1);
  }

  const customPath = getArg('--from');
  const sourcePath = customPath
    ? path.resolve(customPath)
    : path.resolve(process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db'));

  if (!fs.existsSync(sourcePath)) {
    console.error(`\n✖ ERROR: No se encontró el archivo SQLite local en: ${sourcePath}`);
    console.error('  Usa --from <ruta> si tu archivo tiene otro nombre o ubicación.');
    process.exit(1);
  }

  console.log(`\n1. Origen local detectado: ${sourcePath} (${(fs.statSync(sourcePath).size / 1024).toFixed(1)} KB)`);
  console.log('2. Conectando con Turso Cloud y aplicando migraciones de esquema...');

  const turso = getTursoClient();
  await applyTursoMigrations(turso);
  console.log('✔ Esquema en Turso Cloud verificado y actualizado.');

  console.log('\n3. Abriendo base de datos local y leyendo tablas...');
  const localDb = openRawDatabase(sourcePath);

  let totalFilasMigradas = 0;

  try {
    for (const table of TABLES_IN_ORDER) {
      // Verificar si la tabla existe en la base local
      const exists = localDb.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      ).get(table) as { name: string } | undefined;

      if (!exists) continue;

      const rows = localDb.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (rows.length === 0) continue;

      process.stdout.write(`   • Migrando tabla "${table}" (${rows.length} registros)... `);

      // Migrar en lotes de 50 registros para optimizar HTTP requests
      const batchSize = 50;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const statements = batch.map((row) => {
          const columns = Object.keys(row);
          const placeholders = columns.map(() => '?').join(', ');
          const values = Object.values(row).map((val) => (val === undefined ? null : val));
          return {
            sql: `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            args: values as any[],
          };
        });

        await turso.batch(statements, 'write');
      }

      totalFilasMigradas += rows.length;
      console.log('✔ OK');
    }

    console.log('\n================================================================');
    console.log(`✔ MIGRACIÓN EXITOSA: Se copiaron ${totalFilasMigradas} registros a Turso Cloud.`);
    console.log('================================================================\n');
  } finally {
    localDb.close();
  }
}

main().catch((err) => {
  console.error('\n✖ ERROR FATAL EN MIGRACIÓN A TURSO:', err);
  process.exit(1);
});

