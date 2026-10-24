import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import { createUser } from './helpers';
import { hashPassword } from '../../src/server/auth/passwords';
import {
  createEmailVerificationLink,
  createPasswordResetToken,
  resetPasswordWithToken,
  verifyEmailToken,
} from '../../src/server/domain/authTokens';
import { authenticateWithPassword } from '../../src/server/domain/users';

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get('token');
  assert.ok(token);
  return token;
}

before(() => {
  db();
});

after(() => {
  resetDbForTests();
});

test('la verificación de correo es de un solo uso y actualiza la cuenta', () => {
  const email = `verify-${Date.now()}@test.local`;
  const userId = createUser({ email, emailVerified: false });
  const link = createEmailVerificationLink({ userId, email, name: 'Cuenta QA' });
  const token = tokenFromUrl(link.verifyUrl);
  verifyEmailToken(token);
  const row = prepare('SELECT email_verified FROM users WHERE id = ?').get(userId) as {
    email_verified: number;
  };
  assert.equal(row.email_verified, 1);
  assert.throws(() => verifyEmailToken(token), /enlace no es válido/i);
});

test('el restablecimiento de contraseña cambia el hash y consume el token', async () => {
  const email = `reset-${Date.now()}@test.local`;
  const userId = createUser({ email });
  prepare('UPDATE users SET password_hash = ?, password_updated_at = ? WHERE id = ?').run(
    await hashPassword('OldPassword2026!'),
    new Date().toISOString(),
    userId
  );
  const reset = createPasswordResetToken(userId);
  const token = tokenFromUrl(reset.url);
  await resetPasswordWithToken(token, 'NewPassword2026!');
  const login = await authenticateWithPassword(email, 'NewPassword2026!');
  assert.equal(login.userId, userId);
  await assert.rejects(
    () => authenticateWithPassword(email, 'OldPassword2026!'),
    /incorrect/i
  );
  await assert.rejects(
    () => resetPasswordWithToken(token, 'AnotherPassword2026!'),
    /enlace no es válido/i
  );
});

test('rechaza tokens malformados y contraseñas débiles', async () => {
  assert.throws(() => verifyEmailToken('no-es-un-token'), /enlace no es válido/i);
  const reset = createPasswordResetToken(createUser({ email: `weak-${Date.now()}@test.local` }));
  await assert.rejects(
    () => resetPasswordWithToken(tokenFromUrl(reset.url), 'corta'),
    /12 caracteres/i
  );
});
