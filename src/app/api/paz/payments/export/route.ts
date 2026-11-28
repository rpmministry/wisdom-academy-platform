import { NextRequest, NextResponse } from 'next/server';
import {
  handleRouteError,
  requireSession,
} from '@/server/http/api';
import { listPazPaymentIntents } from '@/server/domain/paz';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request, { permission: 'orders.read' });
    const pagos = listPazPaymentIntents();

    writeAudit({
      actor: user,
      action: 'paz.payments.exported',
      entityType: 'paz_payment_intent',
      entityId: 'csv_export',
      after: { count: pagos.length },
    });

    const headers = [
      'Referencia',
      'Nombre',
      'Correo',
      'Telefono',
      'Plan',
      'Metodo',
      'Monto_USD',
      'Estado_Pago',
      'Ref_Transferencia',
      'Tiene_Comprobante',
      'Tiene_Codigo',
      'Estado_Codigo',
      'Acceso_Activo',
      'Fecha_Inscripcion',
      'Revisado_Por',
      'Fecha_Revision',
      'Observacion',
    ];

    const lines = [headers.join(',')];
    for (const p of pagos) {
      lines.push(
        [
          p.reference,
          p.buyerName,
          p.buyerEmail,
          p.buyerPhone || '',
          p.plan,
          p.method === 'bank_transfer' ? 'Transferencia' : 'PayPhone',
          (p.amountCents / 100).toFixed(2),
          p.status,
          p.transferReference || '',
          p.hasReceipt ? 'Si' : 'No',
          p.hasAccessCode ? 'Si' : 'No',
          p.accessCodeStatus || '',
          p.hasActiveAccess ? 'Si' : 'No',
          p.createdAt,
          p.reviewedBy || '',
          p.reviewedAt || '',
          p.adminNotes || p.reviewNote || '',
        ]
          .map(csvEscape)
          .join(',')
      );
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="paz-en-la-mesa-participantes-${dateStamp}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
