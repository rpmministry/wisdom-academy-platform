import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
} from '@/server/http/api';
import { checkRateLimit } from '@/server/http/rateLimit';
import {
  autoApprovePazPayment,
  findPazPaymentIntentByReference,
} from '@/server/domain/paz';
import { createSession, setSessionCookie } from '@/server/auth/sessions';
import { sha256 } from '@/server/security/random';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { PAZ_PROGRAM_SLUG } from '@/lib/paz-en-la-mesa/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit('paz-payment-confirm', clientIp, 30, 900);
    if (!limit.allowed) {
      throw new ApiError(429, 'RATE_LIMITED', 'Demasiados intentos. Espera unos minutos.');
    }

    const body = await readJsonBody<{
      id?: unknown;
      clientTransactionId?: unknown;
      clientTxId?: unknown;
    }>(request, 16 * 1024);

    const payphoneId = body.id ? String(body.id).trim() : '';
    const clientTxId = String(body.clientTransactionId || body.clientTxId || '').trim();

    if (!payphoneId || !clientTxId) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Se requiere el identificador de transacción PayPhone (id) y el código de inscripción (clientTransactionId).'
      );
    }

    // 1. Buscar la intención de pago local en base de datos
    const intent = findPazPaymentIntentByReference(clientTxId);
    if (!intent) {
      throw new ApiError(
        404,
        'INTENT_NOT_FOUND',
        `No se encontró ninguna inscripción asociada al código ${clientTxId}.`
      );
    }

    // 2. Si ya fue aprobada previamente (por ejemplo, al recargar la pantalla de confirmación)
    if (intent.status === 'approved') {
      const user = prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(
        intent.user_id
      ) as { id: string; email: string; display_name: string } | undefined;

      const response = jsonOk({
        success: true,
        alreadyConfirmed: true,
        reference: intent.reference,
        amountCents: intent.amount_cents,
        buyerEmail: intent.buyer_email,
        buyerName: intent.buyer_name,
        payphoneId,
        redirectUrl: '/cursos/paz-en-la-mesa',
      });

      if (user) {
        const userAgent = request.headers.get('user-agent') || 'Browser';
        const session = createSession(user.id, {
          ipHash: clientIp ? sha256(clientIp) : null,
          uaHash: userAgent ? sha256(userAgent) : null,
        });
        setSessionCookie(response, session.token);
      }

      return response;
    }

    // 3. Confirmar la transacción con el endpoint oficial V2 de PayPhone
    const payphoneToken = (
      process.env.PAYPHONE_TOKEN ||
      process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
      ''
    ).trim();

    let isApproved = false;
    let payphoneStatus = 'Unknown';
    let transactionData: Record<string, unknown> = {};

    if (payphoneToken) {
      try {
        const confirmResponse = await fetch(
          'https://pay.payphonetodoesposible.com/api/button/V2/Confirm',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${payphoneToken}`,
            },
            body: JSON.stringify({
              id: Number(payphoneId) || payphoneId,
              clientTxId: clientTxId,
            }),
          }
        );

        if (!confirmResponse.ok) {
          const errText = await confirmResponse.text();
          throw new ApiError(
            502,
            'PAYPHONE_CONFIRMATION_FAILED',
            `Error de comunicación con PayPhone: ${errText}`
          );
        }

        const data = (await confirmResponse.json()) as Record<string, unknown>;
        transactionData = data;
        payphoneStatus = String(data.transactionStatus || data.status || '');
        // PayPhone aprueba cuando transactionStatus === 'Approved' o statusCode === 3
        isApproved = payphoneStatus === 'Approved' || Number(data.statusCode) === 3;
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        throw new ApiError(502, 'PAYPHONE_NETWORK_ERROR', `Fallo al verificar con PayPhone: ${msg}`);
      }
    } else {
      // Si aún no se colocaron las credenciales en local / desarrollo, permitimos validación de prueba
      if (process.env.NODE_ENV !== 'production') {
        isApproved = true;
        payphoneStatus = 'Approved (Modo Pruebas Local)';
        transactionData = { mock: true, id: payphoneId, clientTxId };
      } else {
        throw new ApiError(
          500,
          'PAYPHONE_NOT_CONFIGURED',
          'La pasarela PayPhone aún no tiene configurado su token de acceso (PAYPHONE_TOKEN).'
        );
      }
    }

    if (!isApproved) {
      prepare(`
        UPDATE paz_payment_intents
        SET status = 'rejected', review_note = ?, updated_at = ?
        WHERE id = ? AND status = 'pending'
      `).run(
        `Transacción rechazada por PayPhone: estado ${payphoneStatus}`,
        nowIso(),
        intent.id
      );

      return jsonOk(
        {
          success: false,
          status: payphoneStatus,
          message:
            'La transacción no fue aprobada por la entidad emisora o fue cancelada por el usuario.',
          reference: intent.reference,
        },
        { status: 400 }
      );
    }

    // 4. Aprobación automática, activación del taller y creación de sesión de estudiante
    const reviewNote = `Aprobado automáticamente por PayPhone V2 (TxID: ${payphoneId}, Estado: ${payphoneStatus})`;
    const approval = autoApprovePazPayment({
      intentId: intent.id,
      processor: 'payphone',
      processorTransactionId: payphoneId,
      reviewNote,
    });

    const response = jsonOk({
      success: true,
      reference: approval.intent.reference,
      amountCents: approval.intent.amountCents,
      buyerEmail: approval.intent.buyerEmail,
      buyerName: approval.intent.buyerName,
      payphoneId,
      status: 'Approved',
      redirectUrl: `/cursos/${PAZ_PROGRAM_SLUG}`,
    });

    // Iniciar sesión automáticamente del estudiante para acceso inmediato a clases
    const userAgent = request.headers.get('user-agent') || 'Browser';
    const session = createSession(approval.user.id, {
      ipHash: clientIp ? sha256(clientIp) : null,
      uaHash: userAgent ? sha256(userAgent) : null,
    });
    setSessionCookie(response, session.token);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
