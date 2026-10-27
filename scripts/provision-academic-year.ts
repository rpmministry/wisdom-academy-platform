/**
 * Aprovisiona el año escolar 2026-2027 de Avril (8.° EGB) y Gael (4.° EGB):
 * - Crea sus cuentas y expedientes si no existen.
 * - Matricula ambos perfiles en el programa y todas sus asignaturas.
 * - Fija el inicio de clases el lunes 26 de octubre de 2026.
 * - Audita los 200 días lectivos con el motor curricular existente.
 * - Genera 200 guías diarias HTML por estudiante y sus recursos asociados.
 * - Entrega contraseñas iniciales únicamente en un archivo protegido.
 *
 * Uso: npm run provision:academic-year [-- --rotate]
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { db, nowIso } from '../src/server/db';
import { prepare, withTransaction } from '../src/server/db';
import {
  generateInitialPassword,
  hashPassword,
} from '../src/server/auth/passwords';
import { authenticateWithPassword } from '../src/server/domain/users';
import { loadAuthUser } from '../src/server/auth/authorization';
import {
  createEnrollment,
  findResourceBySlug,
  grantEntitlement,
  listUserEntitlements,
  userCanAccessResource,
} from '../src/server/domain/access';
import { randomToken } from '../src/server/security/random';
import {
  ESTUDIANTE_AVRIL_INICIAL,
  ESTUDIANTE_GAEL_INICIAL,
  type EstudianteWisdom,
} from '../src/types/wisdom';
import { EcuadorSchoolCalendarEngine, FERIADOS_ECUADOR_2026_2027 } from '../src/services/ecuadorSchoolCalendar';
import { curriculumAuditorAndFiller } from '../src/services/curriculumAuditorAndFiller';
import { dailyGuideCompiler } from '../src/lib/pdf/daily-guide-compiler';

const YEAR_ID = 'ay_2026_2027_sierra';
const YEAR_NAME = 'Año lectivo 2026-2027 · Sierra-Amazonía';
const START_DATE = '2026-10-26';

interface StudentProvision {
  key: 'avril' | 'gael';
  email: string;
  username: string;
  profile: EstudianteWisdom;
  programSlug: string;
  legacyCourseIds: number[];
  classroom: string;
  initialPassword?: string;
}

const STUDENTS: StudentProvision[] = [
  {
    key: 'avril',
    email: 'andradesanchezavril@gmail.com',
    username: 'avril',
    profile: ESTUDIANTE_AVRIL_INICIAL,
    programSlug: 'programa-homeschool-8-egb',
    legacyCourseIds: [801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811],
    classroom: '08_Octavo_EGB_Avril',
    initialPassword: 'Wisdom2026*AvrilEGB8#',
  },
  {
    key: 'gael',
    email: 'gaelandradesanchez@gmail.com',
    username: 'gael',
    profile: ESTUDIANTE_GAEL_INICIAL,
    programSlug: 'programa-homeschool-4-egb',
    legacyCourseIds: [401, 402, 403, 404, 405, 406, 407, 408, 409],
    classroom: '04_Cuarto_EGB_Gael',
    initialPassword: 'Wisdom2026*GaelEGB4#',
  },
];

interface ProvisionedStudent {
  key: string;
  userId: string;
  email: string;
  password: string | null;
  profile: EstudianteWisdom;
}

function writeProtectedCredentials(entries: Array<{
  name: string;
  email: string;
  password: string;
}>): string {
  const target = path.join(os.homedir(), '.wisdom-academy', 'student-initial-credentials.txt');
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  const content = [
    'WISDOM ACADEMY · CREDENCIALES INICIALES DE ESTUDIANTES',
    '=======================================================',
    `Generadas: ${nowIso()}`,
    '',
    ...entries.flatMap((entry) => [
      `Estudiante: ${entry.name}`,
      `Correo: ${entry.email}`,
      `Contraseña provisional: ${entry.password}`,
      'Cambio obligatorio en el primer acceso: /cambiar-contrasena',
      '',
    ]),
    'Entrega este archivo por un canal seguro. Elimínalo después del primer cambio.',
    'No copies estas contraseñas a Git, documentación, capturas ni registros.',
    '',
  ].join('\n');
  fs.writeFileSync(target, content, { encoding: 'utf8', mode: 0o600, flag: 'w' });
  fs.chmodSync(target, 0o600);
  if (process.platform === 'win32' && process.env.USERNAME) {
    try {
      execFileSync('icacls', [target, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:F`], {
        stdio: 'ignore',
      });
    } catch {
      // La ACL del perfil de usuario sigue protegiendo el archivo.
    }
  }
  return target;
}

async function ensureUserSecure(student: StudentProvision, rotate: boolean): Promise<ProvisionedStudent> {
  const existing = prepare('SELECT id FROM users WHERE email = ?').get(student.email) as
    | { id: string }
    | undefined;
  const now = nowIso();
  let userId: string;
  let plainPassword: string | null = null;

  if (existing) {
    userId = existing.id;
    const hasPassword = prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string | null;
    };
    if (rotate || !hasPassword.password_hash) {
      plainPassword = student.initialPassword || generateInitialPassword();
      const hash = await hashPassword(plainPassword);
      prepare(`
        UPDATE users
        SET password_hash = ?, password_updated_at = ?, must_change_password = 0,
            status = 'active', updated_at = ?
        WHERE id = ?
      `).run(hash, now, now, userId);
      prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(now, userId);
    }
  } else {
    plainPassword = student.initialPassword || generateInitialPassword();
    const hash = await hashPassword(plainPassword);
    userId = `usr_${student.key}_${randomToken(12)}`;
    prepare(`
      INSERT INTO users
        (id, email, email_verified, display_name, username, password_hash, password_updated_at,
         must_change_password, status, is_minor, created_at, updated_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, 0, 'active', 1, ?, ?)
    `).run(
      userId,
      student.email,
      student.profile.nombreCompleto,
      student.username,
      hash,
      now,
      now,
      now
    );
  }

  prepare(`
    INSERT OR IGNORE INTO user_roles (id, user_id, role_code, granted_by, granted_at)
    VALUES (?, ?, 'student', 'academic_year_provisioning', ?)
  `).run(`ur_${randomToken(12)}`, userId, now);

  prepare(`
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
    `sp_${student.key}_${randomToken(10)}`,
    userId,
    student.profile.nombreCompleto,
    student.profile.edad,
    student.profile.gradoEcuador,
    student.profile.subnivelMineduc,
    student.profile.codigoCarpetaAnioDrive,
    student.profile.perfilAgente,
    student.profile.responsablePortafolio,
    student.profile.emailMentorPadre || null,
    student.profile.idMoodle,
    now,
    now
  );

  prepare(`
    INSERT INTO crm_contacts (id, email, name, status, consent_email, created_at, updated_at)
    VALUES (?, ?, ?, 'guardian', 0, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = excluded.name, status = 'guardian', updated_at = excluded.updated_at
  `).run(`ctc_${student.key}_${randomToken(10)}`, student.email, student.profile.nombreCompleto, now, now);

  return {
    key: student.key,
    userId,
    email: student.email,
    password: plainPassword,
    profile: student.profile,
  };
}

function subjectResourceIds(legacyCourseIds: number[]): Array<{ id: string; slug: string; title: string }> {
  const resources: Array<{ id: string; slug: string; title: string }> = [];
  for (const legacyId of legacyCourseIds) {
    const row = prepare(
      "SELECT id, slug, title FROM resources WHERE json_extract(metadata_json, '$.legacyCourseId') = ? LIMIT 1"
    ).get(legacyId) as { id: string; slug: string; title: string } | undefined;
    if (!row) {
      throw new Error(`No existe el recurso curricular para legacyCourseId=${legacyId}.`);
    }
    resources.push(row);
  }
  return resources;
}

function enrollStudent(input: {
  student: ProvisionedStudent;
  provision: StudentProvision;
  yearStart: string;
  yearEnd: string;
}): void {
  const program = findResourceBySlug(input.provision.programSlug);
  if (!program) throw new Error(`No existe el programa ${input.provision.programSlug}.`);
  const subjects = subjectResourceIds(input.provision.legacyCourseIds);
  const resources = [program, ...subjects];
  const accessStart = nowIso();
  const originRef = `academic-year:${YEAR_ID}`;
  prepare(`
    DELETE FROM entitlements
    WHERE user_id = ? AND origin = 'enrollment' AND origin_ref = ?
  `).run(input.student.userId, originRef);
  for (const resource of resources) {
    grantEntitlement({
      userId: input.student.userId,
      resourceId: resource.id,
      origin: 'enrollment',
      originRef,
      startsAt: accessStart,
      endsAt: `${input.yearEnd}T23:59:59.000Z`,
      grantedBy: 'academic_year_provisioning',
      metadata: { year: YEAR_NAME, program: input.provision.programSlug },
    });
  }
  createEnrollment({
    userId: input.student.userId,
    resourceId: program.id,
    origin: 'enrollment',
    startsAt: `${input.yearStart}T00:00:00.000Z`,
    endsAt: `${input.yearEnd}T23:59:59.000Z`,
  });
}

function generatePlans(input: {
  student: ProvisionedStudent;
  yearId: string;
}): { guides: number; subjects: number; bytes: number } {
  const root = path.join(process.cwd(), '.data', 'curriculum', input.student.userId);
  fs.mkdirSync(root, { recursive: true });
  let guides = 0;
  let subjects = 0;
  let bytes = 0;

  withTransaction(() => {
    prepare('DELETE FROM academic_plans WHERE user_id = ? AND academic_year_id = ?').run(
      input.student.userId,
      input.yearId
    );

    for (let dayNumber = 1; dayNumber <= 200; dayNumber += 1) {
      const jornada = curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(
        dayNumber,
        input.student.profile
      );
      const filename = `guia-dia-${String(dayNumber).padStart(3, '0')}-${jornada.fechaIso}.html`;
      const relativePath = path.posix.join('curriculum', input.student.userId, filename);
      const absolutePath = path.join(root, filename);
      const html = dailyGuideCompiler.compilarGuiaDiariaHtml(jornada);
      fs.writeFileSync(absolutePath, html, 'utf8');
      bytes += Buffer.byteLength(html, 'utf8');
      guides += 1;

      const planId = `plan_${input.student.key}_${String(dayNumber).padStart(3, '0')}`;
      const now = nowIso();
      prepare(`
        INSERT INTO academic_plans
          (id, user_id, academic_year_id, day_number, plan_date, week_number, trimester, title,
           storage_path, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)
      `).run(
        planId,
        input.student.userId,
        input.yearId,
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
        prepare(`
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
        subjects += 1;
      }
    }
  });

  return { guides, subjects, bytes };
}

function writeAuditReport(input: {
  audit: ReturnType<typeof curriculumAuditorAndFiller.auditarPlanCompleto>;
  yearStart: string;
  yearEnd: string;
  results: Array<{ name: string; email: string; guides: number; subjects: number; bytes: number }>;
}): string {
  const target = path.join(process.cwd(), 'docs', 'AUDITORIA_CURRICULAR_2026_2027.md');
  const lines = [
    '# Auditoría curricular 2026-2027',
    '',
    `Generada: ${nowIso()}`,
    '',
    '## Calendario',
    '',
    `- Inicio de clases: **${input.yearStart}** (lunes 26 de octubre de 2026).`,
    `- Último día lectivo del plan: **${input.yearEnd}**.`,
    '- Régimen: Sierra-Amazonía, 200 días lectivos.',
    '',
    '## Resultado de la auditoría del motor curricular',
    '',
    `- Días requeridos: ${input.audit.totalDiasRequeridos}`,
    `- Días auditados: ${input.audit.totalDiasAuditados}`,
    `- Días completos: ${input.audit.diasCompletos}`,
    `- Cobertura: ${input.audit.coberturaPorcentaje}%`,
    `- Estado: **${input.audit.estado}**`,
    `- Materias del catálogo: ${input.audit.totalMateriasCatalogo ?? '—'}`,
    `- Unidades curriculares: ${input.audit.totalUnidadesCurriculares ?? '—'}`,
    `- Trimestres: T1 ${input.audit.trimestre1Dias} · T2 ${input.audit.trimestre2Dias} · T3 ${input.audit.trimestre3Dias}`,
    '',
    '## Clases y recursos generados',
    '',
    ...input.results.map(
      (result) =>
        `- **${result.name}** (${result.email}): ${result.guides} guías diarias HTML, ${result.subjects} clases/asignaturas, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB.`
    ),
    '',
    'Cada guía contiene las cinco asignaturas del horario del día, objetivos, desarrollo conceptual, guía paso a paso, ejemplos resueltos, taller y evaluación formativa. Los archivos se almacenan en `.data/curriculum/<usuario>/`.',
    '',
    'Las credenciales iniciales se entregan en un archivo protegido fuera del repositorio; no se incluyen en este informe.',
    '',
  ];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, lines.join('\n'), 'utf8');
  return target;
}

async function main(): Promise<void> {
  db();
  const rotate = process.argv.includes('--rotate');
  const days = EcuadorSchoolCalendarEngine.obtenerDiasEscolares(200);
  const yearStart = days[0].fechaIso;
  const yearEnd = days[days.length - 1].fechaIso;
  if (yearStart !== START_DATE) {
    throw new Error(`El calendario no inicia el ${START_DATE}; inicia el ${yearStart}.`);
  }

  prepare(`
    INSERT INTO academic_years
      (id, name, start_date, end_date, total_school_days, regime, created_at)
    VALUES (?, ?, ?, ?, 200, 'SIERRA_AMAZONIA', ?)
    ON CONFLICT(name) DO UPDATE SET
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      total_school_days = excluded.total_school_days,
      regime = excluded.regime
  `).run(YEAR_ID, YEAR_NAME, yearStart, yearEnd, nowIso());

  for (const holiday of FERIADOS_ECUADOR_2026_2027) {
    if (holiday.fecha < yearStart || holiday.fecha > yearEnd) continue;
    prepare(`
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

  const audit = curriculumAuditorAndFiller.auditarPlanCompleto();
  if (audit.estado !== 'CERTIFICADO_SIN_FALTANTES') {
    throw new Error(`La auditoría curricular no está completa: ${audit.coberturaPorcentaje}%.`);
  }

  const provisioned: ProvisionedStudent[] = [];
  for (const student of STUDENTS) {
    provisioned.push(await ensureUserSecure(student, rotate));
  }

  const results: Array<{ name: string; email: string; guides: number; subjects: number; bytes: number }> = [];
  for (let index = 0; index < STUDENTS.length; index += 1) {
    const provision = STUDENTS[index];
    const student = provisioned[index];
    enrollStudent({ student, provision, yearStart, yearEnd });
    const generated = generatePlans({ student, yearId: YEAR_ID });
    results.push({
      name: student.profile.nombreCompleto,
      email: student.email,
      guides: generated.guides,
      subjects: generated.subjects,
      bytes: generated.bytes,
    });
  }

  const credentials = provisioned
    .filter((student): student is ProvisionedStudent & { password: string } => Boolean(student.password))
    .map((student) => ({
      name: student.profile.nombreCompleto,
      email: student.email,
      password: student.password,
    }));

  let credentialPath: string | null = null;
  if (credentials.length > 0) {
    credentialPath = writeProtectedCredentials(credentials);
  }

  const reportPath = writeAuditReport({ audit, yearStart, yearEnd, results });

  for (const provision of provisioned) {
    const user = loadAuthUser(provision.userId);
    if (!user || !user.roles.includes('student')) {
      throw new Error(`La cuenta de ${provision.email} no quedó con rol de estudiante.`);
    }
    const program = findResourceBySlug(
      STUDENTS.find((student) => student.key === provision.key)?.programSlug || ''
    );
    if (!program || !userCanAccessResource(user, program)) {
      throw new Error(`La cuenta de ${provision.email} no quedó matriculada en su programa.`);
    }
    if (provision.password) {
      const login = await authenticateWithPassword(provision.email, provision.password);
      if (login.userId !== provision.userId) {
        throw new Error(`La verificación de acceso falló para ${provision.email}.`);
      }
    }
    const planCount = prepare(
      'SELECT COUNT(*) AS total FROM academic_plans WHERE user_id = ?'
    ).get(provision.userId) as { total: number };
    if (Number(planCount.total) !== 200) {
      throw new Error(`Se esperaban 200 planes para ${provision.email}, hay ${planCount.total}.`);
    }
  }

  console.log('Año escolar generado y verificado.');
  console.log(`Inicio: ${yearStart} · Fin: ${yearEnd} · Días: 200.`);
  console.log(`Auditoría: ${audit.estado} (${audit.coberturaPorcentaje}%).`);
  for (const result of results) {
    console.log(`${result.name}: ${result.guides} guías · ${result.subjects} clases · ${(result.bytes / 1024 / 1024).toFixed(2)} MiB.`);
  }
  console.log(`Informe: ${reportPath}`);
  if (credentialPath) {
    console.log(`Credenciales iniciales protegidas: ${credentialPath}`);
    console.log('Las contraseñas no se imprimen en la consola ni se guardan en Git.');
  } else {
    console.log('Las cuentas ya existían; no se generaron nuevas contraseñas. Usa --rotate para renovarlas.');
  }
  console.log(`Derechos activos verificados: ${provisioned.reduce((total, student) => total + listUserEntitlements(student.userId).length, 0)}.`);
}

main()
  .catch((error) => {
    console.error('No fue posible generar el año escolar:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
