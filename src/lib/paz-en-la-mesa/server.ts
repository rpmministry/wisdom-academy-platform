import { PAZ_BRAND } from './content';

export interface PazBankDetails {
  beneficiary: string;
  ruc: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  email: string;
  referenceHint: string;
  configured: boolean;
}

/**
 * Datos de recaudo de Fundación Casa Main.
 *
 * La cuenta bancaria se configura por variables de entorno para no fijar en el
 * código datos que cambian por temporada. El RUC y el beneficiario son los
 * datos oficiales del manual del taller.
 */
export function pazBankDetails(): PazBankDetails {
  const accountNumber = (process.env.PAZ_BANK_ACCOUNT_NUMBER || '').trim();
  const bankName = (process.env.PAZ_BANK_NAME || '').trim();
  const accountType = (process.env.PAZ_BANK_ACCOUNT_TYPE || '').trim();
  const accountHolder =
    (process.env.PAZ_BANK_ACCOUNT_HOLDER || '').trim() || PAZ_BRAND.foundation;
  return {
    beneficiary: PAZ_BRAND.foundation,
    ruc: (process.env.PAZ_BANK_RUC || '1793193764001').trim(),
    bankName: bankName || 'Datos bancarios en la comunidad oficial',
    accountType: accountType || 'Cuenta de la fundación',
    accountNumber: accountNumber || 'Se comparte al iniciar la preventa',
    accountHolder,
    email: (process.env.PAZ_PAYMENTS_EMAIL || 'pagos@maimcasa.com').trim(),
    referenceHint: 'Escribe tu nombre y el código de inscripción en el comprobante.',
    configured: Boolean(accountNumber && bankName),
  };
}

export function pazPayphoneUrl(): string {
  const value = (process.env.PAZ_PAYPHONE_URL || process.env.NEXT_PUBLIC_PAZ_PAYPHONE_URL || '').trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function pazWhatsappUrl(): string {
  const value = (
    process.env.PAZ_WHATSAPP_URL ||
    process.env.NEXT_PUBLIC_PAZ_WHATSAPP_URL ||
    ''
  ).trim();
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function pazPaymentsAdminEmails(): string[] {
  return (process.env.PAZ_PAYMENTS_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
