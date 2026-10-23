/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Modelo de Dominio Pedagógico Moodle LMS
 * ARCHIVO: src/lib/lms-moodle/moodleDomain.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Estructura jerárquica canónica del modelo pedagógico de Moodle LMS:
 * Categoría → Grado/Nivel → Curso/Materia → Trimestre → Lección OpenMAIC.
 *
 * La malla de lecciones se genera desde la capa de datos curricular de cada
 * estudiante, de modo que el aula, el sidebar y el completion tracking reflejen
 * las asignaturas reales de Google Drive y no un catálogo fijo de cinco cursos.
 * ==============================================================================
 */

import { moodleBridge } from '@/services/moodleBridge';
import {
  buscarAsignatura,
  obtenerPerfilCurricular,
  type PerfilCurricular,
} from '@/data/curriculum';

export type TipoActividadMoodle = 'QUIZ_AUTOEVALUABLE' | 'TAREA_ENTREGABLE' | 'GLOSARIO_BIBLICO' | 'FORO_DEBATE';

export interface ActividadMoodle {
  id: string;
  idMoodleModulo: number;
  tipo: TipoActividadMoodle;
  titulo: string;
  descripcion: string;
  ponderacion: number;
  completada: boolean;
  calificacion?: number;
  retroalimentacionDocente?: string;
}

export interface LeccionMoodleLMS {
  id: number;
  numeroLeccion: number;
  titulo: string;
  trimestre: 1 | 2 | 3;
  duracionEstimadaMin: number;
  idEscenaOpenMAIC: string;
  completada: boolean;
  calificacionFinal?: number;
  actividades: ActividadMoodle[];
}

export interface MateriaMoodleLMS {
  idCursoMoodle: number;
  codigoCorto: string;
  nombre: string;
  gradoNivel: string;
  categoriaId: string;
  profesorIAPrincipal: 'Prof. Mateo' | 'Dra. Sofía de Valenzuela';
  versiculoLema: {
    referencia: string;
    texto: string;
  };
  lecciones: LeccionMoodleLMS[];
}

export class MoodleDomainEngine {
  private static instancia: MoodleDomainEngine;

  private constructor() {}

  public static obtenerInstancia(): MoodleDomainEngine {
    if (!MoodleDomainEngine.instancia) {
      MoodleDomainEngine.instancia = new MoodleDomainEngine();
    }
    return MoodleDomainEngine.instancia;
  }

  /**
   * Genera la malla de lecciones de una asignatura y grado a partir del
   * currículo personalizado. Conserva la estructura que consume el aula.
   */
  public obtenerMateriaEstructurada(
    nombreMateria: string,
    esGael: boolean,
    perfilCurricular?: PerfilCurricular
  ): MateriaMoodleLMS {
    const perfil =
      perfilCurricular ||
      obtenerPerfilCurricular(
        esGael ? '04_Cuarto_EGB_Gael' : '08_Octavo_EGB_Avril'
      );
    const asignatura = buscarAsignatura(perfil, nombreMateria);
    const indiceAsignatura = Math.max(0, perfil.asignaturas.indexOf(asignatura));
    const gradoDetectado = Number((perfil.grado.match(/\d+/) || [])[0]);
    const gradoBase = Number.isFinite(gradoDetectado) && gradoDetectado > 0
      ? gradoDetectado
      : esGael
      ? 4
      : 8;
    const idCursoMoodle = gradoBase * 100 + indiceAsignatura;
    const codigoCorto = `WA_${asignatura.codigo.replace(/^\d+_/, '').slice(0, 14).toUpperCase()}`;

    const lecciones: LeccionMoodleLMS[] = asignatura.unidades.map((unidad, indice) => {
      const trimestre: 1 | 2 | 3 = indice < 4 ? 1 : indice < 8 ? 2 : 3;
      const duracionEstimadaMin = (perfil.edad <= 10 ? 25 : 35) + (indice % 3) * 5;
      const idEscena = `scene_${asignatura.codigo
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')}_${String(indice + 1).padStart(2, '0')}`;

      const actividades: ActividadMoodle[] = [];
      if (indice === 0) {
        actividades.push({
          id: `act_q_${asignatura.codigo}_${indice + 1}`,
          idMoodleModulo: idCursoMoodle * 10 + indice + 1,
          tipo: 'QUIZ_AUTOEVALUABLE',
          titulo: `Quiz formativo: ${unidad.titulo}`,
          descripcion: unidad.conceptoClave,
          ponderacion: 40,
          completada: false,
        });
        actividades.push({
          id: `act_pbl_${asignatura.codigo}_${indice + 1}`,
          idMoodleModulo: idCursoMoodle * 10 + indice + 2,
          tipo: asignatura.area === 'TEOLOGIA' ? 'GLOSARIO_BIBLICO' : 'TAREA_ENTREGABLE',
          titulo: asignatura.retoPbl.titulo,
          descripcion: asignatura.retoPbl.descripcion,
          ponderacion: 60,
          completada: false,
        });
      } else if (indice === 1) {
        actividades.push({
          id: `act_q_${asignatura.codigo}_${indice + 1}`,
          idMoodleModulo: idCursoMoodle * 10 + indice + 3,
          tipo: 'QUIZ_AUTOEVALUABLE',
          titulo: `Práctica guiada: ${unidad.titulo}`,
          descripcion: unidad.aplicacion,
          ponderacion: 100,
          completada: false,
        });
      }

      return {
        id: indice + 1,
        numeroLeccion: indice + 1,
        titulo: unidad.titulo,
        trimestre,
        duracionEstimadaMin,
        idEscenaOpenMAIC: idEscena,
        completada: false,
        calificacionFinal: undefined,
        actividades,
      };
    });

    return {
      idCursoMoodle,
      codigoCorto,
      nombre: asignatura.nombre,
      gradoNivel: perfil.grado,
      categoriaId: perfil.codigoCarpetaAnioDrive,
      profesorIAPrincipal: asignatura.profesorIA,
      versiculoLema: asignatura.lema,
      lecciones,
    };
  }

  /**
   * Completion Tracking: registra la finalización de una lección y sincroniza
   * la nota con el Gradebook de Moodle.
   */
  public async registrarFinalizacionLeccion(
    idCursoMoodle: number,
    idUsuarioMoodle: number,
    idLeccion: number,
    notaEvaluacionSobre10: number,
    comentario: string
  ): Promise<{ exito: boolean; notaSobre100: number; mensaje: string }> {
    const notaSobre100 = Math.round(Math.min(10, Math.max(0, notaEvaluacionSobre10)) * 10);

    try {
      const resultado = await moodleBridge.sincronizarCalificacionAgenteIA(
        idCursoMoodle,
        idUsuarioMoodle,
        notaSobre100,
        `Completion Tracking OpenMAIC: Lección ${idLeccion}. ${comentario}`
      );

      return {
        exito: resultado.exito,
        notaSobre100,
        mensaje: `Lección ${idLeccion} completada. Calificación asentada en Moodle: ${notaEvaluacionSobre10}/10.`,
      };
    } catch {
      return {
        exito: false,
        notaSobre100,
        mensaje: 'No se pudo comunicar con el Gradebook de Moodle.',
      };
    }
  }
}

export const moodleDomainEngine = MoodleDomainEngine.obtenerInstancia();
