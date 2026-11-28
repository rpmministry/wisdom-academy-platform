import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  requireSession,
} from '@/server/http/api';
import { prepare } from '@/server/db';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ intentId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'orders.read' });
    const { intentId } = await context.params;
    const row = prepare(`
      SELECT id, reference, receipt_filename, receipt_mime, receipt_path
      FROM paz_payment_intents
      WHERE id = ?
    `).get(intentId) as
      | {
          id: string;
          reference: string;
          receipt_filename: string | null;
          receipt_mime: string | null;
          receipt_path: string | null;
        }
      | undefined;

    if (!row || !row.receipt_path) {
      throw new ApiError(404, 'RECEIPT_NOT_FOUND', 'No hay un comprobante adjunto para esta inscripción.');
    }

    const baseDir = path.resolve(process.env.PAZ_RECEIPTS_DIR || '.data/paz-receipts');
    const resolvedPath = path.resolve(row.receipt_path);
    if (!resolvedPath.startsWith(baseDir) || !fs.existsSync(resolvedPath)) {
      throw new ApiError(404, 'RECEIPT_FILE_MISSING', 'El archivo del comprobante no está disponible en el servidor.');
    }

    const bytes = fs.readFileSync(resolvedPath);
    const safeName = (row.receipt_filename || `${row.reference}-comprobante`).replace(/[^A-Za-z0-9._-]/g, '_');

    writeAudit({
      actor: user,
      action: 'paz.payment_receipt.viewed',
      entityType: 'paz_payment_intent',
      entityId: row.id,
      after: { reference: row.reference },
    });

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': row.receipt_mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
