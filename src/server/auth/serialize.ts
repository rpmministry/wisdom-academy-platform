import { prepare } from '../db';
import type { EstudianteWisdom } from '@/types/wisdom';
import type {
  MatriculaCurso,
  RolUsuario,
  UsuarioCuenta,
} from '@/lib/auth/types';
import { loadAuthUser, type AuthUser } from './authorization';
import { listUserEntitlements, listUserGlobalGrants } from '../domain/access';

interface UserDbRow {
  id: string;
  email: string;
  email_verified: number;
  display_name: string | null;
  username: string | null;
  password_hash: string | null;
  status: string;
  is_minor: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface StudentProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  age: number | null;
  grade: string | null;
  subnivel: string | null;
  folder_code: string | null;
  profile_agent: string | null;
  language: string;
  portfolio_owner: string | null;
  mentor_email: string | null;
}

function mapRole(primaryRole: string): RolUsuario {
  switch (primaryRole) {
    case 'platform_owner':
    case 'principal_admin':
    case 'delegated_admin':
      return 'ADMIN';
    case 'instructor':
      return 'TEACHER';
    case 'founder':
      return 'FOUNDER';
    case 'investor':
      return 'INVESTOR';
    case 'guardian':
      return 'GUARDIAN';
    case 'student':
      return 'STUDENT';
    default:
      return 'CUSTOMER';
  }
}

function stableCourseId(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) % 900000;
  }
  return 100000 + hash;
}

function mapProfile(row: StudentProfileRow): EstudianteWisdom {
  return {
    idMoodle: stableCourseId(row.user_id),
    nombreCompleto: row.full_name,
    edad: row.age ?? 12,
    gradoEcuador: row.grade || 'Sin grado asignado',
    grado: row.grade || undefined,
    subnivelMineduc: row.subnivel || 'Sin subnivel',
    codigoCarpetaAnioDrive: row.folder_code || row.user_id,
    perfilAgente: (row.profile_agent as EstudianteWisdom['perfilAgente']) || 'general_k12',
    idiomaPreferido: row.language === 'EN' ? 'EN' : 'ES',
    responsablePortafolio:
      (row.portfolio_owner as EstudianteWisdom['responsablePortafolio']) || 'ESTUDIANTE_AUTONOMO',
    versiculoBiblicoLema: {
      referencia: 'Proverbios 2:6',
      texto: 'Porque Jehová da la sabiduría, y de su boca viene el conocimiento.',
    },
    emailMentorPadre: row.mentor_email || undefined,
  };
}

function loadProfile(userId: string): StudentProfileRow | null {
  return (
    (prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId) as
      | StudentProfileRow
      | undefined) ?? null
  );
}

function entitlementToMatricula(
  entitlement: ReturnType<typeof listUserEntitlements>[number],
  grade: { trimester1?: number; trimester2?: number; trimester3?: number; average?: number }
): MatriculaCurso {
  const resource = prepare('SELECT metadata_json FROM resources WHERE id = ?').get(
    entitlement.resourceId
  ) as { metadata_json: string } | undefined;
  let metadata: Record<string, unknown> = {};
  try {
    metadata = resource ? (JSON.parse(resource.metadata_json) as Record<string, unknown>) : {};
  } catch {
    metadata = {};
  }
  const legacy = Number(metadata.legacyCourseId);
  const idCurso = Number.isFinite(legacy) && legacy > 0 ? legacy : stableCourseId(entitlement.resourceSlug);
  return {
    idCurso,
    nombre: entitlement.resourceTitle,
    codigoCorto: entitlement.resourceSlug.slice(0, 24),
    profesorIA: 'Profesor IA de Wisdom Academy',
    estado:
      entitlement.effectiveStatus === 'paused'
        ? 'SUSPENDIDA'
        : entitlement.effectiveStatus === 'expired' || entitlement.effectiveStatus === 'revoked'
        ? 'FINALIZADA'
        : 'ACTIVA',
    fechaInicio: entitlement.startsAt.slice(0, 10),
    fechaFin: entitlement.endsAt ? entitlement.endsAt.slice(0, 10) : 'Sin vencimiento',
    porcentajeAvance: 0,
    notaTrimestre1: grade.trimester1,
    notaTrimestre2: grade.trimester2,
    notaTrimestre3: grade.trimester3,
    promedioFinal: grade.average,
    recursoSlug: entitlement.resourceSlug,
    origen: entitlement.origin,
  };
}

function gradesFor(userId: string, resourceId: string): {
  trimester1?: number;
  trimester2?: number;
  trimester3?: number;
  average?: number;
} {
  const rows = prepare(
    'SELECT trimester, grade FROM grade_records WHERE user_id = ? AND resource_id = ?'
  ).all(userId, resourceId) as Array<{ trimester: number; grade: number }>;
  const output: { trimester1?: number; trimester2?: number; trimester3?: number; average?: number } = {};
  for (const row of rows) {
    if (row.trimester === 1) output.trimester1 = row.grade;
    if (row.trimester === 2) output.trimester2 = row.grade;
    if (row.trimester === 3) output.trimester3 = row.grade;
  }
  const values = [output.trimester1, output.trimester2, output.trimester3].filter(
    (value): value is number => typeof value === 'number'
  );
  if (values.length > 0) {
    output.average = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
  }
  return output;
}

export function serializeCurrentUser(user: AuthUser): UsuarioCuenta {
  const row = prepare('SELECT * FROM users WHERE id = ?').get(user.id) as UserDbRow | undefined;
  const profile = loadProfile(user.id);
  const entitlements = listUserEntitlements(user.id).filter(
    (entitlement) => entitlement.effectiveStatus === 'active'
  );
  const matriculas = entitlements.map((entitlement) =>
    entitlementToMatricula(entitlement, gradesFor(user.id, entitlement.resourceId))
  );

  return {
    id: user.id,
    usuario: user.username || user.email,
    correo: user.email,
    nombreCompleto: user.displayName,
    rol: mapRole(user.primaryRole),
    activo: user.status === 'active',
    perfilEstudiante: profile ? mapProfile(profile) : null,
    avatarUrl: row?.avatar_url || null,
    matriculas,
    roles: user.roles,
    permisos: [...user.permissions],
    accesoContenidoGlobal: user.hasGlobalContentAccess,
    debeCambiarContrasena: user.mustChangePassword,
    correoVerificado: user.emailVerified,
    creadoEn: row?.created_at,
  };
}

export interface AdminUserView extends UsuarioCuenta {
  estadosRoles: Array<{ roleCode: string; grantedAt: string }>;
  permisosDirectos: Array<{ permissionCode: string; expiresAt: string | null }>;
  accessosGlobales: ReturnType<typeof listUserGlobalGrants>;
}

export function serializeAdminUser(
  userId: string,
  options: { includeMinorProfile: boolean }
): AdminUserView | null {
  const user = loadAuthUser(userId);
  if (!user) return null;
  const base = serializeCurrentUser(user);
  if (!options.includeMinorProfile) {
    const row = prepare('SELECT is_minor FROM users WHERE id = ?').get(userId) as
      | { is_minor: number }
      | undefined;
    if (row?.is_minor) {
      base.perfilEstudiante = null;
      base.matriculas = [];
    }
  }

  const roleRows = prepare(`
    SELECT role_code, granted_at FROM user_roles
    WHERE user_id = ? AND revoked_at IS NULL ORDER BY granted_at
  `).all(userId) as Array<{ role_code: string; granted_at: string }>;
  const permissionRows = prepare(`
    SELECT permission_code, expires_at FROM user_permissions
    WHERE user_id = ? AND revoked_at IS NULL
      AND (expires_at IS NULL OR expires_at > ?)
    ORDER BY permission_code
  `).all(userId, new Date().toISOString()) as Array<{
    permission_code: string;
    expires_at: string | null;
  }>;

  return {
    ...base,
    estadosRoles: roleRows.map((row) => ({ roleCode: row.role_code, grantedAt: row.granted_at })),
    permisosDirectos: permissionRows.map((row) => ({
      permissionCode: row.permission_code,
      expiresAt: row.expires_at,
    })),
    accessosGlobales: listUserGlobalGrants(userId),
  };
}

export function listAdminUsers(
  options: { search?: string; includeMinorProfiles: boolean; limit?: number }
): AdminUserView[] {
  const search = options.search?.trim();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 200);
  const rows = search
    ? (prepare(`
        SELECT id FROM users
        WHERE email LIKE ? OR display_name LIKE ? OR username LIKE ?
        ORDER BY created_at DESC LIMIT ?
      `).all(`%${search}%`, `%${search}%`, `%${search}%`, limit) as Array<{ id: string }>)
    : (prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT ?').all(limit) as Array<{
        id: string;
      }>);

  return rows
    .map((row) =>
      serializeAdminUser(row.id, { includeMinorProfile: options.includeMinorProfiles })
    )
    .filter((user): user is AdminUserView => Boolean(user));
}
