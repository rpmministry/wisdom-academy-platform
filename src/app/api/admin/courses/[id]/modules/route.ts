import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { addModule, type ModuleKind } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      kind?: ModuleKind;
      description?: string;
      position?: number;
    }>(request);
    const module = addModule(
      id,
      {
        title: body.title || '',
        kind: body.kind,
        description: body.description,
        position: body.position,
      },
      user
    );
    return NextResponse.json({ ok: true, modulo: module });
  } catch (error) {
    return handleRouteError(error);
  }
}
