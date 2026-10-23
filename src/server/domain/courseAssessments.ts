import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { canManageCourses, assertProgramAccess, getProgramRowById, type CourseProgramRow } from './coursePrograms';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';
import { writeAudit } from '../audit';

export type QuestionType = 'true_false' | 'multiple_choice';
export type AssessmentKind = 'midterm' | 'final' | 'practice';
export type AssessmentStatus = 'draft' | 'review' | 'published' | 'archived';

export interface QuestionInput {
  id?: string;
  type: QuestionType;
  prompt: string;
  options?: Array<{ id: string; label: string }>;
  correctKey: string;
  sourceRef?: string | null;
  reviewState?: 'approved' | 'needs_review';
}

export interface AssessmentRow {
  id: string;
  program_id: string;
  module_id: string | null;
  kind: AssessmentKind;
  origin: 'official' | 'generated';
  title: string;
  instructions: string | null;
  status: AssessmentStatus;
  attempts_allowed: number;
  time_limit_minutes: number | null;
  pass_percentage: number | null;
  opens_at: string | null;
  closes_at: string | null;
  grading_mode: string;
  source_refs_json: string;
  audit_json: string;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionRow {
  id: string;
  assessment_id: string;
  type: QuestionType;
  prompt: string;
  options_json: string;
  correct_key: string;
  source_ref: string | null;
  position: number;
  review_state: 'approved' | 'needs_review';
  created_at: string;
}

export const TRUE_FALSE_OPTIONS = [
  { id: 'true', label: 'Verdadero' },
  { id: 'false', label: 'Falso' },
];

function normalizeOptions(options: unknown): Array<{ id: string; label: string }> {
  if (!Array.isArray(options)) return [];
  const seen = new Set<string>();
  const output: Array<{ id: string; label: string }> = [];
  for (const option of options) {
    if (!option || typeof option !== 'object') continue;
    const candidate = option as { id?: unknown; label?: unknown };
    const id = typeof candidate.id === 'string' ? candidate.id.trim().slice(0, 40) : '';
    const label = typeof candidate.label === 'string' ? candidate.label.trim().slice(0, 500) : '';
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    output.push({ id, label });
  }
  return output;
}

export function parseOptions(question: QuestionRow): Array<{ id: string; label: string }> {
  try {
    const parsed = JSON.parse(question.options_json);
    return normalizeOptions(parsed);
  } catch {
    return [];
  }
}

function normalizePrompt(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function validateQuestion(input: QuestionInput, index: number): {
  type: QuestionType;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctKey: string;
  sourceRef: string | null;
} {
  if (!['true_false', 'multiple_choice'].includes(input.type)) {
    throw new ApiError(400, 'QUESTION_TYPE', `La pregunta ${index + 1} tiene un tipo no válido.`);
  }
  const prompt = (input.prompt || '').trim();
  if (prompt.length < 5 || prompt.length > 1000) {
    throw new ApiError(
      400,
      'QUESTION_PROMPT',
      `El enunciado de la pregunta ${index + 1} debe tener entre 5 y 1000 caracteres.`
    );
  }
  const options = input.type === 'true_false' ? TRUE_FALSE_OPTIONS : normalizeOptions(input.options);
  if (input.type === 'true_false') {
    if (options.length !== 2) {
      throw new ApiError(400, 'QUESTION_OPTIONS', 'Verdadero/falso debe tener exactamente dos opciones.');
    }
  } else if (options.length < 2 || options.length > 6) {
    throw new ApiError(
      400,
      'QUESTION_OPTIONS',
      `La pregunta ${index + 1} debe tener entre 3 y 6 opciones válidas y distintas.`
    );
  }
  const correctKey = (input.correctKey || '').trim();
  if (!options.some((option) => option.id === correctKey)) {
    throw new ApiError(
      400,
      'QUESTION_KEY',
      `La clave de la pregunta ${index + 1} no corresponde a ninguna opción.`
    );
  }
  const labels = new Set(options.map((option) => option.label.toLowerCase()));
  if (labels.size !== options.length) {
    throw new ApiError(400, 'QUESTION_OPTIONS', 'Las opciones no pueden repetirse.');
  }
  return {
    type: input.type,
    prompt,
    options,
    correctKey,
    sourceRef: input.sourceRef?.trim().slice(0, 500) || null,
  };
}

export interface AuditIssue {
  code: string;
  message: string;
  questionId?: string;
}

export interface AuditResult {
  ok: boolean;
  issues: AuditIssue[];
  counts: { total: number; trueFalse: number; multipleChoice: number };
  duplicatePrompts: string[];
}

/**
 * Auditoría previa a publicación. Comprueba estructura, tipos, duplicados,
 * evidencia de cada clave y coherencia del modelo de 15 preguntas cuando el
 * examen es generado (5 verdadero/falso + 10 selección múltiple).
 */
export function auditAssessment(assessmentId: string): AuditResult {
  const assessment = prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as
    | AssessmentRow
    | undefined;
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no existe.');
  const questions = prepare(
    'SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY position'
  ).all(assessmentId) as QuestionRow[];

  const issues: AuditIssue[] = [];
  const counts = { total: questions.length, trueFalse: 0, multipleChoice: 0 };
  const seen = new Map<string, string>();
  const duplicatePrompts: string[] = [];

  for (const question of questions) {
    if (question.type === 'true_false') counts.trueFalse += 1;
    else counts.multipleChoice += 1;

    const options = parseOptions(question);
    if (question.type === 'true_false' && options.length !== 2) {
      issues.push({ code: 'TF_OPTIONS', message: 'Pregunta de verdadero/falso con opciones inválidas.', questionId: question.id });
    }
    if (question.type === 'multiple_choice' && (options.length < 2 || options.length > 6)) {
      issues.push({ code: 'MC_OPTIONS', message: 'Pregunta de selección múltiple con número de opciones inválido.', questionId: question.id });
    }
    if (!options.some((option) => option.id === question.correct_key)) {
      issues.push({ code: 'KEY_INVALID', message: 'La clave no corresponde a una opción existente.', questionId: question.id });
    }
    if (!question.source_ref) {
      issues.push({
        code: 'SOURCE_MISSING',
        message: 'La pregunta no tiene referencia de fuente que sustente la clave.',
        questionId: question.id,
      });
    }
    if (question.review_state !== 'approved') {
      issues.push({
        code: 'NEEDS_REVIEW',
        message: 'La pregunta sigue marcada para revisión académica.',
        questionId: question.id,
      });
    }
    const normalized = normalizePrompt(question.prompt);
    if (seen.has(normalized)) {
      duplicatePrompts.push(question.id);
      issues.push({
        code: 'DUPLICATE_PROMPT',
        message: 'Hay preguntas con el mismo enunciado.',
        questionId: question.id,
      });
    } else {
      seen.set(normalized, question.id);
    }
  }

  if (questions.length === 0) {
    issues.push({ code: 'NO_QUESTIONS', message: 'La evaluación no tiene preguntas.' });
  }
  if (assessment.origin === 'generated') {
    if (counts.total !== 15) {
      issues.push({
        code: 'GENERATED_COUNT',
        message: 'Un examen generado debe tener 15 preguntas antes de publicarse.',
      });
    }
    if (counts.trueFalse !== 5) {
      issues.push({
        code: 'GENERATED_TF_COUNT',
        message: 'Un examen generado debe tener 5 preguntas de verdadero/falso.',
      });
    }
    if (counts.multipleChoice !== 10) {
      issues.push({
        code: 'GENERATED_MC_COUNT',
        message: 'Un examen generado debe tener 10 preguntas de selección múltiple.',
      });
    }
  }
  if (assessment.opens_at && assessment.closes_at && assessment.opens_at >= assessment.closes_at) {
    issues.push({ code: 'WINDOW_INVALID', message: 'La fecha de apertura debe ser anterior al cierre.' });
  }

  return { ok: issues.length === 0, issues, counts, duplicatePrompts };
}

export function listAssessments(programId: string): Array<{
  id: string;
  moduleId: string | null;
  kind: AssessmentKind;
  origin: 'official' | 'generated';
  title: string;
  status: AssessmentStatus;
  attemptsAllowed: number;
  timeLimitMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
  passPercentage: number | null;
  questionCount: number;
  audit: AuditResult;
  createdAt: string;
}> {
  const rows = prepare('SELECT * FROM assessments WHERE program_id = ? ORDER BY created_at').all(
    programId
  ) as AssessmentRow[];
  return rows.map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    kind: row.kind,
    origin: row.origin,
    title: row.title,
    status: row.status,
    attemptsAllowed: Number(row.attempts_allowed),
    timeLimitMinutes: row.time_limit_minutes,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    passPercentage: row.pass_percentage,
    questionCount: Number(
      (prepare('SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?').get(row.id) as {
        total: number;
      }).total
    ),
    audit: auditAssessment(row.id),
    createdAt: row.created_at,
  }));
}

export function getAssessmentAdmin(assessmentId: string): {
  assessment: AssessmentRow;
  questions: Array<QuestionRow & { options: Array<{ id: string; label: string }> }>;
  audit: AuditResult;
} | null {
  const assessment = prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as
    | AssessmentRow
    | undefined;
  if (!assessment) return null;
  const questions = prepare(
    'SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY position'
  ).all(assessmentId) as QuestionRow[];
  return {
    assessment,
    questions: questions.map((question) => ({ ...question, options: parseOptions(question) })),
    audit: auditAssessment(assessmentId),
  };
}

export interface CreateAssessmentInput {
  title: string;
  kind?: AssessmentKind;
  moduleId?: string | null;
  instructions?: string | null;
  origin?: 'official' | 'generated';
  status?: AssessmentStatus;
  attemptsAllowed?: number;
  timeLimitMinutes?: number | null;
  passPercentage?: number | null;
  opensAt?: string | null;
  closesAt?: string | null;
  sourceRefs?: unknown;
  questions?: QuestionInput[];
}

function assertWindow(opensAt: string | null, closesAt: string | null): void {
  const normalize = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ApiError(400, 'DATE_INVALID', 'La fecha de la evaluación no es válida.');
    }
    return date.toISOString();
  };
  const start = normalize(opensAt);
  const end = normalize(closesAt);
  if (start && end && start >= end) {
    throw new ApiError(400, 'DATE_RANGE', 'La apertura debe ser anterior al cierre.');
  }
}

function insertQuestions(assessmentId: string, questions: QuestionInput[]): void {
  const now = nowIso();
  questions.forEach((input, index) => {
    const question = validateQuestion(input, index);
    prepare(`
      INSERT INTO assessment_questions
        (id, assessment_id, type, prompt, options_json, correct_key, source_ref, position, review_state, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.id && /^q_[A-Za-z0-9_-]{6,40}$/.test(input.id) ? input.id : `q_${randomToken(16)}`,
      assessmentId,
      question.type,
      question.prompt,
      JSON.stringify(question.options),
      question.correctKey,
      question.sourceRef,
      index + 1,
      question.sourceRef && input.reviewState !== 'needs_review' ? 'approved' : 'needs_review',
      now
    );
  });
}

export function createAssessment(
  programId: string,
  input: CreateAssessmentInput,
  actor?: AuthUser | null
): AssessmentRow {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  if (!input.title?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título de la evaluación es obligatorio.');
  const kind: AssessmentKind =
    input.kind && ['midterm', 'final', 'practice'].includes(input.kind) ? input.kind : 'practice';
  const origin = input.origin === 'official' ? 'official' : 'generated';
  const status: AssessmentStatus =
    input.status && ['draft', 'review', 'published', 'archived'].includes(input.status)
      ? input.status
      : 'draft';
  if (status === 'published') {
    throw new ApiError(409, 'PUBLISH_REQUIRES_AUDIT', 'Crea la evaluación como borrador y publícala después de la auditoría.');
  }
  const attemptsAllowed = Number.isInteger(input.attemptsAllowed)
    ? Math.max(1, Math.min(10, Number(input.attemptsAllowed)))
    : 1;
  const timeLimit =
    input.timeLimitMinutes === null || input.timeLimitMinutes === undefined
      ? null
      : Math.max(1, Math.min(600, Math.trunc(Number(input.timeLimitMinutes))));
  const passPercentage =
    input.passPercentage === null || input.passPercentage === undefined
      ? null
      : Math.max(0, Math.min(100, Number(input.passPercentage)));
  assertWindow(input.opensAt || null, input.closesAt || null);

  const id = `asm_${randomToken(16)}`;
  const now = nowIso();
  const questions = Array.isArray(input.questions) ? input.questions : [];

  withTransaction(() => {
    prepare(`
      INSERT INTO assessments
        (id, program_id, module_id, kind, origin, title, instructions, status, attempts_allowed,
         time_limit_minutes, pass_percentage, opens_at, closes_at, grading_mode, source_refs_json,
         audit_json, version, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'equal_weight', ?, '{}', 1, ?, ?, ?)
    `).run(
      id,
      programId,
      input.moduleId || null,
      kind,
      origin,
      input.title.trim().slice(0, 250),
      input.instructions?.slice(0, 8000) || null,
      status,
      attemptsAllowed,
      timeLimit,
      passPercentage,
      input.opensAt ? new Date(input.opensAt).toISOString() : null,
      input.closesAt ? new Date(input.closesAt).toISOString() : null,
      JSON.stringify(Array.isArray(input.sourceRefs) ? input.sourceRefs.slice(0, 100) : []),
      actor?.id || null,
      now,
      now
    );
    insertQuestions(id, questions);
  });

  writeAudit({
    actor,
    action: 'assessment.created',
    entityType: 'assessment',
    entityId: id,
    after: { programId, kind, origin, questionCount: questions.length },
  });
  return prepare('SELECT * FROM assessments WHERE id = ?').get(id) as AssessmentRow;
}

export function updateAssessment(
  assessmentId: string,
  input: Partial<CreateAssessmentInput> & { version?: number },
  actor?: AuthUser | null
): AssessmentRow {
  const assessment = prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as
    | AssessmentRow
    | undefined;
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no existe.');
  if (input.status === 'published') {
    return publishAssessment(assessmentId, actor);
  }
  const fields: string[] = [];
  const values: Array<string | number | null> = [];
  if (input.title !== undefined) {
    if (!input.title.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'El título no puede quedar vacío.');
    fields.push('title = ?');
    values.push(input.title.trim().slice(0, 250));
  }
  if (input.instructions !== undefined) {
    fields.push('instructions = ?');
    values.push(input.instructions?.slice(0, 8000) || null);
  }
  if (input.kind !== undefined) {
    if (!['midterm', 'final', 'practice'].includes(input.kind)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de evaluación no es válido.');
    }
    fields.push('kind = ?');
    values.push(input.kind);
  }
  if (input.status !== undefined) {
    if (!['draft', 'review', 'archived'].includes(input.status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El estado de la evaluación no es válido.');
    }
    fields.push('status = ?');
    values.push(input.status);
  }
  if (input.attemptsAllowed !== undefined) {
    fields.push('attempts_allowed = ?');
    values.push(Math.max(1, Math.min(10, Math.trunc(Number(input.attemptsAllowed)))));
  }
  if (input.timeLimitMinutes !== undefined) {
    fields.push('time_limit_minutes = ?');
    values.push(
      input.timeLimitMinutes === null
        ? null
        : Math.max(1, Math.min(600, Math.trunc(Number(input.timeLimitMinutes))))
    );
  }
  if (input.passPercentage !== undefined) {
    fields.push('pass_percentage = ?');
    values.push(
      input.passPercentage === null ? null : Math.max(0, Math.min(100, Number(input.passPercentage)))
    );
  }
  if (input.opensAt !== undefined || input.closesAt !== undefined) {
    const opens = input.opensAt === undefined ? assessment.opens_at : input.opensAt;
    const closes = input.closesAt === undefined ? assessment.closes_at : input.closesAt;
    assertWindow(opens, closes);
    fields.push('opens_at = ?');
    values.push(opens ? new Date(opens).toISOString() : null);
    fields.push('closes_at = ?');
    values.push(closes ? new Date(closes).toISOString() : null);
  }
  if (input.sourceRefs !== undefined) {
    fields.push('source_refs_json = ?');
    values.push(JSON.stringify(Array.isArray(input.sourceRefs) ? input.sourceRefs.slice(0, 100) : []));
  }
  if (fields.length) {
    values.push(nowIso(), assessmentId);
    prepare(`UPDATE assessments SET ${fields.join(', ')}, updated_at = ? WHERE id = ?`).run(...values);
  }
  if (Array.isArray(input.questions)) {
    withTransaction(() => {
      prepare('DELETE FROM assessment_questions WHERE assessment_id = ?').run(assessmentId);
      insertQuestions(assessmentId, input.questions as QuestionInput[]);
    });
  }
  writeAudit({
    actor,
    action: 'assessment.updated',
    entityType: 'assessment',
    entityId: assessmentId,
    after: { programId: assessment.program_id, status: input.status || assessment.status },
  });
  return prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as AssessmentRow;
}

export function publishAssessment(assessmentId: string, actor?: AuthUser | null): AssessmentRow {
  const assessment = prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as
    | AssessmentRow
    | undefined;
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no existe.');
  const audit = auditAssessment(assessmentId);
  if (!audit.ok) {
    prepare('UPDATE assessments SET status = ?, audit_json = ?, updated_at = ? WHERE id = ?').run(
      'review',
      JSON.stringify(audit),
      nowIso(),
      assessmentId
    );
    throw new ApiError(
      409,
      'AUDIT_FAILED',
      'La evaluación no puede publicarse: la auditoría encontró problemas.',
      undefined
    );
  }
  prepare('UPDATE assessments SET status = ?, audit_json = ?, updated_at = ? WHERE id = ?').run(
    'published',
    JSON.stringify(audit),
    nowIso(),
    assessmentId
  );
  writeAudit({
    actor,
    action: 'assessment.published',
    entityType: 'assessment',
    entityId: assessmentId,
    after: { programId: assessment.program_id, counts: audit.counts },
  });
  return prepare('SELECT * FROM assessments WHERE id = ?').get(assessmentId) as AssessmentRow;
}

export function getPublishedAssessmentForStudent(
  assessmentId: string,
  user: AuthUser
): {
  assessment: AssessmentRow;
  program: CourseProgramRow;
  questions: Array<{
    id: string;
    type: QuestionType;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    position: number;
  }>;
  attemptsUsed: number;
  inProgressAttemptId: string | null;
} {
  const assessment = prepare("SELECT * FROM assessments WHERE id = ? AND status = 'published'").get(
    assessmentId
  ) as AssessmentRow | undefined;
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no está disponible.');
  const program = getProgramRowById(assessment.program_id);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  assertProgramAccess(user, program);

  const questions = prepare(
    'SELECT id, type, prompt, options_json, position FROM assessment_questions WHERE assessment_id = ? ORDER BY position'
  ).all(assessmentId) as Array<{
    id: string;
    type: QuestionType;
    prompt: string;
    options_json: string;
    position: number;
  }>;
  const attempts = prepare(`
    SELECT id, status FROM assessment_attempts
    WHERE assessment_id = ? AND user_id = ? ORDER BY attempt_number
  `).all(assessmentId, user.id) as Array<{ id: string; status: string }>;
  const inProgress = attempts.find((attempt) => attempt.status === 'in_progress');
  const settled = attempts.filter((attempt) => attempt.status === 'graded' || attempt.status === 'submitted');

  return {
    assessment,
    program,
    questions: questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      options: (() => {
        try {
          return normalizeOptions(JSON.parse(question.options_json));
        } catch {
          return [];
        }
      })(),
      position: Number(question.position),
    })),
    attemptsUsed: settled.length,
    inProgressAttemptId: inProgress?.id || null,
  };
}

function assertAssessmentWindow(assessment: AssessmentRow): void {
  const now = nowIso();
  if (assessment.opens_at && now < assessment.opens_at) {
    throw new ApiError(409, 'ASSESSMENT_NOT_OPEN', 'La evaluación todavía no está abierta.');
  }
  if (assessment.closes_at && now > assessment.closes_at) {
    throw new ApiError(409, 'ASSESSMENT_CLOSED', 'La evaluación ya cerró.');
  }
}

export function startAttempt(
  assessmentId: string,
  user: AuthUser
): { attemptId: string; attemptNumber: number; startedAt: string } {
  const info = getPublishedAssessmentForStudent(assessmentId, user);
  assertAssessmentWindow(info.assessment);

  if (info.inProgressAttemptId) {
    const existing = prepare('SELECT * FROM assessment_attempts WHERE id = ?').get(
      info.inProgressAttemptId
    ) as { id: string; attempt_number: number; started_at: string };
    return {
      attemptId: existing.id,
      attemptNumber: Number(existing.attempt_number),
      startedAt: existing.started_at,
    };
  }
  if (info.attemptsUsed >= Number(info.assessment.attempts_allowed)) {
    throw new ApiError(409, 'ATTEMPTS_EXHAUSTED', 'Ya utilizaste los intentos permitidos.');
  }

  const attemptNumber = info.attemptsUsed + 1;
  const id = `att_${randomToken(16)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO assessment_attempts
      (id, assessment_id, user_id, attempt_number, status, started_at, assessment_version)
    VALUES (?, ?, ?, ?, 'in_progress', ?, ?)
  `).run(id, assessmentId, user.id, attemptNumber, now, info.assessment.version);
  writeAudit({
    actor: user,
    action: 'assessment.attempt_started',
    entityType: 'assessment_attempt',
    entityId: id,
    after: { assessmentId, attemptNumber },
  });
  return { attemptId: id, attemptNumber, startedAt: now };
}

export interface AttemptResult {
  attemptId: string;
  assessmentId: string;
  assessmentVersion: number;
  status: string;
  attemptNumber: number;
  correctCount: number | null;
  totalQuestions: number | null;
  percentage: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  passPercentage: number | null;
}

function toAttemptResult(row: {
  id: string;
  assessment_id: string;
  assessment_version: number;
  status: string;
  attempt_number: number;
  correct_count: number | null;
  total_questions: number | null;
  percentage: number | null;
  submitted_at: string | null;
  graded_at: string | null;
}, passPercentage: number | null): AttemptResult {
  return {
    attemptId: row.id,
    assessmentId: row.assessment_id,
    assessmentVersion: Number(row.assessment_version),
    status: row.status,
    attemptNumber: Number(row.attempt_number),
    correctCount: row.correct_count === null ? null : Number(row.correct_count),
    totalQuestions: row.total_questions === null ? null : Number(row.total_questions),
    percentage: row.percentage === null ? null : Number(row.percentage),
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at,
    passPercentage,
  };
}

export function getAttemptResult(attemptId: string, user: AuthUser): AttemptResult & {
  assessmentTitle: string;
  assessmentKind: AssessmentKind;
  programTitle: string;
  programSlug: string;
} {
  const row = prepare(`
    SELECT a.*, asm.title AS assessment_title, asm.kind AS assessment_kind,
           asm.pass_percentage, cp.title AS program_title, r.slug AS program_slug
    FROM assessment_attempts a
    JOIN assessments asm ON asm.id = a.assessment_id
    JOIN course_programs cp ON cp.id = asm.program_id
    JOIN resources r ON r.id = cp.resource_id
    WHERE a.id = ?
  `).get(attemptId) as
    | {
        id: string;
        assessment_id: string;
        user_id: string;
        status: string;
        attempt_number: number;
        assessment_version: number;
        correct_count: number | null;
        total_questions: number | null;
        percentage: number | null;
        submitted_at: string | null;
        graded_at: string | null;
        assessment_title: string;
        assessment_kind: AssessmentKind;
        pass_percentage: number | null;
        program_title: string;
        program_slug: string;
      }
    | undefined;
  if (!row) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'El intento no existe.');
  if (row.user_id !== user.id && !canManageCourses(user)) {
    throw new ApiError(403, 'ATTEMPT_FORBIDDEN', 'No puedes consultar el intento de otro estudiante.');
  }
  return {
    ...toAttemptResult(row, row.pass_percentage),
    assessmentTitle: row.assessment_title,
    assessmentKind: row.assessment_kind,
    programTitle: row.program_title,
    programSlug: row.program_slug,
  };
}

export function submitAttempt(
  attemptId: string,
  user: AuthUser,
  input: { answers?: Array<{ questionId?: unknown; optionId?: unknown }>; idempotencyKey?: string }
): AttemptResult {
  const attempt = prepare('SELECT * FROM assessment_attempts WHERE id = ?').get(attemptId) as
    | {
        id: string;
        assessment_id: string;
        user_id: string;
        status: string;
        attempt_number: number;
        assessment_version: number;
        correct_count: number | null;
        total_questions: number | null;
        percentage: number | null;
        submitted_at: string | null;
        graded_at: string | null;
      }
    | undefined;
  if (!attempt) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'El intento no existe.');
  if (attempt.user_id !== user.id) {
    throw new ApiError(403, 'ATTEMPT_FORBIDDEN', 'No puedes enviar el intento de otro estudiante.');
  }

  const assessment = prepare('SELECT * FROM assessments WHERE id = ?').get(attempt.assessment_id) as
    | AssessmentRow
    | undefined;
  if (!assessment) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no existe.');

  if (attempt.status === 'graded' || attempt.status === 'submitted') {
    return toAttemptResult(attempt, assessment.pass_percentage);
  }
  assertAssessmentWindow(assessment);

  const idempotencyKey =
    typeof input.idempotencyKey === 'string' && input.idempotencyKey.trim()
      ? input.idempotencyKey.trim().slice(0, 120)
      : null;

  const questions = prepare(
    'SELECT id, correct_key FROM assessment_questions WHERE assessment_id = ? ORDER BY position'
  ).all(assessment.id) as Array<{ id: string; correct_key: string }>;
  if (questions.length === 0) {
    throw new ApiError(409, 'ASSESSMENT_EMPTY', 'La evaluación no tiene preguntas.');
  }

  const answerMap = new Map<string, string | null>();
  if (Array.isArray(input.answers)) {
    for (const answer of input.answers) {
      if (!answer || typeof answer !== 'object') continue;
      const questionId = typeof answer.questionId === 'string' ? answer.questionId : '';
      const optionId = typeof answer.optionId === 'string' ? answer.optionId : null;
      if (questionId) answerMap.set(questionId, optionId);
    }
  }

  let correct = 0;
  const gradedAnswers: Array<{ questionId: string; selectedKey: string | null; isCorrect: boolean }> = [];
  for (const question of questions) {
    const selected = answerMap.get(question.id) ?? null;
    const isCorrect = selected !== null && selected === question.correct_key;
    if (isCorrect) correct += 1;
    gradedAnswers.push({ questionId: question.id, selectedKey: selected, isCorrect });
  }
  const total = questions.length;
  const percentage = Math.round((correct / total) * 10000) / 100;
  const now = nowIso();
  const resultRow = {
    id: attempt.id,
    assessment_id: assessment.id,
    status: 'graded',
    attempt_number: attempt.attempt_number,
    assessment_version: attempt.assessment_version,
    correct_count: correct,
    total_questions: total,
    percentage,
    submitted_at: now,
    graded_at: now,
  };

  withTransaction(() => {
    prepare(`
      UPDATE assessment_attempts
      SET status = 'graded', submitted_at = ?, graded_at = ?, correct_count = ?,
          total_questions = ?, percentage = ?, idempotency_key = COALESCE(idempotency_key, ?)
      WHERE id = ? AND status = 'in_progress'
    `).run(now, now, correct, total, percentage, idempotencyKey, attemptId);
    prepare('DELETE FROM assessment_answers WHERE attempt_id = ?').run(attemptId);
    for (const graded of gradedAnswers) {
      prepare(`
        INSERT INTO assessment_answers (id, attempt_id, question_id, selected_key, is_correct)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        `ans_${randomToken(16)}`,
        attemptId,
        graded.questionId,
        graded.selectedKey,
        graded.isCorrect ? 1 : 0
      );
    }
    prepare(`
      INSERT INTO course_grade_reports
        (id, attempt_id, user_id, program_id, assessment_id, assessment_version, generated_at, drive_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `grp_${randomToken(16)}`,
      attemptId,
      user.id,
      assessment.program_id,
      assessment.id,
      assessment.version,
      now,
      process.env.GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID ? 'pending' : 'skipped',
      now
    );
  });

  writeAudit({
    actor: user,
    action: 'assessment.attempt_graded',
    entityType: 'assessment_attempt',
    entityId: attemptId,
    after: { assessmentId: assessment.id, correct, total, percentage },
  });
  return toAttemptResult(resultRow, assessment.pass_percentage);
}

export function listStudentAssessmentResults(
  programId: string,
  user: AuthUser
): Array<AttemptResult & { assessmentTitle: string; assessmentKind: AssessmentKind }> {
  const rows = prepare(`
    SELECT a.*, asm.title AS assessment_title, asm.kind AS assessment_kind, asm.pass_percentage
    FROM assessment_attempts a
    JOIN assessments asm ON asm.id = a.assessment_id
    WHERE asm.program_id = ? AND a.user_id = ? AND a.status IN ('submitted','graded')
    ORDER BY a.submitted_at DESC
  `).all(programId, user.id) as Array<{
    id: string;
    assessment_id: string;
    status: string;
    attempt_number: number;
    assessment_version: number;
    correct_count: number | null;
    total_questions: number | null;
    percentage: number | null;
    submitted_at: string | null;
    graded_at: string | null;
    assessment_title: string;
    assessment_kind: AssessmentKind;
    pass_percentage: number | null;
  }>;
  return rows.map((row) => ({
    ...toAttemptResult(row, row.pass_percentage),
    assessmentTitle: row.assessment_title,
    assessmentKind: row.assessment_kind,
  }));
}

export function getProgramAssessmentsForAdmin(programId: string): ReturnType<typeof listAssessments> {
  return listAssessments(programId);
}

/** Cambio administrativo de nota con auditoría obligatoria. */
export function adjustAttemptGrade(
  attemptId: string,
  input: { correctCount: number; reason: string },
  actor: AuthUser
): AttemptResult {
  const row = prepare(`
    SELECT a.*, asm.pass_percentage, asm.program_id FROM assessment_attempts a
    JOIN assessments asm ON asm.id = a.assessment_id WHERE a.id = ?
  `).get(attemptId) as
    | {
        id: string;
        assessment_id: string;
        status: string;
        attempt_number: number;
        assessment_version: number;
        correct_count: number | null;
        total_questions: number | null;
        percentage: number | null;
        submitted_at: string | null;
        graded_at: string | null;
        pass_percentage: number | null;
        program_id: string;
      }
    | undefined;
  if (!row) throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'El intento no existe.');
  if (row.status !== 'graded') throw new ApiError(409, 'ATTEMPT_NOT_GRADED', 'El intento no está calificado.');
  const total = Number(row.total_questions || 0);
  if (!Number.isInteger(input.correctCount) || input.correctCount < 0 || input.correctCount > total) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El número de aciertos no es válido.');
  }
  if (!input.reason?.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El motivo del ajuste es obligatorio.');
  }
  const percentage = total ? Math.round((input.correctCount / total) * 10000) / 100 : 0;
  const now = nowIso();
  prepare(
    'UPDATE assessment_attempts SET correct_count = ?, percentage = ?, graded_at = ? WHERE id = ?'
  ).run(input.correctCount, percentage, now, attemptId);
  prepare('UPDATE course_grade_reports SET generated_at = ?, updated_at = ? WHERE attempt_id = ?').run(
    now,
    now,
    attemptId
  );
  writeAudit({
    actor,
    action: 'assessment.grade_adjusted',
    entityType: 'assessment_attempt',
    entityId: attemptId,
    before: { correctCount: row.correct_count, percentage: row.percentage },
    after: { correctCount: input.correctCount, percentage, reason: input.reason.slice(0, 1000) },
  });
  const updated = { ...row, correct_count: input.correctCount, percentage, graded_at: now };
  return toAttemptResult(updated, row.pass_percentage);
}

export function aggregateAssessmentStats(programId: string): Array<{
  assessmentId: string;
  title: string;
  kind: AssessmentKind;
  attempts: number;
  average: number;
  min: number;
  max: number;
  distribution: { below60: number; from60to79: number; from80to89: number; from90to100: number };
}> {
  const assessments = prepare('SELECT id, title, kind FROM assessments WHERE program_id = ?').all(
    programId
  ) as Array<{ id: string; title: string; kind: AssessmentKind }>;
  return assessments.map((assessment) => {
    const rows = prepare(`
      SELECT percentage FROM assessment_attempts
      WHERE assessment_id = ? AND status = 'graded' AND percentage IS NOT NULL
    `).all(assessment.id) as Array<{ percentage: number }>;
    const values = rows.map((row) => Number(row.percentage));
    const sum = values.reduce((total, value) => total + value, 0);
    return {
      assessmentId: assessment.id,
      title: assessment.title,
      kind: assessment.kind,
      attempts: values.length,
      average: values.length ? Math.round((sum / values.length) * 100) / 100 : 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
      distribution: {
        below60: values.filter((value) => value < 60).length,
        from60to79: values.filter((value) => value >= 60 && value < 80).length,
        from80to89: values.filter((value) => value >= 80 && value < 90).length,
        from90to100: values.filter((value) => value >= 90).length,
      },
    };
  });
}
