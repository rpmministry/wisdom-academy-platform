import { NextRequest } from 'next/server';
import {
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { recordPazHeartbeat } from '@/server/domain/pazAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request, { mutation: true });
    const body = await readJsonBody(request);
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'Browser';

    const result = recordPazHeartbeat(session.user, {
      programSlug: typeof body.programSlug === 'string' ? body.programSlug : undefined,
      lessonId: typeof body.lessonId === 'string' ? body.lessonId : undefined,
      classNumber: typeof body.classNumber === 'number' ? body.classNumber : undefined,
      blockNumber: typeof body.blockNumber === 'number' ? body.blockNumber : undefined,
      activeSeconds: typeof body.activeSeconds === 'number' ? body.activeSeconds : 0,
      idleSeconds: typeof body.idleSeconds === 'number' ? body.idleSeconds : 0,
      videoSeconds: typeof body.videoSeconds === 'number' ? body.videoSeconds : 0,
      isVideoPlaying: Boolean(body.isVideoPlaying),
      clientIp,
      userAgent,
    });

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
