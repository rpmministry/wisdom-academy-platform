import { NextRequest } from 'next/server';
import { ApiError, handleRouteError, jsonOk, requireSession } from '@/server/http/api';
import { getOrderForUser } from '@/server/domain/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request);
    const order = getOrderForUser((await context.params).id, user.id);
    if (!order) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe o no pertenece a tu cuenta.');
    }
    return jsonOk(
      { orden: order },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
