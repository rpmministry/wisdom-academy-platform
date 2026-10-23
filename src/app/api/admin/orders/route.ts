import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { listOrders } from '@/server/domain/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const ordenes = listOrders().map((order) => ({
      id: order.id,
      userId: order.user_id,
      userEmail: order.userEmail,
      userName: order.userName,
      status: order.status,
      subtotalCents: Number(order.subtotal_cents),
      discountCents: Number(order.discount_cents),
      totalCents: Number(order.total_cents),
      currency: order.currency,
      paypalOrderId: order.paypal_order_id,
      paypalCaptureId: order.paypal_capture_id,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      items: order.items,
      transactions: order.transactions,
    }));
    return NextResponse.json(
      { ok: true, ordenes },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
