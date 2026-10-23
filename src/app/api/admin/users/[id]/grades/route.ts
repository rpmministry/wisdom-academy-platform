import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireInteger,
  requireSession,
} from '@/server/http/api';
import { saveGrade } from '@/server/domain/users';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'grades.manage' });
    const body = await readJsonBody<{
      trimestre?: number;
      nota?: number;
      resourceId?: string;
      legacyCourseId?: number;
    }>(request);
    const trimester = requireInteger(body.trimestre, 'trimestre', 1, 3) as 1 | 2 | 3;
    const grade = Number(body.nota);
    if (!Number.isFinite(grade) || grade < 0 || grade > 10) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La nota debe estar entre 0 y 10.');
    }
    saveGrade({
      actor: user,
      userId: (await context.params).id,
      resourceId: typeof body.resourceId === 'string' ? body.resourceId : null,
      legacyCourseId:
        body.legacyCourseId === undefined ? null : Number(body.legacyCourseId),
      trimester,
      grade: Number(grade.toFixed(2)),
    });
    writeAudit({
      actor: user,
      action: 'grade.saved',
      entityType: 'user',
      entityId: (await context.params).id,
      after: {
        trimester,
        grade,
        resourceId: body.resourceId,
        legacyCourseId: body.legacyCourseId,
      },
    });
    return jsonOk({ mensaje: 'Calificación registrada.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
