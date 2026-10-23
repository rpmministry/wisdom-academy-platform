import type { AuthUser } from '../auth/authorization';
import { hasPermission } from '../auth/authorization';
import { prepare } from '../db';
import { ApiError } from '../http/api';

export function stableStudentId(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 900000;
  }
  return 100000 + hash;
}

export function gradeKeyForLegacyCourse(courseId: number): '4' | '8' {
  return courseId >= 801 && courseId <= 811 ? '8' : '4';
}

/**
 * Un estudiante solo puede operar con su propio identificador Moodle. El
 * personal con permiso de menores o de usuarios puede consultar expedientes
 * escolares según sus atribuciones.
 */
export function getOwnMoodleId(user: AuthUser): number | null {
  const profile = prepare(
    'SELECT moodle_user_id FROM student_profiles WHERE user_id = ?'
  ).get(user.id) as { moodle_user_id: number | null } | undefined;
  if (!profile) return null;
  return profile.moodle_user_id ?? stableStudentId(user.id);
}

export function assertMoodleStudentAccess(user: AuthUser, studentId: number): void {
  if (user.isOwner || hasPermission(user, 'minors.read')) {
    return;
  }
  const profile = prepare(
    'SELECT moodle_user_id FROM student_profiles WHERE user_id = ?'
  ).get(user.id) as { moodle_user_id: number | null } | undefined;
  if (!profile) {
    throw new ApiError(403, 'STUDENT_SCOPE', 'No tienes un perfil escolar asociado.');
  }
  const expected = profile.moodle_user_id ?? stableStudentId(user.id);
  if (studentId !== expected) {
    throw new ApiError(403, 'STUDENT_SCOPE', 'No tienes acceso a ese expediente escolar.');
  }
}
