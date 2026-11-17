import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { checkRateLimit } from '@/server/http/rateLimit';
import {
  assertProgramAccess,
  canManageCourses,
} from '@/server/domain/coursePrograms';
import {
  getPazChallengeProgress,
  requirePazProgram,
  setPazChallengeDay,
} from '@/server/domain/paz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const program = requirePazProgram();
    if (!canManageCourses(user)) {
      assertProgramAccess(user, program);
    }
    return jsonOk({
      programa: {
        slug: 'paz-en-la-mesa',
        title: program.title,
        releaseAt: program.release_at,
      },
      dias: getPazChallengeProgress(user.id, program.id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('paz-challenge', user.id, 120, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados cambios seguidos. Espera un momento.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{
      day?: unknown;
      completed?: unknown;
      note?: unknown;
    }>(request, 16 * 1024);
    const day = Number(body.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El día debe estar entre 1 y 7.');
    }
    const dias = setPazChallengeDay(user, {
      day,
      completed: body.completed === true,
      note: typeof body.note === 'string' ? body.note : null,
    });
    return jsonOk({ dias });
  } catch (error) {
    return handleRouteError(error);
  }
}
