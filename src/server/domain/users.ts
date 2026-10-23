import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';
import {
  generateInitialPassword,
  hashPassword,
  hashPasswordSync,
  validatePasswordStrength,
  verifyPassword,
} from '../auth/passwords';
import { loadAuthUser, type AuthUser } from '../auth/authorization';
import { revokeUserSessions } from '../auth/sessions';

interface UserRow {
  id: string;
  email: string;
  email_verified: number;
  display_name: string | null;
  username: string | null;
  password_hash: string | null;
  must_change_password: number;
  status: string;
  is_minor: number;
  created_at: string;
}

export interface PasswordLoginResult {
  userId: string;
  mustChangePassword: boolean;
}

let dummyPasswordHash: string | null = null;

function getDummyPasswordHash(): string {
  if (!dummyPasswordHash) {
    dummyPasswordHash = hashPasswordSync(randomToken(32));
  }
  return dummyPasswordHash;
}

export function findUserByIdentifier(identifier: string): UserRow | null {
  return (
    (prepare(`
      SELECT * FROM users
      WHERE (email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE)
      LIMIT 1
    `).get(identifier, identifier) as UserRow | undefined) ?? null
  );
}

export async function authenticateWithPassword(
  identifier: string,
  password: string
): Promise<PasswordLoginResult> {
  const user = findUserByIdentifier(identifier);
  const genericError = new ApiError(
    401,
    'INVALID_CREDENTIALS',
    'Usuario o contraseña incorrectos.'
  );
  if (!user) {
    await verifyPassword(password, getDummyPasswordHash());
    throw genericError;
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'La cuenta está suspendida.');
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw genericError;

  return {
    userId: user.id,
    mustChangePassword: Boolean(user.must_change_password),
  };
}

function uniqueUsernameFromEmail(email: string): string {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'usuario';
  let candidate = base;
  let suffix = 1;
  while (prepare('SELECT id FROM users WHERE username = ?').get(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function createUserByAdmin(input: {
  actor: AuthUser;
  email: string;
  displayName: string;
  password?: string | null;
  isMinor?: boolean;
  studentProfile?: {
    age?: number;
    grade?: string;
    subnivel?: string;
    folderCode?: string;
    profileAgent?: string;
    mentorEmail?: string;
  } | null;
}): Promise<{ userId: string; initialPassword?: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El correo electrónico no es válido.');
  }
  if (prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    throw new ApiError(409, 'EMAIL_EXISTS', 'Ya existe una cuenta con ese correo.');
  }

  const initialPassword = input.password || generateInitialPassword();
  if (input.password) {
    const policy = validatePasswordStrength(input.password);
    if (!policy.ok) throw new ApiError(400, 'WEAK_PASSWORD', policy.message || 'Contraseña débil.');
  }
  const passwordHash = await hashPassword(initialPassword);
  const now = nowIso();
  const userId = `usr_${randomToken(16)}`;
  const role = input.studentProfile ? 'student' : 'customer';

  withTransaction(() => {
    prepare(`
      INSERT INTO users
        (id, email, email_verified, display_name, username, password_hash, password_updated_at,
         must_change_password, status, is_minor, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?, ?, ?, 1, 'active', ?, ?, ?)
    `).run(
      userId,
      email,
      input.displayName.trim(),
      uniqueUsernameFromEmail(email),
      passwordHash,
      now,
      input.isMinor || input.studentProfile ? 1 : 0,
      now,
      now
    );
    prepare(`
      INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ur_${randomToken(12)}`, userId, role, input.actor.id, now);

    if (input.studentProfile) {
      prepare(`
        INSERT INTO student_profiles
          (id, user_id, full_name, age, grade, subnivel, folder_code, profile_agent, language,
           portfolio_owner, mentor_email, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ES', ?, ?, ?, ?)
      `).run(
        `sp_${randomToken(12)}`,
        userId,
        input.displayName.trim(),
        input.studentProfile.age ?? null,
        input.studentProfile.grade ?? null,
        input.studentProfile.subnivel ?? null,
        input.studentProfile.folderCode ?? null,
        input.studentProfile.profileAgent ?? null,
        (input.studentProfile.age ?? 12) <= 10 ? 'PADRE_MENTOR' : 'ESTUDIANTE_AUTONOMO',
        input.studentProfile.mentorEmail ?? null,
        now,
        now
      );
    }

    prepare(`
      INSERT INTO crm_contacts (id, email, name, status, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
    `).run(`ctc_${randomToken(12)}`, email, input.displayName.trim(), now, now);
  });

  return { userId, initialPassword: input.password ? undefined : initialPassword };
}

export async function changeOwnPassword(input: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  currentSessionHash?: string;
}): Promise<void> {
  const row = prepare('SELECT password_hash FROM users WHERE id = ?').get(input.userId) as
    | { password_hash: string | null }
    | undefined;
  if (!row) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');

  if (row.password_hash) {
    const valid = await verifyPassword(input.currentPassword, row.password_hash);
    if (!valid) {
      throw new ApiError(403, 'CURRENT_PASSWORD_INVALID', 'La contraseña actual no es correcta.');
    }
  }
  const policy = validatePasswordStrength(input.newPassword);
  if (!policy.ok) throw new ApiError(400, 'WEAK_PASSWORD', policy.message || 'Contraseña débil.');

  const hash = await hashPassword(input.newPassword);
  prepare(`
    UPDATE users
    SET password_hash = ?, password_updated_at = ?, must_change_password = 0, updated_at = ?
    WHERE id = ?
  `).run(hash, nowIso(), nowIso(), input.userId);
  revokeUserSessions(input.userId, input.currentSessionHash);
}

export async function resetUserPasswordByAdmin(input: {
  userId: string;
  actor: AuthUser;
  newPassword?: string | null;
}): Promise<{ password: string; generated: boolean }> {
  const user = prepare('SELECT id, status FROM users WHERE id = ?').get(input.userId) as
    | { id: string; status: string }
    | undefined;
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  if (!input.actor.isOwner && findActiveRole(input.userId, 'platform_owner')) {
    throw new ApiError(
      403,
      'OWNER_PROTECTED',
      'Solo el creador puede restablecer su propia contraseña.'
    );
  }
  const generated = !input.newPassword;
  const password = input.newPassword || generateInitialPassword();
  if (input.newPassword) {
    const policy = validatePasswordStrength(input.newPassword);
    if (!policy.ok) throw new ApiError(400, 'WEAK_PASSWORD', policy.message || 'Contraseña débil.');
  }
  const hash = await hashPassword(password);
  prepare(`
    UPDATE users
    SET password_hash = ?, password_updated_at = ?, must_change_password = 1, updated_at = ?
    WHERE id = ?
  `).run(hash, nowIso(), nowIso(), input.userId);
  revokeUserSessions(input.userId);
  return { password, generated };
}

export function setUserStatus(input: {
  actor: AuthUser;
  userId: string;
  status: 'active' | 'suspended';
}): void {
  const target = prepare('SELECT id, status FROM users WHERE id = ?').get(input.userId) as
    | { id: string; status: string }
    | undefined;
  if (!target) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  if (target.id === input.actor.id) {
    throw new ApiError(400, 'SELF_ACTION', 'No puedes suspender tu propia cuenta.');
  }
  if (!input.actor.isOwner) {
    const ownerRole = prepare(`
      SELECT 1 AS present FROM user_roles
      WHERE user_id = ? AND role_code = 'platform_owner' AND revoked_at IS NULL
    `).get(input.userId);
    if (ownerRole) {
      throw new ApiError(403, 'OWNER_PROTECTED', 'Solo el creador puede modificar su propia cuenta.');
    }
  }
  prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(
    input.status,
    nowIso(),
    input.userId
  );
  if (input.status === 'suspended') revokeUserSessions(input.userId);
}

function findActiveRole(userId: string, roleCode: string): boolean {
  return Boolean(
    prepare(`
      SELECT 1 AS present FROM user_roles
      WHERE user_id = ? AND role_code = ? AND revoked_at IS NULL
    `).get(userId, roleCode)
  );
}

export function grantRole(input: {
  actor: AuthUser;
  userId: string;
  roleCode: string;
}): { created: boolean } {
  if (input.actor.id === input.userId) {
    throw new ApiError(403, 'SELF_ESCALATION', 'No puedes modificar tus propios roles.');
  }
  if (input.roleCode === 'platform_owner') {
    throw new ApiError(403, 'OWNER_ROLE_PROTECTED', 'El rol de creador no puede asignarse desde la API.');
  }
  const role = prepare('SELECT code, rank FROM roles WHERE code = ?').get(input.roleCode) as
    | { code: string; rank: number }
    | undefined;
  if (!role) throw new ApiError(404, 'ROLE_NOT_FOUND', 'El rol no existe.');
  if (!prepare('SELECT id FROM users WHERE id = ?').get(input.userId)) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  }

  if (role.code === 'principal_admin' && !input.actor.isOwner) {
    throw new ApiError(
      403,
      'OWNER_ONLY',
      'Solo el creador puede nombrar administradores principales.'
    );
  }

  if (!input.actor.isOwner && findActiveRole(input.userId, 'platform_owner')) {
    throw new ApiError(403, 'OWNER_PROTECTED', 'No puedes modificar los roles del creador.');
  }

  if (findActiveRole(input.userId, role.code)) return { created: false };
  prepare(`
    INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`ur_${randomToken(12)}`, input.userId, role.code, input.actor.id, nowIso());
  return { created: true };
}

export function revokeRole(input: {
  actor: AuthUser;
  userId: string;
  roleCode: string;
}): { revoked: boolean } {
  if (input.roleCode === 'platform_owner') {
    throw new ApiError(403, 'OWNER_ROLE_PROTECTED', 'El rol de creador no puede revocarse.');
  }
  if (input.actor.id === input.userId) {
    throw new ApiError(403, 'SELF_ESCALATION', 'No puedes modificar tus propios roles.');
  }
  if (input.roleCode === 'principal_admin' && !input.actor.isOwner) {
    throw new ApiError(403, 'OWNER_ONLY', 'Solo el creador puede retirar administradores principales.');
  }
  if (!input.actor.isOwner && findActiveRole(input.userId, 'platform_owner')) {
    throw new ApiError(403, 'OWNER_PROTECTED', 'No puedes modificar los roles del creador.');
  }
  const result = prepare(`
    UPDATE user_roles SET revoked_at = ?, revoked_by = ?
    WHERE user_id = ? AND role_code = ? AND revoked_at IS NULL
  `).run(nowIso(), input.actor.id, input.userId, input.roleCode);
  return { revoked: result.changes > 0 };
}

export function grantDirectPermission(input: {
  actor: AuthUser;
  userId: string;
  permissionCode: string;
  expiresAt?: string | null;
}): { created: boolean } {
  if (input.actor.id === input.userId) {
    throw new ApiError(403, 'SELF_ESCALATION', 'No puedes concederte permisos a ti mismo.');
  }
  if (!input.actor.permissions.has(input.permissionCode)) {
    throw new ApiError(
      403,
      'PERMISSION_ESCALATION',
      'No puedes conceder un permiso que no posees.'
    );
  }
  if (!prepare('SELECT code FROM permissions WHERE code = ?').get(input.permissionCode)) {
    throw new ApiError(404, 'PERMISSION_NOT_FOUND', 'El permiso no existe.');
  }
  if (!prepare('SELECT id FROM users WHERE id = ?').get(input.userId)) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  }
  if (!input.actor.isOwner && findActiveRole(input.userId, 'platform_owner')) {
    throw new ApiError(403, 'OWNER_PROTECTED', 'No puedes modificar los permisos del creador.');
  }
  const existing = prepare(`
    SELECT id FROM user_permissions
    WHERE user_id = ? AND permission_code = ? AND revoked_at IS NULL
  `).get(input.userId, input.permissionCode);
  if (existing) return { created: false };

  prepare(`
    INSERT INTO user_permissions
      (id, user_id, permission_code, granted_by, granted_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    `up_${randomToken(12)}`,
    input.userId,
    input.permissionCode,
    input.actor.id,
    nowIso(),
    input.expiresAt ? new Date(input.expiresAt).toISOString() : null
  );
  return { created: true };
}

export function revokeDirectPermission(input: {
  actor: AuthUser;
  userId: string;
  permissionCode: string;
}): { revoked: boolean } {
  if (input.actor.id === input.userId) {
    throw new ApiError(403, 'SELF_ESCALATION', 'No puedes modificar tus propios permisos.');
  }
  if (!input.actor.isOwner && findActiveRole(input.userId, 'platform_owner')) {
    throw new ApiError(403, 'OWNER_PROTECTED', 'No puedes modificar los permisos del creador.');
  }
  const result = prepare(`
    UPDATE user_permissions SET revoked_at = ?, revoked_by = ?
    WHERE user_id = ? AND permission_code = ? AND revoked_at IS NULL
  `).run(nowIso(), input.actor.id, input.userId, input.permissionCode);
  return { revoked: result.changes > 0 };
}

export function saveGrade(input: {
  actor: AuthUser;
  userId: string;
  resourceId?: string | null;
  legacyCourseId?: number | null;
  trimester: 1 | 2 | 3;
  grade: number;
}): void {
  let resourceId = input.resourceId || null;
  if (!resourceId && input.legacyCourseId) {
    const row = prepare(
      "SELECT id FROM resources WHERE json_extract(metadata_json, '$.legacyCourseId') = ? LIMIT 1"
    ).get(input.legacyCourseId) as { id: string } | undefined;
    resourceId = row?.id || null;
  }
  if (!resourceId) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'No se encontró el recurso académico.');
  }
  if (!prepare('SELECT id FROM users WHERE id = ?').get(input.userId)) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
  }
  const timestamp = nowIso();
  prepare(`
    INSERT INTO grade_records
      (id, user_id, resource_id, legacy_course_id, trimester, grade, updated_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, resource_id, trimester)
    DO UPDATE SET grade = excluded.grade, updated_by = excluded.updated_by, updated_at = excluded.updated_at
  `).run(
    `grd_${randomToken(12)}`,
    input.userId,
    resourceId,
    input.legacyCourseId ?? null,
    input.trimester,
    input.grade,
    input.actor.id,
    timestamp,
    timestamp
  );
}
