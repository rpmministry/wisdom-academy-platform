import { ApiError } from '../http/api';

/**
 * Usuario interno que mantiene la integridad de `orders.user_id` mientras la
 * compra es anónima. No tiene credenciales, rol ni sesión posible y nunca se
 * muestra en el CRM. Al completar el registro, la orden se transfiere al
 * usuario real en una transacción.
 */
export const GUEST_CHECKOUT_USER_ID = 'usr_guest_checkout';
export const GUEST_CHECKOUT_EMAIL = 'guest-checkout@internal.invalid';

export function normalizeBuyerEmail(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'EMAIL_REQUIRED', 'Ingresa el correo para la compra.');
  }
  const email = value.trim().toLowerCase();
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.endsWith('@internal.invalid')
  ) {
    throw new ApiError(400, 'EMAIL_INVALID', 'El correo de la compra no es válido.');
  }
  return email;
}

export function isValidBuyerEmail(value: string): boolean {
  try {
    normalizeBuyerEmail(value);
    return true;
  } catch {
    return false;
  }
}
