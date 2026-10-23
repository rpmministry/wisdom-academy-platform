'use client';

let csrfToken: string | null = null;

export function setApiCsrfToken(token: string | null): void {
  csrfToken = token;
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(status: number, code: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Tiempo máximo por defecto para una solicitud de la interfaz. */
const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Cliente JSON de la plataforma. Añade el token CSRF de la sesión a toda
 * operación mutable, nunca cachea respuestas autenticadas y corta solicitudes
 * colgadas para evitar indicadores de carga infinitos.
 */
export async function apiFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const method = options.method || (options.body === undefined ? 'GET' : 'POST');
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    if (controller.signal.aborted) {
      if (options.signal?.aborted) {
        throw new ApiClientError(0, 'ABORTED', 'La solicitud fue cancelada.');
      }
      throw new ApiClientError(
        0,
        'TIMEOUT',
        'La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'
      );
    }
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new ApiClientError(
      response.status,
      typeof payload.code === 'string' ? payload.code : 'API_ERROR',
      typeof payload.message === 'string'
        ? payload.message
        : 'No fue posible completar la operación.',
      typeof payload.retryAfterSeconds === 'number' ? payload.retryAfterSeconds : undefined
    );
  }
  return payload as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}
