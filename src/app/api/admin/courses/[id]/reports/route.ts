import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { aggregateAssessmentStats } from '@/server/domain/courseAssessments';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request, { permission: 'grades.manage' });
    const { id } = await context.params;
    const attempts = prepare(`
      SELECT a.id, a.attempt_number, a.status, a.correct_count, a.total_questions, a.percentage,
             a.submitted_at, a.graded_at, u.id AS user_id, u.display_name,
             asm.title AS assessment_title, asm.kind AS assessment_kind,
             gr.drive_status, gr.drive_url
      FROM assessment_attempts a
      JOIN assessments asm ON asm.id = a.assessment_id
      JOIN users u ON u.id = a.user_id
      LEFT JOIN course_grade_reports gr ON gr.attempt_id = a.id
      WHERE asm.program_id = ?
      ORDER BY a.submitted_at DESC
      LIMIT 500
    `).all(id) as Array<{
      id: string;
      attempt_number: number;
      status: string;
      correct_count: number | null;
      total_questions: number | null;
      percentage: number | null;
      submitted_at: string | null;
      graded_at: string | null;
      user_id: string;
      display_name: string | null;
      assessment_title: string;
      assessment_kind: string;
      drive_status: string | null;
      drive_url: string | null;
    }>;

    return NextResponse.json(
      {
        ok: true,
        agregados: aggregateAssessmentStats(id),
        intentos: attempts.map((attempt) => ({
          id: attempt.id,
          attemptNumber: Number(attempt.attempt_number),
          status: attempt.status,
          correctCount: attempt.correct_count === null ? null : Number(attempt.correct_count),
          totalQuestions: attempt.total_questions === null ? null : Number(attempt.total_questions),
          percentage: attempt.percentage === null ? null : Number(attempt.percentage),
          submittedAt: attempt.submitted_at,
          gradedAt: attempt.graded_at,
          userId: attempt.user_id,
          studentName: attempt.display_name || 'Estudiante',
          assessmentTitle: attempt.assessment_title,
          assessmentKind: attempt.assessment_kind,
          driveStatus: attempt.drive_status || 'skipped',
          driveUrl: attempt.drive_url,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
