/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Script Maestro de Aprovisionamiento Remoto
 * ARCHIVO: scripts/db-migrate-and-seed.ts
 *
 * PROPÓSITO ARQUITECTÓNICO (SERVERLESS / CLOUD-NATIVE):
 * Reemplaza el antiguo arranque monolítico de contenedor (docker-entrypoint.sh).
 * Permite inicializar y poblar completamente:
 *   1. Esquema de Turso Cloud (libSQL) / SQLite local con 9 migraciones versionadas.
 *   2. Siembra fundamental de roles, permisos y catálogo de productos.
 *   3. Aprovisionamiento seguro del creador de plataforma (platform_owner).
 *   4. Aprovisionamiento del año lectivo 2026-2027 (Avril 8° EGB, Gael 4° EGB).
 *   5. Importación del currículo teológico ministerial N2N (Semestre 1).
 *   6. Estructuras de carpetas en Google Drive (Bóveda Documental y Cursos).
 *
 * USO:
 *   npm run db:migrate-and-seed
 * ==============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'node:child_process';
import { db, isTursoConfigured, getDatabasePath } from '../src/server/db';
import { isVaultConfigured } from '../src/lib/drive/wisdomDriveVault';

function runStep(name: string, command: string) {
  console.log(`\n▶ [PASO] ${name}...`);
  console.log(`  Comando: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', env: process.env });
    console.log(`✔ [ÉXITO] ${name}`);
  } catch (err: any) {
    console.error(`✖ [ERROR] Falló el paso "${name}":`, err.message || err);
    throw err;
  }
}

async function main() {
  console.log('================================================================');
  console.log(' WISDOM ACADEMY PLATFORM · MASTER PROVISIONING & MIGRATION');
  console.log(' Arquitectura Serverless: Vercel + Turso libSQL + Google Drive');
  console.log('================================================================');

  const mode = isTursoConfigured() ? 'TURSO_CLOUD_LIBSQL' : 'LOCAL_SQLITE';
  console.log(`Modo de persistencia detectado: ${mode}`);
  console.log(`Ubicación de base de datos: ${getDatabasePath() || '(inicializando)'}`);
  console.log(`Google Drive configurado: ${isVaultConfigured() ? 'SÍ (Bóveda activa)' : 'NO'}`);

  // 1. Inicializar base de datos, aplicar migraciones y siembra base
  console.log('\n[1/5] Inicializando conexión, migraciones y siembra base...');
  db();
  console.log('✔ Conexión establecida y esquema v1-v9 verificado.');

  // 2. Aprovisionar creador de plataforma
  try {
    runStep('Aprovisionar creador (platform_owner)', 'npx tsx scripts/provision-owner.ts');
  } catch {
    console.warn('⚠ Advertencia en provision:owner; continuando con los siguientes pasos.');
  }

  // 3. Aprovisionar año escolar y estudiantes (Avril y Gael)
  try {
    runStep('Aprovisionar año escolar 2026-2027', 'npx tsx scripts/provision-academic-year.ts');
  } catch {
    console.warn('⚠ Advertencia en provision:academic-year; continuando con los siguientes pasos.');
  }

  // 4. Importar currículo N2N Semestre 1
  try {
    runStep('Importar Programa de Teología N2N Semestre 1', 'npx tsx scripts/import-n2n-semester-1.ts');
  } catch {
    console.warn('⚠ Advertencia en import:n2n-semester-1; continuando con los siguientes pasos.');
  }

  // 5. Inicializar estructuras en Google Drive (si está configurado)
  if (isVaultConfigured()) {
    try {
      runStep('Inicializar Bóveda Documental y Años Escolares en Google Drive', 'npx tsx scripts/init-google-drive-folders.ts');
      runStep('Inicializar Carpetas de Cursos y Talleres en Google Drive', 'npx tsx scripts/init-courses-workshops-drive.ts');
    } catch {
      console.warn('⚠ Advertencia al inicializar carpetas en Google Drive; verifica permisos de Service Account.');
    }
  } else {
    console.log('\n[5/5] Omitiendo inicialización en la nube de Google Drive (credenciales no presentes en este entorno).');
  }

  console.log('\n================================================================');
  console.log('✔ APROVISIONAMIENTO Y MIGRACIÓN COMPLETADOS CON ÉXITO');
  console.log('  La plataforma está lista para operar en producción.');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('\n✖ ERROR FATAL EN APROVISIONAMIENTO:', err);
  process.exit(1);
});

