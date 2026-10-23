import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { createUser, actor } from '../platform/helpers';
import {
  addModule,
  createProgram,
  getProgramRowById,
  updateProgram,
} from '../../src/server/domain/coursePrograms';
import { grantEntitlement } from '../../src/server/domain/access';
import {
  auditAssessment,
  createAssessment,
  getAttemptResult,
  getPublishedAssessmentForStudent,
  publishAssessment,
  startAttempt,
  submitAttempt,
  type QuestionInput,
} from '../../src/server/domain/courseAssessments';

function setup() {
  const adminId = createUser({ email: `admin-assess-${Date.now()}-${Math.random()}@test.local`, roles: ['principal_admin'] });
  const admin = actor(adminId);
  const studentId = createUser({ email: `student-assess-${Date.now()}-${Math.random()}@test.local`, roles: ['student'] });
  const program = createProgram({
    kind: 'course',
    title: `Curso de evaluación ${Math.random()}`,
    status: 'draft',
  });
  const module = addModule(program.id, { title: 'Semestre 01', kind: 'semester' });
  updateProgram(program.id, { status: 'published' }, admin);
  grantEntitlement({
    userId: studentId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'assessment-test',
  });
  return { adminId, admin, studentId, program, module };
}

function buildQuestions(): QuestionInput[] {
  const questions: QuestionInput[] = [];
  for (let index = 1; index <= 5; index += 1) {
    questions.push({
      type: 'true_false',
      prompt: `Afirmación verificable número ${index} del material estudiado.`,
      correctKey: index % 2 === 0 ? 'true' : 'false',
      sourceRef: `Texto oficial, página ${index}`,
    });
  }
  for (let index = 1; index <= 10; index += 1) {
    questions.push({
      type: 'multiple_choice',
      prompt: `Pregunta de selección múltiple número ${index} sobre el contenido.`,
      options: [
        { id: 'a', label: `Alternativa A de la pregunta ${index}` },
        { id: 'b', label: `Alternativa B de la pregunta ${index}` },
        { id: 'c', label: `Alternativa C de la pregunta ${index}` },
      ],
      correctKey: index % 3 === 0 ? 'c' : 'b',
      sourceRef: `Clase ${index}, texto oficial página ${index + 20}`,
    });
  }
  return questions;
}

test('audita y publica un examen generado de 15 preguntas con evidencia', () => {
  const { admin, program, module } = setup();
  const questions = buildQuestions();
  const assessment = createAssessment(
    program.id,
    {
      title: 'Examen parcial de prueba',
      kind: 'midterm',
      moduleId: module.id,
      origin: 'generated',
      questions,
    },
    admin
  );
  const audit = auditAssessment(assessment.id);
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.counts, { total: 15, trueFalse: 5, multipleChoice: 10 });
  const published = publishAssessment(assessment.id, admin);
  assert.equal(published.status, 'published');
});

test('bloquea la publicación si falta evidencia o el modelo generado está incompleto', () => {
  const { admin, program } = setup();
  const assessment = createAssessment(
    program.id,
    {
      title: 'Examen incompleto',
      kind: 'final',
      origin: 'generated',
      questions: [
        {
          type: 'true_false',
          prompt: 'Pregunta sin fuente documentada.',
          correctKey: 'true',
        },
      ],
    },
    admin
  );
  const audit = auditAssessment(assessment.id);
  assert.equal(audit.ok, false);
  assert.ok(audit.issues.some((issue) => issue.code === 'SOURCE_MISSING'));
  assert.ok(audit.issues.some((issue) => issue.code === 'GENERATED_COUNT'));
  assert.throws(() => publishAssessment(assessment.id, admin), /auditoría/i);
  const row = prepare('SELECT status FROM assessments WHERE id = ?').get(assessment.id) as { status: string };
  assert.equal(row.status, 'review');
});

test('conserva la estructura de un examen oficial con otro número de preguntas', () => {
  const { admin, program } = setup();
  const assessment = createAssessment(
    program.id,
    {
      title: 'Examen oficial importado',
      kind: 'midterm',
      origin: 'official',
      questions: [
        {
          type: 'true_false',
          prompt: 'Afirmación oficial de verdadero o falso.',
          correctKey: 'true',
          sourceRef: 'Documento oficial, página 1',
        },
        {
          type: 'multiple_choice',
          prompt: 'Pregunta oficial de selección múltiple.',
          options: [
            { id: 'x', label: 'Opción oficial X' },
            { id: 'y', label: 'Opción oficial Y' },
          ],
          correctKey: 'y',
          sourceRef: 'Documento oficial, página 2',
        },
      ],
    },
    admin
  );
  const audit = auditAssessment(assessment.id);
  assert.equal(audit.ok, true);
  assert.equal(audit.counts.total, 2);
  const published = publishAssessment(assessment.id, admin);
  assert.equal(published.status, 'published');
  const count = prepare('SELECT COUNT(*) AS total FROM assessment_questions WHERE assessment_id = ?').get(
    assessment.id
  ) as { total: number };
  assert.equal(Number(count.total), 2);
});

test('el estudiante nunca recibe claves y la calificación se calcula en el servidor', () => {
  const { admin, studentId, program } = setup();
  const assessment = createAssessment(
    program.id,
    {
      title: 'Examen seguro',
      kind: 'midterm',
      origin: 'generated',
      attemptsAllowed: 1,
      questions: buildQuestions(),
    },
    admin
  );
  publishAssessment(assessment.id, admin);

  const student = actor(studentId);
  const info = getPublishedAssessmentForStudent(assessment.id, student);
  const serialized = JSON.stringify(info.questions);
  assert.equal(serialized.includes('correct_key'), false);
  assert.equal(serialized.includes('correctKey'), false);
  assert.equal(serialized.includes('sourceRef'), false);
  assert.equal(info.questions.length, 15);

  const started = startAttempt(assessment.id, student);
  const questions = prepare(
    'SELECT id, correct_key FROM assessment_questions WHERE assessment_id = ? ORDER BY position'
  ).all(assessment.id) as Array<{ id: string; correct_key: string }>;
  const result = submitAttempt(started.attemptId, student, {
    answers: questions.map((question) => ({
      questionId: question.id,
      optionId: question.correct_key,
    })),
    idempotencyKey: 'submit-once',
  });
  assert.equal(result.status, 'graded');
  assert.equal(result.correctCount, 15);
  assert.equal(result.totalQuestions, 15);
  assert.equal(result.percentage, 100);
  assert.equal('correctKey' in result, false);

  const submitAgain = submitAttempt(started.attemptId, student, {
    answers: [],
    idempotencyKey: 'submit-once',
  });
  assert.equal(submitAgain.percentage, 100);

  const attempts = prepare('SELECT COUNT(*) AS total FROM assessment_attempts WHERE user_id = ?').get(studentId) as {
    total: number;
  };
  const reports = prepare('SELECT COUNT(*) AS total FROM course_grade_reports WHERE user_id = ?').get(studentId) as {
    total: number;
  };
  assert.equal(Number(attempts.total), 1);
  assert.equal(Number(reports.total), 1);
  assert.throws(() => startAttempt(assessment.id, student), /intentos permitidos/i);
});

test('impide accesos cruzados a intentos de otros estudiantes', () => {
  const { admin, program } = setup();
  const assessment = createAssessment(
    program.id,
    { title: 'Examen IDOR', kind: 'midterm', origin: 'generated', questions: buildQuestions() },
    admin
  );
  publishAssessment(assessment.id, admin);
  const firstId = createUser({ email: `student-a-${Date.now()}@test.local`, roles: ['student'] });
  const secondId = createUser({ email: `student-b-${Date.now()}@test.local`, roles: ['student'] });
  grantEntitlement({
    userId: firstId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'a',
  });
  grantEntitlement({
    userId: secondId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'b',
  });
  const first = actor(firstId);
  const second = actor(secondId);
  const started = startAttempt(assessment.id, first);
  assert.throws(() => getAttemptResult(started.attemptId, second), /otro estudiante/i);
  assert.throws(
    () => submitAttempt(started.attemptId, second, { answers: [] }),
    /otro estudiante/i
  );
});

test('rechaza preguntas ambiguas o con clave inexistente', () => {
  const { admin, program } = setup();
  assert.throws(
    () =>
      createAssessment(program.id, {
        title: 'Pregunta inválida',
        questions: [
          {
            type: 'multiple_choice',
            prompt: 'Pregunta con clave fuera de las opciones.',
            options: [
              { id: 'a', label: 'Uno' },
              { id: 'b', label: 'Dos' },
              { id: 'c', label: 'Tres' },
            ],
            correctKey: 'z',
            sourceRef: 'Fuente',
          },
        ],
      }, admin),
    /clave/i
  );
});
