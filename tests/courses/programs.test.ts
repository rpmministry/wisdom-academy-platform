import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { createUser, actor } from '../platform/helpers';
import {
  addLesson,
  addMaterial,
  addModule,
  createProgram,
  createWeeklyReview,
  getProgramDetail,
  getProgramRowById,
  getProgramRowBySlug,
  getLessonForStudent,
  markLessonProgress,
  updateProgram,
  listAccessiblePrograms,
  userCanViewProgram,
} from '../../src/server/domain/coursePrograms';
import { grantEntitlement } from '../../src/server/domain/access';

function buildProgram(kind: 'course' | 'workshop' = 'course') {
  return createProgram({
    kind,
    title: kind === 'course' ? 'Curso de prueba con semestres' : 'Taller de prueba práctica',
    description: kind === 'course' ? 'Descripción del curso' : 'Descripción del taller',
    objectives: ['Objetivo verificable'],
    requirements: ['Requisito verificable'],
    status: 'draft',
  });
}

test('crea cursos y talleres con estructuras diferentes', () => {
  const course = buildProgram('course');
  const workshop = buildProgram('workshop');
  assert.notEqual(course.id, workshop.id);

  const courseModule = addModule(course.id, {
    title: 'Semestre 01',
    kind: 'semester',
    position: 1,
  });
  const workshopStep = addModule(workshop.id, {
    title: 'Paso 1: preparación',
    kind: 'unit',
    position: 1,
  });
  const courseLesson = addLesson(course.id, courseModule.id, { title: 'Clase del curso' });
  const workshopLesson = addLesson(workshop.id, workshopStep.id, { title: 'Actividad del taller' });
  assert.equal(courseLesson.moduleId, courseModule.id);
  assert.equal(workshopLesson.moduleId, workshopStep.id);

  const reloadedWorkshop = getProgramRowById(workshop.id);
  assert.ok(reloadedWorkshop);
  assert.equal(reloadedWorkshop.kind, 'workshop');
  assert.equal(reloadedWorkshop.title, 'Taller de prueba práctica');
});

test('un estudiante solo accede con derecho vigente y a programas publicados', () => {
  const admin = actor(createUser({ email: 'admin-courses@test.local', roles: ['principal_admin'] }));
  const studentId = createUser({ email: 'student-courses@test.local', roles: ['student'] });
  const student = actor(studentId);
  const program = buildProgram('course');

  assert.equal(userCanViewProgram(student, getProgramRowById(program.id)!), false);

  updateProgram(program.id, { status: 'published' }, admin);
  assert.equal(userCanViewProgram(student, getProgramRowById(program.id)!), false);

  grantEntitlement({
    userId: studentId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'test-grant',
  });
  assert.equal(userCanViewProgram(student, getProgramRowById(program.id)!), true);

  const visible = listAccessiblePrograms(actor(studentId));
  assert.ok(visible.some((item) => item.id === program.id));
});

test('guarda y recupera progreso por clase', () => {
  const admin = actor(createUser({ email: 'admin-progress@test.local', roles: ['principal_admin'] }));
  const studentId = createUser({ email: 'student-progress@test.local', roles: ['student'] });
  const program = buildProgram('course');
  updateProgram(program.id, { status: 'published' }, admin);
  grantEntitlement({
    userId: studentId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'progress',
  });
  const module = addModule(program.id, { title: 'Semestre 01', kind: 'semester' });
  const lesson = addLesson(program.id, module.id, {
    title: 'Clase con progreso',
    videoIds: ['https://youtu.be/dQw4w9WgXcQ'],
  });

  const student = actor(studentId);
  const progress = markLessonProgress(student, lesson.id, { completed: true, playbackSeconds: 120 });
  assert.equal(progress.status, 'completed');
  assert.ok(progress.completedAt);

  const detail = getProgramDetail(getProgramRowById(program.id)!, { userId: studentId });
  assert.equal(detail.progress.completedLessons, 1);
  assert.equal(detail.progress.percent, 100);
  assert.equal(detail.modules[0].lessons[0].progress?.status, 'completed');
});

test('impide registrar progreso sin derecho de acceso', () => {
  const admin = actor(createUser({ email: 'admin-noaccess@test.local', roles: ['principal_admin'] }));
  const student = actor(createUser({ email: 'student-noaccess@test.local', roles: ['student'] }));
  const program = buildProgram('course');
  updateProgram(program.id, { status: 'published' }, admin);
  const module = addModule(program.id, { title: 'Semestre 01', kind: 'semester' });
  const lesson = addLesson(program.id, module.id, { title: 'Clase protegida' });
  assert.throws(() => markLessonProgress(student, lesson.id, { completed: true }), /derecho de acceso/i);
});

test('los repasos solo se exponen al publicarse', () => {
  const admin = actor(createUser({ email: 'admin-review@test.local', roles: ['principal_admin'] }));
  const program = buildProgram('course');
  const review = createWeeklyReview(
    program.id,
    {
      title: 'Repaso de la semana 1',
      weekLabel: 'Semana 1',
      contentMd: '# Repaso\n\nContenido de estudio.',
      isAiGenerated: true,
      status: 'draft',
    },
    admin
  );
  assert.equal(review.status, 'draft');
  const row = prepare('SELECT status FROM weekly_reviews WHERE id = ?').get(review.id) as { status: string };
  assert.equal(row.status, 'draft');
});

test('los semestres posteriores quedan bloqueados hasta completar el anterior', () => {
  const admin = actor(createUser({ email: 'admin-sequence@test.local', roles: ['principal_admin'] }));
  const studentId = createUser({ email: 'student-sequence@test.local', roles: ['student'] });
  const student = actor(studentId);
  const program = buildProgram('course');
  updateProgram(program.id, { status: 'published' }, admin);
  grantEntitlement({
    userId: studentId,
    resourceId: program.resourceId,
    origin: 'manual_owner',
    originRef: 'sequence',
  });
  const semester1 = addModule(program.id, { title: 'Semestre 01', kind: 'semester', position: 1 });
  const semester2 = addModule(program.id, { title: 'Semestre 02', kind: 'semester', position: 2 });
  const lesson1 = addLesson(program.id, semester1.id, { title: 'Clase del semestre 1' });
  const lesson2 = addLesson(program.id, semester2.id, { title: 'Clase del semestre 2' });

  const before = getProgramDetail(getProgramRowById(program.id)!, { userId: studentId });
  assert.equal(before.modules[0].locked, false);
  assert.equal(before.modules[1].locked, true);
  assert.equal(before.modules[1].lessons.length, 0);
  assert.equal(getLessonForStudent(lesson2.id, studentId), null);

  markLessonProgress(student, lesson1.id, { completed: true });
  const after = getProgramDetail(getProgramRowById(program.id)!, { userId: studentId });
  assert.equal(after.modules[1].locked, false);
  assert.equal(after.modules[1].lessons.length, 1);
  assert.ok(getLessonForStudent(lesson2.id, studentId));
});

test('materiales y clases se ordenan y pertenecen al programa correcto', () => {
  const program = buildProgram('course');
  const other = buildProgram('course');
  const module = addModule(program.id, { title: 'Semestre 01', kind: 'semester' });
  const lesson = addLesson(program.id, module.id, { title: 'Clase ordenada', position: 2 });
  addMaterial(program.id, {
    kind: 'external_link',
    title: 'Lectura complementaria',
    url: 'https://example.com/lectura',
    lessonId: lesson.id,
  });
  assert.throws(
    () => addLesson(program.id, module.id, { title: '' }),
    /título de la clase es obligatorio/i
  );
  const detail = getProgramDetail(getProgramRowById(program.id)!);
  assert.equal(detail.modules[0].lessons[0].materials.length, 1);
  assert.equal(detail.modules[0].lessons[0].materials[0].title, 'Lectura complementaria');
  assert.throws(
    () =>
      addMaterial(other.id, {
        kind: 'external_link',
        title: 'Material cruzado',
        url: 'https://example.com',
        lessonId: lesson.id,
      }),
    /no pertenece al programa/i
  );
  assert.equal(getProgramRowBySlug('no-existe'), null);
});
