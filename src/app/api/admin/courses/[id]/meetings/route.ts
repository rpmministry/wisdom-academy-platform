import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import {
  listWeeklyMeetingsForProgram,
  upsertWeeklyMeeting,
  type UpsertWeeklyMeetingInput,
} from '@/server/domain/weeklyMeetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request, { permission: 'meetings.manage' });
    const { id } = await context.params;
    return NextResponse.json(
      {
        ok: true,
        reuniones: listWeeklyMeetingsForProgram(id, {
          includeUnpublished: true,
          includeHost: true,
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'meetings.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<Partial<UpsertWeeklyMeetingInput>>(request, 256 * 1024);
    if (!body.joinUrl || body.weekNumber === undefined) {
      return NextResponse.json(
        { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Semana y enlace son obligatorios.' } },
        { status: 400 }
      );
    }
    const meeting = upsertWeeklyMeeting(
      id,
      {
        weekNumber: Number(body.weekNumber),
        moduleId: body.moduleId ?? null,
        title: body.title,
        provider: body.provider,
        embedMode: body.embedMode ?? null,
        joinUrl: body.joinUrl,
        hostUrl: body.hostUrl ?? null,
        hostName: body.hostName ?? null,
        startsAt: body.startsAt ?? null,
        endsAt: body.endsAt ?? null,
        timezone: body.timezone,
        status: body.status,
        studentNote: body.studentNote ?? null,
        staffNote: body.staffNote ?? null,
        recordingUrl: body.recordingUrl ?? null,
      },
      user
    );
    return NextResponse.json({ ok: true, reunion: meeting });
  } catch (error) {
    return handleRouteError(error);
  }
}
