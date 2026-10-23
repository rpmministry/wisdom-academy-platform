import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import {
  deleteWeeklyMeeting,
  getWeeklyMeetingById,
  upsertWeeklyMeeting,
  type UpsertWeeklyMeetingInput,
} from '@/server/domain/weeklyMeetings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function resolveMeeting(programId: string, meetingId: string) {
  const meeting = getWeeklyMeetingById(meetingId, { includeHost: true });
  if (!meeting || meeting.programId !== programId) {
    throw new ApiError(404, 'MEETING_NOT_FOUND', 'La reunión no existe en este programa.');
  }
  return meeting;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'meetings.manage', mutation: true });
    const { id, meetingId } = await context.params;
    const current = await resolveMeeting(id, meetingId);
    const body = await readJsonBody<Partial<UpsertWeeklyMeetingInput>>(request, 256 * 1024);
    const meeting = upsertWeeklyMeeting(
      id,
      {
        weekNumber: Number(body.weekNumber ?? current.weekNumber),
        moduleId: body.moduleId === undefined ? current.moduleId : body.moduleId,
        title: body.title ?? current.title,
        provider: body.provider ?? current.provider,
        embedMode: body.embedMode === undefined ? current.embedMode : body.embedMode,
        joinUrl: body.joinUrl ?? current.joinUrl,
        hostUrl: body.hostUrl === undefined ? current.hostUrl ?? null : body.hostUrl,
        hostName: body.hostName === undefined ? current.hostName : body.hostName,
        startsAt: body.startsAt === undefined ? current.startsAt : body.startsAt,
        endsAt: body.endsAt === undefined ? current.endsAt : body.endsAt,
        timezone: body.timezone ?? current.timezone,
        status: body.status ?? current.status,
        studentNote: body.studentNote === undefined ? current.studentNote : body.studentNote,
        staffNote: body.staffNote === undefined ? current.staffNote ?? null : body.staffNote,
        recordingUrl: body.recordingUrl === undefined ? current.recordingUrl : body.recordingUrl,
      },
      user
    );
    return NextResponse.json({ ok: true, reunion: meeting });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'meetings.manage', mutation: true });
    const { id, meetingId } = await context.params;
    await resolveMeeting(id, meetingId);
    deleteWeeklyMeeting(meetingId, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
