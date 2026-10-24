import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import { createUser, actor, productId, tableCount } from './helpers';
import { createCheckout } from '../../src/server/domain/checkout';
import { createDiscount } from '../../src/server/domain/discounts';
import {
  completeRegistration,
  getRegistrationView,
  listCheckoutRegistrations,
  registrationUrlForOrder,
} from '../../src/server/domain/checkoutRegistration';
import { authenticateWithPassword } from '../../src/server/domain/users';
import { listUserEntitlements } from '../../src/server/domain/access';
import { GUEST_CHECKOUT_USER_ID } from '../../src/server/domain/guestCheckout';

let ownerId = '';
let sequence = 0;

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get('token');
  assert.ok(token);
  return token;
}

function createFreeCode(_productSlug: string): string {
  const discount = createDiscount({
    actor: actor(ownerId),
    name: `Cobertura total ${(sequence += 1)}`,
    kind: 'full',
    value: 0,
    resourceIds: [],
    appliesAll: true,
    codeCount: 1,
  });
  return discount.codes[0];
}

async function createFreeGuestOrder(productSlug: string, buyerEmail: string) {
  const code = createFreeCode(productSlug);
  return createCheckout({
    buyerEmail,
    productIds: [productId(productSlug)],
    discountCode: code,
    idempotencyKey: `guest-test-${sequence}-${Date.now()}`,
    appUrl: 'http://127.0.0.1:3100',
  });
}

function adultSubmission(email: string) {
  return {
    buyerFirstName: 'Ana',
    buyerLastName: 'Paredes',
    documentType: 'cedula',
    documentNumber: '1712345678',
    country: 'Ecuador',
    phone: '+593 99 111 2222',
    password: 'ClaveSegura2026!',
    passwordConfirm: 'ClaveSegura2026!',
    acceptTerms: true,
    acceptPrivacy: true,
    marketingOptIn: false,
  };
}

function minorSubmission() {
  return {
    buyerFirstName: 'María',
    buyerLastName: 'Paredes',
    documentType: 'cedula',
    documentNumber: '1712345678',
    country: 'Ecuador',
    phone: '+593 99 111 2222',
    studentFirstName: 'Diego',
    studentLastName: 'Paredes',
    studentBirthDate: '2015-05-10',
    studentGrade: '8.º EGB',
    studentAcademicNotes: 'Continuidad desde educación en casa.',
    guardianFirstName: 'María',
    guardianLastName: 'Paredes',
    guardianEmail: 'guardian-qa@test.local',
    guardianPhone: '+593 99 333 4444',
    guardianRelationship: 'madre',
    guardianAuthorization: true,
    password: 'ClaveSegura2026!',
    passwordConfirm: 'ClaveSegura2026!',
    acceptTerms: true,
    acceptPrivacy: true,
    marketingOptIn: true,
  };
}

before(() => {
  db();
  ownerId = createUser({
    email: `guest-registration-owner-${Date.now()}@test.local`,
    roles: ['platform_owner'],
  });
});

after(() => {
  resetDbForTests();
});

test('una orden gratuita de invitado no concede acceso antes del registro', async () => {
  const email = `guest-free-${Date.now()}@test.local`;
  const order = await createFreeGuestOrder('curso-python-ia-jovenes', email);
  assert.equal(order.checkoutMode, 'guest');
  assert.equal(order.registrationRequired, true);
  assert.equal(order.freeAccessGranted, false);
  const row = prepare('SELECT user_id, registration_status FROM orders WHERE id = ?').get(
    order.orderId
  ) as { user_id: string; registration_status: string };
  assert.equal(row.user_id, GUEST_CHECKOUT_USER_ID);
  assert.equal(row.registration_status, 'pending');
  assert.equal(
    tableCount('entitlements', 'user_id = ?', GUEST_CHECKOUT_USER_ID),
    0
  );
  const url = registrationUrlForOrder(order.orderId);
  const view = getRegistrationView(tokenFromUrl(url));
  assert.equal(view.status, 'pending');
  assert.equal(view.buyerEmail, email);
  assert.equal(view.requiresGuardian, false);
});

test('el registro crea cuenta, perfil, matrícula y ficha CRM sin duplicar al reintentar', async () => {
  const email = `guest-adult-${Date.now()}@test.local`;
  const order = await createFreeGuestOrder('curso-python-ia-jovenes', email);
  const token = tokenFromUrl(registrationUrlForOrder(order.orderId));
  const result = await completeRegistration({
    token,
    submission: adultSubmission(email),
  });
  assert.equal(result.isNewUser, true);
  const user = prepare('SELECT * FROM users WHERE email = ?').get(email) as {
    id: string;
    role: string;
    email_verified: number;
    display_name: string;
  };
  assert.equal(user.email_verified, 0);
  assert.equal(user.display_name, 'Ana Paredes');
  const roles = prepare(
    'SELECT role_code FROM user_roles WHERE user_id = ? AND revoked_at IS NULL'
  ).all(result.userId) as Array<{ role_code: string }>;
  assert.ok(roles.some((role) => role.role_code === 'student'));
  const profile = prepare('SELECT full_name, phone, country FROM student_profiles WHERE user_id = ?').get(
    result.userId
  ) as { full_name: string; phone: string; country: string };
  assert.equal(profile.full_name, 'Ana Paredes');
  assert.equal(profile.country, 'Ecuador');
  const orderRow = prepare(
    'SELECT user_id, registered_user_id, registration_status FROM orders WHERE id = ?'
  ).get(order.orderId) as {
    user_id: string;
    registered_user_id: string;
    registration_status: string;
  };
  assert.equal(orderRow.user_id, result.userId);
  assert.equal(orderRow.registered_user_id, result.userId);
  assert.equal(orderRow.registration_status, 'completed');
  const entitlements = listUserEntitlements(result.userId);
  assert.ok(entitlements.length > 0);
  const bought = prepare(
    'SELECT resource_id FROM product_resources WHERE product_id = ? LIMIT 1'
  ).get(productId('curso-python-ia-jovenes')) as { resource_id: string };
  assert.ok(entitlements.some((right) => right.resourceId === bought.resource_id));
  const notBought = prepare(
    'SELECT resource_id FROM product_resources WHERE product_id = ? LIMIT 1'
  ).get(productId('taller-liderazgo-cristiano')) as { resource_id: string };
  assert.equal(
    entitlements.some((right) => right.resourceId === notBought.resource_id),
    false
  );
  const contact = prepare('SELECT status, consent_email FROM crm_contacts WHERE email = ?').get(
    email
  ) as { status: string; consent_email: number };
  assert.equal(contact.status, 'customer');
  assert.equal(contact.consent_email, 0);

  const login = await authenticateWithPassword(email, 'ClaveSegura2026!');
  assert.equal(login.userId, result.userId);

  const entitlementsBefore = tableCount('entitlements', 'user_id = ?', result.userId);
  const usersBefore = tableCount('users');
  const again = await completeRegistration({ token, submission: adultSubmission(email) });
  assert.equal(again.userId, result.userId);
  assert.equal(tableCount('entitlements', 'user_id = ?', result.userId), entitlementsBefore);
  assert.equal(tableCount('users'), usersBefore);

  const view = getRegistrationView(token);
  assert.equal(view.status, 'completed');
  const registered = listCheckoutRegistrations({ q: email });
  assert.equal(registered.length, 1);
  assert.equal(registered[0]?.registrationStatus, 'completed');
  assert.equal(registered[0]?.activeAccess, true);
  assert.equal(registered[0]?.emailVerified, false);
});

test('el programa para menores exige autorización y crea el expediente del estudiante', async () => {
  const email = `guest-minor-${Date.now()}@test.local`;
  const order = await createFreeGuestOrder('programa-homeschool-8-egb', email);
  const token = tokenFromUrl(registrationUrlForOrder(order.orderId));
  const view = getRegistrationView(token);
  assert.equal(view.requiresGuardian, true);
  assert.equal(view.productKind, 'program');

  await assert.rejects(
    () =>
      completeRegistration({
        token,
        submission: { ...minorSubmission(), guardianAuthorization: false },
      }),
    /representante legal/i
  );
  const result = await completeRegistration({
    token,
    submission: minorSubmission(),
  });
  const user = prepare('SELECT is_minor, status FROM users WHERE id = ?').get(result.userId) as {
    is_minor: number;
    status: string;
  };
  assert.equal(user.is_minor, 0);
  assert.equal(user.status, 'active');
  const roles = prepare(
    'SELECT role_code FROM user_roles WHERE user_id = ? AND revoked_at IS NULL'
  ).all(result.userId) as Array<{ role_code: string }>;
  assert.ok(roles.some((role) => role.role_code === 'guardian'));
  const profile = prepare(`
    SELECT full_name, birth_date, guardian_first_name, guardian_relationship
    FROM student_profiles WHERE user_id = ?
  `).get(result.userId) as {
    full_name: string;
    birth_date: string;
    guardian_first_name: string;
    guardian_relationship: string;
  };
  assert.equal(profile.full_name, 'Diego Paredes');
  assert.equal(profile.birth_date, '2015-05-10');
  assert.equal(profile.guardian_first_name, 'María');
  assert.equal(profile.guardian_relationship, 'madre');
  assert.equal(
    tableCount('guardian_students', 'guardian_user_id = ?', result.userId),
    1
  );
  assert.ok(
    listUserEntitlements(result.userId).some((right) => right.effectiveStatus === 'active')
  );
  assert.equal(listCheckoutRegistrations({ q: email }).length, 0);
  const withMinors = listCheckoutRegistrations({ q: email, includeMinors: true });
  assert.equal(withMinors.length, 1);
  assert.equal(withMinors[0]?.studentName, 'Diego Paredes');
  assert.equal(withMinors[0]?.guardianRelationship, 'madre');
});

test('un correo existente exige sesión y se vincula sin duplicar la cuenta', async () => {
  const email = `guest-existing-${Date.now()}@test.local`;
  const existingId = createUser({ email, name: 'Cuenta Existente' });
  const order = await createFreeGuestOrder('curso-python-ia-jovenes', email);
  const token = tokenFromUrl(registrationUrlForOrder(order.orderId));
  const usersBefore = tableCount('users');

  await assert.rejects(
    () =>
      completeRegistration({
        token,
        submission: adultSubmission(email),
      }),
    /ya tiene una cuenta/i
  );
  assert.equal(tableCount('users'), usersBefore);

  const linked = await completeRegistration({
    token,
    sessionUser: actor(existingId),
    submission: adultSubmission(email),
  });
  assert.equal(linked.userId, existingId);
  assert.equal(linked.isNewUser, false);
  assert.equal(tableCount('users'), usersBefore);
  assert.equal(
    (
      prepare('SELECT user_id FROM orders WHERE id = ?').get(order.orderId) as {
        user_id: string;
      }
    ).user_id,
    existingId
  );
  assert.ok(listUserEntitlements(existingId).length > 0);
});

test('rechaza tokens manipulados, órdenes no pagadas y otro usuario', async () => {
  const now = new Date().toISOString();
  const pendingId = `ord_pending_${Date.now()}`;
  const pendingProduct = productId('curso-python-ia-jovenes');
  prepare(`
    INSERT INTO orders
      (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency,
       metadata_json, created_at, updated_at, buyer_email, checkout_mode, registration_status)
    VALUES (?, 'usr_guest_checkout', 'pending', 1000, 0, 1000, 'USD', '{}', ?, ?, ?,
            'guest', 'pending')
  `).run(
    pendingId,
    now,
    now,
    `guest-pending-${Date.now()}@test.local`
  );
  prepare(`
    INSERT INTO order_items
      (id, order_id, product_id, title_snapshot, unit_price_cents, quantity)
    VALUES (?, ?, ?, 'Curso pendiente', 1000, 1)
  `).run(`oit_${pendingId}`, pendingId, pendingProduct);
  assert.throws(() => registrationUrlForOrder(pendingId), /pago|confirmado|pagada/i);

  const email = `guest-token-${Date.now()}@test.local`;
  const order = await createFreeGuestOrder('curso-python-ia-jovenes', email);
  const token = tokenFromUrl(registrationUrlForOrder(order.orderId));
  const tampered = `${token.slice(0, -2)}xx`;
  assert.throws(() => getRegistrationView(tampered), /enlace de registro no es válido/i);

  const otherId = createUser({ email: `other-${Date.now()}@test.local` });
  await assert.rejects(
    () =>
      completeRegistration({
        token,
        sessionUser: actor(otherId),
        submission: adultSubmission(email),
      }),
    /no coincide/i
  );
});

test('el CRM filtra registros y distingue pago, registro y correo', async () => {
  const email = `guest-crm-${Date.now()}@test.local`;
  const order = await createFreeGuestOrder('curso-python-ia-jovenes', email);
  const pendingToken = tokenFromUrl(registrationUrlForOrder(order.orderId));
  assert.ok(getRegistrationView(pendingToken));

  const pendingRows = listCheckoutRegistrations({ q: email, status: 'pending' });
  assert.equal(pendingRows.length, 1);
  assert.equal(pendingRows[0]?.registrationStatus, 'pending');
  assert.equal(pendingRows[0]?.paymentStatus, 'free');

  await completeRegistration({
    token: pendingToken,
    submission: adultSubmission(email),
  });
  const completed = listCheckoutRegistrations({ q: email });
  assert.equal(completed.length, 1);
  assert.equal(completed[0]?.registrationStatus, 'completed');
  assert.equal(completed[0]?.emailVerified, false);
  assert.equal(completed[0]?.guardianName, null);
  assert.ok(completed[0]?.documentNumberMasked?.startsWith('••••'));

  const noResults = listCheckoutRegistrations({ q: 'correo-que-no-existe@test.local' });
  assert.equal(noResults.length, 0);
});
