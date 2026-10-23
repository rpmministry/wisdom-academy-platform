import { prepare } from '../db';
import { nowIso } from '../db/sqlite';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  username: string | null;
  status: string;
  isMinor: boolean;
  mustChangePassword: boolean;
  roles: string[];
  primaryRole: string;
  permissions: Set<string>;
  hasGlobalContentAccess: boolean;
  isOwner: boolean;
  avatarUrl: string | null;
}

interface UserRow {
  id: string;
  email: string;
  email_verified: number;
  display_name: string | null;
  username: string | null;
  status: string;
  is_minor: number;
  must_change_password: number;
}

function activeGrantIsValid(status: string, startsAt: string, endsAt: string | null, now: string): boolean {
  if (status !== 'active') return false;
  if (startsAt > now) return false;
  if (endsAt && endsAt <= now) return false;
  return true;
}

export function primaryRoleFor(roles: string[]): string {
  const priority = [
    'platform_owner',
    'principal_admin',
    'delegated_admin',
    'instructor',
    'founder',
    'investor',
    'student',
    'guardian',
    'customer',
  ];
  return priority.find((role) => roles.includes(role)) || 'customer';
}

export function loadAuthUser(userId: string): AuthUser | null {
  const user = prepare(`
    SELECT id, email, email_verified, display_name, username, status, is_minor, must_change_password
    FROM users WHERE id = ?
  `).get(userId) as UserRow | undefined;
  if (!user || user.status !== 'active') return null;

  const roleRows = prepare(`
    SELECT DISTINCT role_code FROM user_roles
    WHERE user_id = ? AND revoked_at IS NULL
    ORDER BY role_code
  `).all(userId) as Array<{ role_code: string }>;
  const roles = roleRows.map((row) => row.role_code);
  const isOwner = roles.includes('platform_owner');

  const rolePermissions = prepare(`
    SELECT DISTINCT rp.permission_code
    FROM role_permissions rp
    JOIN user_roles ur ON ur.role_code = rp.role_code
    WHERE ur.user_id = ? AND ur.revoked_at IS NULL
  `).all(userId) as Array<{ permission_code: string }>;
  const directPermissions = prepare(`
    SELECT permission_code FROM user_permissions
    WHERE user_id = ? AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)
  `).all(userId, nowIso()) as Array<{ permission_code: string }>;

  const permissions = new Set<string>([
    ...rolePermissions.map((row) => row.permission_code),
    ...directPermissions.map((row) => row.permission_code),
  ]);
  for (const permission of [...permissions]) {
    if (permission.startsWith('*')) permissions.add(permission.slice(1));
  }

  const now = nowIso();
  const globalGrants = prepare(`
    SELECT status, starts_at, ends_at FROM global_access_grants
    WHERE user_id = ? AND status <> 'revoked'
  `).all(userId) as Array<{ status: string; starts_at: string; ends_at: string | null }>;
  const hasGlobalContentAccess =
    isOwner ||
    permissions.has('content.access_all') ||
    globalGrants.some((grant) =>
      activeGrantIsValid(grant.status, grant.starts_at, grant.ends_at, now)
    );

  return {
    id: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    displayName: user.display_name || user.email,
    username: user.username,
    status: user.status,
    isMinor: Boolean(user.is_minor),
    mustChangePassword: Boolean(user.must_change_password),
    roles,
    primaryRole: primaryRoleFor(roles),
    permissions,
    hasGlobalContentAccess,
    isOwner,
    avatarUrl: null,
  };
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.isOwner || user.permissions.has(permission);
}

export function hasAdminAccess(user: AuthUser | null): boolean {
  return hasPermission(user, 'admin.access');
}

export function hasCrmAccess(user: AuthUser | null): boolean {
  return hasPermission(user, 'crm.access');
}

export function canManageGlobalInvitations(user: AuthUser | null): boolean {
  return hasPermission(user, 'founder_codes.manage');
}

export function roleLabel(role: string): string {
  switch (role) {
    case 'platform_owner':
      return 'Creador';
    case 'principal_admin':
      return 'Administrador principal';
    case 'delegated_admin':
      return 'Administrador delegado';
    case 'instructor':
      return 'Instructor';
    case 'founder':
      return 'Fundador';
    case 'investor':
      return 'Inversor';
    case 'student':
      return 'Estudiante';
    case 'guardian':
      return 'Representante legal';
    default:
      return 'Cliente';
  }
}
