import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import {
  createDiscount,
  loadProductForDiscount,
  validateDiscountForUser,
} from '../../src/server/domain/discounts';
import {
  changeGiftRedemptionStatus,
  createGiftCodes,
  expandGiftCodeScope,
  listGiftCodes,
  pauseGiftCode,
  redeemGiftCode,
  revokeGiftCode,
} from '../../src/server/domain/gifts';
import {
  findResourceBySlug,
  listUserEntitlements,
  userCanAccessResource,
} from '../../src/server/domain/access';
import { createUser, actor, productId, resourceId } from './helpers';

let ownerId = '';
let userA = '';
let userB = '';
let userC = '';

before(() => {
  db();
  ownerId = createUser({ email: 'owner-codes@test.local', roles: ['platform_owner'] });
  userA = createUser({ email: 'gift-a@test.local', roles: ['customer'] });
  userB = createUser({ email: 'gift-b@test.local', roles: ['customer'] });
  userC = createUser({ email: 'gift-c@test.local', roles: ['customer'] });
});

after(() => resetDbForTests());

test('un descuento solo afecta productos elegibles y respeta el porcentaje', () => {
  const owner = actor(ownerId);
  const python = loadProductForDiscount(productId('curso-python-ia-jovenes'));
  const leadership = loadProductForDiscount(productId('taller-liderazgo-cristiano'));
  assert.ok(python && leadership);

  const created = createDiscount({
    actor: owner,
    name: '20% Python',
    kind: 'percentage',
    value: 20,
    resourceIds: [resourceId('taller-python-ia-jovenes')],
    maxUses: 5,
    maxUsesPerUser: 1,
    codeCount: 1,
  });
  assert.equal(created.codes.length, 1);

  const code = created.codes[0];
  const validated = validate(code, python);
  assert.equal(validated.discountCents, 200);
  assert.throws(() => validate(code, leadership), /no aplica/i);
});

function validate(code: string, product: NonNullable<ReturnType<typeof loadProductForDiscount>>) {
  return validateDiscountForUser({ code, userId: userA, products: [product] });
}

test('los límites de uso del descuento se aplican por código y por usuario', () => {
  const owner = actor(ownerId);
  const python = loadProductForDiscount(productId('curso-python-ia-jovenes'));
  assert.ok(python);
  const created = createDiscount({
    actor: owner,
    name: 'Fijo 5',
    kind: 'fixed',
    value: 500,
    resourceIds: [resourceId('taller-python-ia-jovenes')],
    maxUses: 1,
    maxUsesPerUser: 1,
    codeCount: 1,
  });
  const code = created.codes[0];
  const validation = validate(code, python);
  assert.equal(validation.discountCents, 500);

  prepare(`
    INSERT INTO orders (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency,
      discount_id, discount_code_id, created_at, updated_at, paid_at)
    VALUES ('ord_code_limit', ?, 'paid', 1000, 500, 500, 'USD', ?, ?, ?, ?, ?)
  `).run(
    userA,
    validation.discountId,
    validation.codeId,
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
  prepare(`
    INSERT INTO discount_redemptions (id, discount_code_id, user_id, order_id, amount_cents, status, created_at)
    VALUES ('dr_code_limit', ?, ?, 'ord_code_limit', 500, 'consumed', ?)
  `).run(validation.codeId, userA, new Date().toISOString());

  assert.throws(
    () => validateDiscountForUser({ code, userId: userA, products: [python] }),
    /agotó|máximo/i
  );
});

test('un descuento total produce acceso gratuito con origen promo_full', async () => {
  const owner = actor(ownerId);
  const created = createDiscount({
    actor: owner,
    name: 'Acceso total',
    kind: 'full',
    value: 0,
    resourceIds: [resourceId('taller-mayordomia-financiera')],
    maxUses: 1,
    maxUsesPerUser: 1,
    codeCount: 1,
  });
  const { createCheckout } = await import('../../src/server/domain/checkout');
  const result = await createCheckout({
    user: actor(userB),
    productIds: [productId('taller-mayordomia-financiera')],
    discountCode: created.codes[0],
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(result.status, 'free');
  const rights = listUserEntitlements(userB);
  assert.ok(rights.some((right) => right.origin === 'promo_full'));
  assert.equal(
    userCanAccessResource(actor(userB), findResourceBySlug('taller-mayordomia-financiera')!),
    true
  );
});

test('los códigos de regalo conceden solo sus recursos y son idempotentes', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Regalo dos recursos',
    resourceIds: [
      resourceId('taller-python-ia-jovenes'),
      resourceId('taller-liderazgo-cristiano'),
    ],
    count: 1,
    maxRedemptions: 1,
    durationDays: 30,
  });
  const code = created[0].code;
  const result = redeemGiftCode({
    code,
    userId: userA,
    userEmail: 'gift-a@test.local',
    emailVerified: true,
  });
  assert.equal(result.resources.length, 2);
  const again = redeemGiftCode({
    code,
    userId: userA,
    userEmail: 'gift-a@test.local',
    emailVerified: true,
  });
  assert.equal(again.alreadyRedeemed, true);

  assert.throws(
    () =>
      redeemGiftCode({
        code,
        userId: userB,
        userEmail: 'gift-b@test.local',
        emailVerified: true,
      }),
    /agotó/i
  );

  const rights = listUserEntitlements(userA);
  const giftRights = rights.filter((right) => right.origin === 'gift');
  assert.ok(giftRights.length >= 2);
  assert.equal(
    userCanAccessResource(actor(userA), findResourceBySlug('taller-python-ia-jovenes')!),
    true
  );
});

test('un regalo nominativo exige correo verificado y coincidente', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Regalo nominativo',
    resourceIds: [resourceId('taller-musica-adoracion')],
    count: 1,
    recipientEmail: 'gift-b@test.local',
    durationMonths: 1,
  });
  assert.throws(
    () =>
      redeemGiftCode({
        code: created[0].code,
        userId: userC,
        userEmail: 'gift-c@test.local',
        emailVerified: true,
      }),
    /reservado/i
  );
  assert.throws(
    () =>
      redeemGiftCode({
        code: created[0].code,
        userId: userB,
        userEmail: 'gift-b@test.local',
        emailVerified: false,
      }),
    /verificado/i
  );
  const ok = redeemGiftCode({
    code: created[0].code,
    userId: userB,
    userEmail: 'gift-b@test.local',
    emailVerified: true,
  });
  assert.equal(ok.resources[0].slug, 'taller-musica-adoracion');
});

test('pausar o revocar el código no permite nuevos canjes', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Pausable',
    resourceIds: [resourceId('taller-escuela-padres-homeschoolers')],
    count: 1,
    maxRedemptions: 5,
    durationDays: 10,
  });
  const gift = listGiftCodes().find((item) => item.id === created[0].id);
  assert.ok(gift);
  pauseGiftCode(gift.id, true);
  assert.throws(
    () =>
      redeemGiftCode({
        code: created[0].code,
        userId: userC,
        userEmail: 'gift-c@test.local',
        emailVerified: true,
      }),
    /pausado/i
  );
  pauseGiftCode(gift.id, false);
  revokeGiftCode(gift.id, owner, 'Prueba');
  assert.throws(
    () =>
      redeemGiftCode({
        code: created[0].code,
        userId: userC,
        userEmail: 'gift-c@test.local',
        emailVerified: true,
      }),
    /revocado/i
  );
});

test('un regalo vencido no se puede canjear', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Vencido',
    resourceIds: [resourceId('material-guia-bienvenida-homeschool')],
    count: 1,
    redeemBy: new Date(Date.now() - 60_000).toISOString(),
    durationDays: 5,
  });
  assert.throws(
    () =>
      redeemGiftCode({
        code: created[0].code,
        userId: userC,
        userEmail: 'gift-c@test.local',
        emailVerified: true,
      }),
    /expirado/i
  );
});

test('ampliar el alcance puede ser solo futuro o incluir beneficiarios existentes', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Ampliable',
    resourceIds: [resourceId('taller-python-ia-jovenes')],
    count: 1,
    maxRedemptions: 5,
    durationDays: 20,
  });
  const giftId = created[0].id;
  const redemption = redeemGiftCode({
    code: created[0].code,
    userId: userC,
    userEmail: 'gift-c@test.local',
    emailVerified: true,
  });

  const future = expandGiftCodeScope({
    giftCodeId: giftId,
    resourceIds: [resourceId('taller-liderazgo-cristiano')],
    applyToExisting: false,
    actor: owner,
  });
  assert.equal(future.futureOnly, true);
  assert.equal(
    listUserEntitlements(userC).some(
      (right) =>
        right.resourceSlug === 'taller-liderazgo-cristiano' &&
        right.originRef === redemption.redemptionId
    ),
    false
  );

  const retroactive = expandGiftCodeScope({
    giftCodeId: giftId,
    resourceIds: [resourceId('taller-musica-adoracion')],
    applyToExisting: true,
    actor: owner,
  });
  assert.equal(retroactive.affectedBeneficiaries, 1);
  assert.equal(
    listUserEntitlements(userC).some(
      (right) =>
        right.resourceSlug === 'taller-musica-adoracion' &&
        right.originRef === redemption.redemptionId
    ),
    true
  );
});

test('pausar derechos de un beneficiario no afecta el código para otros', () => {
  const owner = actor(ownerId);
  const created = createGiftCodes({
    actor: owner,
    label: 'Derechos pausables',
    resourceIds: [resourceId('material-guia-bienvenida-homeschool')],
    count: 1,
    maxRedemptions: 5,
    durationDays: 15,
  });
  const redemption = redeemGiftCode({
    code: created[0].code,
    userId: userA,
    userEmail: 'gift-a@test.local',
    emailVerified: true,
  });
  changeGiftRedemptionStatus(redemption.redemptionId, 'pause', owner, 'Prueba');
  const rights = listUserEntitlements(userA).filter(
    (right) => right.originRef === redemption.redemptionId
  );
  assert.ok(rights.every((right) => right.effectiveStatus === 'paused'));
  changeGiftRedemptionStatus(redemption.redemptionId, 'resume', owner);
  assert.ok(
    listUserEntitlements(userA)
      .filter((right) => right.originRef === redemption.redemptionId)
      .every((right) => right.effectiveStatus === 'active')
  );
  changeGiftRedemptionStatus(redemption.redemptionId, 'revoke', owner, 'Prueba');
  assert.ok(
    listUserEntitlements(userA)
      .filter((right) => right.originRef === redemption.redemptionId)
      .every((right) => right.effectiveStatus === 'revoked')
  );
});
