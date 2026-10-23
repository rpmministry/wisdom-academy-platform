import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import {
  expandGiftCodeScope,
  listGiftBeneficiaries,
  listGiftCodes,
  pauseGiftCode,
  revokeGiftCode,
  updateGiftCodeSettings,
} from '@/server/domain/gifts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: giftId } = await context.params;
    requireSession(request, { permission: 'gifts.read' });
    const gift = listGiftCodes().find((item) => item.id === giftId);
    if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
    return NextResponse.json(
      { ok: true, regalo: gift, beneficiarios: listGiftBeneficiaries(gift.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: giftId } = await context.params;
    const { user } = requireSession(request, { mutation: true, permission: 'gifts.manage' });
    const gift = listGiftCodes().find((item) => item.id === giftId);
    if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
    const body = await readJsonBody<{
      action?: 'pause' | 'resume' | 'revoke' | 'expand' | 'settings';
      resourceIds?: unknown;
      applyToExisting?: boolean;
      confirmarRetroactivo?: boolean;
      redeemBy?: string | null;
      maxRedemptions?: number | null;
      durationDays?: number | null;
      durationMonths?: number | null;
      endsAt?: string | null;
      unlimited?: boolean;
      notes?: string | null;
      reason?: string;
    }>(request);

    if (body.action === 'pause' || body.action === 'resume') {
      pauseGiftCode(gift.id, body.action === 'pause');
    } else if (body.action === 'revoke') {
      revokeGiftCode(gift.id, user, body.reason || 'Código revocado');
    } else if (body.action === 'expand') {
      const resourceIds = Array.isArray(body.resourceIds)
        ? body.resourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [];
      if (resourceIds.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona los recursos que se añadirán.');
      }
      if (body.applyToExisting && body.confirmarRetroactivo !== true) {
        throw new ApiError(
          400,
          'CONFIRMATION_REQUIRED',
          'La ampliación retroactiva requiere confirmación explícita.'
        );
      }
      const result = expandGiftCodeScope({
        giftCodeId: gift.id,
        resourceIds,
        applyToExisting: Boolean(body.applyToExisting),
        actor: user,
      });
      writeAudit({
        actor: user,
        action: 'gift.scope.expanded',
        entityType: 'gift_code',
        entityId: gift.id,
        before: { resources: gift.resources, redemptions: gift.redemptionCount },
        after: {
          added: result.added,
          applyToExisting: Boolean(body.applyToExisting),
          affectedBeneficiaries: result.affectedBeneficiaries,
        },
      });
      return jsonOk({ ...result, mensaje: 'Alcance del código ampliado.' });
    } else if (body.action === 'settings') {
      updateGiftCodeSettings({
        giftCodeId: gift.id,
        redeemBy: body.redeemBy,
        maxRedemptions: body.maxRedemptions,
        durationDays: body.durationDays,
        durationMonths: body.durationMonths,
        endsAt: body.endsAt,
        unlimited: body.unlimited,
        notes: body.notes,
      });
    } else {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción indicada no es válida.');
    }

    writeAudit({
      actor: user,
      action: `gift.${body.action}`,
      entityType: 'gift_code',
      entityId: gift.id,
      before: gift,
      after: { action: body.action },
    });
    return jsonOk({ mensaje: 'Código de regalo actualizado.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
