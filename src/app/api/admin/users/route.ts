import { NextRequest, NextResponse } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { createUserByAdmin } from '@/server/domain/users';
import { listAdminUsers, serializeAdminUser } from '@/server/auth/serialize';
import { writeAudit } from '@/server/audit';
import { ApiError } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request, { permission: 'users.read' });
    const search = request.nextUrl.searchParams.get('q') || undefined;
    const usuarios = listAdminUsers({
      search,
      includeMinorProfiles: hasPermission(user, 'minors.read'),
      limit: 200,
    });
    return NextResponse.json(
      { ok: true, usuarios },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.manage' });
    const body = await readJsonBody<{
      email?: string;
      nombreCompleto?: string;
      password?: string;
      studentProfile?: {
        age?: number;
        grade?: string;
        subnivel?: string;
        folderCode?: string;
        profileAgent?: string;
        mentorEmail?: string;
      } | null;
    }>(request);
    const email = requireJsonString(body.email, 'email', 254);
    const displayName = requireJsonString(body.nombreCompleto, 'nombreCompleto', 160);
    const password =
      typeof body.password === 'string' && body.password.trim() ? body.password : null;

    if (body.studentProfile && !hasPermission(user, 'minors.read')) {
      throw new ApiError(
        403,
        'MINORS_FORBIDDEN',
        'No tienes permiso para crear expedientes de menores.'
      );
    }

    const created = await createUserByAdmin({
      actor: user,
      email,
      displayName,
      password,
      studentProfile: body.studentProfile
        ? {
            age: Number(body.studentProfile.age) || undefined,
            grade: body.studentProfile.grade,
            subnivel: body.studentProfile.subnivel,
            folderCode: body.studentProfile.folderCode,
            profileAgent: body.studentProfile.profileAgent,
            mentorEmail: body.studentProfile.mentorEmail,
          }
        : null,
    });

    writeAudit({
      actor: user,
      action: 'user.created',
      entityType: 'user',
      entityId: created.userId,
      after: {
        email,
        displayName,
        studentProfile: Boolean(body.studentProfile),
      },
    });

    const usuario = serializeAdminUser(created.userId, {
      includeMinorProfile: hasPermission(user, 'minors.read'),
    });
    return jsonOk({
      usuario,
      passwordInicial: created.initialPassword || null,
      mensaje: created.initialPassword
        ? 'Usuario creado. Entrega la contraseña inicial una sola vez y exige su cambio.'
        : 'Usuario creado correctamente.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
