import fs from 'node:fs';
import path from 'node:path';
import { NextRequest } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import type { AuthUser } from '@/server/auth/authorization';
import { checkRateLimit } from '@/server/http/rateLimit';
import {
  attachPazPaymentReceipt,
  createPazPaymentIntent,
  listPazPaymentIntents,
  type PazPaymentMethod,
  type PazPlan,
} from '@/server/domain/paz';
import { pazBankDetails, pazPayphoneUrl } from '@/lib/paz-en-la-mesa/server';

const ALLOWED_RECEIPT_MIMES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const statusParam = request.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'pending' ||
      statusParam === 'approved' ||
      statusParam === 'rejected' ||
      statusParam === 'cancelled'
        ? statusParam
        : undefined;
    return jsonOk({ pagos: listPazPaymentIntents(status) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let user: AuthUser | null = null;
    try {
      const session = requireSession(request, { mutation: true });
      user = session.user;
    } catch {
      // Permitimos checkout e inscripción como visitante sin cuenta previa
    }
    const rateKey = user ? user.id : getClientIp(request);
    const limit = checkRateLimit('paz-payments', rateKey, 30, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas solicitudes de pago. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const contentType = request.headers.get('content-type') || '';
    let body: {
      plan?: unknown;
      method?: unknown;
      buyerName?: unknown;
      buyerEmail?: unknown;
      buyerPhone?: unknown;
      city?: unknown;
      transferReference?: unknown;
      transferDate?: unknown;
      note?: unknown;
      consent?: unknown;
    } = {};
    let receiptFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      body = {
        plan: form.get('plan'),
        method: form.get('method'),
        buyerName: form.get('buyerName'),
        buyerEmail: form.get('buyerEmail'),
        buyerPhone: form.get('buyerPhone'),
        city: form.get('city'),
        transferReference: form.get('transferReference'),
        transferDate: form.get('transferDate'),
        note: form.get('note'),
        consent: form.get('consent') !== 'false',
      };
      const fileEntry = form.get('receipt');
      if (fileEntry instanceof File && fileEntry.size > 0) {
        if (fileEntry.size > MAX_RECEIPT_BYTES) {
          throw new ApiError(400, 'RECEIPT_TOO_LARGE', 'El comprobante no debe superar los 5 MB.');
        }
        if (!ALLOWED_RECEIPT_MIMES[fileEntry.type]) {
          throw new ApiError(
            400,
            'RECEIPT_INVALID_TYPE',
            'El comprobante debe ser una imagen (JPG, PNG, WEBP) o PDF.'
          );
        }
        receiptFile = fileEntry;
      }
    } else {
      body = await readJsonBody<typeof body>(request, 24 * 1024);
    }

    const plan = body.plan as PazPlan;
    const method = body.method as PazPaymentMethod;
    if (!['presale', 'official', 'scholarship'].includes(plan)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona un plan válido.');
    }
    if (!['bank_transfer', 'payphone'].includes(method)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona un método de pago válido.');
    }
    let result = createPazPaymentIntent(
      user,
      {
        plan,
        method,
        buyerName: typeof body.buyerName === 'string' ? body.buyerName : null,
        buyerEmail: typeof body.buyerEmail === 'string' ? body.buyerEmail : null,
        buyerPhone: typeof body.buyerPhone === 'string' ? body.buyerPhone : null,
        city: typeof body.city === 'string' ? body.city : null,
        transferReference:
          typeof body.transferReference === 'string' ? body.transferReference : null,
        transferDate: typeof body.transferDate === 'string' ? body.transferDate : null,
        note: typeof body.note === 'string' ? body.note : null,
        consent: body.consent !== false,
      },
      { paymentUrl: pazPayphoneUrl() }
    );

    if (receiptFile && result.intent.method === 'bank_transfer') {
      const ext = ALLOWED_RECEIPT_MIMES[receiptFile.type] || 'bin';
      const dir = path.resolve(process.env.PAZ_RECEIPTS_DIR || '.data/paz-receipts');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${result.intent.id}.${ext}`);
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      const updatedIntent = attachPazPaymentReceipt(result.intent.id, {
        filename: receiptFile.name || `${result.intent.reference}.${ext}`,
        mime: receiptFile.type,
        storagePath: filePath,
      });
      result = { ...result, intent: updatedIntent };
    }
    return jsonOk(
      {
        pago: result.intent,
        creado: result.created,
        instrucciones:
          result.intent.method === 'bank_transfer'
            ? { banco: pazBankDetails() }
            : {
                payphoneUrl: pazPayphoneUrl() || null,
                payphoneToken:
                  (process.env.PAYPHONE_TOKEN ||
                    process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
                    '').trim() || null,
                payphoneStoreId:
                  (process.env.PAYPHONE_STORE_ID ||
                    process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ||
                    '').trim() || null,
                mensaje:
                  'Si el enlace aún no está configurado, el equipo te enviará el enlace oficial de PayPhone con tu código de inscripción.',
              },
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
