import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertProgramAccess,
  getProgramRowBySlug,
} from '@/server/domain/coursePrograms';
import { getWeeklyMeetingForProgramWeek } from '@/server/domain/weeklyMeetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; week: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, week } = await context.params;
    const weekNumber = Number(week);
    if (!Number.isInteger(weekNumber) || weekNumber < 1) {
      throw new ApiError(400, 'WEEK_INVALID', 'La semana no es válida.');
    }
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    assertProgramAccess(user, program);
    const meeting = getWeeklyMeetingForProgramWeek(program.id, weekNumber, {
      includeUnpublished: false,
      includeHost: false,
    });
    return NextResponse.json({ ok: true, reunion: meeting }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error);
  }
}
