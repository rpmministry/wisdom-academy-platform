/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Integración OpenMAIC
 * ARCHIVO: src/lib/openmaic/openmaicEngine.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Módulo central de la arquitectura OpenMAIC en Wisdom Academy.
 * Preserva y encapsula:
 * 1. Flujo de las 4 Fases Pedagógicas (Enfoque, Gráfico, Procedimiento y Sabiduría Bíblica).
 * 2. Gestión de agentes pedagógicos virtuales: Prof. Mateo (Primaria) y Dra. Sofía (Secundaria).
 * 3. Gestión de compañeros de clase multi-agente (Lucas y Daniel).
 * 4. Integración del progreso del estudiante hacia Moodle LMS REST API.
 * ==============================================================================
 */

import {
  curriculumContentEngine,
  DiapositivaLeccion,
  IntervencionOpenMAIC,
  PasoExplicacionLeccion,
  LeccionMateriaCompleta,
} from '@/services/curriculumContentEngine';
import { moodleBridge } from '@/services/moodleBridge';

export interface ProgresoClaseOpenMAIC {
  estudianteId: string;
  idMoodle: number;
  cursoId: number;
  materia: string;
  diapositivaActual: number;
  totalDiapositivas: number;
  pasoActivo: number;
  porcentajeCompletado: number;
  quizCalificacion?: number;
  fechaUltimaActividad: string;
}

export class OpenMAICEngine {
  private static instancia: OpenMAICEngine;

  private constructor() {}

  public static obtenerInstancia(): OpenMAICEngine {
    if (!OpenMAICEngine.instancia) {
      OpenMAICEngine.instancia = new OpenMAICEngine();
    }
    return OpenMAICEngine.instancia;
  }

  /**
   * Obtiene la lección completa para una materia y perfil de edad.
   */
  public obtenerLeccion(materia: string, esGael: boolean): LeccionMateriaCompleta {
    return curriculumContentEngine.obtenerLeccion(materia, esGael);
  }

  /**
   * Obtiene los pasos pedagógicos estructurados de una diapositiva en OpenMAIC.
   */
  public obtenerPasosExplicacion(
    diapositiva: DiapositivaLeccion,
    esGael: boolean,
    materia: string
  ): PasoExplicacionLeccion[] {
    return curriculumContentEngine.obtenerPasosExplicacion(diapositiva, esGael, materia);
  }

  /**
   * Registra y sincroniza el avance de la clase de OpenMAIC en el libro de calificaciones de Moodle.
   */
  public async guardarProgresoMoodle(
    progreso: ProgresoClaseOpenMAIC
  ): Promise<{ exito: boolean; mensaje: string }> {
    try {
      const notaFinal = progreso.quizCalificacion ?? Math.round(progreso.porcentajeCompletado);
      await moodleBridge.sincronizarCalificacionAgenteIA(
        progreso.cursoId,
        progreso.idMoodle,
        notaFinal,
        `Progreso en OpenMAIC: Lección de ${progreso.materia} (${progreso.porcentajeCompletado}% completado)`
      );
      return {
        exito: true,
        mensaje: `Progreso del ${progreso.porcentajeCompletado}% registrado en Moodle satisfactoriamente.`,
      };
    } catch {
      return {
        exito: false,
        mensaje: 'No se pudo conectar con el servidor Moodle en este momento.',
      };
    }
  }
}

export const openmaicEngine = OpenMAICEngine.obtenerInstancia();
export type {
  DiapositivaLeccion,
  IntervencionOpenMAIC,
  PasoExplicacionLeccion,
  LeccionMateriaCompleta,
};

