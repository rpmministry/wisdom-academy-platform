import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { hasPermission } from '../auth/authorization';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';
import { writeAudit } from '../audit';
import { findResourceBySlug, userCanAccessResource, type ResourceRow } from './access';
import { ensureProgramProduct, syncProgramProduct } from './courseCatalog';

export type ProgramKind = 'course' | 'workshop';
export type ProgramStatus = 'draft' | 'published' | 'archived';
export type ModuleKind = 'semester' | 'module' | 'unit';
export type MaterialKind = 'drive_file' | 'drive_folder' | 'external_link' | 'text' | 'full_text';

export interface CourseProgramRow {
  id: string;
  resource_id: string;
  kind: ProgramKind;
  title: string;
  subtitle: string | null;
  description: string | null;
  institution: string | null;
  level: string | null;
  audience: string | null;
  duration_label: string | null;
  objectives_json: string;
  requirements_json: string;
  cover_image_url: string | null;
  status: ProgramStatus;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  drive_synced_at: string | null;
  catalog_product_id: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface CourseModuleRow {
  id: string;
  program_id: string;
  title: string;
  kind: ModuleKind;
  position: number;
  description: string | null;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface CourseLessonRow {
  id: string;
  program_id: string;
  module_id: string;
  title: string;
  description: string | null;
  position: number;
  youtube_video_ids_json: string;
  pages_label: string | null;
  duration_label: string | null;
  drive_folder_id: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface CourseMaterialRow {
  id: string;
  program_id: string;
  module_id: string | null;
  lesson_id: string | null;
  kind: MaterialKind;
  title: string;
  url: string | null;
  drive_file_id: string | null;
  visibility: 'student' | 'staff';
  position: number;
  metadata_json: string;
  created_at: string;
}

export interface WeeklyReviewRow {
  id: string;
  program_id: string;
  module_id: string | null;
  week_label: string;
  title: string;
  content_md: string;
  source_refs_json: string;
  is_ai_generated: number;
  status: 'draft' | 'published' | 'archived';
  position: number;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgressView {
  lessonId: string;
  status: 'in_progress' | 'completed';
  playbackSeconds: number;
  completedAt: string | null;
}

export interface ProgramSummary {
  id: string;
  resourceId: string;
  slug: string;
  kind: ProgramKind;
  title: string;
  subtitle: string | null;
  description: string | null;
  institution: string | null;
  level: string | null;
  audience: string | null;
  durationLabel: string | null;
  objectives: string[];
  requirements: string[];
  coverImageUrl: string | null;
  logoUrl: string | null;
  sourceUrl: string | null;
  sequential: boolean;
  credential: string | null;
  disclaimer: string | null;
  passPercentage: number | null;
  status: ProgramStatus;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  publishedReviews: number;
  assessments: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonView {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  position: number;
  videoIds: string[];
  videoId: string | null;
  pagesLabel: string | null;
  durationLabel: string | null;
  week: number | null;
  subject: string | null;
  subjectCode: string | null;
  sessionNumber: number | null;
  materials: MaterialView[];
  progress: LessonProgressView | null;
}

export interface ModuleSubject {
  code: string;
  name: string;
  professor?: string;
  sessions?: number;
}

export interface ModuleCompletion {
  completedLessons: number;
  totalLessons: number;
  assessmentsPassed: number;
  requiredAssessments: number;
  completed: boolean;
}

export interface ModuleView {
  id: string;
  title: string;
  kind: ModuleKind;
  position: number;
  description: string | null;
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  lessons: LessonView[];
  subjects: ModuleSubject[];
  contentStatus: string | null;
  locked: boolean;
  completion: ModuleCompletion | null;
}

export interface MaterialView {
  id: string;
  kind: MaterialKind;
  title: string;
  url: string | null;
  driveFileId: string | null;
  visibility: 'student' | 'staff';
  position: number;
}

export interface AssessmentSummary {
  id: string;
  moduleId: string | null;
  kind: 'midterm' | 'final' | 'practice';
  title: string;
  status: string;
  attemptsAllowed: number;
  timeLimitMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
  questionCount: number;
}

export interface ProgramDetail {
  program: ProgramSummary;
  modules: ModuleView[];
  materials: MaterialView[];
  reviews: Array<{
    id: string;
    moduleId: string | null;
    weekLabel: string;
    title: string;
    status: string;
    isAiGenerated: boolean;
    publishedAt: string | null;
    position: number;
  }>;
  assessments: AssessmentSummary[];
  progress: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
    nextLessonId: string | null;
  };
}

export function canManageCourses(user: AuthUser | null): boolean {
  return Boolean(user && (user.isOwner || hasPermission(user, 'resources.manage')));
}

export function slugifyProgram(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'programa';
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseModuleSubjects(value: unknown): ModuleSubject[] {
  if (!Array.isArray(value)) return [];
  const out: ModuleSubject[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as { code?: unknown; name?: unknown; professor?: unknown; sessions?: unknown };
    if (typeof candidate.code !== 'string' || typeof candidate.name !== 'string') continue;
    out.push({
      code: candidate.code.slice(0, 20),
      name: candidate.name.slice(0, 200),
      professor: typeof candidate.professor === 'string' ? candidate.professor.slice(0, 200) : undefined,
      sessions: Number.isInteger(Number(candidate.sessions)) ? Number(candidate.sessions) : undefined,
    });
  }
  return out;
}

function normalizeStringArray(value: unknown, maxItems = 50, maxLength = 500): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function getProgramRowById(id: string): CourseProgramRow | null {
  return (
    (prepare('SELECT * FROM course_programs WHERE id = ?').get(id) as CourseProgramRow | undefined) ??
    null
  );
}

export function getProgramRowBySlug(slug: string): CourseProgramRow | null {
  const row = prepare(`
    SELECT cp.* FROM course_programs cp
    JOIN resources r ON r.id = cp.resource_id
    WHERE r.slug = ?
  `).get(slug) as CourseProgramRow | undefined;
  return row ?? null;
}

export function getProgramResource(program: CourseProgramRow): ResourceRow {
  const resource = prepare('SELECT * FROM resources WHERE id = ?').get(program.resource_id) as
    | ResourceRow
    | undefined;
  if (!resource) throw new ApiError(500, 'PROGRAM_RESOURCE_MISSING', 'El recurso del programa no existe.');
  return resource;
}

export function getProgramSlug(program: CourseProgramRow): string {
  return getProgramResource(program).slug;
}

/**
 * Un administrador con `resources.manage` puede previsualizar borradores.
 * Un estudiante solo accede a programas publicados con derecho vigente.
 */
export function assertProgramAccess(user: AuthUser, program: CourseProgramRow): ResourceRow {
  const resource = getProgramResource(program);
  if (canManageCourses(user)) return resource;
  if (program.status !== 'published') {
    throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El curso o taller no está disponible.');
  }
  if (!userCanAccessResource(user, resource)) {
    throw new ApiError(403, 'PROGRAM_FORBIDDEN', 'No tienes un derecho de acceso vigente para este programa.');
  }
  return resource;
}

export function userCanViewProgram(user: AuthUser, program: CourseProgramRow): boolean {
  try {
    assertProgramAccess(user, program);
    return true;
  } catch {
    return false;
  }
}

function toProgramSummary(program: CourseProgramRow): ProgramSummary {
  const resource = getProgramResource(program);
  const metadata = parseJsonObject(program.metadata_json);
  const modules = prepare('SELECT COUNT(*) AS total FROM course_modules WHERE program_id = ?').get(
    program.id
  ) as { total: number };
  const lessons = prepare('SELECT COUNT(*) AS total FROM course_lessons WHERE program_id = ?').get(
    program.id
  ) as { total: number };
  const reviews = prepare(
    "SELECT COUNT(*) AS total FROM weekly_reviews WHERE program_id = ? AND status = 'published'"
  ).get(program.id) as { total: number };
  const assessments = prepare('SELECT COUNT(*) AS total FROM assessments WHERE program_id = ?').get(
    program.id
  ) as { total: number };

  return {
    id: program.id,
    resourceId: program.resource_id,
    slug: resource.slug,
    kind: program.kind,
    title: program.title,
    subtitle: program.subtitle,
    description: program.description,
    institution: program.institution,
    level: program.level,
    audience: program.audience,
    durationLabel: program.duration_label,
    objectives: parseJsonArray(program.objectives_json),
    requirements: parseJsonArray(program.requirements_json),
    coverImageUrl: program.cover_image_url,
    logoUrl: typeof metadata.logoUrl === 'string' ? metadata.logoUrl : null,
    sourceUrl: typeof metadata.sourceUrl === 'string' ? metadata.sourceUrl : null,
    sequential: metadata.sequential === true,
    credential: typeof metadata.credential === 'string' ? metadata.credential : null,
    disclaimer: typeof metadata.disclaimer === 'string' ? metadata.disclaimer : null,
    passPercentage:
      typeof metadata.passPercentage === 'number' ? Number(metadata.passPercentage) : null,
    status: program.status,
    driveFolderId: program.drive_folder_id,
    driveFolderUrl: program.drive_folder_url,
    moduleCount: Number(modules.total),
    lessonCount: Number(lessons.total),
    publishedReviews: Number(reviews.total),
    assessments: Number(assessments.total),
    createdAt: program.created_at,
    updatedAt: program.updated_at,
  };
}

export function listPrograms(options: {
  includeDrafts?: boolean;
  kind?: ProgramKind;
} = {}): ProgramSummary[] {
  const conditions: string[] = [];
  const values: string[] = [];
  if (!options.includeDrafts) {
    conditions.push("cp.status = 'published' AND r.status = 'published'");
  }
  if (options.kind) {
    conditions.push('cp.kind = ?');
    values.push(options.kind);
  }
  const rows = prepare(`
    SELECT cp.* FROM course_programs cp
    JOIN resources r ON r.id = cp.resource_id
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY cp.kind, cp.title
  `).all(...values) as CourseProgramRow[];
  return rows.map(toProgramSummary);
}

export interface CreateProgramInput {
  kind: ProgramKind;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  institution?: string | null;
  level?: string | null;
  audience?: string | null;
  durationLabel?: string | null;
  objectives?: unknown;
  requirements?: unknown;
  coverImageUrl?: string | null;
  slug?: string | null;
  status?: ProgramStatus;
  metadata?: Record<string, unknown>;
  driveFolderId?: string | null;
  driveFolderUrl?: string | null;
}

export function createProgram(input: CreateProgramInput, actor?: AuthUser | null): ProgramSummary {
  if (!input.title?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El título del programa es obligatorio.');
  }
  if (!['course', 'workshop'].includes(input.kind)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de programa no es válido.');
  }
  const status = input.status || 'draft';
  if (!['draft', 'published', 'archived'].includes(status)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El estado del programa no es válido.');
  }

  const baseSlug = slugifyProgram(input.slug || input.title);
  let slug = baseSlug;
  let counter = 2;
  while (prepare('SELECT id FROM resources WHERE slug = ?').get(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const now = nowIso();
  const resourceId = `res_${randomToken(16)}`;
  const programId = `prg_${randomToken(16)}`;

  withTransaction(() => {
    prepare(`
      INSERT INTO resources (id, slug, type, title, description, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resourceId,
      slug,
      input.kind,
      input.title.trim().slice(0, 250),
      input.description?.slice(0, 4000) || null,
      status,
      JSON.stringify({ programId, kind: input.kind, ...(input.metadata || {}) }),
      now,
      now
    );
    prepare(`
      INSERT INTO course_programs
        (id, resource_id, kind, title, subtitle, description, institution, level, audience,
         duration_label, objectives_json, requirements_json, cover_image_url, status,
         drive_folder_id, drive_folder_url, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      programId,
      resourceId,
      input.kind,
      input.title.trim().slice(0, 250),
      input.subtitle?.slice(0, 300) || null,
      input.description?.slice(0, 4000) || null,
      input.institution?.slice(0, 250) || null,
      input.level?.slice(0, 120) || null,
      input.audience?.slice(0, 500) || null,
      input.durationLabel?.slice(0, 120) || null,
      JSON.stringify(normalizeStringArray(input.objectives)),
      JSON.stringify(normalizeStringArray(input.requirements)),
      input.coverImageUrl?.slice(0, 1000) || null,
      status,
      input.driveFolderId || null,
      input.driveFolderUrl || null,
      JSON.stringify(input.metadata || {}),
      now,
      now
    );
  });

  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(500, 'PROGRAM_CREATE_FAILED', 'No se pudo crear el programa.');
  writeAudit({
    actor,
    action: 'course_program.created',
    entityType: 'course_program',
    entityId: programId,
    after: { title: program.title, kind: program.kind, status: program.status, slug },
  });
  ensureProgramProduct(programId);
  return toProgramSummary(getProgramRowById(programId) || program);
}

export function updateProgram(
  programId: string,
  input: Partial<CreateProgramInput> & { status?: ProgramStatus },
  actor?: AuthUser | null
): ProgramSummary {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  const before = { title: program.title, status: program.status };

  const fields: string[] = [];
  const values: Array<string | null> = [];
  const assign = (column: string, value: string | null) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (input.title !== undefined) {
    if (!input.title?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título no puede quedar vacío.');
    assign('title', input.title.trim().slice(0, 250));
  }
  if (input.subtitle !== undefined) assign('subtitle', input.subtitle?.slice(0, 300) || null);
  if (input.description !== undefined) assign('description', input.description?.slice(0, 4000) || null);
  if (input.institution !== undefined) assign('institution', input.institution?.slice(0, 250) || null);
  if (input.level !== undefined) assign('level', input.level?.slice(0, 120) || null);
  if (input.audience !== undefined) assign('audience', input.audience?.slice(0, 500) || null);
  if (input.durationLabel !== undefined) assign('duration_label', input.durationLabel?.slice(0, 120) || null);
  if (input.objectives !== undefined) assign('objectives_json', JSON.stringify(normalizeStringArray(input.objectives)));
  if (input.requirements !== undefined) assign('requirements_json', JSON.stringify(normalizeStringArray(input.requirements)));
  if (input.coverImageUrl !== undefined) assign('cover_image_url', input.coverImageUrl?.slice(0, 1000) || null);
  if (input.driveFolderId !== undefined) assign('drive_folder_id', input.driveFolderId || null);
  if (input.driveFolderUrl !== undefined) assign('drive_folder_url', input.driveFolderUrl || null);
  if (input.metadata !== undefined) assign('metadata_json', JSON.stringify(input.metadata || {}));

  let nextStatus = program.status;
  if (input.status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(input.status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El estado del programa no es válido.');
    }
    nextStatus = input.status;
    assign('status', input.status);
  }

  if (fields.length) {
    values.push(nowIso(), programId);
    withTransaction(() => {
      prepare(`UPDATE course_programs SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(
        ...values
      );
      if (nextStatus !== program.status) {
        prepare('UPDATE resources SET status = ?, updated_at = ? WHERE id = ?').run(
          nextStatus,
          nowIso(),
          program.resource_id
        );
      }
      if (input.title !== undefined) {
        prepare('UPDATE resources SET title = ?, updated_at = ? WHERE id = ?').run(
          input.title.trim().slice(0, 250),
          nowIso(),
          program.resource_id
        );
      }
      if (input.description !== undefined) {
        prepare('UPDATE resources SET description = ?, updated_at = ? WHERE id = ?').run(
          input.description?.slice(0, 4000) || null,
          nowIso(),
          program.resource_id
        );
      }
    });
  }

  const updated = getProgramRowById(programId);
  if (!updated) throw new ApiError(500, 'PROGRAM_UPDATE_FAILED', 'No se pudo actualizar el programa.');
  writeAudit({
    actor,
    action: 'course_program.updated',
    entityType: 'course_program',
    entityId: programId,
    before,
    after: { title: updated.title, status: updated.status },
  });
  syncProgramProduct(programId);
  return toProgramSummary(getProgramRowById(programId) || updated);
}

export function setProgramStatus(
  programId: string,
  status: ProgramStatus,
  actor?: AuthUser | null
): ProgramSummary {
  return updateProgram(programId, { status }, actor);
}

export function addModule(
  programId: string,
  input: { title: string; kind?: ModuleKind; description?: string | null; position?: number },
  actor?: AuthUser | null
): ModuleView {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  if (!input.title?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título del módulo es obligatorio.');
  const kind: ModuleKind = input.kind && ['semester', 'module', 'unit'].includes(input.kind) ? input.kind : 'module';
  const position = Number.isInteger(input.position)
    ? Number(input.position)
    : ((prepare('SELECT COALESCE(MAX(position), 0) AS max FROM course_modules WHERE program_id = ?').get(
        programId
      ) as { max: number }).max + 1);
  const id = `mod_${randomToken(16)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO course_modules
      (id, program_id, title, kind, position, description, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?)
  `).run(id, programId, input.title.trim().slice(0, 250), kind, position, input.description?.slice(0, 2000) || null, now, now);
  writeAudit({
    actor,
    action: 'course_module.created',
    entityType: 'course_module',
    entityId: id,
    after: { programId, title: input.title, kind, position },
  });
  return getModuleView(id) as ModuleView;
}

export function getModuleView(moduleId: string, userId?: string): ModuleView | null {
  const row = prepare('SELECT * FROM course_modules WHERE id = ?').get(moduleId) as
    | CourseModuleRow
    | undefined;
  if (!row) return null;
  const lessons = prepare('SELECT * FROM course_lessons WHERE module_id = ? ORDER BY position, title').all(
    moduleId
  ) as CourseLessonRow[];
  const metadata = parseJsonObject(row.metadata_json);
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    position: Number(row.position),
    description: row.description,
    driveFolderId: row.drive_folder_id,
    driveFolderUrl: row.drive_folder_url,
    lessons: lessons.map((lesson) => toLessonView(lesson, userId)),
    subjects: parseModuleSubjects(metadata.subjects),
    contentStatus: typeof metadata.contentStatus === 'string' ? metadata.contentStatus : null,
    locked: false,
    completion: null,
  };
}

export function updateModule(
  moduleId: string,
  input: { title?: string; description?: string | null; position?: number; kind?: ModuleKind; driveFolderId?: string | null; driveFolderUrl?: string | null },
  actor?: AuthUser | null
): ModuleView {
  const row = prepare('SELECT * FROM course_modules WHERE id = ?').get(moduleId) as
    | CourseModuleRow
    | undefined;
  if (!row) throw new ApiError(404, 'MODULE_NOT_FOUND', 'El módulo no existe.');
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título no puede quedar vacío.');
    fields.push('title = ?');
    values.push(input.title.trim().slice(0, 250));
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description?.slice(0, 2000) || null);
  }
  if (input.position !== undefined) {
    fields.push('position = ?');
    values.push(Math.max(0, Math.trunc(Number(input.position))));
  }
  if (input.kind !== undefined) {
    if (!['semester', 'module', 'unit'].includes(input.kind)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de módulo no es válido.');
    }
    fields.push('kind = ?');
    values.push(input.kind);
  }
  if (input.driveFolderId !== undefined) {
    fields.push('drive_folder_id = ?');
    values.push(input.driveFolderId || null);
  }
  if (input.driveFolderUrl !== undefined) {
    fields.push('drive_folder_url = ?');
    values.push(input.driveFolderUrl || null);
  }
  if (fields.length) {
    values.push(nowIso(), moduleId);
    prepare(`UPDATE course_modules SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
    writeAudit({
      actor,
      action: 'course_module.updated',
      entityType: 'course_module',
      entityId: moduleId,
      after: { programId: row.program_id },
    });
  }
  const view = getModuleView(moduleId);
  if (!view) throw new ApiError(500, 'MODULE_UPDATE_FAILED', 'No se pudo actualizar el módulo.');
  return view;
}

export function deleteModule(moduleId: string, actor?: AuthUser | null): void {
  const row = prepare('SELECT program_id, title FROM course_modules WHERE id = ?').get(moduleId) as
    | { program_id: string; title: string }
    | undefined;
  if (!row) throw new ApiError(404, 'MODULE_NOT_FOUND', 'El módulo no existe.');
  prepare('DELETE FROM course_modules WHERE id = ?').run(moduleId);
  writeAudit({
    actor,
    action: 'course_module.deleted',
    entityType: 'course_module',
    entityId: moduleId,
    before: { programId: row.program_id, title: row.title },
  });
}

function toLessonView(lesson: CourseLessonRow, userId?: string): LessonView {
  const materials = prepare(
    "SELECT * FROM course_materials WHERE lesson_id = ? AND visibility = 'student' ORDER BY position"
  ).all(lesson.id) as CourseMaterialRow[];
  const progress = userId
    ? (prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(
        userId,
        lesson.id
      ) as
        | { status: 'in_progress' | 'completed'; playback_seconds: number; completed_at: string | null }
        | undefined)
    : undefined;
  const videos = parseJsonArray(lesson.youtube_video_ids_json);
  const metadata = parseJsonObject(lesson.metadata_json);
  const toNumberOrNull = (value: unknown) =>
    Number.isInteger(Number(value)) ? Number(value) : null;

  return {
    id: lesson.id,
    moduleId: lesson.module_id,
    title: lesson.title,
    description: lesson.description,
    position: Number(lesson.position),
    videoIds: videos,
    videoId: videos[0] || null,
    pagesLabel: lesson.pages_label,
    durationLabel: lesson.duration_label,
    week: toNumberOrNull(metadata.week),
    subject: typeof metadata.subject === 'string' ? metadata.subject : null,
    subjectCode: typeof metadata.subjectCode === 'string' ? metadata.subjectCode : null,
    sessionNumber: toNumberOrNull(metadata.sessionNumber),
    materials: materials.map(toMaterialView),
    progress: progress
      ? {
          lessonId: lesson.id,
          status: progress.status,
          playbackSeconds: Number(progress.playback_seconds),
          completedAt: progress.completed_at,
        }
      : null,
  };
}

function toMaterialView(row: CourseMaterialRow): MaterialView {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    url: row.url,
    driveFileId: row.drive_file_id,
    visibility: row.visibility,
    position: Number(row.position),
  };
}

export function addLesson(
  programId: string,
  moduleId: string,
  input: {
    title: string;
    description?: string | null;
    position?: number;
    videoIds?: unknown;
    pagesLabel?: string | null;
    durationLabel?: string | null;
  },
  actor?: AuthUser | null
): LessonView {
  const module = prepare('SELECT program_id FROM course_modules WHERE id = ?').get(moduleId) as
    | { program_id: string }
    | undefined;
  if (!module || module.program_id !== programId) {
    throw new ApiError(404, 'MODULE_NOT_FOUND', 'El módulo no pertenece al programa indicado.');
  }
  if (!input.title?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título de la clase es obligatorio.');
  const position = Number.isInteger(input.position)
    ? Number(input.position)
    : ((prepare('SELECT COALESCE(MAX(position), 0) AS max FROM course_lessons WHERE module_id = ?').get(
        moduleId
      ) as { max: number }).max + 1);
  const id = `les_${randomToken(16)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO course_lessons
      (id, program_id, module_id, title, description, position, youtube_video_ids_json,
       pages_label, duration_label, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
  `).run(
    id,
    programId,
    moduleId,
    input.title.trim().slice(0, 250),
    input.description?.slice(0, 4000) || null,
    position,
    JSON.stringify(normalizeStringArray(input.videoIds, 10, 20)),
    input.pagesLabel?.slice(0, 100) || null,
    input.durationLabel?.slice(0, 100) || null,
    now,
    now
  );
  writeAudit({
    actor,
    action: 'course_lesson.created',
    entityType: 'course_lesson',
    entityId: id,
    after: { programId, moduleId, title: input.title },
  });
  const row = prepare('SELECT * FROM course_lessons WHERE id = ?').get(id) as CourseLessonRow;
  return toLessonView(row);
}

export function updateLesson(
  lessonId: string,
  input: {
    title?: string;
    description?: string | null;
    position?: number;
    videoIds?: unknown;
    pagesLabel?: string | null;
    durationLabel?: string | null;
    moduleId?: string;
  },
  actor?: AuthUser | null
): LessonView {
  const row = prepare('SELECT * FROM course_lessons WHERE id = ?').get(lessonId) as
    | CourseLessonRow
    | undefined;
  if (!row) throw new ApiError(404, 'LESSON_NOT_FOUND', 'La clase no existe.');
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título no puede quedar vacío.');
    fields.push('title = ?');
    values.push(input.title.trim().slice(0, 250));
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description?.slice(0, 4000) || null);
  }
  if (input.position !== undefined) {
    fields.push('position = ?');
    values.push(Math.max(0, Math.trunc(Number(input.position))));
  }
  if (input.videoIds !== undefined) {
    fields.push('youtube_video_ids_json = ?');
    values.push(JSON.stringify(normalizeStringArray(input.videoIds, 10, 20)));
  }
  if (input.pagesLabel !== undefined) {
    fields.push('pages_label = ?');
    values.push(input.pagesLabel?.slice(0, 100) || null);
  }
  if (input.durationLabel !== undefined) {
    fields.push('duration_label = ?');
    values.push(input.durationLabel?.slice(0, 100) || null);
  }
  if (input.moduleId !== undefined) {
    const module = prepare('SELECT program_id FROM course_modules WHERE id = ?').get(input.moduleId) as
      | { program_id: string }
      | undefined;
    if (!module || module.program_id !== row.program_id) {
      throw new ApiError(400, 'MODULE_INVALID', 'El módulo destino no pertenece al programa.');
    }
    fields.push('module_id = ?');
    values.push(input.moduleId);
  }
  if (fields.length) {
    values.push(nowIso(), lessonId);
    prepare(`UPDATE course_lessons SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
    writeAudit({
      actor,
      action: 'course_lesson.updated',
      entityType: 'course_lesson',
      entityId: lessonId,
      after: { programId: row.program_id },
    });
  }
  const updated = prepare('SELECT * FROM course_lessons WHERE id = ?').get(lessonId) as CourseLessonRow;
  return toLessonView(updated);
}

export function deleteLesson(lessonId: string, actor?: AuthUser | null): void {
  const row = prepare('SELECT program_id, title FROM course_lessons WHERE id = ?').get(lessonId) as
    | { program_id: string; title: string }
    | undefined;
  if (!row) throw new ApiError(404, 'LESSON_NOT_FOUND', 'La clase no existe.');
  prepare('DELETE FROM course_lessons WHERE id = ?').run(lessonId);
  writeAudit({
    actor,
    action: 'course_lesson.deleted',
    entityType: 'course_lesson',
    entityId: lessonId,
    before: { programId: row.program_id, title: row.title },
  });
}

export function addMaterial(
  programId: string,
  input: {
    kind: MaterialKind;
    title: string;
    url?: string | null;
    driveFileId?: string | null;
    lessonId?: string | null;
    moduleId?: string | null;
    visibility?: 'student' | 'staff';
    position?: number;
    metadata?: Record<string, unknown>;
  },
  actor?: AuthUser | null
): MaterialView {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  if (!['drive_file', 'drive_folder', 'external_link', 'text', 'full_text'].includes(input.kind)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de material no es válido.');
  }
  if (!input.title?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título del material es obligatorio.');
  const url = input.url?.trim() || null;
  if (url && !/^https?:\/\//i.test(url) && !url.startsWith('/')) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'La URL del material no es válida.');
  }
  if (!url && !input.driveFileId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El material necesita una URL o un archivo de Drive.');
  }
  if (input.lessonId) {
    const lesson = prepare('SELECT program_id FROM course_lessons WHERE id = ?').get(input.lessonId) as
      | { program_id: string }
      | undefined;
    if (!lesson || lesson.program_id !== programId) {
      throw new ApiError(400, 'LESSON_INVALID', 'La clase del material no pertenece al programa.');
    }
  }
  const id = `mat_${randomToken(16)}`;
  const position = Number.isInteger(input.position)
    ? Number(input.position)
    : ((prepare('SELECT COALESCE(MAX(position), 0) AS max FROM course_materials WHERE program_id = ?').get(
        programId
      ) as { max: number }).max + 1);
  prepare(`
    INSERT INTO course_materials
      (id, program_id, module_id, lesson_id, kind, title, url, drive_file_id, visibility,
       position, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    programId,
    input.moduleId || null,
    input.lessonId || null,
    input.kind,
    input.title.trim().slice(0, 250),
    url,
    input.driveFileId?.slice(0, 200) || null,
    input.visibility === 'staff' ? 'staff' : 'student',
    position,
    JSON.stringify(input.metadata || {}),
    nowIso()
  );
  writeAudit({
    actor,
    action: 'course_material.created',
    entityType: 'course_material',
    entityId: id,
    after: { programId, kind: input.kind, title: input.title },
  });
  const row = prepare('SELECT * FROM course_materials WHERE id = ?').get(id) as CourseMaterialRow;
  return toMaterialView(row);
}

export function deleteMaterial(materialId: string, actor?: AuthUser | null): void {
  const row = prepare('SELECT program_id, title FROM course_materials WHERE id = ?').get(materialId) as
    | { program_id: string; title: string }
    | undefined;
  if (!row) throw new ApiError(404, 'MATERIAL_NOT_FOUND', 'El material no existe.');
  prepare('DELETE FROM course_materials WHERE id = ?').run(materialId);
  writeAudit({
    actor,
    action: 'course_material.deleted',
    entityType: 'course_material',
    entityId: materialId,
    before: { programId: row.program_id, title: row.title },
  });
}

/**
 * Calcula si un semestre/módulo está aprobado: todas las clases completadas y
 * todas las evaluaciones publicadas del módulo aprobadas con la nota mínima
 * configurada (60% por defecto, según la guía oficial N2N).
 */
export function getModuleCompletion(
  programId: string,
  moduleId: string,
  userId: string
): ModuleCompletion {
  const lessons = prepare(
    'SELECT id FROM course_lessons WHERE program_id = ? AND module_id = ?'
  ).all(programId, moduleId) as Array<{ id: string }>;
  const completedRow = prepare(`
    SELECT COUNT(*) AS total FROM lesson_progress p
    JOIN course_lessons l ON l.id = p.lesson_id
    WHERE p.user_id = ? AND l.program_id = ? AND l.module_id = ? AND p.status = 'completed'
  `).get(userId, programId, moduleId) as { total: number };

  const assessments = prepare(`
    SELECT id, pass_percentage FROM assessments
    WHERE program_id = ? AND module_id = ? AND status = 'published'
  `).all(programId, moduleId) as Array<{ id: string; pass_percentage: number | null }>;

  let assessmentsPassed = 0;
  for (const assessment of assessments) {
    const best = prepare(`
      SELECT MAX(percentage) AS best FROM assessment_attempts
      WHERE assessment_id = ? AND user_id = ? AND status = 'graded'
    `).get(assessment.id, userId) as { best: number | null };
    const threshold = assessment.pass_percentage === null ? 60 : Number(assessment.pass_percentage);
    if (best.best !== null && Number(best.best) >= threshold) assessmentsPassed += 1;
  }

  const totalLessons = lessons.length;
  const completedLessons = Number(completedRow.total);
  return {
    completedLessons,
    totalLessons,
    assessmentsPassed,
    requiredAssessments: assessments.length,
    completed:
      totalLessons > 0 &&
      completedLessons === totalLessons &&
      assessmentsPassed === assessments.length,
  };
}

export function isModuleUnlocked(programId: string, moduleId: string, userId: string): boolean {
  const modules = prepare(
    'SELECT id FROM course_modules WHERE program_id = ? ORDER BY position, title'
  ).all(programId) as Array<{ id: string }>;
  const index = modules.findIndex((module) => module.id === moduleId);
  if (index <= 0) return true;
  const previous = modules[index - 1];
  return getModuleCompletion(programId, previous.id, userId).completed;
}

export function getProgramDetail(
  program: CourseProgramRow,
  options: { userId?: string; includeStaffMaterials?: boolean } = {}
): ProgramDetail {
  const modules = prepare('SELECT * FROM course_modules WHERE program_id = ? ORDER BY position, title').all(
    program.id
  ) as CourseModuleRow[];
  const materials = prepare(`
    SELECT * FROM course_materials
    WHERE program_id = ? AND (lesson_id IS NULL)
      ${options.includeStaffMaterials ? '' : "AND visibility = 'student'"}
    ORDER BY position
  `).all(program.id) as CourseMaterialRow[];
  const reviews = prepare(
    options.includeStaffMaterials
      ? 'SELECT * FROM weekly_reviews WHERE program_id = ? ORDER BY position, published_at'
      : "SELECT * FROM weekly_reviews WHERE program_id = ? AND status = 'published' ORDER BY position, published_at"
  ).all(program.id) as WeeklyReviewRow[];
  const assessments = prepare(`
    SELECT a.*,
      (SELECT COUNT(*) FROM assessment_questions q WHERE q.assessment_id = a.id) AS question_count
    FROM assessments a WHERE a.program_id = ?
    ${options.includeStaffMaterials ? '' : "AND a.status = 'published'"}
    ORDER BY a.created_at
  `).all(program.id) as Array<{
    id: string;
    module_id: string | null;
    kind: 'midterm' | 'final' | 'practice';
    title: string;
    status: string;
    attempts_allowed: number;
    time_limit_minutes: number | null;
    opens_at: string | null;
    closes_at: string | null;
    question_count: number;
  }>;

  const staffView = Boolean(options.includeStaffMaterials);
  let previousCompleted = false;
  const moduleViews: ModuleView[] = modules.map((module, index) => {
    const lessons = prepare('SELECT * FROM course_lessons WHERE module_id = ? ORDER BY position, title').all(
      module.id
    ) as CourseLessonRow[];
    const completion = options.userId
      ? getModuleCompletion(program.id, module.id, options.userId)
      : null;
    const locked = !staffView && index > 0 && !previousCompleted;
    if (completion) previousCompleted = completion.completed;
    const metadata = parseJsonObject(module.metadata_json);
    return {
      id: module.id,
      title: module.title,
      kind: module.kind,
      position: Number(module.position),
      description: module.description,
      driveFolderId: module.drive_folder_id,
      driveFolderUrl: module.drive_folder_url,
      lessons: locked ? [] : lessons.map((lesson) => toLessonView(lesson, options.userId)),
      subjects: parseModuleSubjects(metadata.subjects),
      contentStatus: typeof metadata.contentStatus === 'string' ? metadata.contentStatus : null,
      locked,
      completion,
    };
  });

  const allLessons = moduleViews.flatMap((module) => module.lessons);
  const totalLessonsRow = prepare(
    'SELECT COUNT(*) AS total FROM course_lessons WHERE program_id = ?'
  ).get(program.id) as { total: number };
  const totalLessons = Number(totalLessonsRow.total);
  const completedRow = options.userId
    ? (prepare(`
        SELECT COUNT(*) AS total FROM lesson_progress
        WHERE program_id = ? AND user_id = ? AND status = 'completed'
      `).get(program.id, options.userId) as { total: number })
    : { total: 0 };
  const completed = Number(completedRow.total);
  const nextLesson = allLessons.find((lesson) => lesson.progress?.status !== 'completed');

  return {
    program: toProgramSummary(program),
    modules: moduleViews,
    materials: materials.map(toMaterialView),
    reviews: reviews.map((review) => ({
      id: review.id,
      moduleId: review.module_id,
      weekLabel: review.week_label,
      title: review.title,
      status: review.status,
      isAiGenerated: Boolean(review.is_ai_generated),
      publishedAt: review.published_at,
      position: Number(review.position),
    })),
    assessments: assessments.map((assessment) => ({
      id: assessment.id,
      moduleId: assessment.module_id,
      kind: assessment.kind,
      title: assessment.title,
      status: assessment.status,
      attemptsAllowed: Number(assessment.attempts_allowed),
      timeLimitMinutes: assessment.time_limit_minutes,
      opensAt: assessment.opens_at,
      closesAt: assessment.closes_at,
      questionCount: Number(assessment.question_count),
    })),
    progress: {
      completedLessons: completed,
      totalLessons,
      percent: totalLessons ? Math.round((completed / totalLessons) * 100) : 0,
      nextLessonId: nextLesson?.id || null,
    },
  };
}

export function getLessonForStudent(lessonId: string, userId: string): {
  lesson: LessonView;
  module: ModuleView;
  program: CourseProgramRow;
  prevLessonId: string | null;
  nextLessonId: string | null;
} | null {
  const row = prepare('SELECT * FROM course_lessons WHERE id = ?').get(lessonId) as
    | CourseLessonRow
    | undefined;
  if (!row) return null;
  const program = getProgramRowById(row.program_id);
  if (!program) return null;
  if (!isModuleUnlocked(program.id, row.module_id, userId)) return null;
  const module = getModuleView(row.module_id, userId);
  if (!module) return null;

  const modules = prepare(
    'SELECT id FROM course_modules WHERE program_id = ? ORDER BY position, title'
  ).all(program.id) as Array<{ id: string }>;
  const unlockedModules = new Set<string>();
  let previousCompleted = false;
  modules.forEach((moduleRow, index) => {
    const unlocked = index === 0 || previousCompleted;
    if (unlocked) unlockedModules.add(moduleRow.id);
    previousCompleted = getModuleCompletion(program.id, moduleRow.id, userId).completed;
  });

  const ordered = (prepare(`
    SELECT l.id, l.module_id FROM course_lessons l
    JOIN course_modules m ON m.id = l.module_id
    WHERE l.program_id = ?
    ORDER BY m.position, m.title, l.position, l.title
  `).all(program.id) as Array<{ id: string; module_id: string }>).filter((lesson) =>
    unlockedModules.has(lesson.module_id)
  );
  const index = ordered.findIndex((item) => item.id === lessonId);

  return {
    lesson: toLessonView(row, userId),
    module,
    program,
    prevLessonId: index > 0 ? ordered[index - 1].id : null,
    nextLessonId: index >= 0 && index < ordered.length - 1 ? ordered[index + 1].id : null,
  };
}

export function markLessonProgress(
  user: AuthUser,
  lessonId: string,
  input: { completed?: boolean; playbackSeconds?: number }
): LessonProgressView {
  const row = prepare('SELECT * FROM course_lessons WHERE id = ?').get(lessonId) as
    | CourseLessonRow
    | undefined;
  if (!row) throw new ApiError(404, 'LESSON_NOT_FOUND', 'La clase no existe.');
  const program = getProgramRowById(row.program_id);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  assertProgramAccess(user, program);

  const now = nowIso();
  const completed = input.completed === true;
  const playback = Number.isFinite(input.playbackSeconds)
    ? Math.max(0, Math.min(60 * 60 * 12, Math.trunc(Number(input.playbackSeconds))))
    : 0;
  const id = `prg_${randomToken(16)}`;

  prepare(`
    INSERT INTO lesson_progress (id, user_id, lesson_id, program_id, status, playback_seconds, completed_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
      status = CASE WHEN excluded.status = 'completed' THEN 'completed' ELSE lesson_progress.status END,
      playback_seconds = MAX(lesson_progress.playback_seconds, excluded.playback_seconds),
      completed_at = COALESCE(lesson_progress.completed_at, excluded.completed_at),
      updated_at = excluded.updated_at
  `).run(
    id,
    user.id,
    lessonId,
    row.program_id,
    completed ? 'completed' : 'in_progress',
    playback,
    completed ? now : null,
    now
  );

  const saved = prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(
    user.id,
    lessonId
  ) as { status: 'in_progress' | 'completed'; playback_seconds: number; completed_at: string | null };
  return {
    lessonId,
    status: saved.status,
    playbackSeconds: Number(saved.playback_seconds),
    completedAt: saved.completed_at,
  };
}

export function createWeeklyReview(
  programId: string,
  input: {
    title: string;
    weekLabel: string;
    contentMd: string;
    moduleId?: string | null;
    sourceRefs?: Array<Record<string, unknown>>;
    isAiGenerated?: boolean;
    status?: 'draft' | 'published';
    position?: number;
  },
  actor?: AuthUser | null
): WeeklyReviewRow {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  if (!input.title?.trim() || !input.weekLabel?.trim() || !input.contentMd?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Título, semana y contenido del repaso son obligatorios.');
  }
  const id = `rev_${randomToken(16)}`;
  const now = nowIso();
  const status = input.status === 'published' ? 'published' : 'draft';
  prepare(`
    INSERT INTO weekly_reviews
      (id, program_id, module_id, week_label, title, content_md, source_refs_json, is_ai_generated,
       status, position, published_at, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    programId,
    input.moduleId || null,
    input.weekLabel.trim().slice(0, 120),
    input.title.trim().slice(0, 250),
    input.contentMd.slice(0, 200_000),
    JSON.stringify(Array.isArray(input.sourceRefs) ? input.sourceRefs.slice(0, 100) : []),
    input.isAiGenerated === false ? 0 : 1,
    status,
    Number.isInteger(input.position) ? Number(input.position) : 0,
    status === 'published' ? now : null,
    actor?.id || null,
    now,
    now
  );
  writeAudit({
    actor,
    action: 'weekly_review.created',
    entityType: 'weekly_review',
    entityId: id,
    after: { programId, weekLabel: input.weekLabel, status },
  });
  return prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(id) as WeeklyReviewRow;
}

export function updateWeeklyReview(
  reviewId: string,
  input: { title?: string; contentMd?: string; status?: 'draft' | 'published' | 'archived'; sourceRefs?: unknown },
  actor?: AuthUser | null
): WeeklyReviewRow {
  const row = prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(reviewId) as
    | WeeklyReviewRow
    | undefined;
  if (!row) throw new ApiError(404, 'REVIEW_NOT_FOUND', 'El repaso no existe.');
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  if (input.title !== undefined) {
    fields.push('title = ?');
    values.push(input.title.trim().slice(0, 250));
  }
  if (input.contentMd !== undefined) {
    fields.push('content_md = ?');
    values.push(input.contentMd.slice(0, 200_000));
  }
  if (input.status !== undefined) {
    if (!['draft', 'published', 'archived'].includes(input.status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El estado del repaso no es válido.');
    }
    fields.push('status = ?');
    values.push(input.status);
    if (input.status === 'published') {
      fields.push('published_at = COALESCE(published_at, ?)');
      values.push(nowIso());
    }
  }
  if (input.sourceRefs !== undefined) {
    fields.push('source_refs_json = ?');
    values.push(JSON.stringify(Array.isArray(input.sourceRefs) ? input.sourceRefs.slice(0, 100) : []));
  }
  if (fields.length) {
    values.push(nowIso(), reviewId);
    prepare(`UPDATE weekly_reviews SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
    writeAudit({
      actor,
      action: 'weekly_review.updated',
      entityType: 'weekly_review',
      entityId: reviewId,
      after: { programId: row.program_id, status: input.status || row.status },
    });
  }
  return prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(reviewId) as WeeklyReviewRow;
}

export function getPublishedReview(reviewId: string): WeeklyReviewRow | null {
  const row = prepare("SELECT * FROM weekly_reviews WHERE id = ? AND status = 'published'").get(reviewId) as
    | WeeklyReviewRow
    | undefined;
  return row ?? null;
}

export function getProgramByResourceSlugForAccess(slug: string): CourseProgramRow | null {
  const resource = findResourceBySlug(slug);
  if (!resource) return null;
  return getProgramRowBySlug(slug);
}

export function listAccessiblePrograms(user: AuthUser): ProgramSummary[] {
  const rows = prepare(`
    SELECT cp.* FROM course_programs cp
    JOIN resources r ON r.id = cp.resource_id
    WHERE cp.status = 'published' AND r.status = 'published'
    ORDER BY cp.kind, cp.title
  `).all() as CourseProgramRow[];
  return rows.filter((program) => userCanViewProgram(user, program)).map(toProgramSummary);
}
