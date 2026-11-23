import { NextRequest } from 'next/server';
import { prepare, withTransaction } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { handleRouteError, jsonOk, readJsonBody } from '@/server/http/api';
import { writeAudit } from '@/server/audit';
import {
  reviewPazPaymentIntent,
  type PazPaymentIntentView,
} from '@/server/domain/paz';
import type { AuthUser } from '@/server/auth/authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PayPhoneWebhookPayload {
  id?: unknown;
  clientTransactionId?: unknown;
  status?: unknown;
  transactionStatus?: unknown;
  phoneNumber?: unknown;
  email?: unknown;
  amount?: unknown;
}

/**
 * Webhook oficial para confirmaciones de pago con PayPhone (Ecuador).
 *
 * Endpoint: POST /api/paz/payments/webhook
 *
 * Flujo de seguridad:
 * 1. Recibe `id` (transactionId en PayPhone) y `clientTransactionId` (referencia local PAZ-2026-XXXX).
 * 2. Si PAYPHONE_TOKEN está configurado, valida con la API de PayPhone (https://pay.payphone.com.ec/api/button/Confirm).
 * 3. Al verificarse el estado 'Approved', aprueba el payment intent y activa matrícula y orden.
 * 4. Protege contra confirmaciones falsas y pagos duplicados.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody<PayPhoneWebhookPayload>(request, 32 * 1024);
    const payphoneTxId =
      typeof body.id === 'string' || typeof body.id === 'number'
        ? String(body.id)
        : null;
    const clientTxId =
      typeof body.clientTransactionId === 'string'
        ? body.clientTransactionId.trim()
        : null;

    if (!clientTxId) {
      return jsonOk({ received: false, error: 'MISSING_CLIENT_TX_ID' }, { status: 400 });
    }

    const intent = prepare(
      'SELECT * FROM paz_payment_intents WHERE reference = ?'
    ).get(clientTxId) as { id: string; status: string; user_id: string } | undefined;

    if (!intent) {
      return jsonOk({ received: false, error: 'PAYMENT_INTENT_NOT_FOUND' }, { status: 404 });
    }

    if (intent.status === 'approved') {
      return jsonOk({ received: true, status: 'already_approved' });
    }

    const payphoneToken = process.env.PAYPHONE_TOKEN || process.env.PAYPHONE_PRIVATE_TOKEN;
    let isApproved = false;
    let confirmationDetail: Record<string, unknown> = {};

    if (payphoneToken && payphoneTxId) {
      // Verificación real con servidor PayPhone
      try {
        const verifyResponse = await fetch('https://pay.payphone.com.ec/api/button/Confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${payphoneToken}`,
          },
          body: JSON.stringify({
            id: Number(payphoneTxId) || payphoneTxId,
            clientTxId,
          }),
        });

        if (verifyResponse.ok) {
          const verifyData = (await verifyResponse.json()) as {
            transactionStatus?: string;
            statusCode?: number;
          };
          confirmationDetail = verifyData;
          if (
            verifyData.transactionStatus === 'Approved' ||
            verifyData.statusCode === 3
          ) {
            isApproved = true;
          }
        }
      } catch (verifyError) {
        console.error('Error validando transacción con PayPhone:', verifyError);
      }
    } else {
      // Modo preparación/entorno sin credenciales reales:
      // Se registra la recepción del webhook y se audita
      confirmationDetail = {
        notice: 'Credenciales de PayPhone no configuradas; webhook recibido en modo preparación.',
        rawPayload: body,
      };
    }

    if (isApproved) {
      const systemActor: AuthUser = {
        id: 'system_payphone',
        email: 'payphone-webhook@wisdomacademy.alsiztech.com',
        emailVerified: true,
        displayName: 'PayPhone Webhook',
        username: 'payphone_system',
        status: 'active',
        isMinor: false,
        mustChangePassword: false,
        roles: ['principal_admin'],
        primaryRole: 'principal_admin',
        permissions: new Set(['orders.manage', 'orders.read', 'paz.payments.manage']),
        hasGlobalContentAccess: true,
        isOwner: false,
        avatarUrl: null,
      };

      const updated = reviewPazPaymentIntent(
        systemActor,
        intent.id,
        'approve',
        `Aprobado automáticamente por PayPhone Webhook · TxId: ${payphoneTxId || 'N/A'}`
      );

      return jsonOk({ received: true, status: 'approved', pago: updated });
    }

    // Registrar intento para revisión administrativa
    prepare(`
      UPDATE paz_payment_intents
      SET note = COALESCE(note, '') || '\n[Webhook PayPhone recibido: ' || ? || ']',
          updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify({ payphoneTxId, status: body.status || body.transactionStatus }), nowIso(), intent.id);

    return jsonOk({ received: true, status: 'pending_verification', detail: confirmationDetail });
  } catch (error) {
    return handleRouteError(error);
  }
}
