import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { normalizarNombreAsignatura, obtenerPerfilCurricular } from '@/data/curriculum';

interface ProfileRow {
  user_id: string;
  full_name: string;
  age: number | null;
  grade: string | null;
  subnivel: string | null;
  folder_code: string | null;
  profile_agent: string | null;
  mentor_email: string | null;
  moodle_user_id: number | null;
}

export function buildStudentPortalData(userId: string) {
  const profile = prepare('SELECT * FROM student_profiles WHERE user_id = ?').get(userId) as
    | ProfileRow
    | undefined;

  const year = prepare(
    "SELECT * FROM academic_years WHERE regime = 'SIERRA_AMAZONIA' ORDER BY start_date DESC LIMIT 1"
  ).get() as
    | {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        total_school_days: number;
      }
    | undefined;

  if (!profile) {
    return {
      perfil: null,
      horario: {},
      asignaturas: [],
      calendario: year
        ? {
            id: year.id,
            nombre: year.name,
            inicio: year.start_date,
            fin: year.end_date,
            diasLectivos: Number(year.total_school_days),
          }
        : null,
      resumen: null,
      planes: [],
      eventos: [],
    };
  }

  const perfil = obtenerPerfilCurricular(profile.folder_code || profile.grade || '');
  const today = nowIso().slice(0, 10);
  const totalPlans = year
    ? (prepare(
        'SELECT COUNT(*) AS total FROM academic_plans WHERE user_id = ? AND academic_year_id = ?'
      ).get(userId, year.id) as { total: number })
    : { total: 0 };
  const completed = year
    ? (prepare(
        'SELECT COUNT(*) AS total FROM academic_plans WHERE user_id = ? AND academic_year_id = ? AND plan_date < ?'
      ).get(userId, year.id, today) as { total: number })
    : { total: 0 };
  const plans = year
    ? (prepare(`
        SELECT * FROM academic_plans
        WHERE user_id = ? AND academic_year_id = ?
        ORDER BY CASE WHEN plan_date >= ? THEN 0 ELSE 1 END, plan_date ASC
        LIMIT 12
      `).all(userId, year.id, today) as Array<{
        id: string;
        day_number: number;
        plan_date: string;
        week_number: number;
        trimester: number;
        title: string;
        storage_path: string;
      }>)
    : [];
  const subjects = prepare(`
    SELECT aps.plan_id, aps.subject, aps.topic, aps.objective
    FROM academic_plan_subjects aps
    JOIN academic_plans p ON p.id = aps.plan_id
    WHERE p.user_id = ?
    ORDER BY aps.subject
  `).all(userId) as Array<{
    plan_id: string;
    subject: string;
    topic: string;
    objective: string | null;
  }>;
  const subjectsByPlan = new Map<
    string,
    Array<{ subject: string; topic: string; objective: string | null }>
  >();
  for (const subject of subjects) {
    const list = subjectsByPlan.get(subject.plan_id) || [];
    list.push({ subject: subject.subject, topic: subject.topic, objective: subject.objective });
    subjectsByPlan.set(subject.plan_id, list);
  }

  const events = year
    ? (prepare(`
        SELECT event_date, title, kind, description
        FROM academic_calendar_events
        WHERE academic_year_id = ? AND event_date >= ?
        ORDER BY event_date ASC LIMIT 10
      `).all(year.id, today) as Array<{
        event_date: string;
        title: string;
        kind: string;
        description: string | null;
      }>)
    : [];

  const grades = prepare(`
    SELECT r.title AS subject, g.trimester, g.grade
    FROM grade_records g
    JOIN resources r ON r.id = g.resource_id
    WHERE g.user_id = ?
    ORDER BY g.trimester
  `).all(userId) as Array<{ subject: string; trimester: number; grade: number }>;

  const subjectsView = perfil.asignaturas.map((asignatura, index) => ({
    codigo: asignatura.codigo,
    nombre: asignatura.nombre,
    nombreCorto: asignatura.nombreCorto,
    area: asignatura.area,
    profesorIA: asignatura.profesorIA,
    unidades: asignatura.unidades.length,
    primeraUnidad: asignatura.unidades[0]?.titulo || null,
    conceptos: asignatura.conceptosFundamentales.slice(0, 3).map((item) => item.termino),
    enfoque: asignatura.enfoqueAcademico.slice(0, 220),
    colorIndex: index % 5,
    calificaciones: grades
      .filter((grade) => {
        const resourceName = normalizarNombreAsignatura(grade.subject);
        const subjectName = normalizarNombreAsignatura(asignatura.nombre);
        return resourceName.includes(subjectName) || subjectName.includes(resourceName);
      })
      .map((grade) => ({ trimestre: grade.trimester, nota: grade.grade })),
  }));

  return {
    perfil: {
      nombre: profile.full_name || perfil.estudiante,
      grado: profile.grade || perfil.grado,
      subnivel: profile.subnivel || perfil.subnivelMineduc,
      edad: profile.age || perfil.edad,
      docente: perfil.asignaturas[0]?.profesorIA || 'Profesor IA',
      anoLectivo: perfil.anoLectivo,
      codigoCarpeta: perfil.codigoCarpetaAnioDrive,
      totalAsignaturas: subjectsView.length,
      totalUnidades: subjectsView.reduce((total, subject) => total + subject.unidades, 0),
      horario: perfil.horarioSemanal,
    },
    horario: perfil.horarioSemanal,
    asignaturas: subjectsView,
    calendario: year
      ? {
          id: year.id,
          nombre: year.name,
          inicio: year.start_date,
          fin: year.end_date,
          diasLectivos: Number(year.total_school_days),
        }
      : null,
    resumen: {
      planesGenerados: Number(totalPlans.total),
      diasCompletados: Number(completed.total),
      progreso:
        Number(totalPlans.total) > 0
          ? Math.round((Number(completed.total) / Number(totalPlans.total)) * 100)
          : 0,
      asignaturas: subjectsView.length,
      unidades: subjectsView.reduce((total, subject) => total + subject.unidades, 0),
    },
    planes: plans.map((plan) => ({
      id: plan.id,
      dia: plan.day_number,
      fecha: plan.plan_date,
      semana: plan.week_number,
      trimestre: plan.trimester,
      titulo: plan.title,
      materias: subjectsByPlan.get(plan.id) || [],
      guiaUrl: `/api/me/plans/${encodeURIComponent(plan.id)}/guide`,
    })),
    eventos: events,
  };
}
