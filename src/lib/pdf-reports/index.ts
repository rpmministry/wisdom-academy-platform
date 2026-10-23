/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Módulo de Reportes, Guías y Calendario Escolar (lib)
 * ARCHIVO: src/lib/pdf-reports/index.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Expone de forma centralizada la generación de guías pedagógicas imprimibles (PDF),
 * el cálculo de trimestres, feriados y días lectivos del calendario escolar
 * oficial de la Sierra ecuatoriana 2026-2027.
 * ==============================================================================
 */

export {
  printableGuideGenerator,
  PrintableGuideGenerator,
} from '@/services/printableGuideGenerator';

export {
  EcuadorSchoolCalendarEngine,
  type DetalleDiaLectivo,
  type FeriadoEcuador,
  FERIADOS_ECUADOR_2026_2027,
} from '@/services/ecuadorSchoolCalendar';

