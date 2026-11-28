import test from 'node:test';
import assert from 'node:assert/strict';
import { pazPublicConfig } from '../../src/lib/paz-en-la-mesa/config';
import { pazBankDetails } from '../../src/lib/paz-en-la-mesa/server';
import { extractYouTubeVideoId } from '../../src/lib/courses/youtube';
import {
  attachPazPaymentReceipt,
  createPazPaymentIntent,
  listPazPaymentIntents,
  reviewPazPaymentIntent,
  updatePazPaymentAdminInfo,
} from '../../src/server/domain/paz';
import {
  generatePazAccessCode,
  redeemPazAccessCode,
  regeneratePazAccessCode,
} from '../../src/server/domain/pazAccessCodes';
import { getPazGeneralKpis } from '../../src/server/domain/pazAnalytics';
import { createProgram, getProgramRowBySlug } from '../../src/server/domain/coursePrograms';
import { createUser, actor } from '../platform/helpers';

let adminUser: ReturnType<typeof actor>;

test('clase 3 tiene configurado el video oficial de YouTube r0jVCPHmYZ0', () => {
  assert.ok(pazPublicConfig.classVideos.class3.includes('r0jVCPHmYZ0'));
  assert.equal(extractYouTubeVideoId(pazPublicConfig.classVideos.class3), 'r0jVCPHmYZ0');
});

test('datos bancarios oficiales de Fundación Casa Main están completos', () => {
  const bank = pazBankDetails();
  assert.equal(bank.bankName, 'Banco Pichincha');
  assert.equal(bank.accountType, 'Cuenta corriente');
  assert.equal(bank.accountNumber, '2100264280');
  assert.equal(bank.accountHolder, 'Fundación Casa Main');
  assert.equal(bank.ruc, '1793193764001');
  assert.equal(bank.email, 'fundacioncasamain@gmail.com');
  assert.equal(bank.configured, true);
});

test('flujo de transferencia: comprobante, rechazo, aprobación única, regeneración y KPIs', async () => {
  process.env.PAZ_FORCE_PHASE = 'presale';
  const adminId = await createUser({
    email: `admin-paz-crm-${Date.now()}@wisdomacademy.alsiztech.com`,
    name: 'Admin Paz CRM',
    roles: ['principal_admin'],
  });
  adminUser = actor(adminId);
  if (!getProgramRowBySlug('paz-en-la-mesa')) {
    createProgram(
      {
        slug: 'paz-en-la-mesa',
        title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
        kind: 'workshop',
        status: 'published',
      },
      adminUser
    );
  }
  const emailA = `transfer.ok.${Date.now()}@example.com`;
  const createdA = createPazPaymentIntent(null, {
    plan: 'presale',
    method: 'bank_transfer',
    buyerName: 'Ana Lucía Torres',
    buyerEmail: emailA,
    buyerPhone: '+593991112222',
    transferReference: 'REF-887766',
    consent: true,
  });

  const withReceipt = attachPazPaymentReceipt(createdA.intent.id, {
    filename: 'comprobante.png',
    mime: 'image/png',
    storagePath: `.data/paz-receipts/${createdA.intent.id}.png`,
  });
  assert.equal(withReceipt.hasReceipt, true);
  assert.equal(withReceipt.status, 'pending');

  const updatedInfo = updatePazPaymentAdminInfo(adminUser, createdA.intent.id, {
    adminNotes: 'Verificado en estado de cuenta Banco Pichincha',
  });
  assert.equal(updatedInfo.adminNotes, 'Verificado en estado de cuenta Banco Pichincha');

  // Aprobación y emisión de código único
  const code1 = generatePazAccessCode(adminUser, {
    email: emailA,
    intentId: createdA.intent.id,
  });
  assert.equal(code1.rawCode.startsWith('PAZ26-'), true);

  // Regeneración de código conservando historial (revoca el primero y emite otro)
  const code2 = regeneratePazAccessCode(adminUser, code1.id);
  assert.notEqual(code2.rawCode, code1.rawCode);

  // El código anterior ya no se puede canjear
  assert.throws(() =>
    redeemPazAccessCode({ rawCode: code1.rawCode, email: emailA })
  );

  // El nuevo código sí activa el acceso
  const redeemed = redeemPazAccessCode({ rawCode: code2.rawCode, email: emailA });
  assert.equal(redeemed.success, true);

  // Rechazo de otra transferencia con motivo
  const emailB = `transfer.rej.${Date.now()}@example.com`;
  const createdB = createPazPaymentIntent(null, {
    plan: 'official',
    method: 'bank_transfer',
    buyerName: 'Luis Fernando Gómez',
    buyerEmail: emailB,
    buyerPhone: '+593993334444',
    transferReference: 'REF-000',
    consent: true,
  });
  const rejected = reviewPazPaymentIntent(
    adminUser,
    createdB.intent.id,
    'reject',
    'Comprobante ilegible'
  );
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.reviewNote, 'Comprobante ilegible');

  // No se puede generar código para un pago rechazado
  assert.throws(() =>
    generatePazAccessCode(adminUser, {
      email: emailB,
      intentId: createdB.intent.id,
    })
  );

  const list = listPazPaymentIntents();
  assert.ok(list.some((item) => item.id === createdA.intent.id && item.hasActiveAccess));

  const kpis = getPazGeneralKpis();
  assert.ok(kpis.totalRegistrations >= 2);
  assert.ok(kpis.confirmedPayments >= 1);
  assert.ok(kpis.totalCodesGenerated >= 2);
});
