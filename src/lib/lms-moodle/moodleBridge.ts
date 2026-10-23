/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Módulo de Integración Moodle LMS (lib)
 * ARCHIVO: src/lib/lms-moodle/moodleBridge.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Conector modular de Moodle LMS REST API para la arquitectura de negocio.
 * Expone la sincronización de calificaciones, cursos por estudiante,
 * paquetización para estudio sin conexión (Offline-First) y control de tokens.
 * ==============================================================================
 */

export {
  moodleBridge,
  MoodleWisdomBridge,
  type ResultadoSincronizacionNota,
  type ParametrosEventoCalendario,
  CATEGORIAS_14_ANIOS_MOODLE,
} from '@/services/moodleBridge';

