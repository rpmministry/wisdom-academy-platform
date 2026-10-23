import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare, nowIso } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import {
  addMonthsClamped,
  changeEntitlementStatus,
  changeGlobalAccessStatus,
  effectiveStatus,
  findResourceBySlug,
  grantEntitlement,
  grantGlobalAccess,
  listUserEntitlements,
  userCanAccessResource,
} from '../../src/server/domain/access';
import { loadAuthUser } from '../../src/server/auth/authorization';
import { createUser, actor, resourceId } from './helpers';

const resource = () => {
  const found = findResourceBySlug('programa-homeschool-8-egb');
  assert.ok(found);
  return found;
};

let learner = '';
let founder = '';
let owner = '';

before(() => {
  db();
  learner = createUser({ email: 'learner-access@test.local', roles: ['customer'] });
  founder = createUser({ email: 'founder-access@test.local', roles: ['founder'] });
  owner = createUser({ email: 'owner-access@test.local', roles: ['platform_owner'] });
});

after(() => resetDbForTests());

test('un usuario sin derechos no accede al recurso', () => {
  const user = actor(learner);
  assert.equal(userCanAccessResource(user, resource()), false);
});

test('concede, pausa, reactiva, extiende y revoca un derecho', () => {
  const user = actor(learner);
  const granted = grantEntitlement({
    userId: learner,
    resourceId: resourceId('programa-homeschool-8-egb'),
    origin: 'manual_owner',
    originRef: 'test:manual-1',
    grantedBy: owner,
  });
  assert.equal(granted.created, true);
  assert.equal(userCanAccessResource(actor(learner), resource()), true);

  changeEntitlementStatus(granted.id, 'pause', owner);
  assert.equal(userCanAccessResource(actor(learner), resource()), false);
  changeEntitlementStatus(granted.id, 'resume', owner);
  assert.equal(userCanAccessResource(actor(learner), resource()), true);
  changeEntitlementStatus(granted.id, 'revoke', owner, 'Prueba');
  assert.equal(userCanAccessResource(actor(learner), resource()), false);
  void user;
});

test('un derecho vencido no concede acceso', () => {
  const past = new Date(Date.now() - 86_400_000).toISOString();
  grantEntitlement({
    userId: learner,
    resourceId: resourceId('programa-homeschool-4-egb'),
    origin: 'scholarship',
    originRef: 'test:expired',
    startsAt: new Date(Date.now() - 172_800_000).toISOString(),
    endsAt: past,
  });
  const four = findResourceBySlug('programa-homeschool-4-egb');
  assert.ok(four);
  assert.equal(userCanAccessResource(actor(learner), four), false);
});

test('una revocación de un origen no retira otro derecho vigente', () => {
  const gift = grantEntitlement({
    userId: learner,
    resourceId: resourceId('taller-liderazgo-cristiano'),
    origin: 'gift',
    originRef: 'test:gift-independent',
  });
  const manual = grantEntitlement({
    userId: learner,
    resourceId: resourceId('taller-liderazgo-cristiano'),
    origin: 'manual_owner',
    originRef: 'test:manual-independent',
  });
  const leadership = findResourceBySlug('taller-liderazgo-cristiano');
  assert.ok(leadership);
  assert.equal(userCanAccessResource(actor(learner), leadership), true);

  changeEntitlementStatus(manual.id, 'revoke', owner, 'Solo compra');
  assert.equal(userCanAccessResource(actor(learner), leadership), true);
  changeEntitlementStatus(gift.id, 'revoke', owner, 'Solo regalo');
  assert.equal(userCanAccessResource(actor(learner), leadership), false);
});

test('fundador no obtiene administración y su acceso global es revocable', () => {
  const beforeGrant = actor(founder);
  assert.equal(beforeGrant.permissions.has('admin.access'), false);
  assert.equal(userCanAccessResource(beforeGrant, resource()), false);

  const grant = grantGlobalAccess({
    userId: founder,
    kind: 'founder',
    origin: 'test_invitation',
    originRef: 'founder-test',
    grantedBy: owner,
  });
  const withGrant = actor(founder);
  assert.equal(withGrant.hasGlobalContentAccess, true);
  assert.equal(userCanAccessResource(withGrant, resource()), true);
  assert.equal(withGrant.permissions.has('admin.access'), false);

  changeGlobalAccessStatus(grant.id, 'revoke', owner, 'Prueba');
  assert.equal(userCanAccessResource(actor(founder), resource()), false);
});

test('el creador conserva acceso global aunque no exista un derecho', () => {
  const ownerUser = actor(owner);
  assert.equal(ownerUser.isOwner, true);
  assert.equal(userCanAccessResource(ownerUser, resource()), true);
});

test('la suma de meses respeta el último día del mes', () => {
  assert.equal(
    new Date(addMonthsClamped('2026-01-31T12:00:00.000Z', 1)).toISOString(),
    '2026-02-28T12:00:00.000Z'
  );
  assert.equal(
    new Date(addMonthsClamped('2028-01-31T00:00:00.000Z', 1)).toISOString(),
    '2028-02-29T00:00:00.000Z'
  );
});

test('los estados efectivos reflejan fechas y revocación', () => {
  const now = nowIso();
  assert.equal(effectiveStatus('active', now, null), 'active');
  assert.equal(effectiveStatus('active', addMonthsClamped(now, 1), null), 'pending');
  assert.equal(effectiveStatus('active', now, addMonthsClamped(now, -1)), 'expired');
  assert.equal(effectiveStatus('paused', now, null), 'paused');
  assert.equal(effectiveStatus('revoked', now, null), 'revoked');
});

test('los derechos listados conservan su origen', () => {
  const rights = listUserEntitlements(learner);
  assert.ok(rights.some((right) => right.origin === 'manual_owner'));
  assert.ok(rights.some((right) => right.origin === 'scholarship'));
  assert.ok(
    prepare('SELECT 1 AS present FROM users WHERE id = ?').get(learner),
    'el usuario de prueba debe existir'
  );
});
