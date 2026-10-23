import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { deleteMaterial } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { materialId } = await context.params;
    deleteMaterial(materialId, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
