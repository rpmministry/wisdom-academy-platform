import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  updateInvitationStatus,
} from '../../src/server/domain/invitations';
import {
  changeGlobalAccessStatus,
  findResourceBySlug,
  listUserGlobalGrants,
  userCanAccessResource,
} from '../../src/server/domain/access';
import { loadAuthUser } from '../../src/server/auth/authorization';
import { createUser, actor } from './helpers';

let ownerId = '';
let invitedId = '';
let otherId = '';
let openAId = '';
let openBId = '';
let openCId = '';

before(() => {
  db();
  ownerId = createUser({ email: 'owner-invites@test.local', roles: ['platform_owner'] });
  invitedId = createUser({ email: 'invited@test.local', roles: ['customer'] });
  otherId = createUser({ email: 'other@test.local', roles: ['customer'] });
  openAId = createUser({ email: 'open-a@test.local', roles: ['customer'] });
  openBId = createUser({ email: 'open-b@test.local', roles: ['customer'] });
  openCId = createUser({ email: 'open-c@test.local', roles: ['customer'] });
});

after(() => resetDbForTests());

test('una invitación nominativa solo la acepta el correo verificado', () => {
  const owner = actor(ownerId);
  const created = createInvitation({
    actor: owner,
    kind: 'founder',
    mode: 'nominated',
    email: 'invited@test.local',
    accessMonths: 12,
  });
  assert.throws(
    () => acceptInvitation({ token: created.token, user: actor(otherId) }),
    /otro correo/i
  );

  const accepted = acceptInvitation({ token: created.token, user: actor(invitedId) });
  assert.equal(accepted.alreadyAccepted, false);
  const user = loadAuthUser(invitedId);
  assert.ok(user);
  assert.equal(user.roles.includes('founder'), true);
  assert.equal(user.hasGlobalContentAccess, true);
  const resource = findResourceBySlug('programa-homeschool-8-egb');
  assert.ok(resource);
  assert.equal(userCanAccessResource(user, resource), true);

  const again = acceptInvitation({ token: created.token, user: actor(invitedId) });
  assert.equal(again.alreadyAccepted, true);
});

test('revocar el acceso global retira el contenido pero no crea administración', () => {
  const user = loadAuthUser(invitedId);
  assert.ok(user);
  const grant = listUserGlobalGrants(invitedId)[0];
  assert.ok(grant);
  assert.equal(user.permissions.has('admin.access'), false);
  changeGlobalAccessStatus(grant.id, 'revoke', ownerId, 'Prueba');
  const updated = loadAuthUser(invitedId);
  assert.ok(updated);
  const resource = findResourceBySlug('programa-homeschool-8-egb');
  assert.ok(resource);
  assert.equal(userCanAccessResource(updated, resource), false); // El rol de fundador no concede acceso sin grant.
  const activeGrant = listUserGlobalGrants(invitedId).find(
    (item) => item.effectiveStatus === 'active'
  );
  assert.equal(activeGrant, undefined);
});

test('una invitación abierta respeta el máximo de usos', () => {
  const owner = actor(ownerId);
  const created = createInvitation({
    actor: owner,
    kind: 'investor',
    mode: 'open',
    maxUses: 2,
    accessDays: 30,
  });
  const first = acceptInvitation({ token: created.token, user: actor(openAId) });
  assert.equal(first.kind, 'investor');
  const second = acceptInvitation({ token: created.token, user: actor(openBId) });
  assert.equal(second.alreadyAccepted, false);
  assert.throws(
    () => acceptInvitation({ token: created.token, user: actor(openCId) }),
    /agotó/i
  );
  const status = prepare('SELECT status FROM invitations WHERE id = ?').get(created.id) as {
    status: string;
  };
  assert.equal(status.status, 'exhausted');
});

test('pausar o revocar una invitación impide nuevos canjes', () => {
  const owner = actor(ownerId);
  const paused = createInvitation({
    actor: owner,
    kind: 'founder',
    mode: 'open',
    maxUses: 5,
    accessMonths: 1,
  });
  updateInvitationStatus(paused.id, 'pause');
  assert.throws(
    () => acceptInvitation({ token: paused.token, user: actor(openCId) }),
    /pausada/i
  );
  updateInvitationStatus(paused.id, 'resume');
  const accepted = acceptInvitation({ token: paused.token, user: actor(openCId) });
  assert.equal(accepted.alreadyAccepted, false);

  const revoked = createInvitation({
    actor: owner,
    kind: 'investor',
    mode: 'open',
    maxUses: 5,
    accessMonths: 1,
  });
  updateInvitationStatus(revoked.id, 'revoke');
  assert.throws(
    () => acceptInvitation({ token: revoked.token, user: actor(openCId) }),
    /revocada/i
  );
});

test('la lista de invitaciones expone solo pistas y beneficiarios', () => {
  const list = listInvitations();
  assert.ok(list.length >= 3);
  for (const invitation of list) {
    assert.equal(typeof invitation.hint, 'string');
    assert.ok(!('token' in invitation));
    assert.ok(Array.isArray(invitation.beneficiaries));
  }
});
