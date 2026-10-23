import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import {
  authenticateWithPassword,
  changeOwnPassword,
  createUserByAdmin,
  grantDirectPermission,
  grantRole,
  resetUserPasswordByAdmin,
  revokeRole,
  setUserStatus,
} from '../../src/server/domain/users';
import { createUser, actor } from './helpers';

let ownerId = '';
let principalId = '';
let delegatedId = '';
let plainId = '';

before(async () => {
  db();
  ownerId = createUser({ email: 'owner-users@test.local', roles: ['platform_owner'] });
  principalId = createUser({ email: 'principal-users@test.local', roles: ['principal_admin'] });
  delegatedId = createUser({ email: 'delegated-users@test.local', roles: ['delegated_admin'] });
  plainId = createUser({ email: 'plain-users@test.local', roles: ['customer'] });
  const owner = actor(ownerId);
  grantDirectPermission({
    actor: owner,
    userId: delegatedId,
    permissionCode: 'users.permissions.manage',
  });
  grantDirectPermission({
    actor: owner,
    userId: delegatedId,
    permissionCode: 'users.roles.manage',
  });
});

after(() => resetDbForTests());

test('solo el creador puede nombrar administradores principales', () => {
  const principal = actor(principalId);
  assert.throws(
    () => grantRole({ actor: principal, userId: plainId, roleCode: 'principal_admin' }),
    /creador/i
  );
  const owner = actor(ownerId);
  const result = grantRole({ actor: owner, userId: plainId, roleCode: 'principal_admin' });
  assert.equal(result.created, true);
  assert.throws(
    () => grantRole({ actor: owner, userId: delegatedId, roleCode: 'platform_owner' }),
    /no puede asignarse/i
  );
});

test('nadie puede escalar sus propios roles o permisos', () => {
  const principal = actor(principalId);
  assert.throws(
    () => grantRole({ actor: principal, userId: principalId, roleCode: 'founder' }),
    /propios roles/i
  );
  assert.throws(
    () => grantDirectPermission({ actor: principal, userId: principalId, permissionCode: 'audit.read' }),
    /ti mismo/i
  );
});

test('un delegado solo puede conceder permisos que ya posee', () => {
  const delegated = actor(delegatedId);
  assert.throws(
    () => grantDirectPermission({
      actor: delegated,
      userId: plainId,
      permissionCode: 'founder_codes.manage',
    }),
    /no posees/i
  );
  const owner = actor(ownerId);
  grantDirectPermission({
    actor: owner,
    userId: delegatedId,
    permissionCode: 'audit.read',
  });
  const updated = actor(delegatedId);
  const granted = grantDirectPermission({
    actor: updated,
    userId: plainId,
    permissionCode: 'audit.read',
  });
  assert.equal(granted.created, true);
});

test('el rol del creador no puede retirarse y la cuenta está protegida', async () => {
  const owner = actor(ownerId);
  const principal = actor(principalId);
  assert.throws(
    () => revokeRole({ actor: owner, userId: ownerId, roleCode: 'platform_owner' }),
    /no puede revocarse/i
  );
  await assert.rejects(
    () => resetUserPasswordByAdmin({ userId: ownerId, actor: principal }),
    /creador/i
  );
  assert.throws(
    () => setUserStatus({ actor: principal, userId: ownerId, status: 'suspended' }),
    /creador/i
  );
});

test('las contraseñas se almacenan con scrypt y permiten autenticar', async () => {
  const owner = actor(ownerId);
  const created = await createUserByAdmin({
    actor: owner,
    email: 'password-user@test.local',
    displayName: 'Usuario con Clave',
    password: 'ClaveSegura2026!',
  });
  assert.equal(created.initialPassword, undefined);
  const login = await authenticateWithPassword('password-user@test.local', 'ClaveSegura2026!');
  assert.equal(login.userId, created.userId);
  await assert.rejects(
    () => authenticateWithPassword('password-user@test.local', 'clave-incorrecta'),
    /incorrectos/i
  );
});

test('el cambio de contraseña exige la actual y revoca otras sesiones', async () => {
  const owner = actor(ownerId);
  const created = await createUserByAdmin({
    actor: owner,
    email: 'change-user@test.local',
    displayName: 'Usuario Cambio',
    password: 'ClaveInicial2026!',
  });
  await changeOwnPassword({
    userId: created.userId,
    currentPassword: 'ClaveInicial2026!',
    newPassword: 'ClaveNueva2026!',
  });
  const login = await authenticateWithPassword('change-user@test.local', 'ClaveNueva2026!');
  assert.equal(login.userId, created.userId);
  await assert.rejects(
    () =>
      changeOwnPassword({
        userId: created.userId,
        currentPassword: 'ClaveInicial2026!',
        newPassword: 'OtraClave2026!',
      }),
    /actual no es correcta/i
  );
});

test('suspender una cuenta impide el acceso', async () => {
  const owner = actor(ownerId);
  const created = await createUserByAdmin({
    actor: owner,
    email: 'suspend-user@test.local',
    displayName: 'Usuario Suspendido',
    password: 'ClaveSuspend2026!',
  });
  setUserStatus({ actor: owner, userId: created.userId, status: 'suspended' });
  await assert.rejects(
    () => authenticateWithPassword('suspend-user@test.local', 'ClaveSuspend2026!'),
    /suspendida/i
  );
  setUserStatus({ actor: owner, userId: created.userId, status: 'active' });
  const login = await authenticateWithPassword('suspend-user@test.local', 'ClaveSuspend2026!');
  assert.equal(login.userId, created.userId);
});
