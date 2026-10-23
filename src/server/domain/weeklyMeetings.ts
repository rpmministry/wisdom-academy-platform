import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { hasPermission } from '../auth/authorization';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';
import { writeAudit } from '../audit';
import {
  DEFAULT_MEETING_URL,
  providerLabel,
  resolveEmbedMode,
  validateMeetingUrl,
  type MeetingEmbedMode,
  type MeetingProviderId,
} from '@/lib/meetings/providers';

export type MeetingStatus = 'draft' | 'published' | 'live' | 'completed' | 'cancelled';

export interface WeeklyMeetingRow {
  id: string;
  program_id: string;
  module_id: string | null;
  week_number: number;
  title: string;
  provider: MeetingProviderId;
  embed_mode: MeetingEmbedMode;
  join_url: string;
  host_url: string | null;
  host_name: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  status: MeetingStatus;
  student_note: string | null;
  staff_note: string | null;
  recording_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeeklyMeetingView {
  id: string;
  programId: string;
  moduleId: string | null;
  weekNumber: number;
  title: string;
  provider: MeetingProviderId;
  providerLabel: string;
  embedMode: MeetingEmbedMode;
  joinUrl: string;
  hostUrl?: string | null;
  hostName: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  status: MeetingStatus;
  studentNote: string | null;
  staffNote?: string | null;
  recordingUrl: string | null;
  canJoin: boolean;
  isLive: boolean;
  updatedAt: string;
}

export function canManageMeetings(user: AuthUser | null): boolean {
  return Boolean(user && (user.isOwner || hasPermission(user, 'meetings.manage')));
}

export function meetingAccessWindow(): { earlyMinutes: number; lateMinutes: number } {
  return { earlyMinutes: 15, lateMinutes: 30 };
}

export function computeMeetingAvailability(
  row: Pick<WeeklyMeetingRow, 'status' | 'starts_at' | 'ends_at'>,
  now = Date.now()
): { canJoin: boolean; isLive: boolean } {
  if (row.status === 'draft' || row.status === 'cancelled' || row.status === 'completed') {
    return { canJoin: false, isLive: false };
  }
  const start = row.starts_at ? Date.parse(row.starts_at) : null;
  const end = row.ends_at ? Date.parse(row.ends_at) : null;
  const { earlyMinutes, lateMinutes } = meetingAccessWindow();
  const isLive =
    row.status === 'live' ||
    (start !== null && Number.isFinite(start) && now >= start && (end === null || !Number.isFinite(end) || now <= end));
  if (start !== null && Number.isFinite(start) && now < start - earlyMinutes * 60_000) {
    return { canJoin: false, isLive: false };
  }
  if (end !== null && Number.isFinite(end) && now > end + lateMinutes * 60_000) {
    return { canJoin: false, isLive: false };
  }
  return { canJoin: true, isLive };
}

function toView(row: WeeklyMeetingRow, includeHost: boolean): WeeklyMeetingView {
  const availability = computeMeetingAvailability(row);
  return {
    id: row.id,
    programId: row.program_id,
    moduleId: row.module_id,
    weekNumber: Number(row.week_number),
    title: row.title,
    provider: row.provider,
    providerLabel: providerLabel(row.provider),
    embedMode: row.embed_mode,
    joinUrl: row.join_url,
    ...(includeHost ? { hostUrl: row.host_url, staffNote: row.staff_note } : {}),
    hostName: row.host_name,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    timezone: row.timezone,
    status: row.status,
    studentNote: row.student_note,
    recordingUrl: row.recording_url,
    canJoin: availability.canJoin,
    isLive: availability.isLive,
    updatedAt: row.updated_at,
  };
}

export function listWeeklyMeetingsForProgram(
  programId: string,
  options: { includeUnpublished?: boolean; includeHost?: boolean } = {}
): WeeklyMeetingView[] {
  const rows = prepare(
    'SELECT * FROM weekly_meetings WHERE program_id = ? ORDER BY week_number'
  ).all(programId) as WeeklyMeetingRow[];
  return rows
    .filter((row) => options.includeUnpublished || row.status !== 'draft')
    .map((row) => toView(row, Boolean(options.includeHost)));
}

export function getWeeklyMeetingForProgramWeek(
  programId: string,
  weekNumber: number,
  options: { includeUnpublished?: boolean; includeHost?: boolean } = {}
): WeeklyMeetingView | null {
  const row = prepare(
    'SELECT * FROM weekly_meetings WHERE program_id = ? AND week_number = ?'
  ).get(programId, weekNumber) as WeeklyMeetingRow | undefined;
  if (!row) return null;
  if (!options.includeUnpublished && row.status === 'draft') {
    return null;
  }
  return toView(row, Boolean(options.includeHost));
}

export function getWeeklyMeetingById(
  meetingId: string,
  options: { includeHost?: boolean } = {}
): WeeklyMeetingView | null {
  const row = prepare('SELECT * FROM weekly_meetings WHERE id = ?').get(meetingId) as
    | WeeklyMeetingRow
    | undefined;
  return row ? toView(row, Boolean(options.includeHost)) : null;
}

export function listAllWeeklyMeetings(): Array<
  WeeklyMeetingView & { programTitle: string; programSlug: string }
> {
  const rows = prepare(`
    SELECT m.*, cp.title AS program_title, r.slug AS program_slug
    FROM weekly_meetings m
    JOIN course_programs cp ON cp.id = m.program_id
    JOIN resources r ON r.id = cp.resource_id
    ORDER BY cp.title, m.week_number
  `).all() as Array<WeeklyMeetingRow & { program_title: string; program_slug: string }>;
  return rows.map((row) => ({
    ...toView(row, true),
    programTitle: row.program_title,
    programSlug: row.program_slug,
  }));
}

export interface UpsertWeeklyMeetingInput {
  weekNumber: number;
  moduleId?: string | null;
  title?: string;
  provider?: MeetingProviderId;
  embedMode?: MeetingEmbedMode | null;
  joinUrl: string;
  hostUrl?: string | null;
  hostName?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  timezone?: string;
  status?: MeetingStatus;
  studentNote?: string | null;
  staffNote?: string | null;
  recordingUrl?: string | null;
}

function parseOptionalDate(value: string | null | undefined, label: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'MEETING_DATE_INVALID', `La fecha de ${label} no es válida.`);
  }
  return date.toISOString();
}

export function upsertWeeklyMeeting(
  programId: string,
  input: UpsertWeeklyMeetingInput,
  actor: AuthUser
): WeeklyMeetingView {
  const program = prepare('SELECT id FROM course_programs WHERE id = ?').get(programId) as
    | { id: string }
    | undefined;
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');

  const week = Number(input.weekNumber);
  if (!Number.isInteger(week) || week < 1 || week > 99) {
    throw new ApiError(400, 'MEETING_WEEK_INVALID', 'La semana debe estar entre 1 y 99.');
  }
  if (input.moduleId) {
    const module = prepare('SELECT program_id FROM course_modules WHERE id = ?').get(
      input.moduleId
    ) as { program_id: string } | undefined;
    if (!module || module.program_id !== programId) {
      throw new ApiError(400, 'MEETING_MODULE_INVALID', 'El módulo no pertenece al programa.');
    }
  }

  const provider = (input.provider || 'google_meet') as MeetingProviderId;
  if (!['google_meet', 'jitsi', 'daily', 'bigbluebutton', 'zoom', 'teams', 'custom'].includes(provider)) {
    throw new ApiError(400, 'MEETING_PROVIDER_INVALID', 'El proveedor de videollamada no es válido.');
  }
  const urlResult = validateMeetingUrl(provider, input.joinUrl);
  if (!urlResult.ok) throw new ApiError(400, 'MEETING_URL_INVALID', urlResult.message);

  const embedMode = resolveEmbedMode(provider, input.embedMode);
  const status: MeetingStatus = input.status || 'published';
  if (!['draft', 'published', 'live', 'completed', 'cancelled'].includes(status)) {
    throw new ApiError(400, 'MEETING_STATUS_INVALID', 'El estado de la reunión no es válido.');
  }
  const startsAt = parseOptionalDate(input.startsAt, 'inicio');
  const endsAt = parseOptionalDate(input.endsAt, 'fin');
  if (startsAt && endsAt && startsAt >= endsAt) {
    throw new ApiError(400, 'MEETING_WINDOW_INVALID', 'La hora de inicio debe ser anterior a la de fin.');
  }
  let hostUrl: string | null = null;
  if (input.hostUrl?.trim()) {
    const hostResult = validateMeetingUrl(provider, input.hostUrl);
    if (!hostResult.ok) throw new ApiError(400, 'MEETING_HOST_URL_INVALID', hostResult.message);
    hostUrl = hostResult.url;
  }
  let recordingUrl: string | null = null;
  if (input.recordingUrl?.trim()) {
    const parsed = new URL(input.recordingUrl.trim());
    if (parsed.protocol !== 'https:') {
      throw new ApiError(400, 'MEETING_RECORDING_INVALID', 'La grabación debe usar HTTPS.');
    }
    recordingUrl = parsed.toString();
  }

  const existing = prepare(
    'SELECT * FROM weekly_meetings WHERE program_id = ? AND week_number = ?'
  ).get(programId, week) as WeeklyMeetingRow | undefined;
  const now = nowIso();
  const title = (input.title || `Repaso en vivo — Semana ${String(week).padStart(2, '0')}`)
    .trim()
    .slice(0, 250);
  const hostName = input.hostName?.trim().slice(0, 200) || 'Profesor de la semana';
  const timezone = input.timezone?.trim().slice(0, 80) || 'America/Guayaquil';
  const studentNote = input.studentNote?.slice(0, 2000) || null;
  const staffNote = input.staffNote?.slice(0, 2000) || null;

  let meetingId: string;
  if (existing) {
    meetingId = existing.id;
    prepare(`
      UPDATE weekly_meetings
      SET module_id = ?, title = ?, provider = ?, embed_mode = ?, join_url = ?, host_url = ?,
          host_name = ?, starts_at = ?, ends_at = ?, timezone = ?, status = ?,
          student_note = ?, staff_note = ?, recording_url = ?, updated_at = ?
      WHERE id = ?
    `).run(
      input.moduleId === undefined ? existing.module_id : input.moduleId || null,
      title,
      provider,
      embedMode,
      urlResult.url,
      hostUrl,
      hostName,
      startsAt,
      endsAt,
      timezone,
      status,
      studentNote,
      staffNote,
      recordingUrl,
      now,
      meetingId
    );
  } else {
    meetingId = `mtg_${randomToken(16)}`;
    withTransaction(() => {
      prepare(`
        INSERT INTO weekly_meetings
          (id, program_id, module_id, week_number, title, provider, embed_mode, join_url,
           host_url, host_name, starts_at, ends_at, timezone, status, student_note, staff_note,
           recording_url, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        meetingId,
        programId,
        input.moduleId || null,
        week,
        title,
        provider,
        embedMode,
        urlResult.url,
        hostUrl,
        hostName,
        startsAt,
        endsAt,
        timezone,
        status,
        studentNote,
        staffNote,
        recordingUrl,
        actor.id,
        now,
        now
      );
    });
  }

  writeAudit({
    actor,
    action: existing ? 'weekly_meeting.updated' : 'weekly_meeting.created',
    entityType: 'weekly_meeting',
    entityId: meetingId,
    before: existing
      ? { provider: existing.provider, status: existing.status, week: existing.week_number }
      : undefined,
    after: { programId, week, provider, embedMode, status, startsAt, endsAt },
  });

  const saved = prepare('SELECT * FROM weekly_meetings WHERE id = ?').get(meetingId) as WeeklyMeetingRow;
  return toView(saved, true);
}

export function deleteWeeklyMeeting(meetingId: string, actor: AuthUser): void {
  const row = prepare('SELECT * FROM weekly_meetings WHERE id = ?').get(meetingId) as
    | WeeklyMeetingRow
    | undefined;
  if (!row) throw new ApiError(404, 'MEETING_NOT_FOUND', 'La reunión no existe.');
  prepare('DELETE FROM weekly_meetings WHERE id = ?').run(meetingId);
  writeAudit({
    actor,
    action: 'weekly_meeting.deleted',
    entityType: 'weekly_meeting',
    entityId: meetingId,
    before: { programId: row.program_id, week: row.week_number, provider: row.provider },
  });
}

/**
 * Crea las salas de las semanas indicadas si aún no existen. No modifica las
 * salas existentes ni sobrescribe enlaces configurados por administración.
 */
export function ensureDefaultWeeklyMeetings(
  programId: string,
  weeks: number[],
  options: { joinUrl?: string; hostName?: string } = {}
): number {
  const firstModule = prepare(`
    SELECT id FROM course_modules WHERE program_id = ?
    ORDER BY CASE WHEN kind = 'semester' THEN 0 ELSE 1 END, position, title LIMIT 1
  `).get(programId) as { id: string } | undefined;
  const now = nowIso();
  let created = 0;
  for (const week of weeks) {
    if (!Number.isInteger(week) || week < 1) continue;
    const exists = prepare(
      'SELECT id FROM weekly_meetings WHERE program_id = ? AND week_number = ?'
    ).get(programId, week);
    if (exists) continue;
    const joinUrl = options.joinUrl || DEFAULT_MEETING_URL;
    const result = validateMeetingUrl('google_meet', joinUrl);
    if (!result.ok) continue;
    prepare(`
      INSERT INTO weekly_meetings
        (id, program_id, module_id, week_number, title, provider, embed_mode, join_url,
         host_name, timezone, status, student_note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'google_meet', 'external', ?, ?, 'America/Guayaquil', 'published', ?, ?, ?)
    `).run(
      `mtg_${randomToken(16)}`,
      programId,
      firstModule?.id || null,
      week,
      `Repaso en vivo — Semana ${String(week).padStart(2, '0')}`,
      result.url,
      options.hostName || 'Profesor de la semana',
      'Conéctate con tu profesor para repasar los temas de la semana.',
      now,
      now
    );
    created += 1;
  }
  return created;
}
