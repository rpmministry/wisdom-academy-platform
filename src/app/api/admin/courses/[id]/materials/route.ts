import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { addMaterial, type MaterialKind } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      kind?: MaterialKind;
      title?: string;
      url?: string;
      driveFileId?: string;
      lessonId?: string;
      moduleId?: string;
      visibility?: 'student' | 'staff';
      position?: number;
      metadata?: Record<string, unknown>;
    }>(request);
    const material = addMaterial(
      id,
      {
        kind: (body.kind || 'external_link') as MaterialKind,
        title: body.title || '',
        url: body.url,
        driveFileId: body.driveFileId,
        lessonId: body.lessonId,
        moduleId: body.moduleId,
        visibility: body.visibility,
        position: body.position,
        metadata: body.metadata,
      },
      user
    );
    return NextResponse.json({ ok: true, material });
  } catch (error) {
    return handleRouteError(error);
  }
}
