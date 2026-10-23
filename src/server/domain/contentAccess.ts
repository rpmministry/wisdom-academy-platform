import type { AuthUser } from '../auth/authorization';
import { hasPermission } from '../auth/authorization';
import { ApiError } from '../http/api';
import { findResourceBySlug, userCanAccessResource, type ResourceRow } from './access';
import { prepare } from '../db';

const PROGRAM_BY_GRADE: Record<'4' | '8', string[]> = {
  '4': ['programa-homeschool-4-egb', 'grado-4-egb'],
  '8': ['programa-homeschool-8-egb', 'grado-8-egb'],
};

const SUBJECT_ALIASES: Array<{ keys: string[]; token: string }> = [
  { keys: ['matematica', 'matematicas', 'prealgebra', 'algebra', 'calculo'], token: 'matematicas' },
  { keys: ['lengua', 'literatura', 'lenguaje', 'comunicacion'], token: 'lengua' },
  { keys: ['ciencia', 'ciencias', 'naturales', 'biologia', 'fisica', 'quimica'], token: 'ciencias' },
  { keys: ['sociales', 'historia', 'realidad nacional'], token: 'sociales' },
  { keys: ['english', 'ingles', 'phonics', 'reading', 'literature'], token: 'english' },
  { keys: ['software', 'programacion', 'python', 'computacion', 'tecnologia'], token: 'software' },
  { keys: ['politica', 'politicas', 'relaciones internacionales', 'rrii'], token: 'politicas' },
  { keys: ['administracion', 'marketing', 'emprendimiento'], token: 'administracion' },
  { keys: ['arte', 'artistica', 'eca', 'musica', 'teatro'], token: 'educacion cultural' },
  { keys: ['educacion fisica', 'fisica y salud', 'deporte', 'deportes'], token: 'educacion fisica' },
  { keys: ['dios', 'teologia', 'cosmovision', 'biblia'], token: 'relacion con dios' },
];

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function gradeKeyFrom(grade: string, age?: number): '4' | '8' {
  const normalized = normalize(grade);
  if (normalized.includes('8') || normalized.includes('octavo')) return '8';
  if (normalized.includes('4') || normalized.includes('cuarto') || normalized.includes('gael')) {
    return '4';
  }
  if (typeof age === 'number') return age <= 10 ? '4' : '8';
  return '8';
}

function candidateResources(grade: '4' | '8', subject: string): ResourceRow[] {
  const normalizedSubject = normalize(subject);
  const alias = SUBJECT_ALIASES.find((item) =>
    item.keys.some((key) => normalizedSubject.includes(key))
  );
  const rows = prepare(`
    SELECT * FROM resources
    WHERE status = 'published' AND type = 'course'
  `).all() as ResourceRow[];

  const sameGrade = rows.filter((row) => {
    try {
      const metadata = JSON.parse(row.metadata_json) as { grade?: string };
      return typeof metadata.grade === 'string' && metadata.grade.trim().startsWith(grade);
    } catch {
      return false;
    }
  });
  if (!alias) return sameGrade;
  return sameGrade.filter((row) => normalize(row.title).includes(alias.token));
}

/**
 * Comprueba el acceso al contenido educativo de una materia y grado. Otorga
 * acceso por programa/grado completo o por la asignatura concreta; nunca por
 * compartir categoría o página.
 */
export function userCanAccessLegacyContent(
  user: AuthUser,
  grade: string,
  subject: string,
  age?: number
): boolean {
  if (user.isOwner || hasPermission(user, 'content.access_all')) return true;
  const gradeKey = gradeKeyFrom(grade, age);
  for (const slug of PROGRAM_BY_GRADE[gradeKey]) {
    const resource = findResourceBySlug(slug);
    if (resource && userCanAccessResource(user, resource)) return true;
  }
  const normalizedSubject = normalize(subject);
  if (!normalizedSubject || ['general', 'jornada', 'programa completo'].includes(normalizedSubject)) {
    return false;
  }
  const candidates = candidateResources(gradeKey, subject);
  return candidates.some((resource) => userCanAccessResource(user, resource));
}

export function assertLegacyContentAccess(
  user: AuthUser,
  grade: string,
  subject: string,
  age?: number
): void {
  if (!userCanAccessLegacyContent(user, grade, subject, age)) {
    throw new ApiError(
      403,
      'RESOURCE_FORBIDDEN',
      'No tienes un derecho de acceso vigente para esta materia y grado.'
    );
  }
}

/** Verifica que un estudiante solo opere sobre su propio perfil. */
export function assertStudentScope(
  user: AuthUser,
  options: { studentName?: string | null; grade?: string | null; studentExternalId?: number | null }
): void {
  if (user.isOwner || hasPermission(user, 'minors.read')) {
    return;
  }
  const profile = prepare('SELECT full_name, grade FROM student_profiles WHERE user_id = ?').get(
    user.id
  ) as { full_name: string; grade: string | null } | undefined;
  if (!profile) {
    // Un cliente adulto sin expediente escolar no puede reclamar el expediente
    // de un menor, pero sí puede consultar material de su propio producto.
    if (options.studentExternalId) {
      throw new ApiError(403, 'STUDENT_SCOPE', 'No tienes acceso a ese expediente estudiantil.');
    }
    return;
  }
  if (options.studentName) {
    const requested = normalize(options.studentName);
    const own = normalize(profile.full_name);
    if (requested && own && !requested.includes(own) && !own.includes(requested)) {
      throw new ApiError(403, 'STUDENT_SCOPE', 'Solo puedes consultar tu propio espacio académico.');
    }
  }
  if (options.grade && profile.grade) {
    const requested = gradeKeyFrom(options.grade);
    const own = gradeKeyFrom(profile.grade);
    if (requested !== own) {
      throw new ApiError(403, 'STUDENT_SCOPE', 'El grado solicitado no corresponde a tu matrícula.');
    }
  }
}
