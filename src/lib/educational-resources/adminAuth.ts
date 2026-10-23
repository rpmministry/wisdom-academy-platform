/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Autenticación del Panel de Recursos
 * ARCHIVO: src/lib/educational-resources/adminAuth.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Protege las rutas de revisión y aprobación con un token exclusivo del
 * servidor. El token se configura en `EDUCATIONAL_RESOURCES_ADMIN_TOKEN`, nunca
 * se incluye en el bundle del cliente y se compara en tiempo constante.
 * ==============================================================================
 */

import { timingSafeEqual } from 'crypto';

/** Indica si el servidor tiene configurado el token administrativo. */
export function adminRecursosConfigurado(): boolean {
  return Boolean(process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN);
}

/**
 * Valida el encabezado `x-educational-admin-token` contra la variable de
 * entorno. Devuelve false si no hay token configurado o si no coincide.
 */
export function tokenAdminValido(cabeceras: Headers): boolean {
  const esperado = process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN || '';
  const recibido = cabeceras.get('x-educational-admin-token') || '';
  if (!esperado || recibido.length === 0) return false;

  const bufferEsperado = Buffer.from(esperado, 'utf8');
  const bufferRecibido = Buffer.from(recibido, 'utf8');
  if (bufferEsperado.length !== bufferRecibido.length) return false;
  return timingSafeEqual(bufferEsperado, bufferRecibido);
}
