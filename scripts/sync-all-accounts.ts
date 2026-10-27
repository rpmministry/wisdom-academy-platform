/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Sincronización Total de Cuentas y Acceso
 * ARCHIVO: scripts/sync-all-accounts.ts
 *
 * PROPÓSITO:
 * 1. Restablecer el acceso total del Creador de la plataforma:
 *    - Correo: mauriandrade2@gmail.com
 *    - Nombre: Mauricio
 *    - Subtítulo / Rol: Creador de Wisdom School (platform_owner)
 *    - Contraseña segura lista para iniciar sesión sin fricción.
 * 2. Crear y matricular a los 2 estudiantes oficiales:
 *    - Avril Andrade Sanchez (12 años, 8° de básica / EGB, andradesanchezavril@gmail.com)
 *    - Gael Andrade Sanchez (8 años, 4° de básica / EGB, gaelandradesanchez@gmail.com)
 *    - Contraseñas seguras para ambos.
 *    - Vinculación de tutor/padre-mentor (Mauricio).
 *    - Generación y matrícula de los 200 días escolares en sus programas y materias.
 * 3. Sincronizar todos los datos tanto en SQLite local como en Turso Cloud (Vercel).
 * ==============================================================================
 */

import * as dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs';
import path from 'node:path';
import {
  openRawDatabase,
  getTursoClient,
  isTursoConfigured,
  applyTursoMigrations,
} from '../src/server/db';
import { hashPassword, verifyPassword } from '../src/server/auth/passwords';
import { nowIso } from '../src/server/db/sqlite';
import { randomToken } from '../src/server/security/random';
import {
  ESTUDIANTE_AVRIL_INICIAL,
  ESTUDIANTE_GAEL_INICIAL,
} from '../src/types/wisdom';
import { EcuadorSchoolCalendarEngine, FERIADOS_ECUADOR_2026_2027 } from '../src/services/ecuadorSchoolCalendar';
import { curriculumAuditorAndFiller } from '../src/services/curriculumAuditorAndFiller';
import { dailyGuideCompiler } from '../src/lib/pdf/daily-guide-compiler';

const CREATOR_EMAIL = 'mauriandrade2@gmail.com';
const CREATOR_NAME = 'Mauricio';
const CREATOR_PASSWORD = process.env.OWNER_INITIAL_PASSWORD || 'Wisdom2026!MauricioOwner#';

const AVRIL_EMAIL = 'andradesanchezavril@gmail.com';
const AVRIL_NAME = 'Avril Andrade Sanchez';
const AVRIL_PASSWORD = 'Wisdom2026*AvrilEGB8#';

const GAEL_EMAIL = 'gaelandradesanchez@gmail.com';
const GAEL_NAME = 'Gael Andrade Sanchez';
const GAEL_PASSWORD = 'Wisdom2026*GaelEGB4#';

const YEAR_ID = 'ay_2026_2027_sierra';
const YEAR_NAME = 'Año lectivo 2026-2027 · Sierra-Amazonía';

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
  console.log(' WISDOM ACADEMY · RECUPERACIÓN DE ACCESO Y MATRÍCULA DE ESTUDIANTES');
  console.log('================================================================\n');

  const localDbPath = path.resolve(process.env.WISDOM_DB_PATH || path.join(process.cwd(), '.data', 'wisdom.db'));
  fs.mkdirSync(path.dirname(localDbPath), { recursive: true });

  console.log(`1. Conectando y asegurando base de datos local: ${localDbPath}`);
  const db = openRawDatabase(localDbPath);
  db.exec('PRAGMA foreign_keys = ON');

  // Asegurar migraciones y roles
  const { MIGRATIONS } = await import('../src/server/db/migrations');
  const { seedFoundation } = await import('../src/server/db/seed');
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>;
  const applied = new Set(appliedRows.map((row) => Number(row.version)));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(migration.version, migration.name, nowIso());
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
  seedFoundation(db);

  const now = nowIso();

  // -------------------------------------------------------------
  // A. Configurar Rol 'platform_owner' y Settings para el Creador
  // -------------------------------------------------------------
  console.log('\n2. Aprovisionando Creador de Wisdom School...');
  db.prepare(`
    UPDATE roles
    SET name = 'Creador de Wisdom School',
        description = 'Creador de Wisdom School - Control total formativo y administrativo. No transferible.'
    WHERE code = 'platform_owner'
  `).run();

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES ('owner_email', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(CREATOR_EMAIL, now);

  db.prepare("DELETE FROM settings WHERE key = 'owner_google_sub'").run();

  // Crear o actualizar usuario Creador
  const creatorHash = await hashPassword(CREATOR_PASSWORD);
  let creatorRow = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(CREATOR_EMAIL) as { id: string } | undefined;
  let creatorId = creatorRow?.id;

  if (creatorId) {
    db.prepare(`
      UPDATE users
      SET display_name = ?,
          username = 'mauricio',
          password_hash = ?,
          password_updated_at = ?,
          must_change_password = 0,
          status = 'active',
          email_verified = 1,
          updated_at = ?
      WHERE id = ?
    `).run(CREATOR_NAME, creatorHash, now, now, creatorId);
  } else {
    creatorId = `usr_owner_${randomToken(16)}`;
    db.prepare(`
      INSERT INTO users
        (id, email, email_verified, display_name, username, password_hash, password_updated_at,
         must_change_password, status, is_minor, created_at, updated_at)
      VALUES (?, ?, 1, ?, 'mauricio', ?, ?, 0, 'active', 0, ?, ?)
    `).run(creatorId, CREATOR_EMAIL, CREATOR_NAME, creatorHash, now, now, now);
  }

  // Asignar rol platform_owner
  const existingOwnerRole = db.prepare(`
    SELECT 1 FROM user_roles WHERE user_id = ? AND role_code = 'platform_owner' AND revoked_at IS NULL
  `).get(creatorId);
  if (!existingOwnerRole) {
    db.prepare(`
      INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, 'platform_owner', 'recovery_script', ?)
    `).run(`ur_owner_${randomToken(12)}`, creatorId, now);
  }

  // Acceso global total
  db.prepare("DELETE FROM global_access_grants WHERE user_id = ? AND kind = 'owner'").run(creatorId);
  db.prepare(`
    INSERT INTO global_access_grants (id, user_id, kind, origin, origin_ref, status, starts_at, ends_at, granted_by, created_at, updated_at)
    VALUES (?, ?, 'owner', 'recovery_script', 'owner', 'active', ?, NULL, 'recovery_script', ?, ?)
  `).run(`gag_owner_${randomToken(10)}`, creatorId, now, now, now);

  db.prepare(`
    INSERT INTO crm_contacts (id, email, name, status, created_at, updated_at)
    VALUES (?, ?, ?, 'customer', ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
  `).run(`ctc_owner_${randomToken(10)}`, CREATOR_EMAIL, CREATOR_NAME, now, now);

  console.log(`✔ Creador configurado: ${CREATOR_NAME} (${CREATOR_EMAIL})`);
  console.log(`  Rol: platform_owner (Creador de Wisdom School)`);

  // -------------------------------------------------------------
  // B. Configurar Año Lectivo 2026-2027
  // -------------------------------------------------------------
  console.log('\n3. Configurando Año Lectivo 2026-2027 Sierra-Amazonía...');
  const days = EcuadorSchoolCalendarEngine.obtenerDiasEscolares(200);
  const yearStart = days[0].fechaIso;
  const yearEnd = days[days.length - 1].fechaIso;

  db.prepare(`
    INSERT INTO academic_years
      (id, name, start_date, end_date, total_school_days, regime, created_at)
    VALUES (?, ?, ?, ?, 200, 'SIERRA_AMAZONIA', ?)
    ON CONFLICT(name) DO UPDATE SET
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      total_school_days = excluded.total_school_days,
      regime = excluded.regime
  `).run(YEAR_ID, YEAR_NAME, yearStart, yearEnd, now);

  for (const holiday of FERIADOS_ECUADOR_2026_2027) {
    if (holiday.fecha < yearStart || holiday.fecha > yearEnd) continue;
    db.prepare(`
      INSERT OR IGNORE INTO academic_calendar_events
        (id, academic_year_id, event_date, title, kind, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      `ace_${randomToken(10)}`,
      YEAR_ID,
      holiday.fecha,
      holiday.nombre,
      holiday.tipo,
      holiday.descripcion
    );
  }
  console.log(`✔ Año escolar registrado: ${YEAR_NAME} (${yearStart} al ${yearEnd})`);

  // -------------------------------------------------------------
  // C. Crear y Matricular Estudiantes (Avril y Gael)
  // -------------------------------------------------------------
  console.log('\n4. Aprovisionando estudiantes y planes académicos...');
  const studentsDef = [
    {
      key: 'avril',
      email: AVRIL_EMAIL,
      name: AVRIL_NAME,
      username: 'avril',
      password: AVRIL_PASSWORD,
      profile: ESTUDIANTE_AVRIL_INICIAL,
      programSlug: 'programa-homeschool-8-egb',
      legacyCourseIds: [801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811],
      classroom: '08_Octavo_EGB_Avril',
    },
    {
      key: 'gael',
      email: GAEL_EMAIL,
      name: GAEL_NAME,
      username: 'gael',
      password: GAEL_PASSWORD,
      profile: ESTUDIANTE_GAEL_INICIAL,
      programSlug: 'programa-homeschool-4-egb',
      legacyCourseIds: [401, 402, 403, 404, 405, 406, 407, 408, 409],
      classroom: '04_Cuarto_EGB_Gael',
    },
  ];

  for (const s of studentsDef) {
    const studentHash = await hashPassword(s.password);
    let sRow = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(s.email) as { id: string } | undefined;
    let sUserId = sRow?.id;

    if (sUserId) {
      db.prepare(`
        UPDATE users
        SET display_name = ?,
            username = ?,
            password_hash = ?,
            password_updated_at = ?,
            must_change_password = 0,
            status = 'active',
            is_minor = 1,
            email_verified = 1,
            updated_at = ?
        WHERE id = ?
      `).run(s.name, s.username, studentHash, now, now, sUserId);
    } else {
      sUserId = `usr_${s.key}_${randomToken(12)}`;
      db.prepare(`
        INSERT INTO users
          (id, email, email_verified, display_name, username, password_hash, password_updated_at,
           must_change_password, status, is_minor, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, ?, 0, 'active', 1, ?, ?)
      `).run(sUserId, s.email, s.name, s.username, studentHash, now, now, now);
    }

    // Rol student
    db.prepare(`
      INSERT OR IGNORE INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, 'student', 'recovery_script', ?)
    `).run(`ur_${randomToken(12)}`, sUserId, now);

    // Perfil de estudiante
    const spId = `sp_${s.key}_${randomToken(10)}`;
    db.prepare(`
      INSERT INTO student_profiles
        (id, user_id, full_name, age, grade, subnivel, folder_code, profile_agent, language,
         portfolio_owner, mentor_email, moodle_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ES', ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        full_name = excluded.full_name,
        age = excluded.age,
        grade = excluded.grade,
        subnivel = excluded.subnivel,
        folder_code = excluded.folder_code,
        profile_agent = excluded.profile_agent,
        portfolio_owner = excluded.portfolio_owner,
        mentor_email = excluded.mentor_email,
        moodle_user_id = excluded.moodle_user_id,
        updated_at = excluded.updated_at
    `).run(
      spId,
      sUserId,
      s.name,
      s.profile.edad,
      s.profile.gradoEcuador,
      s.profile.subnivelMineduc,
      s.profile.codigoCarpetaAnioDrive,
      s.profile.perfilAgente,
      s.profile.responsablePortafolio,
      CREATOR_EMAIL,
      s.profile.idMoodle,
      now,
      now
    );

    // Obtener student_profile real id
    const profileRow = db.prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(sUserId) as { id: string };

    // Vincular tutor / padre mentor (Mauricio)
    db.prepare(`
      INSERT INTO guardian_students (id, guardian_user_id, student_profile_id, relationship, verified_at, created_at)
      VALUES (?, ?, ?, 'padre_mentor', ?, ?)
      ON CONFLICT(guardian_user_id, student_profile_id) DO UPDATE SET relationship = 'padre_mentor'
    `).run(`gs_${randomToken(10)}`, creatorId, profileRow.id, now, now);

    // Contacto CRM
    db.prepare(`
      INSERT INTO crm_contacts (id, email, name, status, consent_email, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', 1, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
    `).run(`ctc_${s.key}_${randomToken(10)}`, s.email, s.name, now, now);

    // Matricular en el programa y asignaturas
    const program = db.prepare('SELECT id, slug, title FROM resources WHERE slug = ?').get(s.programSlug) as { id: string; slug: string; title: string } | undefined;
    if (!program) throw new Error(`Programa ${s.programSlug} no encontrado.`);

    const subjects: Array<{ id: string; slug: string; title: string }> = [];
    for (const legacyId of s.legacyCourseIds) {
      const row = db.prepare(
        "SELECT id, slug, title FROM resources WHERE json_extract(metadata_json, '$.legacyCourseId') = ? LIMIT 1"
      ).get(legacyId) as { id: string; slug: string; title: string } | undefined;
      if (row) subjects.push(row);
    }

    const allResources = [program, ...subjects];
    const originRef = `academic-year:${YEAR_ID}`;
    db.prepare("DELETE FROM entitlements WHERE user_id = ? AND origin = 'enrollment' AND origin_ref = ?").run(sUserId, originRef);

    for (const res of allResources) {
      db.prepare(`
        INSERT INTO entitlements
          (id, user_id, resource_id, origin, origin_ref, status, starts_at, ends_at, granted_by, metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, 'enrollment', ?, 'active', ?, ?, 'recovery_script', ?, ?, ?)
      `).run(
        `ent_${randomToken(12)}`,
        sUserId,
        res.id,
        originRef,
        now,
        `${yearEnd}T23:59:59.000Z`,
        JSON.stringify({ year: YEAR_NAME, program: s.programSlug }),
        now,
        now
      );
    }

    db.prepare("DELETE FROM enrollments WHERE user_id = ? AND resource_id = ?").run(sUserId, program.id);
    db.prepare(`
      INSERT INTO enrollments (id, user_id, resource_id, origin, status, starts_at, ends_at, created_at, updated_at)
      VALUES (?, ?, ?, 'enrollment', 'active', ?, ?, ?, ?)
    `).run(
      `enr_${randomToken(12)}`,
      sUserId,
      program.id,
      `${yearStart}T00:00:00.000Z`,
      `${yearEnd}T23:59:59.000Z`,
      now,
      now
    );

    // Generar 200 guías y planes
    const rootDir = path.join(process.cwd(), '.data', 'curriculum', sUserId);
    fs.mkdirSync(rootDir, { recursive: true });
    db.prepare('DELETE FROM academic_plans WHERE user_id = ? AND academic_year_id = ?').run(sUserId, YEAR_ID);

    for (let dayNumber = 1; dayNumber <= 200; dayNumber += 1) {
      const jornada = curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(dayNumber, s.profile);
      const filename = `guia-dia-${String(dayNumber).padStart(3, '0')}-${jornada.fechaIso}.html`;
      const relativePath = path.posix.join('curriculum', sUserId, filename);
      const absolutePath = path.join(rootDir, filename);
      const html = dailyGuideCompiler.compilarGuiaDiariaHtml(jornada);
      fs.writeFileSync(absolutePath, html, 'utf8');

      const planId = `plan_${s.key}_${String(dayNumber).padStart(3, '0')}`;
      db.prepare(`
        INSERT INTO academic_plans
          (id, user_id, academic_year_id, day_number, plan_date, week_number, trimester, title,
           storage_path, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
      `).run(
        planId,
        sUserId,
        YEAR_ID,
        dayNumber,
        jornada.fechaIso,
        jornada.semanaNumero,
        jornada.trimestre,
        `Día ${dayNumber} · ${jornada.grado}`,
        relativePath,
        now,
        now
      );

      for (const materia of jornada.materias) {
        db.prepare(`
          INSERT INTO academic_plan_subjects
            (id, plan_id, subject, topic, objective, resource_kind, resource_path, created_at)
          VALUES (?, ?, ?, ?, ?, 'guia_diaria', ?, ?)
        `).run(
          `aps_${randomToken(14)}`,
          planId,
          materia.nombreMateria,
          materia.temaDelDia,
          materia.objetivoAprendizaje,
          relativePath,
          now
        );
      }
    }

    console.log(`✔ Estudiante matriculado: ${s.name} (${s.email})`);
    console.log(`  Grado: ${s.profile.gradoEcuador} | Subnivel: ${s.profile.subnivelMineduc}`);
    console.log(`  200 Guías y planes diarios generados y vinculados.`);
  }

  // -------------------------------------------------------------
  // D. Sincronizar hacia Turso Cloud (Vercel)
  // -------------------------------------------------------------
  if (isTursoConfigured()) {
    console.log('\n5. Sincronizando datos hacia Turso Cloud (libSQL)...');
    const turso = getTursoClient();
    await applyTursoMigrations(turso);

    let totalFilas = 0;
    for (const table of TABLES_IN_ORDER) {
      const exists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      ).get(table) as { name: string } | undefined;
      if (!exists) continue;

      const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
      if (rows.length === 0) continue;

      process.stdout.write(`   • Sincronizando "${table}" (${rows.length} registros)... `);
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
      totalFilas += rows.length;
      console.log('✔');
    }
    console.log(`✔ Sincronización con Turso Cloud completada con éxito (${totalFilas} registros migrados).`);

    // Verificación directa en Turso
    console.log('\n6. Verificando autenticación y permisos directamente en Turso Cloud...');
    const ownerTurso = await turso.execute({
      sql: 'SELECT id, email, display_name, password_hash FROM users WHERE email = ?',
      args: [CREATOR_EMAIL],
    });
    if (ownerTurso.rows.length === 0) throw new Error('El creador no se encuentra en Turso Cloud.');
    const ownerValid = await verifyPassword(CREATOR_PASSWORD, String(ownerTurso.rows[0].password_hash));
    console.log(`  Creador en Turso (${CREATOR_EMAIL}): Contraseña verificada = ${ownerValid ? 'SÍ (VÁLIDA)' : 'ERROR'}`);

    const avrilTurso = await turso.execute({
      sql: 'SELECT id, email, display_name, password_hash FROM users WHERE email = ?',
      args: [AVRIL_EMAIL],
    });
    const avrilValid = await verifyPassword(AVRIL_PASSWORD, String(avrilTurso.rows[0].password_hash));
    console.log(`  Estudiante Avril en Turso (${AVRIL_EMAIL}): Contraseña verificada = ${avrilValid ? 'SÍ (VÁLIDA)' : 'ERROR'}`);

    const gaelTurso = await turso.execute({
      sql: 'SELECT id, email, display_name, password_hash FROM users WHERE email = ?',
      args: [GAEL_EMAIL],
    });
    const gaelValid = await verifyPassword(GAEL_PASSWORD, String(gaelTurso.rows[0].password_hash));
    console.log(`  Estudiante Gael en Turso (${GAEL_EMAIL}): Contraseña verificada = ${gaelValid ? 'SÍ (VÁLIDA)' : 'ERROR'}`);
  } else {
    console.warn('\n⚠ Turso no está configurado en las variables de entorno. Los cambios se aplicaron únicamente en SQLite local.');
  }

  db.close();

  // Guardar archivo seguro de credenciales
  const credsDir = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.wisdom-academy');
  fs.mkdirSync(credsDir, { recursive: true });
  const credsFile = path.join(credsDir, 'production-access-credentials.txt');
  const credsContent = [
    'WISDOM ACADEMY · CREDENCIALES OFICIALES DE ACCESO Y MATRÍCULA',
    '==============================================================',
    `Fecha: ${now}`,
    '',
    '1. CUENTA DEL CREADOR DE LA PLATAFORMA (Acceso total formativo y administrativo):',
    `   Nombre: ${CREATOR_NAME}`,
    '   Subtítulo: Creador de Wisdom School',
    `   Correo: ${CREATOR_EMAIL}`,
    '   Usuario: mauricio',
    `   Contraseña: ${CREATOR_PASSWORD}`,
    '   Rol: platform_owner',
    '',
    '2. ESTUDIANTE 1:',
    `   Nombre: ${AVRIL_NAME}`,
    '   Edad: 12 años',
    '   Curso / Grado: 8° de básica (Básica Superior)',
    `   Correo: ${AVRIL_EMAIL}`,
    '   Usuario: avril',
    `   Contraseña: ${AVRIL_PASSWORD}`,
    '   Programa: Programa Homeschool 8.° EGB (11 asignaturas)',
    '   Estado: Matriculada y activa',
    '',
    '3. ESTUDIANTE 2:',
    `   Nombre: ${GAEL_NAME}`,
    '   Edad: 8 años',
    '   Curso / Grado: 4° de básica (Básica Elemental)',
    `   Correo: ${GAEL_EMAIL}`,
    '   Usuario: gael',
    `   Contraseña: ${GAEL_PASSWORD}`,
    '   Programa: Programa Homeschool 4.° EGB (9 asignaturas)',
    '   Estado: Matriculado y activo',
    '==============================================================',
  ].join('\n');
  fs.writeFileSync(credsFile, credsContent, 'utf8');

  console.log('\n================================================================');
  console.log(' PROCESO COMPLETADO SATISFACTORIAMENTE');
  console.log(` Credenciales respaldadas en: ${credsFile}`);
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n✖ ERROR EN EL PROCESO:', err);
  process.exit(1);
});
