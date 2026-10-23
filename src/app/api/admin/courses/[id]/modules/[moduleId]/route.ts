import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { deleteModule, updateModule, type ModuleKind } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { moduleId } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      description?: string | null;
      position?: number;
      kind?: ModuleKind;
      driveFolderId?: string | null;
      driveFolderUrl?: string | null;
    }>(request);
    const module = updateModule(moduleId, body, user);
    return NextResponse.json({ ok: true, modulo: module });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { moduleId } = await context.params;
    deleteModule(moduleId, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
