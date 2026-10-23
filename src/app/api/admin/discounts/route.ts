import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import {
  createDiscount,
  listDiscounts,
  type DiscountKind,
} from '@/server/domain/discounts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'discounts.read' });
    return NextResponse.json(
      { ok: true, descuentos: listDiscounts() },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'discounts.manage' });
    const body = await readJsonBody<{
      name?: string;
      kind?: DiscountKind;
      value?: number;
      resourceIds?: unknown;
      appliesAll?: boolean;
      status?: 'draft' | 'active';
      startsAt?: string;
      endsAt?: string;
      maxUses?: number | null;
      maxUsesPerUser?: number | null;
      minPurchaseCents?: number;
      stackable?: boolean;
      codeCount?: number;
      customCode?: string;
    }>(request);
    const name = requireJsonString(body.name, 'name', 160);
    if (!body.kind || !['percentage', 'fixed', 'full'].includes(body.kind)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de descuento no es válido.');
    }
    const resourceIds = Array.isArray(body.resourceIds)
      ? body.resourceIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    if (!body.appliesAll && resourceIds.length === 0) {
      throw new ApiError(
        400,
        'DISCOUNT_SCOPE_REQUIRED',
        'Selecciona recursos elegibles o autoriza explícitamente toda la plataforma.'
      );
    }
    const result = createDiscount({
      actor: user,
      name,
      kind: body.kind,
      value: Number(body.value) || 0,
      resourceIds,
      appliesAll: Boolean(body.appliesAll),
      status: body.status === 'draft' ? 'draft' : 'active',
      startsAt: body.startsAt || null,
      endsAt: body.endsAt || null,
      maxUses: body.maxUses === null || body.maxUses === undefined ? null : Number(body.maxUses),
      maxUsesPerUser:
        body.maxUsesPerUser === null || body.maxUsesPerUser === undefined
          ? null
          : Number(body.maxUsesPerUser),
      minPurchaseCents: Number(body.minPurchaseCents) || 0,
      stackable: Boolean(body.stackable),
      codeCount: Math.min(Math.max(Number(body.codeCount) || 1, 1), 100),
      customCode: body.customCode || null,
    });
    writeAudit({
      actor: user,
      action: 'discount.created',
      entityType: 'discount',
      entityId: result.discountId,
      after: {
        name,
        kind: body.kind,
        value: body.value,
        resourceIds,
        appliesAll: Boolean(body.appliesAll),
        codeCount: result.codes.length,
      },
    });
    return jsonOk({
      discountId: result.discountId,
      codigos: result.codes,
      mensaje: 'Promoción creada. Los códigos se muestran una sola vez.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
