import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import {
  createInvitation,
  listInvitations,
  type InvitationKind,
  type InvitationMode,
} from '@/server/domain/invitations';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'invitations.read' });
    return NextResponse.json(
      { ok: true, invitaciones: listInvitations() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'founder_codes.manage' });
    const body = await readJsonBody<{
      kind?: InvitationKind;
      mode?: InvitationMode;
      email?: string;
      label?: string;
      maxUses?: number;
      startsAt?: string;
      expiresAt?: string;
      accessStartsAt?: string;
      accessDays?: number;
      accessMonths?: number;
      accessEndsAt?: string;
      unlimited?: boolean;
    }>(request);
    if (body.kind !== 'founder' && body.kind !== 'investor') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La invitación debe ser de fundador o inversor.');
    }
    if (body.mode !== 'nominated' && body.mode !== 'open') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La modalidad debe ser nominativa o abierta.');
    }
    const created = createInvitation({
      actor: user,
      kind: body.kind,
      mode: body.mode,
      email: body.email || null,
      label: body.label || null,
      maxUses: body.maxUses ? Number(body.maxUses) : 1,
      startsAt: body.startsAt || null,
      expiresAt: body.expiresAt || null,
      accessStartsAt: body.accessStartsAt || null,
      accessDays: body.accessDays ? Number(body.accessDays) : null,
      accessMonths: body.accessMonths ? Number(body.accessMonths) : null,
      accessEndsAt: body.accessEndsAt || null,
      unlimited: Boolean(body.unlimited),
    });
    writeAudit({
      actor: user,
      action: 'invitation.created',
      entityType: 'invitation',
      entityId: created.id,
      after: {
        kind: body.kind,
        mode: body.mode,
        email: body.email || null,
        maxUses: body.maxUses || 1,
        unlimited: Boolean(body.unlimited),
      },
    });
    return jsonOk({
      invitacion: created,
      mensaje: 'Invitación creada. Comparte el código por un canal seguro; no se mostrará de nuevo.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
