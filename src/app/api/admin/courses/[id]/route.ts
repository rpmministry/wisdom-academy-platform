import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import {
  getProgramDetail,
  getProgramRowById,
  updateProgram,
  type ProgramStatus,
} from '@/server/domain/coursePrograms';
import { listAssessments } from '@/server/domain/courseAssessments';
import { listImportRuns } from '@/server/domain/courseImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request, { permission: 'resources.manage' });
    const { id } = await context.params;
    const program = getProgramRowById(id);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    return NextResponse.json(
      {
        ok: true,
        programa: getProgramDetail(program, { includeStaffMaterials: true }),
        evaluaciones: listAssessments(id),
        importaciones: listImportRuns(id),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      subtitle?: string | null;
      description?: string | null;
      institution?: string | null;
      level?: string | null;
      audience?: string | null;
      durationLabel?: string | null;
      objectives?: unknown;
      requirements?: unknown;
      coverImageUrl?: string | null;
      status?: ProgramStatus;
      driveFolderId?: string | null;
      driveFolderUrl?: string | null;
    }>(request);
    const program = updateProgram(
      id,
      {
        title: body.title,
        subtitle: body.subtitle,
        description: body.description,
        institution: body.institution,
        level: body.level,
        audience: body.audience,
        durationLabel: body.durationLabel,
        objectives: body.objectives,
        requirements: body.requirements,
        coverImageUrl: body.coverImageUrl,
        status: body.status,
        driveFolderId: body.driveFolderId,
        driveFolderUrl: body.driveFolderUrl,
      },
      user
    );
    return NextResponse.json({ ok: true, programa: program });
  } catch (error) {
    return handleRouteError(error);
  }
}
