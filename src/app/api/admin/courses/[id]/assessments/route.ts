import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { createAssessment, listAssessments, type QuestionInput } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request, { permission: 'resources.manage' });
    const { id } = await context.params;
    return NextResponse.json(
      { ok: true, evaluaciones: listAssessments(id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      kind?: 'midterm' | 'final' | 'practice';
      moduleId?: string;
      instructions?: string;
      origin?: 'official' | 'generated';
      attemptsAllowed?: number;
      timeLimitMinutes?: number | null;
      passPercentage?: number | null;
      opensAt?: string | null;
      closesAt?: string | null;
      sourceRefs?: unknown;
      questions?: QuestionInput[];
    }>(request, 2 * 1024 * 1024);
    const assessment = createAssessment(
      id,
      {
        title: body.title || '',
        kind: body.kind,
        moduleId: body.moduleId,
        instructions: body.instructions,
        origin: body.origin,
        attemptsAllowed: body.attemptsAllowed,
        timeLimitMinutes: body.timeLimitMinutes,
        passPercentage: body.passPercentage,
        opensAt: body.opensAt,
        closesAt: body.closesAt,
        sourceRefs: body.sourceRefs,
        questions: body.questions,
      },
      user
    );
    return NextResponse.json({ ok: true, evaluacion: assessment });
  } catch (error) {
    return handleRouteError(error);
  }
}
