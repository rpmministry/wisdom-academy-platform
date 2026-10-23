import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { createGiftCodes, listGiftCodes } from '@/server/domain/gifts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'gifts.read' });
    return NextResponse.json(
      { ok: true, regalos: listGiftCodes() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'gifts.manage' });
    const body = await readJsonBody<{
      label?: string;
      resourceIds?: unknown;
      count?: number;
      maxRedemptions?: number;
      redeemBy?: string;
      accessStartsAt?: string;
      durationDays?: number;
      durationMonths?: number;
      endsAt?: string;
      unlimited?: boolean;
      recipientEmail?: string;
      customCode?: string;
      notes?: string;
    }>(request);
    const resourceIds = Array.isArray(body.resourceIds)
      ? body.resourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    if (resourceIds.length === 0) {
      throw new ApiError(
        400,
        'GIFT_SCOPE_REQUIRED',
        'Selecciona al menos un curso, taller, grado o programa concreto.'
      );
    }
    const created = createGiftCodes({
      actor: user,
      label: body.label || null,
      resourceIds,
      count: Number(body.count) || 1,
      maxRedemptions: Number(body.maxRedemptions) || 1,
      redeemBy: body.redeemBy || null,
      accessStartsAt: body.accessStartsAt || null,
      durationDays: body.durationDays ? Number(body.durationDays) : null,
      durationMonths: body.durationMonths ? Number(body.durationMonths) : null,
      endsAt: body.endsAt || null,
      unlimited: Boolean(body.unlimited),
      recipientEmail: body.recipientEmail || null,
      customCode: body.customCode || null,
      notes: body.notes || null,
    });
    writeAudit({
      actor: user,
      action: 'gift.codes.created',
      entityType: 'gift_code',
      entityId: created[0]?.id,
      after: {
        count: created.length,
        resourceIds,
        recipient: body.recipientEmail || null,
        unlimited: Boolean(body.unlimited),
        durationDays: body.durationDays || null,
        durationMonths: body.durationMonths || null,
      },
    });
    return jsonOk({
      codigos: created,
      mensaje: 'Códigos generados. Cópialos ahora: no volverán a mostrarse completos.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
