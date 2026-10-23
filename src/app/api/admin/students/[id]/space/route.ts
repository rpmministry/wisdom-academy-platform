import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { prepare } from '@/server/db';
import { buildStudentPortalData } from '@/server/domain/studentPortal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireSession(request, { permission: 'minors.read' });
    const { id } = await context.params;
    const student = prepare(
      'SELECT id, COALESCE(display_name, username, email) AS full_name, email FROM users WHERE id = ?'
    ).get(id) as { id: string; full_name: string; email: string } | undefined;
    if (!student) {
      return NextResponse.json(
        { ok: false, error: 'Estudiante no encontrado.' },
        { status: 404 }
      );
    }
    const profile = prepare('SELECT 1 AS present FROM student_profiles WHERE user_id = ?').get(id);
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: 'El usuario no tiene un perfil académico configurado.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        estudiante: {
          id: student.id,
          nombre: student.full_name,
          correo: student.email,
        },
        ...buildStudentPortalData(id),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
