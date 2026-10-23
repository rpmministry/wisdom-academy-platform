import { paypalConfig } from '../config';

export interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: unknown[];
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    invoice_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: { currency_code?: string; value?: string };
      }>;
    };
  }>;
}

export class PayPalApiError extends Error {
  status: number;
  issue: string | null;

  constructor(message: string, status = 502, issue: string | null = null) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = status;
    this.issue = issue;
  }
}

export interface PayPalCreateOrderInput {
  orderId: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}

export interface PayPalClientOptions {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  webhookId?: string;
  fetchImpl?: typeof fetch;
}

const PAYPAL_TIMEOUT_MS = 15_000;

function amountValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export class PayPalClient {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly webhookId: string;
  private readonly fetchImpl: typeof fetch;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(options: PayPalClientOptions = {}) {
    const config = paypalConfig();
    this.baseUrl = (options.baseUrl || config.baseUrl).replace(/\/$/, '');
    this.clientId = options.clientId ?? config.clientId;
    this.clientSecret = options.clientSecret ?? config.clientSecret;
    this.webhookId = options.webhookId ?? config.webhookId;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.value;
    }
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await this.fetchImpl(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    });
    const data = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !data.access_token) {
      throw new PayPalApiError(
        data.error_description || 'No fue posible autenticar con PayPal.',
        502
      );
    }
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 300)) * 1000,
    };
    return data.access_token;
  }

  private async request<T>(
    path: string,
    init: { method: string; body?: unknown; requestId?: string }
  ): Promise<T> {
    const token = await this.accessToken();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.requestId ? { 'PayPal-Request-Id': init.requestId } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(PAYPAL_TIMEOUT_MS),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const details = Array.isArray(data.details) ? (data.details as Array<Record<string, unknown>>) : [];
      const issue = typeof details[0]?.issue === 'string' ? details[0].issue : null;
      throw new PayPalApiError(
        typeof data.message === 'string' ? data.message : 'PayPal rechazó la operación.',
        response.status,
        issue
      );
    }
    return data as T;
  }

  async createOrder(input: PayPalCreateOrderInput): Promise<{
    id: string;
    approvalUrl: string | null;
    status: string;
  }> {
    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.orderId,
          custom_id: input.orderId,
          invoice_id: input.orderId,
          description: input.description.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: amountValue(input.amountCents),
          },
        },
      ],
      application_context: {
        brand_name: 'Wisdom Academy',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    };

    const order = await this.request<PayPalOrderResponse>('/v2/checkout/orders', {
      method: 'POST',
      body,
      requestId: input.idempotencyKey,
    });
    const approvalUrl =
      order.links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href ||
      null;
    return { id: order.id, approvalUrl, status: order.status };
  }

  async captureOrder(paypalOrderId: string, requestId: string): Promise<PayPalCaptureResponse> {
    return this.request<PayPalCaptureResponse>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
      { method: 'POST', requestId }
    );
  }

  /**
   * Consulta una orden existente. Se usa para reconciliar una captura que
   * PayPal ya procesó aunque la respuesta HTTP se haya perdido.
   */
  async getOrderDetails(paypalOrderId: string): Promise<PayPalCaptureResponse> {
    return this.request<PayPalCaptureResponse>(
      `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
      { method: 'GET' }
    );
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<boolean> {
    if (!this.webhookId) return false;
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const certUrl = headers.get('paypal-cert-url');
    const authAlgo = headers.get('paypal-auth-algo');
    const transmissionSig = headers.get('paypal-transmission-sig');
    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      return false;
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return false;
    }

    const response = await this.request<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: {
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: this.webhookId,
          webhook_event: event,
        },
      }
    );
    return response.verification_status === 'SUCCESS';
  }

  async refundCapture(
    captureId: string,
    requestId: string,
    amount?: { cents: number; currency: string }
  ): Promise<{ id: string; status: string }> {
    return this.request<{ id: string; status: string }>(
      `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      {
        method: 'POST',
        requestId,
        body: amount
          ? {
              amount: {
                currency_code: amount.currency,
                value: amountValue(amount.cents),
              },
            }
          : undefined,
      }
    );
  }
}

export function getPayPalClient(): PayPalClient | null {
  const config = paypalConfig();
  if (!config.configured) return null;
  return new PayPalClient();
}

/**
 * Convierte un importe PayPal a centavos sin tolerar redondeos ambiguos.
 * La plataforma almacena precios en centavos y solo admite monedas de dos
 * decimales; una moneda distinta se rechaza en vez de reinterpretarse.
 */
export function parsePayPalAmountToCents(value: string, currency: string): number | null {
  if (!/^[A-Z]{3}$/.test(currency)) return null;
  if (!/^\d+(\.\d{2})$/.test(value)) return null;
  const [whole, decimals] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimals);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function findApprovalLink(links: PayPalLink[] | undefined): string | null {
  return links?.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href || null;
}
