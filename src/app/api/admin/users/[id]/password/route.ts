import { NextRequest } from 'next/server';
import { handleRouteError, jsonOk, readJsonBody, requireSession } from '@/server/http/api';
import { resetUserPasswordByAdmin } from '@/server/domain/users';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.manage' });
    const body = await readJsonBody<{ password?: string }>(request);
    const result = await resetUserPasswordByAdmin({
      userId: (await context.params).id,
      actor: user,
      newPassword: typeof body.password === 'string' ? body.password : null,
    });
    writeAudit({
      actor: user,
      action: 'user.password.reset',
      entityType: 'user',
      entityId: (await context.params).id,
      after: { generated: result.generated },
    });
    return jsonOk({
      passwordInicial: result.generated ? result.password : null,
      mensaje: result.generated
        ? 'Contraseña restablecida. Se muestra una sola vez.'
        : 'Contraseña actualizada. El usuario deberá cambiarla en su próximo acceso.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
