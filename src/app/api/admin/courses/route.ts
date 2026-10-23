import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  optionalJsonString,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import {
  addModule,
  createProgram,
  listPrograms,
  type ProgramKind,
} from '@/server/domain/coursePrograms';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'resources.manage' });
    const kindParam = request.nextUrl.searchParams.get('kind');
    const kind: ProgramKind | undefined =
      kindParam === 'course' || kindParam === 'workshop' ? kindParam : undefined;
    return NextResponse.json(
      { ok: true, programas: listPrograms({ includeDrafts: true, kind }) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const body = await readJsonBody<{
      kind?: ProgramKind;
      title?: string;
      subtitle?: string;
      description?: string;
      institution?: string;
      level?: string;
      audience?: string;
      durationLabel?: string;
      objectives?: unknown;
      requirements?: unknown;
      coverImageUrl?: string;
      slug?: string;
      status?: 'draft' | 'published' | 'archived';
      semesters?: number;
      n2nTemplate?: boolean;
      driveFolderId?: string;
      driveFolderUrl?: string;
    }>(request);
    if (!body.kind || !['course', 'workshop'].includes(body.kind)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona curso o taller.');
    }
    if (!body.title?.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El título es obligatorio.');
    }
    const program = createProgram(
      {
        kind: body.kind,
        title: body.title,
        subtitle: optionalJsonString(body.subtitle, 300),
        description: optionalJsonString(body.description, 4000),
        institution: optionalJsonString(body.institution, 250),
        level: optionalJsonString(body.level, 120),
        audience: optionalJsonString(body.audience, 500),
        durationLabel: optionalJsonString(body.durationLabel, 120),
        objectives: body.objectives,
        requirements: body.requirements,
        coverImageUrl: optionalJsonString(body.coverImageUrl, 1000),
        slug: optionalJsonString(body.slug, 80),
        status: body.status === 'published' ? 'published' : body.status === 'archived' ? 'archived' : 'draft',
        driveFolderId: optionalJsonString(body.driveFolderId, 200),
        driveFolderUrl: optionalJsonString(body.driveFolderUrl, 1000),
        metadata: body.n2nTemplate ? { structureTemplate: 'n2n', semesters: 10 } : {},
      },
      user
    );

    const semesterCount = body.n2nTemplate
      ? 10
      : Number.isInteger(body.semesters) && Number(body.semesters) >= 1 && Number(body.semesters) <= 20
        ? Number(body.semesters)
        : 0;

    if (semesterCount > 0 && program.kind === 'course') {
      const now = nowIso();
      for (let index = 1; index <= semesterCount; index += 1) {
        const module = addModule(
          program.id,
          {
            title: `Semestre ${String(index).padStart(2, '0')}`,
            kind: 'semester',
            position: index,
            description: `Estructura del semestre ${index}. Los contenidos se incorporarán desde los materiales oficiales.`,
          },
          user
        );
        prepare('UPDATE course_modules SET metadata_json = ?, created_at = ?, updated_at = ? WHERE id = ?').run(
          JSON.stringify({ semesterNumber: index, placeholder: true }),
          now,
          now,
          module.id
        );
      }
    }

    return jsonOk({ programa: program });
  } catch (error) {
    return handleRouteError(error);
  }
}
