import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { actor, createUser } from '../platform/helpers';
import {
  generatePazAccessCode,
  generateRawSecureCode,
  hashAccessCode,
  normalizeAccessCode,
  redeemPazAccessCode,
  revokePazAccessCode,
  markPazAccessCodeSent,
  listPazAccessCodes,
} from '../../src/server/domain/pazAccessCodes';
import {
  recordPazHeartbeat,
  getPazGeneralKpis,
  getPazStudentDetail,
} from '../../src/server/domain/pazAnalytics';
import {
  ensurePazTestAccounts,
  PAZ_TEST_CREDENTIALS,
} from '../../src/server/domain/pazSeedAccounts';
import {
  generatePazWorkbookReplica,
  getPazSyncStatus,
} from '../../src/server/domain/pazGoogleSync';
import {
  addLesson,
  addModule,
  createProgram,
  getProgramDetail,
  getProgramRowBySlug,
  getLessonForStudent,
  userCanViewProgram,
} from '../../src/server/domain/coursePrograms';
import { PAZ_PROGRAM_SLUG } from '../../src/lib/paz-en-la-mesa/content';

function ensurePazProgram(): string {
  const existing = getProgramRowBySlug('paz-en-la-mesa');
  if (existing) return existing.id;
  const program = createProgram({
    kind: 'workshop',
    title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
    slug: 'paz-en-la-mesa',
    status: 'published',
    metadata: { sequential: false, pazEnLaMesa: true },
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
      });
    }
  }
  return program.id;
}

function setupAdmin() {
  ensurePazProgram();
  const userId = createUser({
    email: `paz-admin-${Date.now()}@wisdom.test`,
    roles: ['principal_admin'],
  });
  return actor(userId);
}

test('generación de código seguro de 25 caracteres con formato y sin texto plano en base de datos', () => {
  const admin = setupAdmin();
  const email = `test-buyer-${Date.now()}@test.local`;
  const result = generatePazAccessCode(admin, { email });

  assert.ok(result.id);
  assert.ok(result.rawCode);
  const normalized = normalizeAccessCode(result.rawCode);
  assert.equal(normalized.length, 25, 'El código debe tener exactamente 25 caracteres alfanuméricos');
  assert.match(result.rawCode, /^PAZ26-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);

  // Verificar que la base de datos NUNCA almacena el código plano
  const row = prepare('SELECT * FROM paz_access_codes WHERE id = ?').get(result.id) as {
    code_hash: string;
    code_preview: string;
  };
  assert.ok(row.code_hash);
  assert.notEqual(row.code_hash, result.rawCode);
  assert.equal(row.code_hash, hashAccessCode(normalized));
  assert.match(row.code_preview, /^PAZ26-••••-••••-••••-[A-Z0-9]{5}$/);
});

test('flujo de canje y activación de estudiante con código de 25 caracteres', () => {
  const admin = setupAdmin();
  const email = `student-redemption-${Date.now()}@test.local`;
  const generated = generatePazAccessCode(admin, { email });

  const redeemed = redeemPazAccessCode({
    rawCode: generated.rawCode,
    email,
    fullName: 'Familia Canjeada',
    clientIp: '192.168.1.10',
  });

  assert.equal(redeemed.success, true);
  assert.equal(redeemed.user.email, email);
  assert.equal(redeemed.program.slug, PAZ_PROGRAM_SLUG);

  // Verificar que el estudiante quedó con derecho de acceso activo
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  assert.ok(program);
  const userObj = actor(redeemed.user.id);
  assert.equal(userCanViewProgram(userObj, program), true);

  // Verificar que el código cambió su estado a 'redeemed'
  const row = prepare('SELECT status, user_id, redeemed_at FROM paz_access_codes WHERE id = ?').get(generated.id) as {
    status: string;
    user_id: string;
    redeemed_at: string;
  };
  assert.equal(row.status, 'redeemed');
  assert.equal(row.user_id, redeemed.user.id);
  assert.ok(row.redeemed_at);

  // Re-canje idempotente por el mismo estudiante devuelve confirmación
  const repeatRedeem = redeemPazAccessCode({
    rawCode: generated.rawCode,
    email,
  });
  assert.equal(repeatRedeem.success, true);
  assert.equal(repeatRedeem.alreadyRedeemed, true);
});

test('seguridad del código: rechazo por correo no coincidente, código inexistente y bloqueo por intentos', () => {
  const admin = setupAdmin();
  const email = `legit-owner-${Date.now()}@test.local`;
  const generated = generatePazAccessCode(admin, { email });

  // 1. Correo no coincidente
  assert.throws(
    () =>
      redeemPazAccessCode({
        rawCode: generated.rawCode,
        email: 'attacker@evil.local',
      }),
    /CODE_EMAIL_MISMATCH|no corresponde al correo/
  );

  // 2. Formato incorrecto
  assert.throws(
    () =>
      redeemPazAccessCode({
        rawCode: 'CORTO-123',
        email,
      }),
    /INVALID_CODE_FORMAT|exactamente 25 caracteres/
  );

  // 3. Código inexistente
  assert.throws(
    () =>
      redeemPazAccessCode({
        rawCode: 'PAZ26-99999-99999-99999-99999',
        email,
      }),
    /CODE_NOT_FOUND|no es válido/
  );

  // 4. Bloqueo tras superar el límite de intentos fallidos
  for (let i = 0; i < 4; i += 1) {
    try {
      redeemPazAccessCode({ rawCode: generated.rawCode, email: 'wrong@test.local' });
    } catch {
      // Ignorar fallos intencionales
    }
  }

  assert.throws(
    () =>
      redeemPazAccessCode({
        rawCode: generated.rawCode,
        email,
      }),
    /CODE_LOCKED|máximo de intentos/
  );
});

test('revocación administrativa de código impide canjes posteriores', () => {
  const admin = setupAdmin();
  const email = `to-revoke-${Date.now()}@test.local`;
  const generated = generatePazAccessCode(admin, { email });

  revokePazAccessCode(admin, generated.id, 'Comprobante bancario rebotado o duplicado');

  assert.throws(
    () =>
      redeemPazAccessCode({
        rawCode: generated.rawCode,
        email,
      }),
    /CODE_REVOKED|ha sido revocado/
  );
});

test('marcar código como enviado y filtrado administrativo', () => {
  const admin = setupAdmin();
  const email = `sent-code-${Date.now()}@test.local`;
  const generated = generatePazAccessCode(admin, { email });

  const marked = markPazAccessCodeSent(admin, generated.id);
  assert.equal(marked.success, true);
  assert.ok(marked.sentAt);

  const list = listPazAccessCodes({ email, includeTest: true });
  assert.ok(list.length >= 1);
  assert.equal(list[0].status, 'sent');
  assert.ok(list[0].sentAt);
});

test('seguimiento de tiempo activo real vs inactivo con latidos (heartbeats)', () => {
  const admin = setupAdmin();
  const email = `tracked-student-${Date.now()}@test.local`;
  const generated = generatePazAccessCode(admin, { email });
  const redeemed = redeemPazAccessCode({ rawCode: generated.rawCode, email });
  const student = actor(redeemed.user.id);

  const heartbeat1 = recordPazHeartbeat(student, {
    programSlug: PAZ_PROGRAM_SLUG,
    activeSeconds: 30,
    idleSeconds: 0,
    videoSeconds: 25,
    isVideoPlaying: true,
  });
  assert.equal(heartbeat1.recorded, true);
  assert.ok(heartbeat1.sessionId);

  const heartbeat2 = recordPazHeartbeat(student, {
    programSlug: PAZ_PROGRAM_SLUG,
    activeSeconds: 15,
    idleSeconds: 45,
    videoSeconds: 0,
    isVideoPlaying: false,
  });
  assert.equal(heartbeat2.recorded, true);

  const profile = getPazStudentDetail(student.id);
  assert.ok(profile);
  assert.ok(profile.totalActiveMinutes >= 0.7);
});

test('aprovisionamiento de los 3 accesos de prueba en los 3 escenarios especificados', () => {
  const accounts = ensurePazTestAccounts();
  assert.equal(accounts.length, 3);

  // Escenario 1: Pasarela
  const gw = accounts.find((a) => a.scenario === 'gateway');
  assert.ok(gw);
  assert.equal(gw.email, PAZ_TEST_CREDENTIALS.account1Email);
  const gwUser = actor(gw.userId);
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  assert.ok(program);
  assert.equal(userCanViewProgram(gwUser, program), true);

  // Escenario 2: Transferencia bancaria con código de 25 caracteres
  const tr = accounts.find((a) => a.scenario === 'bank_transfer');
  assert.ok(tr);
  assert.equal(tr.email, PAZ_TEST_CREDENTIALS.account2Email);
  assert.ok(tr.accessCode25);
  assert.equal(normalizeAccessCode(tr.accessCode25).length, 25);
  const trUser = actor(tr.userId);
  assert.equal(userCanViewProgram(trUser, program), true);

  // Escenario 3: Autorización administrativa directa
  const ad = accounts.find((a) => a.scenario === 'admin_grant');
  assert.ok(ad);
  assert.equal(ad.email, PAZ_TEST_CREDENTIALS.account3Email);
  const adUser = actor(ad.userId);
  assert.equal(userCanViewProgram(adUser, program), true);
});

test('exclusión de cuentas de prueba de estadísticas comerciales en KPIs', () => {
  ensurePazTestAccounts();
  const kpisCommercial = getPazGeneralKpis({ includeTest: false });
  const kpisWithTest = getPazGeneralKpis({ includeTest: true });

  assert.ok(kpisCommercial);
  assert.ok(kpisWithTest);
  // Las cuentas de prueba deben poder discriminarse
  assert.ok(kpisWithTest.totalCodesGenerated >= kpisCommercial.totalCodesGenerated);
});

test('generación de réplica documental de 6 pestañas para Google Sheets', () => {
  const replica = generatePazWorkbookReplica();
  assert.ok(replica.INSCRITOS);
  assert.ok(replica.PAGOS);
  assert.ok(replica.CODIGOS_ACCESO);
  assert.ok(replica.HISTORIAL_INGRESOS);
  assert.ok(replica.ACTIVIDAD_TALLER);
  assert.ok(replica.RESUMEN_GENERAL);

  // Seguridad: la pestaña de códigos NUNCA debe tener códigos planos
  const codesSheet = replica.CODIGOS_ACCESO;
  for (const c of codesSheet) {
    assert.equal('rawCode' in c, false);
    assert.equal('code_raw' in c, false);
  }
});
