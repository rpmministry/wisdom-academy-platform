import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';
import { writeAudit } from '../audit';
import { getProgramRowById, type CourseLessonRow } from './coursePrograms';
import { mergeManifestEntries, parseManifest, type ManifestEntry } from '@/lib/courses/manifest';
import { extractDocument } from '@/lib/courses/documents';
import { buildYouTubeWatchUrl } from '@/lib/courses/youtube';

export interface ImportRowPreview {
  semester: number | null;
  lessonNumber: number | null;
  title: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  action: 'create' | 'update' | 'error';
  existingLessonId: string | null;
  videoIds: string[];
  pages: string | null;
  message: string | null;
}

export interface ManifestPreview {
  format: string;
  stats: {
    total: number;
    create: number;
    update: number;
    errors: number;
    warnings: number;
  };
  rows: ImportRowPreview[];
  errors: string[];
  warnings: string[];
  entries: ManifestEntry[];
}

function findSemesterModule(programId: string, semester: number): { id: string; title: string } | null {
  const modules = prepare(
    "SELECT id, title, metadata_json FROM course_modules WHERE program_id = ? AND kind = 'semester' ORDER BY position"
  ).all(programId) as Array<{ id: string; title: string; metadata_json: string }>;
  for (const module of modules) {
    try {
      const metadata = JSON.parse(module.metadata_json) as { semesterNumber?: unknown };
      if (Number(metadata.semesterNumber) === semester) return module;
    } catch {
      // continúa con la coincidencia por título
    }
    const pattern = new RegExp(`semestre\\s*0*${semester}\\b`, 'i');
    if (pattern.test(module.title)) return module;
  }
  return null;
}

function lessonMetadata(row: CourseLessonRow): { lessonNumber?: number; pages?: string | null; sourceRef?: string | null } {
  try {
    return JSON.parse(row.metadata_json) as { lessonNumber?: number; pages?: string | null; sourceRef?: string | null };
  } catch {
    return {};
  }
}

function findExistingLesson(
  programId: string,
  moduleId: string,
  entry: ManifestEntry
): CourseLessonRow | null {
  const lessons = prepare(
    'SELECT * FROM course_lessons WHERE program_id = ? AND module_id = ? ORDER BY position'
  ).all(programId, moduleId) as CourseLessonRow[];
  for (const lesson of lessons) {
    const metadata = lessonMetadata(lesson);
    if (entry.lessonNumber !== null && Number(metadata.lessonNumber) === entry.lessonNumber) return lesson;
  }
  if (entry.title) {
    const normalized = entry.title.trim().toLowerCase();
    for (const lesson of lessons) {
      if (lesson.title.trim().toLowerCase() === normalized) return lesson;
    }
  }
  return null;
}

export function previewManifestImport(
  programId: string,
  filename: string,
  content: string
): ManifestPreview {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  const parsed = parseManifest(filename, content);
  const merged = mergeManifestEntries(parsed.entries);
  const rows: ImportRowPreview[] = [];
  const errors = [...parsed.errors];
  const seenClasses = new Set<string>();
  let create = 0;
  let update = 0;
  let rowErrors = 0;

  merged.slice(0, 500).forEach((entry) => {
    const label = `Semestre ${entry.semester ?? '?'}, clase ${entry.lessonNumber ?? '?'}`;
    if (entry.semester === null || entry.lessonNumber === null || !entry.title) {
      rowErrors += 1;
      rows.push({
        semester: entry.semester,
        lessonNumber: entry.lessonNumber,
        title: entry.title,
        moduleId: null,
        moduleTitle: null,
        action: 'error',
        existingLessonId: null,
        videoIds: entry.videoIds,
        pages: entry.pages,
        message: 'Faltan datos obligatorios (semestre, número de clase o título).',
      });
      return;
    }
    const classKey = `${entry.semester}-${entry.lessonNumber}`;
    if (seenClasses.has(classKey)) {
      rowErrors += 1;
      rows.push({
        semester: entry.semester,
        lessonNumber: entry.lessonNumber,
        title: entry.title,
        moduleId: null,
        moduleTitle: null,
        action: 'error',
        existingLessonId: null,
        videoIds: entry.videoIds,
        pages: entry.pages,
        message: 'Clase duplicada en el manifiesto.',
      });
      return;
    }
    seenClasses.add(classKey);

    const module = findSemesterModule(programId, entry.semester);
    if (!module) {
      rowErrors += 1;
      errors.push(`${label}: no existe el semestre ${entry.semester} en el programa.`);
      rows.push({
        semester: entry.semester,
        lessonNumber: entry.lessonNumber,
        title: entry.title,
        moduleId: null,
        moduleTitle: null,
        action: 'error',
        existingLessonId: null,
        videoIds: entry.videoIds,
        pages: entry.pages,
        message: `No existe el semestre ${entry.semester} en este programa.`,
      });
      return;
    }
    if (entry.invalidVideoUrls.length) {
      rowErrors += 1;
      rows.push({
        semester: entry.semester,
        lessonNumber: entry.lessonNumber,
        title: entry.title,
        moduleId: module.id,
        moduleTitle: module.title,
        action: 'error',
        existingLessonId: null,
        videoIds: entry.videoIds,
        pages: entry.pages,
        message: `Enlaces inválidos: ${entry.invalidVideoUrls.join(', ')}`,
      });
      return;
    }

    const existing = findExistingLesson(programId, module.id, entry);
    if (existing) update += 1;
    else create += 1;
    rows.push({
      semester: entry.semester,
      lessonNumber: entry.lessonNumber,
      title: entry.title,
      moduleId: module.id,
      moduleTitle: module.title,
      action: existing ? 'update' : 'create',
      existingLessonId: existing?.id || null,
      videoIds: entry.videoIds,
      pages: entry.pages,
      message: existing
        ? 'Se actualizarán videos y metadatos sin duplicar la clase.'
        : 'Se creará la clase en el semestre correspondiente.',
    });
  });

  return {
    format: parsed.format,
    stats: {
      total: parsed.entries.length,
      create,
      update,
      errors: rowErrors + parsed.errors.length,
      warnings: parsed.warnings.length,
    },
    rows,
    errors: [...new Set(errors)].slice(0, 200),
    warnings: parsed.warnings.slice(0, 200),
    entries: merged,
  };
}

export interface ManifestImportResult {
  runId: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  lessons: Array<{ lessonId: string; title: string; semester: number; lessonNumber: number }>;
}

export function confirmManifestImport(
  programId: string,
  filename: string,
  content: string,
  actor: AuthUser
): ManifestImportResult {
  const preview = previewManifestImport(programId, filename, content);
  const now = nowIso();
  const runId = `imp_${randomToken(16)}`;
  const errors = [...preview.errors];
  const warnings = [...preview.warnings];
  const lessons: ManifestImportResult['lessons'] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  withTransaction(() => {
    preview.rows.forEach((row) => {
      if (row.action === 'error' || !row.moduleId || row.semester === null || row.lessonNumber === null || !row.title) {
        skipped += 1;
        if (row.message && !errors.includes(row.message)) errors.push(row.message);
        return;
      }
      const entry = preview.entries.find(
        (item) => item.semester === row.semester && item.lessonNumber === row.lessonNumber
      );
      if (!entry) {
        skipped += 1;
        return;
      }
      if (row.existingLessonId) {
        prepare(`
          UPDATE course_lessons
          SET title = ?, pages_label = ?, duration_label = ?, description = COALESCE(?, description),
              youtube_video_ids_json = ?, metadata_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          row.title.slice(0, 250),
          entry.pages || null,
          entry.duration || null,
          entry.description || null,
          JSON.stringify(entry.videoIds),
          JSON.stringify({
            lessonNumber: row.lessonNumber,
            pages: entry.pages || null,
            sourceRef: filename,
            importedAt: now,
          }),
          now,
          row.existingLessonId
        );
        updated += 1;
        lessons.push({
          lessonId: row.existingLessonId,
          title: row.title,
          semester: row.semester,
          lessonNumber: row.lessonNumber,
        });
      } else {
        const position = Number(
          (prepare('SELECT COALESCE(MAX(position), 0) AS max FROM course_lessons WHERE module_id = ?').get(
            row.moduleId
          ) as { max: number }).max
        ) + 1;
        const lessonId = `les_${randomToken(16)}`;
        prepare(`
          INSERT INTO course_lessons
            (id, program_id, module_id, title, description, position, youtube_video_ids_json,
             pages_label, duration_label, metadata_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          lessonId,
          programId,
          row.moduleId,
          row.title.slice(0, 250),
          entry.description || null,
          position,
          JSON.stringify(entry.videoIds),
          entry.pages || null,
          entry.duration || null,
          JSON.stringify({
            lessonNumber: row.lessonNumber,
            pages: entry.pages || null,
            sourceRef: filename,
            importedAt: now,
          }),
          now,
          now
        );
        imported += 1;
        lessons.push({
          lessonId,
          title: row.title,
          semester: row.semester,
          lessonNumber: row.lessonNumber,
        });
      }

      if (entry.material) {
        const materialTitle = entry.material.slice(0, 250);
        const existingMaterial = prepare(
          'SELECT id FROM course_materials WHERE lesson_id = ? AND title = ?'
        ).get(lessons[lessons.length - 1].lessonId, materialTitle) as { id: string } | undefined;
        if (!existingMaterial) {
          prepare(`
            INSERT INTO course_materials
              (id, program_id, module_id, lesson_id, kind, title, url, visibility, position, metadata_json, created_at)
            VALUES (?, ?, ?, ?, 'external_link', ?, ?, 'student', 0, '{}', ?)
          `).run(
            `mat_${randomToken(16)}`,
            programId,
            row.moduleId,
            lessons[lessons.length - 1].lessonId,
            materialTitle,
            entry.material,
            now
          );
        }
      }
    });

    const summary = {
      filename,
      format: preview.format,
      imported,
      updated,
      skipped,
      errors: errors.length,
      warnings: warnings.length,
      lessons,
    };
    prepare(`
      INSERT INTO course_import_runs (id, program_id, kind, filename, summary_json, created_by, created_at)
      VALUES (?, ?, 'video_manifest', ?, ?, ?, ?)
    `).run(runId, programId, filename.slice(0, 250), JSON.stringify(summary), actor.id, now);
  });

  writeAudit({
    actor,
    action: 'course_manifest.imported',
    entityType: 'course_program',
    entityId: programId,
    after: { runId, imported, updated, skipped, errors: errors.length },
  });

  return { runId, imported, updated, skipped, errors: errors.slice(0, 200), warnings, lessons };
}

export interface DocumentImportResult {
  materialId: string;
  filename: string;
  visibility: 'student' | 'staff';
  confidence: string;
  pageCount: number | null;
  warnings: string[];
  driveFileId: string | null;
  driveStatus: 'uploaded' | 'not_configured' | 'failed';
  textLength: number;
  preview: string;
}

/**
 * Importa un documento (PDF/DOCX/TXT/MD) como material textual.
 *
 * Si Drive está configurado y el programa tiene carpeta, el original se sube a
 * `01_DOCUMENTOS_ORIGINALES`; si falla, la importación de texto no se pierde.
 */
export async function importDocument(input: {
  programId: string;
  filename: string;
  buffer: Buffer;
  mimeType?: string;
  visibility?: 'student' | 'staff';
  actor: AuthUser;
}): Promise<DocumentImportResult> {
  const program = getProgramRowById(input.programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  const visibility = input.visibility === 'staff' ? 'staff' : 'student';
  const extracted = extractDocument({
    filename: input.filename,
    mimeType: input.mimeType,
    buffer: input.buffer,
  });
  if (!extracted.text) {
    throw new ApiError(
      422,
      'DOCUMENT_EMPTY',
      'No se pudo extraer texto del documento. Si es un PDF escaneado, aplica OCR antes de importarlo.'
    );
  }

  let driveFileId: string | null = null;
  let driveStatus: DocumentImportResult['driveStatus'] = 'not_configured';
  const warnings = [...extracted.warnings];

  if (program.drive_folder_id && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    try {
      const { createDriveGateway, ensureFolderStructure } = await import('@/lib/courses/googleDrive');
      const gateway = createDriveGateway();
      let parentId = program.drive_folder_id;
      const privateAdminRoot = process.env.GOOGLE_DRIVE_PRIVATE_ADMIN_FOLDER_ID?.trim();

      if (visibility === 'staff' && privateAdminRoot) {
        const ensured = await ensureFolderStructure({
          gateway,
          rootFolderId: privateAdminRoot,
          nodes: [
            {
              name: 'Examenes oficiales',
              purpose: 'Originales de exámenes con respuestas. Acceso exclusivo del personal académico.',
              children: [
                {
                  name: program.id,
                  purpose: 'Documentos oficiales privados del programa.',
                },
              ],
            },
          ],
        });
        const programFolder = ensured.folders.find((folder) => folder.name === program.id);
        parentId = programFolder?.id || ensured.folders[0].id;
      } else {
        const management = await gateway.findFolder(
          program.drive_folder_id,
          '00_GESTION_E_INDICE_DE_MATERIALES'
        );
        const originals = management
          ? await gateway.findFolder(management.id, '01_DOCUMENTOS_ORIGINALES')
          : null;
        parentId = originals?.id || program.drive_folder_id;
        if (visibility === 'staff') {
          warnings.push(
            'GOOGLE_DRIVE_PRIVATE_ADMIN_FOLDER_ID no está configurado. El original privado se guardó en la carpeta de gestión del programa; verifica que no herede permisos de estudiantes.'
          );
        }
      }

      const upload = await gateway.uploadFile({
        parentId,
        name: input.filename.slice(0, 250),
        mimeType: extracted.mimeType,
        content: input.buffer,
      });
      driveFileId = upload.id;
      driveStatus = 'uploaded';
    } catch (error) {
      driveStatus = 'failed';
      warnings.push(
        `El texto se importó, pero el original no pudo subirse a Drive: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`
      );
    }
  }

  const materialId = `mat_${randomToken(16)}`;
  const now = nowIso();
  const preview = extracted.text.slice(0, 5000);
  prepare(`
    INSERT INTO course_materials
      (id, program_id, module_id, lesson_id, kind, title, url, drive_file_id, visibility, position, metadata_json, created_at)
    VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    materialId,
    input.programId,
    driveFileId ? 'drive_file' : 'text',
    input.filename.replace(/\.[^.]+$/, '').slice(0, 250),
    driveFileId && visibility === 'student' ? `https://drive.google.com/file/d/${driveFileId}/view` : null,
    driveFileId,
    visibility,
    JSON.stringify({
      source: 'document_import',
      documentClass: visibility === 'staff' ? 'exam_source' : 'material',
      visibleToStudents: visibility === 'student',
      originalFilename: input.filename,
      extension: extracted.extension,
      mimeType: extracted.mimeType,
      confidence: extracted.confidence,
      pageCount: extracted.pageCount,
      truncated: extracted.truncated,
      warnings,
      textPreview: preview,
      extractedText: extracted.text,
      textLength: extracted.text.length,
      importedAt: now,
    }),
    now
  );

  prepare(`
    INSERT INTO course_import_runs (id, program_id, kind, filename, summary_json, created_by, created_at)
    VALUES (?, ?, 'document', ?, ?, ?, ?)
  `).run(
    `imp_${randomToken(16)}`,
    input.programId,
    input.filename.slice(0, 250),
    JSON.stringify({
      materialId,
      confidence: extracted.confidence,
      pageCount: extracted.pageCount,
      warnings,
      driveStatus,
    }),
    input.actor.id,
    now
  );

  writeAudit({
    actor: input.actor,
    action: 'course_document.imported',
    entityType: 'course_material',
    entityId: materialId,
    after: { programId: input.programId, filename: input.filename, confidence: extracted.confidence, driveStatus },
  });

  return {
    materialId,
    filename: input.filename,
    visibility,
    confidence: extracted.confidence,
    pageCount: extracted.pageCount,
    warnings,
    driveFileId,
    driveStatus,
    textLength: extracted.text.length,
    preview,
  };
}

export function listImportRuns(programId: string): Array<{
  id: string;
  kind: string;
  filename: string;
  summary: Record<string, unknown>;
  createdAt: string;
}> {
  const rows = prepare(
    'SELECT * FROM course_import_runs WHERE program_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(programId) as Array<{
    id: string;
    kind: string;
    filename: string;
    summary_json: string;
    created_at: string;
  }>;
  return rows.map((row) => {
    let summary: Record<string, unknown> = {};
    try {
      summary = JSON.parse(row.summary_json) as Record<string, unknown>;
    } catch {
      summary = {};
    }
    return { id: row.id, kind: row.kind, filename: row.filename, summary, createdAt: row.created_at };
  });
}

/** Construye un informe descargable de una importación sin datos sensibles. */
export function renderImportReportCsv(runId: string): string | null {
  const row = prepare('SELECT * FROM course_import_runs WHERE id = ?').get(runId) as
    | { filename: string; kind: string; summary_json: string; created_at: string }
    | undefined;
  if (!row) return null;
  let summary: Record<string, unknown> = {};
  try {
    summary = JSON.parse(row.summary_json) as Record<string, unknown>;
  } catch {
    summary = {};
  }
  const lines = [
    'campo,valor',
    `archivo,"${row.filename.replace(/"/g, '""')}"`,
    `tipo,"${row.kind}"`,
    `fecha,"${row.created_at}"`,
  ];
  for (const [key, value] of Object.entries(summary)) {
    if (key === 'lessons') continue;
    lines.push(`${key},"${String(value).replace(/"/g, '""')}"`);
  }
  return lines.join('\n');
}

export function getLessonVideoUrls(videoIds: string[]): string[] {
  return videoIds.map((id) => {
    try {
      return buildYouTubeWatchUrl(id);
    } catch {
      return '';
    }
  });
}
