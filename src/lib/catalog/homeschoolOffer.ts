/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Regla Comercial Homeschool
 * ARCHIVO: src/lib/catalog/homeschoolOffer.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Define la regla única de la oferta anual Homeschool y las rutas del recurso
 * de bienvenida. El precio canónico se persiste en `products.price_cents`;
 * estas constantes se usan para normalizar la base y para presentar la oferta.
 *
 * No contiene datos de estudiantes, credenciales ni configuración de pagos.
 * ==============================================================================
 */

export const HOMESCHOOL_ANNUAL_PRICE_CENTS = 10_000;

export const HOMESCHOOL_OFFER_LABEL = 'OFERTA ESPECIAL HOMESCHOOL';
export const HOMESCHOOL_OFFER_PERIOD = 'por todo el año lectivo';
export const HOMESCHOOL_OFFER_DESCRIPTION =
  'Una propuesta de formación para acompañar al estudiante durante su año escolar.';

export const HOMESCHOOL_GUIDE_PATH = '/guia-bienvenida-homeschool';
export const HOMESCHOOL_GUIDE_PDF_PATH =
  '/docs/guia-de-bienvenida-homeschool-wisdom-academy.pdf';

/** Convierte centavos en el formato inequívoco de la oferta anual. */
export function formatoPrecioAnual(cents: number, currency = 'USD'): string {
  const valor = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
  return `$${valor} ${currency}`;
}
