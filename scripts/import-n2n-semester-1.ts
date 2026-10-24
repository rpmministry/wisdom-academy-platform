/**
 * Importa el Semestre 1 oficial de N2N a Wisdom Academy.
 *
 * Uso: npm run import:n2n-semester-1
 *
 * - No inventa contenidos: usa el horario, los libros y los exámenes oficiales.
 * - Es idempotente: actualiza clases y materiales existentes por claves N2N.
 * - Deja los semestres 2-10 bloqueados hasta completar y aprobar el anterior.
 * - Publica el programa al finalizar.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prepare } from '../src/server/db';
import { nowIso } from '../src/server/db/sqlite';
import {
  addLesson,
  addModule,
  createProgram,
  createWeeklyReview,
  getProgramRowBySlug,
  updateLesson,
  updateModule,
  updateProgram,
  updateWeeklyReview,
} from '../src/server/domain/coursePrograms';
import {
  auditAssessment,
  createAssessment,
  publishAssessment,
} from '../src/server/domain/courseAssessments';
import { randomToken } from '../src/server/security/random';
import { ensureDefaultWeeklyMeetings } from '../src/server/domain/weeklyMeetings';
import {
  N2N_PROGRAM_METADATA,
  N2N_SEMESTER_1_SCHEDULE,
  N2N_SEMESTER_DESCRIPTIONS,
  N2N_SEMESTER_1_SUBJECTS,
  N2N_SEMESTER_PLANS,
  type N2nSessionSeed,
} from '../src/lib/courses/n2nSemester1';
import { N2N_FINAL_REVIEW_MD, N2N_PARTIAL_REVIEW_MD } from '../src/lib/courses/n2nReviews';

const OLD_SLUG = 'curso-teologico-universidad-cristiana-n2n';
const NEW_SLUG = 'programa-de-teologia-n2n';
const PROGRAM_TITLE = 'Programa de Teología | Universidad Cristiana N2N';

const PROGRAM_DESCRIPTION = `Programa de educación teológica y ministerial basado en el currículo de Nation-2-Nation Christian University (N2N). Forma a líderes, voluntarios y miembros de iglesia para el servicio en el ministerio, la enseñanza bíblica y el liderazgo en la iglesia local.

Incluye clases en video, textos oficiales, repasos semanales y evaluaciones. El avance es secuencial: cada semestre se habilita al completar y aprobar el anterior.

Naturaleza del programa: educación para el ministerio. No otorga un título académico, no confiere un grado académico y no cuenta con aval académico. Wisdom Academy emite diplomas y certificados ministeriales de estudios semestre a semestre, sujetos al cumplimiento de las clases y evaluaciones.`;

const PROGRAM_OBJECTIVES = [
  'Comprender las bases bíblicas, doctrinales y ministeriales del currículo N2N.',
  'Desarrollar hábitos de estudio, reflexión y aplicación práctica en la iglesia local.',
  'Crecer en carácter, servicio y liderazgo para el ministerio cristiano.',
  'Completar las clases, repasos y evaluaciones de cada semestre con una secuencia verificable.',
];

const PROGRAM_REQUIREMENTS = [
  'Compromiso de participación en una iglesia o ministerio local.',
  'Servicio ministerial práctico de al menos 10 horas por semestre, según la guía N2N.',
  'Completar las clases y aprobar las evaluaciones del semestre con 60% o más.',
];

const PROGRAM_MATERIALS = [
  {
    key: 'plan-semestres-1-5',
    title: 'Plan de estudios N2N — Semestres 1 a 5',
    fileId: '1fATFR80Wl0Nwn8QBUPfeMz6VETyIcAdh',
    filename: '1 SEMESTRE 2024.pdf',
    visibility: 'student' as const,
  },
  {
    key: 'calendario-s1',
    title: 'Calendario oficial del Semestre 1',
    fileId: '1YXfWKFjeTez7EY__CTD7DWcmeVNTLb0f',
    filename: 'N2NLA Semester 1-Class schedule.pdf',
    visibility: 'student' as const,
  },
  {
    key: 'guia-facilitador',
    title: 'Guía del facilitador N2N 2020-2021',
    fileId: '170P4Bw-o01u-800EcjIYceKzTiSM_Fw0',
    filename: 'GUIA DEL FACILITADOR 2020-2021.pdf',
    visibility: 'staff' as const,
  },
  ...N2N_SEMESTER_1_SUBJECTS.map((subject) => ({
    key: `libro-${subject.code}`,
    title: `Texto completo — ${subject.bookTitle}`,
    fileId: subject.bookFileId,
    filename: subject.bookFilename,
    visibility: 'student' as const,
  })),
];

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function ensureProgram(): string {
  let program = getProgramRowBySlug(NEW_SLUG) || getProgramRowBySlug(OLD_SLUG);
  if (!program) {
    const created = createProgram({
      kind: 'course',
      title: PROGRAM_TITLE,
      slug: NEW_SLUG,
      subtitle: 'Formación bíblica y ministerial · Currículo N2N',
      description: PROGRAM_DESCRIPTION,
      institution: 'Universidad Cristiana N2N (N2NCU)',
      level: 'Educación para el ministerio',
      audience: 'Líderes, voluntarios, miembros de iglesia y personas llamadas al servicio ministerial.',
      durationLabel: '10 semestres · 32 sesiones programadas en el Semestre 1',
      objectives: PROGRAM_OBJECTIVES,
      requirements: PROGRAM_REQUIREMENTS,
      coverImageUrl: '/brand/n2n/online-mid1-2022.jpg',
      status: 'draft',
      metadata: N2N_PROGRAM_METADATA,
    });
    program = getProgramRowBySlug(created.slug);
    if (!program) throw new Error('No se pudo crear el programa N2N.');
    console.log(`+ Programa creado: ${PROGRAM_TITLE}`);
  }

  const conflict = prepare('SELECT id FROM resources WHERE slug = ? AND id <> ?').get(
    NEW_SLUG,
    program.resource_id
  ) as { id: string } | undefined;
  if (!conflict) {
    prepare('UPDATE resources SET slug = ?, updated_at = ? WHERE id = ?').run(
      NEW_SLUG,
      nowIso(),
      program.resource_id
    );
  }

  updateProgram(
    program.id,
    {
      title: PROGRAM_TITLE,
      subtitle: 'Formación bíblica y ministerial · Currículo N2N',
      description: PROGRAM_DESCRIPTION,
      institution: 'Universidad Cristiana N2N (N2NCU)',
      level: 'Educación para el ministerio',
      audience: 'Líderes, voluntarios, miembros de iglesia y personas llamadas al servicio ministerial.',
      durationLabel: '10 semestres · 32 sesiones programadas en el Semestre 1',
      objectives: PROGRAM_OBJECTIVES,
      requirements: PROGRAM_REQUIREMENTS,
      coverImageUrl: '/brand/n2n/online-mid1-2022.jpg',
      status: 'published',
      metadata: N2N_PROGRAM_METADATA,
    },
    null
  );
  console.log(`= Programa actualizado: ${PROGRAM_TITLE}`);
  return program.id;
}

function ensureSemesterModules(programId: string): Map<number, string> {
  const existing = prepare('SELECT * FROM course_modules WHERE program_id = ? ORDER BY position').all(
    programId
  ) as Array<{ id: string; metadata_json: string }>;
  const bySemester = new Map<number, string>();
  for (const module of existing) {
    const metadata = parseMetadata(module.metadata_json);
    if (Number.isInteger(Number(metadata.semesterNumber))) {
      bySemester.set(Number(metadata.semesterNumber), module.id);
    }
  }

  for (let semester = 1; semester <= 10; semester += 1) {
    const title = `Semestre ${String(semester).padStart(2, '0')}`;
    const description = N2N_SEMESTER_DESCRIPTIONS[semester];
    let moduleId = bySemester.get(semester);
    if (!moduleId) {
      const created = addModule(programId, {
        title,
        kind: 'semester',
        position: semester,
        description,
      });
      moduleId = created.id;
      console.log(`+ Módulo creado: ${title}`);
    } else {
      updateModule(moduleId, { title, description, position: semester, kind: 'semester' });
    }
    const subjects = N2N_SEMESTER_PLANS[semester] || [];
    prepare('UPDATE course_modules SET metadata_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify({
        semesterNumber: semester,
        title,
        description,
        subjects,
        contentStatus:
          semester === 1 ? 'loaded' : semester <= 5 ? 'pending_upload' : 'pending_source',
        source: 'N2N 1 SEMESTRE 2024.pdf',
      }),
      nowIso(),
      moduleId
    );
    bySemester.set(semester, moduleId);
  }
  return bySemester;
}

function upsertProgramMaterial(input: {
  programId: string;
  key: string;
  title: string;
  fileId: string;
  filename: string;
  visibility: 'student' | 'staff';
  extra?: Record<string, unknown>;
}): void {
  const rows = prepare(
    'SELECT * FROM course_materials WHERE program_id = ? AND lesson_id IS NULL'
  ).all(input.programId) as Array<{ id: string; metadata_json: string }>;
  const existing = rows.find((row) => parseMetadata(row.metadata_json).n2nAssetKey === input.key);
  const metadata = JSON.stringify({
    source: 'n2n',
    n2nAssetKey: input.key,
    originalFilename: input.filename,
    visibility: input.visibility,
    ...(input.extra || {}),
  });
  if (existing) {
    prepare(`
      UPDATE course_materials
      SET title = ?, kind = 'drive_file', url = NULL, drive_file_id = ?, visibility = ?,
          metadata_json = ?
      WHERE id = ?
    `).run(
      input.title,
      input.fileId,
      input.visibility,
      metadata,
      existing.id
    );
    return;
  }
  prepare(`
    INSERT INTO course_materials
      (id, program_id, module_id, lesson_id, kind, title, url, drive_file_id, visibility,
       position, metadata_json, created_at)
    VALUES (?, ?, NULL, NULL, 'drive_file', ?, NULL, ?, ?, 0, ?, ?)
  `).run(
    `mat_${randomToken(16)}`,
    input.programId,
    input.title,
    input.fileId,
    input.visibility,
    metadata,
    nowIso()
  );
}

function lessonDescription(session: N2nSessionSeed): string {
  return `Sesión ${session.session} del curso ${session.subject}. Texto oficial: ${session.bookTitle}, páginas ${session.pages}. Semana ${session.week} del horario oficial.`;
}

function ensureLessons(programId: string, moduleId: string): number {
  const existing = prepare('SELECT * FROM course_lessons WHERE program_id = ? AND module_id = ?').all(
    programId,
    moduleId
  ) as Array<{ id: string; metadata_json: string }>;
  const byKey = new Map<string, string>();
  for (const lesson of existing) {
    const metadata = parseMetadata(lesson.metadata_json);
    if (typeof metadata.n2nKey === 'string') byKey.set(metadata.n2nKey, lesson.id);
  }

  let count = 0;
  N2N_SEMESTER_1_SCHEDULE.forEach((session, index) => {
    const title = `${session.subjectCode} · ${session.subject} — Sesión ${session.session}: ${session.title}`;
    const metadata = {
      n2nKey: session.key,
      semesterNumber: 1,
      subjectCode: session.subjectCode,
      subject: session.subject,
      sessionNumber: session.session,
      week: session.week,
      bookFileId: session.bookFileId,
      bookTitle: session.bookTitle,
      pages: session.pages,
      videoId: session.videoId,
      sourceRef: `${session.bookTitle} (${session.bookFileId}), páginas ${session.pages}`,
      scheduleSource: 'N2NLA Semester 1-Class schedule.pdf',
    };
    const base = {
      title,
      description: lessonDescription(session),
      position: index + 1,
      videoIds: [session.videoId],
      pagesLabel: session.pages,
    };
    const existingId = byKey.get(session.key);
    let lessonId = existingId || null;
    if (lessonId) {
      updateLesson(lessonId, base);
    } else {
      const created = addLesson(programId, moduleId, base);
      lessonId = created.id;
      byKey.set(session.key, lessonId);
      count += 1;
    }
    prepare('UPDATE course_lessons SET metadata_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(metadata),
      nowIso(),
      lessonId
    );

    const existingMaterial = prepare(
      'SELECT id FROM course_materials WHERE lesson_id = ? AND drive_file_id = ? LIMIT 1'
    ).get(lessonId, session.bookFileId) as { id: string } | undefined;
    if (!existingMaterial) {
      prepare(`
        INSERT INTO course_materials
          (id, program_id, module_id, lesson_id, kind, title, url, drive_file_id, visibility,
           position, metadata_json, created_at)
        VALUES (?, ?, ?, ?, 'drive_file', ?, NULL, ?, 'student', 0, ?, ?)
      `).run(
        `mat_${randomToken(16)}`,
        programId,
        moduleId,
        lessonId,
        `Texto: ${session.bookTitle}`,
        session.bookFileId,
        JSON.stringify({
          source: 'n2n',
          n2nAssetKey: `lesson-${session.key}`,
          originalFilename: session.bookTitle,
          pages: session.pages,
        }),
        nowIso()
      );
    }
  });
  console.log(`= Clases verificadas en Semestre 01: ${N2N_SEMESTER_1_SCHEDULE.length} (nuevas: ${count})`);
  return count;
}

function ensureReviews(programId: string, moduleId: string): void {
  const definitions = [
    {
      title: 'Repaso para el Examen Parcial — Semestre 1',
      weekLabel: 'Semana 5',
      content: N2N_PARTIAL_REVIEW_MD,
      position: 1,
      refs: [
        { source: '38-RYD-5 Sesiones.pdf', page: '1-10', detail: 'Alcanzando Su Destino, sesiones 1-4' },
        { source: 'N2-MF-00.pdf', page: '1-23', detail: 'El Matrimonio y la Familia, sesiones 1-9' },
        { source: 'N3-VC-00.pdf', page: '74-76', detail: 'La Vida Cristiana Victoriosa, sesión 1' },
        { source: 'N2NLA Semester 1-Class schedule.pdf', page: 'Semanas 1-6', detail: 'Horario oficial' },
      ],
    },
    {
      title: 'Repaso para el Examen Final — Semestre 1',
      weekLabel: 'Semana 11',
      content: N2N_FINAL_REVIEW_MD,
      position: 2,
      refs: [
        { source: 'N4-FD-00.pdf', page: '1-20', detail: 'Libre por el Decreto Divino, sesiones 1-10' },
        { source: 'N5-SL-00.pdf', page: '27-42', detail: 'El Sufrimiento y La Pérdida, sesiones 1-6' },
        { source: 'N3-VC-00.pdf', page: '77-80', detail: 'La Vida Cristiana Victoriosa, sesión 2' },
        { source: 'N2-MF-00.pdf', page: '24-26', detail: 'El Matrimonio y la Familia, sesión 10' },
        { source: 'N2NLA Semester 1-Class schedule.pdf', page: 'Semanas 7-12', detail: 'Horario oficial' },
      ],
    },
  ];

  for (const definition of definitions) {
    const existing = prepare(
      'SELECT id FROM weekly_reviews WHERE program_id = ? AND title = ?'
    ).get(programId, definition.title) as { id: string } | undefined;
    if (existing) {
      updateWeeklyReview(
        existing.id,
        {
          title: definition.title,
          contentMd: definition.content,
          status: 'published',
          sourceRefs: definition.refs,
        },
        null
      );
      prepare(
        "UPDATE weekly_reviews SET week_label = ?, module_id = ?, position = ?, is_ai_generated = 1, updated_at = ? WHERE id = ?"
      ).run(definition.weekLabel, moduleId, definition.position, nowIso(), existing.id);
      console.log(`= Repaso actualizado: ${definition.title}`);
    } else {
      const created = createWeeklyReview(
        programId,
        {
          title: definition.title,
          weekLabel: definition.weekLabel,
          contentMd: definition.content,
          moduleId,
          sourceRefs: definition.refs,
          isAiGenerated: true,
          status: 'published',
          position: definition.position,
        },
        null
      );
      console.log(`+ Repaso creado: ${definition.title} [${created.id}]`);
    }
  }
}

function ensureAssessments(programId: string, moduleId: string): void {
  const file = path.join(process.cwd(), 'content', 'n2n', 'semester-1-exams.json');
  if (!fs.existsSync(file)) throw new Error('No se encontró content/n2n/semester-1-exams.json');
  const exams = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{
    examNumber: number;
    title: string;
    subject: string;
    kind: 'midterm' | 'final';
    sourceFile: string;
    sourceFileId: string;
    bookFile: string;
    bookFileId: string;
    questions: Array<{
      number: number;
      type: 'true_false' | 'multiple_choice';
      prompt: string;
      options: Array<{ id: string; label: string }>;
      correctKey: string;
      sourceRef: string;
    }>;
  }>;

  for (const exam of exams) {
    const existing = prepare(
      'SELECT id, status FROM assessments WHERE program_id = ? AND title = ?'
    ).get(programId, exam.title) as { id: string; status: string } | undefined;
    if (existing) {
      const audit = auditAssessment(existing.id);
      if (existing.status !== 'published' && audit.ok) {
        publishAssessment(existing.id, null);
        console.log(`= Evaluación publicada: ${exam.title}`);
      } else {
        console.log(`= Evaluación ya existente: ${exam.title} (${existing.status})`);
      }
      continue;
    }

    const assessment = createAssessment(
      programId,
      {
        title: exam.title,
        kind: exam.kind,
        moduleId,
        origin: 'official',
        attemptsAllowed: 2,
        passPercentage: 60,
        instructions: `Evaluación oficial del currículo N2N correspondiente a ${exam.subject}. A libro cerrado: no se permiten Biblias ni apuntes. ${exam.questions.length} preguntas. La nota mínima institucional es 60%. La calificación se calcula automáticamente en el servidor; las claves y la revisión detallada son privadas del personal académico.`,
        sourceRefs: [
          {
            source: exam.sourceFile,
            fileId: exam.sourceFileId,
            book: exam.bookFile,
            bookFileId: exam.bookFileId,
            examNumber: exam.examNumber,
            answerKey: 'N2N_Exams_and_AK.pdf',
          },
        ],
        questions: exam.questions.map((question) => ({
          type: question.type,
          prompt: question.prompt,
          options: question.options,
          correctKey: question.correctKey,
          sourceRef: question.sourceRef,
          reviewState: 'approved',
        })),
      },
      null
    );
    const audit = auditAssessment(assessment.id);
    if (!audit.ok) {
      console.error(`Auditoría fallida para ${exam.title}:`, audit.issues);
      throw new Error(`La evaluación ${exam.title} no pasó la auditoría.`);
    }
    publishAssessment(assessment.id, null);
    console.log(`+ Evaluación oficial creada y publicada: ${exam.title} (${exam.questions.length} preguntas)`);
  }
}

function ensureN2nProductPricing(programId: string): void {
  const program = prepare('SELECT resource_id FROM course_programs WHERE id = ?').get(programId) as
    | { resource_id: string }
    | undefined;
  if (!program) throw new Error('No se encontro el recurso del programa N2N.');

  const product = prepare(`
    SELECT p.id, p.metadata_json
    FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ?
    LIMIT 1
  `).get(program.resource_id) as { id: string; metadata_json: string } | undefined;
  if (!product) throw new Error('No se encontro el producto del programa N2N.');

  let metadata: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(product.metadata_json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    metadata = {};
  }

  metadata.billingPeriod = 'semester';
  metadata.offerLabel = 'USD 50 por semestre';
  metadata.offerPeriod = 'por semestre';
  metadata.offerDescription =
    'Precio de USD 50 por semestre del Programa de Teologia. El acceso se habilita al confirmar el pago.';

  prepare(`
    UPDATE products
    SET price_cents = 5000, currency = 'USD', price_status = 'defined',
        status = 'published', metadata_json = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(metadata), nowIso(), product.id);
  console.log('= Producto N2N activado: USD 50 por semestre.');
}

function main(): void {
  prepare('SELECT 1').get();
  const programId = ensureProgram();
  const modules = ensureSemesterModules(programId);
  const semester1 = modules.get(1);
  if (!semester1) throw new Error('No se encontró el módulo del Semestre 1.');

  ensureLessons(programId, semester1);

  for (const material of PROGRAM_MATERIALS) {
    upsertProgramMaterial({
      programId,
      key: material.key,
      title: material.title,
      fileId: material.fileId,
      filename: material.filename,
      visibility: material.visibility,
      extra: { semesters: material.key === 'plan-semestres-1-5' ? '1-5' : undefined },
    });
  }
  console.log(`= Materiales de programa verificados: ${PROGRAM_MATERIALS.length}`);

  ensureReviews(programId, semester1);
  ensureAssessments(programId, semester1);
  ensureN2nProductPricing(programId);

  const newMeetings = ensureDefaultWeeklyMeetings(
    programId,
    Array.from({ length: 12 }, (_, index) => index + 1),
    { hostName: 'Profesor de Teología' }
  );
  console.log(`= Salas de repaso semanal verificadas: ${newMeetings} nuevas`);

  const counts = prepare(`
    SELECT
      (SELECT COUNT(*) FROM course_lessons WHERE program_id = ?) AS lessons,
      (SELECT COUNT(*) FROM course_materials WHERE program_id = ?) AS materials,
      (SELECT COUNT(*) FROM weekly_reviews WHERE program_id = ?) AS reviews,
      (SELECT COUNT(*) FROM assessments WHERE program_id = ?) AS assessments
  `).get(programId, programId, programId, programId) as {
    lessons: number;
    materials: number;
    reviews: number;
    assessments: number;
  };
  console.log('');
  console.log('Semestre 1 importado. Totales del programa:');
  console.log(`Clases: ${counts.lessons}`);
  console.log(`Materiales: ${counts.materials}`);
  console.log(`Repasos: ${counts.reviews}`);
  console.log(`Evaluaciones: ${counts.assessments}`);
  console.log('Programa publicado. Los semestres 2-10 quedan bloqueados hasta aprobar el anterior.');
}

main();
