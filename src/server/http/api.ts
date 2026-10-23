import { NextResponse } from 'next/server';
import { appUrl, isProduction } from '../config';
import { nowIso } from '../db/sqlite';
import { loadSessionFromRequest, type SessionRecord } from '../auth/sessions';
import { hasPermission, type AuthUser } from '../auth/authorization';
import { constantTimeEqual, sha256 } from '../security/random';
import { rateLimitSalt } from '../config';
import { hashClientIp } from '../security/random';

export class ApiError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export interface RequestMeta {
  ipHash: string | null;
  uaHash: string | null;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function requestMeta(request: Request): RequestMeta {
  return {
    ipHash: hashClientIp(getClientIp(request), rateLimitSalt()),
    uaHash: request.headers.get('user-agent')
      ? sha256(request.headers.get('user-agent') as string).slice(0, 32)
      : null,
  };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store' };
  if (status === 429 && typeof extra?.retryAfterSeconds === 'number') {
    headers['Retry-After'] = String(Math.max(1, Math.ceil(extra.retryAfterSeconds)));
  }
  return NextResponse.json(
    { ok: false, code, message, ...(extra ?? {}) },
    { status, headers }
  );
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, {
      ...(error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    });
  }
  if (process.env.NODE_ENV !== 'test') {
    console.error('[wisdom-api]', error);
  }
  return jsonError(500, 'INTERNAL_ERROR', 'No fue posible completar la operación.');
}

/** Rechaza peticiones mutables de un origen distinto al de la aplicación. */
export function assertSameOrigin(
  request: Request,
  options: { requireOriginInProduction?: boolean } = {}
): void {
  const origin = request.headers.get('origin');
  if (!origin) {
    // El inicio de sesión no lleva token CSRF, por lo que en producción se
    // exige la cabecera Origin de un navegador. Las herramientas de línea de
    // comandos deben usar un cliente con cabeceras explícitas.
    if (options.requireOriginInProduction && isProduction()) {
      throw new ApiError(
        403,
        'ORIGIN_REQUIRED',
        'La petición debe incluir una cabecera Origin válida.'
      );
    }
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, 'ORIGIN_INVALID', 'Origen de la petición no válido.');
  }

  const allowedHosts = new Set<string>();
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (requestHost) allowedHosts.add(requestHost);
  try {
    allowedHosts.add(new URL(appUrl()).host);
  } catch {
    // Una APP_URL inválida no debe habilitar orígenes adicionales.
  }

  if (!allowedHosts.has(originHost)) {
    throw new ApiError(403, 'ORIGIN_FORBIDDEN', 'Origen de la petición no autorizado.');
  }
}

export interface AuthContext {
  user: AuthUser;
  session: SessionRecord;
}

/**
 * Carga la sesión y, en operaciones mutables, exige el token CSRF de la sesión.
 * La autorización se comprueba siempre aquí, nunca en el cliente.
 */
export function requireSession(
  request: Request,
  options?: {
    permission?: string;
    mutation?: boolean;
    allowPendingPasswordChange?: boolean;
  }
): AuthContext {
  const session = loadSessionFromRequest(request);
  if (!session) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
  }

  if (session.user.mustChangePassword && !options?.allowPendingPasswordChange) {
    throw new ApiError(
      428,
      'PASSWORD_CHANGE_REQUIRED',
      'Debes cambiar la contraseña inicial antes de continuar.'
    );
  }

  if (options?.mutation) {
    assertSameOrigin(request);
    const csrf = request.headers.get('x-csrf-token') || '';
    if (!csrf || !constantTimeEqual(csrf, session.csrfToken)) {
      throw new ApiError(403, 'CSRF_INVALID', 'Token de seguridad inválido o vencido.');
    }
  }

  if (options?.permission && !hasPermission(session.user, options.permission)) {
    throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para ejecutar esta acción.');
  }

  return { user: session.user, session };
}

export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = 64 * 1024
): Promise<T> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'CONTENT_TYPE', 'La petición debe enviarse como JSON.');
  }
  const raw = await request.text();
  // `String.length` cuenta unidades UTF-16; el límite debe medirse en bytes
  // reales para que los caracteres multibyte no amplíen el cuerpo permitido.
  if (new TextEncoder().encode(raw).length > maxBytes) {
    throw new ApiError(413, 'BODY_TOO_LARGE', 'El cuerpo de la petición es demasiado grande.');
  }
  if (!raw.trim()) return {} as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new ApiError(400, 'JSON_INVALID', 'El cuerpo de la petición no es JSON válido.');
  }
}

export function requireJsonString(
  value: unknown,
  field: string,
  maxLength = 500,
  options: { trim?: boolean } = {}
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ApiError(400, 'VALIDATION_ERROR', `El campo ${field} es obligatorio.`);
  }
  const normalized = options.trim === false ? value : value.trim();
  if (normalized.length > maxLength) {
    throw new ApiError(400, 'VALIDATION_ERROR', `El campo ${field} excede la longitud permitida.`);
  }
  return normalized;
}

export function optionalJsonString(value: unknown, maxLength = 500): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Se esperaba una cadena de texto.');
  }
  return value.trim().slice(0, maxLength) || null;
}

export function requireInteger(
  value: unknown,
  field: string,
  min: number,
  max: number
): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `El campo ${field} debe ser un entero entre ${min} y ${max}.`
    );
  }
  return parsed;
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, 'VALIDATION_ERROR', `El campo ${field} debe ser booleano.`);
  }
  return value;
}

export function now(): string {
  return nowIso();
}
