import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { nowIso } from '../../src/server/db/sqlite';
import { createUser, actor } from '../platform/helpers';
import {
  addLesson,
  addModule,
  createProgram,
  getProgramDetail,
  getProgramRowBySlug,
  getLessonForStudent,
  markLessonProgress,
} from '../../src/server/domain/coursePrograms';
import { grantEntitlement } from '../../src/server/domain/access';
import {
  createPazLead,
  getPazChallengeProgress,
  reviewPazPaymentIntent,
  setPazChallengeDay,
} from '../../src/server/domain/paz';

const RELEASE_AT = '2099-12-08T17:00:00.000Z';

function ensurePazProgram(): string {
  const existing = getProgramRowBySlug('paz-en-la-mesa');
  if (existing) return existing.id;
  const program = createProgram({
    kind: 'workshop',
    title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
    slug: 'paz-en-la-mesa',
    status: 'published',
    releaseAt: RELEASE_AT,
    metadata: { sequential: false, releaseAt: RELEASE_AT, pazEnLaMesa: true },
  });
  for (let number = 1; number <= 4; number += 1) {
    const module = addModule(program.id, {
      title: `Clase 0${number}`,
      kind: 'unit',
      position: number,
    });
    prepare('UPDATE course_modules SET metadata_json = ? WHERE id = ?').run(
      JSON.stringify({ pazClassNumber: number }),
      module.id
    );
    for (let block = 1; block <= 4; block += 1) {
      addLesson(program.id, module.id, {
        title: `Bloque ${block}`,
        position: block,
        videoIds: [],
        releaseAt: RELEASE_AT,
      });
    }
  }
  return program.id;
}

function pazStudent() {
  const userId = createUser({
    email: `paz-student-${Date.now()}-${Math.random()}@test.local`,
    roles: ['student'],
  });
  const programId = ensurePazProgram();
  const program = getProgramRowBySlug('paz-en-la-mesa');
  assert.ok(program);
  grantEntitlement({
    userId,
    resourceId: program.resource_id,
    origin: 'manual_owner',
    originRef: `paz-test-${userId}`,
  });
  return { userId, user: actor(userId), programId };
}

test('el taller en preventa muestra los bloques pero oculta video y materiales', () => {
  const { userId } = pazStudent();
  const program = getProgramRowBySlug('paz-en-la-mesa');
  assert.ok(program);
  const detail = getProgramDetail(program, { userId });
  assert.equal(detail.program.released, false);
  assert.equal(detail.modules.length, 4);
  const lessons = detail.modules.flatMap((module) => module.lessons);
  assert.equal(lessons.length, 16);
  assert.equal(lessons.every((lesson) => lesson.released === false), true);
  assert.equal(lessons.every((lesson) => lesson.videoIds.length === 0), true);
  assert.equal(lessons.every((lesson) => lesson.materials.length === 0), true);
  assert.equal(getLessonForStudent(lessons[0].id, userId), null);
  assert.throws(
    () => markLessonProgress(actor(userId), lessons[0].id, { completed: true }),
    /LESSON_NOT_RELEASED|se habilita/
  );
});

test('un pago aprobado activa derecho, orden pagada y matrícula', () => {
  const { userId, user } = pazStudent();
  const admin = actor(
    createUser({
      email: `paz-admin-${Date.now()}-${Math.random()}@test.local`,
      roles: ['principal_admin'],
    })
  );
  const program = getProgramRowBySlug('paz-en-la-mesa');
  assert.ok(program);
  const now = nowIso();
  const intentId = `pazpay_test_${Date.now()}`;
  prepare(`
    INSERT INTO paz_payment_intents
      (id, reference, user_id, plan, method, amount_cents, currency, status,
       buyer_name, buyer_email, transfer_reference, created_at, updated_at)
    VALUES (?, ?, ?, 'presale', 'bank_transfer', 2700, 'USD', 'pending',
            'Familia Prueba', ?, 'TEST-001', ?, ?)
  `).run(
    intentId,
    `PAZ-TEST-${Date.now()}`,
    user.id,
    user.email,
    now,
    now
  );

  const approved = reviewPazPaymentIntent(admin, intentId, 'approve', 'Validado en prueba');
  assert.equal(approved.status, 'approved');
  assert.ok(approved.orderId);

  const entitlements = prepare(
    "SELECT * FROM entitlements WHERE user_id = ? AND resource_id = ? AND status = 'active'"
  ).all(user.id, program.resource_id) as Array<{ id: string; origin: string }>;
  assert.equal(entitlements.some((item) => item.origin === 'purchase'), true);
  const order = prepare('SELECT * FROM orders WHERE id = ?').get(approved.orderId) as {
    status: string;
    total_cents: number;
  };
  assert.equal(order.status, 'paid');
  assert.equal(Number(order.total_cents), 2700);
  const enrollment = prepare('SELECT * FROM enrollments WHERE order_id = ?').get(
    approved.orderId
  ) as { status: string } | undefined;
  assert.equal(enrollment?.status, 'active');
});

test('el reto de 7 días guarda el checklist por alumno y el lead queda registrado', () => {
  const { user } = pazStudent();
  const program = getProgramRowBySlug('paz-en-la-mesa');
  assert.ok(program);

  const lead = createPazLead({
    fullName: 'Familia Interesada',
    email: `lead-${Date.now()}@test.local`,
    phone: '+593 99 999 9999',
    consent: true,
  });
  assert.match(lead.id, /^pazlead_/);

  const initial = getPazChallengeProgress(user.id, program.id);
  assert.equal(initial.length, 7);
  assert.equal(initial.every((day) => day.completed === false), true);

  const updated = setPazChallengeDay(user, {
    day: 3,
    completed: true,
    note: 'Consagramos el presupuesto familiar.',
  });
  assert.equal(updated.filter((day) => day.completed).length, 1);
  assert.equal(updated[2].completed, true);
  assert.equal(updated[2].note, 'Consagramos el presupuesto familiar.');
});

