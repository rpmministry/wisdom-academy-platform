export const SESSION_COOKIE = 'wa_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 12;
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function ownerEmail(): string {
  return (process.env.PLATFORM_OWNER_EMAIL || 'mauriandrade2@gmail.com').trim().toLowerCase();
}

export function rateLimitSalt(): string {
  return (
    process.env.WISDOM_RATE_LIMIT_SALT ||
    process.env.EDUCATIONAL_RESOURCE_RATE_LIMIT_SALT ||
    'wisdom-academy-local-salt'
  );
}

export function appUrl(req?: Request): string {
  const configured =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (req) {
    const forwardedProto = req.headers.get('x-forwarded-proto');
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host') || 'localhost:3000';
    const proto = forwardedProto || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export function googleClientId(): string | null {
  return (
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
    null
  );
}

export function paypalConfig() {
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
  const overrideBaseUrl = process.env.PAYPAL_API_BASE_URL?.trim().replace(/\/$/, '') || '';
  if (overrideBaseUrl && process.env.NODE_ENV === 'production') {
    // Evita que un error de configuración envíe credenciales a un host ajeno.
    throw new Error('PAYPAL_API_BASE_URL no está permitido en producción.');
  }
  const baseUrl =
    overrideBaseUrl ||
    (mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim() || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim() || '';
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || '';
  const requestedCurrency = (process.env.PAYPAL_CURRENCY || 'USD').trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(requestedCurrency) ? requestedCurrency : 'USD';
  return {
    mode,
    baseUrl,
    clientId,
    clientSecret,
    webhookId,
    currency,
    configured: Boolean(clientId && clientSecret),
    webhookConfigured: Boolean(webhookId),
  };
}

export function e2eMode(): boolean {
  return process.env.WISDOM_E2E === '1';
}
