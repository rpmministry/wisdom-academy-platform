import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { createUser, actor } from '../platform/helpers';
import { createProgram, addModule } from '../../src/server/domain/coursePrograms';
import {
  computeMeetingAvailability,
  ensureDefaultWeeklyMeetings,
  listWeeklyMeetingsForProgram,
  upsertWeeklyMeeting,
} from '../../src/server/domain/weeklyMeetings';

function setup() {
  const admin = actor(createUser({ email: `admin-meet-${Date.now()}-${Math.random()}@test.local`, roles: ['principal_admin'] }));
  const program = createProgram({
    kind: 'course',
    title: `Curso de reuniones ${Math.random()}`,
    status: 'published',
  });
  const module = addModule(program.id, { title: 'Semestre 01', kind: 'semester', position: 1 });
  return { admin, program, module };
}

test('crea una sala de Google Meet y no expone el enlace de anfitrión al estudiante', () => {
  const { admin, program, module } = setup();
  const meeting = upsertWeeklyMeeting(
    program.id,
    {
      weekNumber: 1,
      moduleId: module.id,
      title: 'Repaso de la semana 1',
      provider: 'google_meet',
      joinUrl: 'https://meet.google.com/vts-kbvh-xij',
      hostUrl: 'https://meet.google.com/vts-kbvh-xij',
      hostName: 'Profesor de Teología',
      status: 'published',
    },
    admin
  );
  assert.equal(meeting.providerLabel, 'Google Meet');
  assert.equal(meeting.embedMode, 'external');
  assert.equal(meeting.joinUrl, 'https://meet.google.com/vts-kbvh-xij');
  assert.ok(meeting.hostUrl);

  const studentView = listWeeklyMeetingsForProgram(program.id, { includeHost: false });
  assert.equal(studentView.length, 1);
  assert.equal(studentView[0].joinUrl, 'https://meet.google.com/vts-kbvh-xij');
  assert.equal(studentView[0].hostUrl, undefined);
  assert.equal(studentView[0].staffNote, undefined);
});

test('valida el código de Google Meet y rechaza enlaces ajenos', () => {
  const { admin, program } = setup();
  assert.throws(
    () =>
      upsertWeeklyMeeting(
        program.id,
        {
          weekNumber: 1,
          provider: 'google_meet',
          joinUrl: 'https://example.com/reunion',
        },
        admin
      ),
    /no corresponde a Google Meet|formato/i
  );
  assert.throws(
    () =>
      upsertWeeklyMeeting(
        program.id,
        {
          weekNumber: 1,
          provider: 'google_meet',
          joinUrl: 'https://meet.google.com/code-incorrecto',
        },
        admin
      ),
    /xxx-xxxx-xxx/i
  );
  assert.throws(
    () =>
      upsertWeeklyMeeting(
        program.id,
        {
          weekNumber: 1,
          provider: 'google_meet',
          joinUrl: 'http://meet.google.com/vts-kbvh-xij',
        },
        admin
      ),
    /HTTPS/i
  );
});

test('soporta Jitsi embebido y actualiza sin duplicar la semana', () => {
  const { admin, program } = setup();
  const first = upsertWeeklyMeeting(
    program.id,
    {
      weekNumber: 2,
      provider: 'jitsi',
      joinUrl: 'https://meet.jit.si/WisdomTeologiaSemana2',
      title: 'Repaso Jitsi',
    },
    admin
  );
  assert.equal(first.embedMode, 'iframe');
  assert.equal(first.providerLabel, 'Jitsi Meet');

  const second = upsertWeeklyMeeting(
    program.id,
    {
      weekNumber: 2,
      provider: 'jitsi',
      joinUrl: 'https://meet.jit.si/WisdomTeologiaSemana2',
      title: 'Repaso actualizado',
    },
    admin
  );
  assert.equal(second.id, first.id);
  const rows = prepare('SELECT COUNT(*) AS total FROM weekly_meetings WHERE program_id = ?').get(
    program.id
  ) as { total: number };
  assert.equal(Number(rows.total), 1);
  assert.equal(listWeeklyMeetingsForProgram(program.id)[0].title, 'Repaso actualizado');
});

test('calcula la ventana de ingreso y el estado en vivo', () => {
  const now = Date.parse('2026-10-22T18:00:00.000Z');
  const future = computeMeetingAvailability(
    {
      status: 'published',
      starts_at: '2026-10-22T19:00:00.000Z',
      ends_at: '2026-10-22T20:00:00.000Z',
    },
    now
  );
  assert.equal(future.canJoin, false);

  const live = computeMeetingAvailability(
    {
      status: 'published',
      starts_at: '2026-10-22T17:50:00.000Z',
      ends_at: '2026-10-22T18:40:00.000Z',
    },
    now
  );
  assert.equal(live.canJoin, true);
  assert.equal(live.isLive, true);

  const cancelled = computeMeetingAvailability(
    { status: 'cancelled', starts_at: null, ends_at: null },
    now
  );
  assert.equal(cancelled.canJoin, false);
});

test('crea las doce salas por defecto sin sobrescribir las existentes', () => {
  const { program } = setup();
  const created = ensureDefaultWeeklyMeetings(
    program.id,
    Array.from({ length: 12 }, (_, index) => index + 1),
    { hostName: 'Profesor de Teología' }
  );
  assert.equal(created, 12);
  const meetings = listWeeklyMeetingsForProgram(program.id);
  assert.equal(meetings.length, 12);
  assert.ok(meetings.every((meeting) => meeting.provider === 'google_meet'));
  assert.ok(meetings.every((meeting) => meeting.joinUrl === 'https://meet.google.com/vts-kbvh-xij'));

  const again = ensureDefaultWeeklyMeetings(program.id, [1, 2, 13], {
    hostName: 'Profesor de Teología',
  });
  assert.equal(again, 1);
  assert.equal(listWeeklyMeetingsForProgram(program.id).length, 13);
});
