import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import { getPazStudentDetail } from '@/server/domain/pazAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const { userId } = await params;
    const detail = getPazStudentDetail(userId);
    if (!detail) {
      throw new ApiError(404, 'STUDENT_NOT_FOUND', 'Estudiante no encontrado en el taller.');
    }
    return jsonOk({ student: detail });
  } catch (error) {
    return handleRouteError(error);
  }
}
