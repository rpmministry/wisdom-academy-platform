import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession(request);
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
    if (!year) {
      return NextResponse.json(
        { ok: true, calendario: null, planes: [], eventos: [], resumen: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const today = nowIso().slice(0, 10);
    const totalPlans = prepare(
      'SELECT COUNT(*) AS total FROM academic_plans WHERE user_id = ? AND academic_year_id = ?'
    ).get(user.id, year.id) as { total: number };
    const completed = prepare(
      'SELECT COUNT(*) AS total FROM academic_plans WHERE user_id = ? AND academic_year_id = ? AND plan_date < ?'
    ).get(user.id, year.id, today) as { total: number };
    const plans = prepare(`
      SELECT p.* FROM academic_plans p
      WHERE p.user_id = ? AND p.academic_year_id = ?
      ORDER BY CASE WHEN p.plan_date >= ? THEN 0 ELSE 1 END, p.plan_date ASC
      LIMIT 6
    `).all(user.id, year.id, today) as Array<{
      id: string;
      day_number: number;
      plan_date: string;
      week_number: number;
      trimester: number;
      title: string;
      storage_path: string;
    }>;
    const subjects = prepare(`
      SELECT aps.plan_id, aps.subject, aps.topic
      FROM academic_plan_subjects aps
      JOIN academic_plans p ON p.id = aps.plan_id
      WHERE p.user_id = ? AND p.academic_year_id = ?
      ORDER BY aps.subject
    `).all(user.id, year.id) as Array<{ plan_id: string; subject: string; topic: string }>;
    const subjectsByPlan = new Map<string, Array<{ subject: string; topic: string }>>();
    for (const subject of subjects) {
      const list = subjectsByPlan.get(subject.plan_id) || [];
      list.push({ subject: subject.subject, topic: subject.topic });
      subjectsByPlan.set(subject.plan_id, list);
    }
    const events = prepare(`
      SELECT event_date, title, kind, description
      FROM academic_calendar_events
      WHERE academic_year_id = ? AND event_date >= ?
      ORDER BY event_date ASC LIMIT 8
    `).all(year.id, today) as Array<{
      event_date: string;
      title: string;
      kind: string;
      description: string | null;
    }>;

    return NextResponse.json(
      {
        ok: true,
        calendario: {
          id: year.id,
          nombre: year.name,
          inicio: year.start_date,
          fin: year.end_date,
          diasLectivos: Number(year.total_school_days),
        },
        resumen: {
          planesGenerados: Number(totalPlans.total),
          diasCompletados: Number(completed.total),
          progreso:
            Number(totalPlans.total) > 0
              ? Math.round((Number(completed.total) / Number(totalPlans.total)) * 100)
              : 0,
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
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
