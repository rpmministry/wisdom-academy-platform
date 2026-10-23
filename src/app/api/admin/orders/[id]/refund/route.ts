import { NextRequest } from 'next/server';
import { handleRouteError, jsonOk, requireSession } from '@/server/http/api';
import { refundOrder } from '@/server/domain/checkout';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'orders.refund' });
    const result = await refundOrder({ orderId: (await context.params).id, actor: user });
    writeAudit({
      actor: user,
      action: result.refundStatus === 'completed' ? 'order.refunded' : 'order.refund_pending',
      entityType: 'order',
      entityId: (await context.params).id,
      after: { status: result.status, refundStatus: result.refundStatus },
    });
    return jsonOk({
      mensaje:
        result.refundStatus === 'completed'
          ? 'Reembolso completado. Los derechos de compra vinculados fueron revocados.'
          : 'PayPal registró el reembolso como pendiente. Los accesos se revocarán cuando el webhook verificado confirme su finalización.',
      estado: result.status,
      reembolso: result.refundStatus,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
