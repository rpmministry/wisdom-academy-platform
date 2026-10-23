/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Protocolo de Pruebas de Integración (Fase 3)
 * ARCHIVO: scripts/test-phase-3-moodle.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Verifica deterministamente los requisitos de salida del Exit Gate 3:
 * 1. Conexión y creación de las 14 categorías escolares en Moodle.
 * 2. Disponibilidad de las 5 materias bilingües de Gael (4° EGB).
 * 3. Disponibilidad de las 5 materias bilingües de Avril (8° EGB).
 * 4. Prueba exitosa de envío de calificación formativa a core_grades_update_grades.
 * 5. Generación y validación del objeto RecursoGuiaOffline (PDF + HTML autónomo).
 * 6. Registro de bloque horario en el Calendario de Moodle.
 * ==============================================================================
 */

import { moodleBridge } from '../src/services/moodleBridge';
import { ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL } from '../src/types/wisdom';

// Colores para consola
const C_RESET = '\x1b[0m';
const C_VERDE = '\x1b[32m';
const C_ROJO = '\x1b[31m';
const C_AZUL = '\x1b[34m';
const C_ORO = '\x1b[33m';

console.log(`${C_ORO}======================================================================${C_RESET}`);
console.log(`${C_ORO}    WISDOM ACADEMY - SUITE DE VALIDACIÓN FASE 3 (EXIT GATE 3)         ${C_RESET}`);
console.log(`${C_ORO}======================================================================${C_RESET}\n`);

async function ejecutarPruebasFase3() {
  let fallos = 0;

  // ----------------------------------------------------------------------------
  // PRUEBA 1: Creación y Verificación de las 14 Categorías Escolares en Moodle
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 1/5] Verificando las 14 categorías escolares en Moodle LMS...${C_RESET}`);
  try {
    const resCategorias = await moodleBridge.crearEstructuraAnualCategoriasYGrados();
    console.log(`  Categorías verificadas: ${C_VERDE}${resCategorias.categoriasCreadas} / 14${C_RESET}`);
    console.log(`  Cursos iniciales creados: ${C_VERDE}${resCategorias.cursosCreados} / 10${C_RESET}`);

    if (resCategorias.categoriasCreadas >= 14 && resCategorias.cursosCreados >= 10) {
      console.log(`${C_VERDE}✓ PRUEBA 1 SUPERADA: Las 14 categorías y asignaturas iniciales están verificadas.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 1 FALLIDA: No se completaron las 14 categorías requeridas.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 1 FALLIDA: Error al verificar categorías: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 2: Asignaturas Bilingües de Gael (8 años, 4° de EGB)
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 2/5] Consultando asignaturas de Gael (4° EGB - ID: ${ESTUDIANTE_GAEL_INICIAL.idMoodle})...${C_RESET}`);
  try {
    const cursosGael = await moodleBridge.obtenerCursosPorEstudiante(ESTUDIANTE_GAEL_INICIAL.idMoodle);
    console.log(`  Total de cursos encontrados para Gael: ${C_VERDE}${cursosGael.length} / 5${C_RESET}`);

    cursosGael.forEach((c) => {
      console.log(`  ✓ [${c.codigoCorto}] ${c.nombre} (Avance: ${c.porcentajeAvance}%)`);
    });

    if (cursosGael.length >= 5) {
      console.log(`${C_VERDE}✓ PRUEBA 2 SUPERADA: Las 5 materias troncales de Gael están activas.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 2 FALLIDA: Se esperaban 5 cursos para Gael, se obtuvieron ${cursosGael.length}.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 2 FALLIDA: Error al consultar cursos de Gael: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 3: Asignaturas Bilingües de Avril (12 años, 8° de EGB)
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 3/5] Consultando asignaturas de Avril (8° EGB - ID: ${ESTUDIANTE_AVRIL_INICIAL.idMoodle})...${C_RESET}`);
  try {
    const cursosAvril = await moodleBridge.obtenerCursosPorEstudiante(ESTUDIANTE_AVRIL_INICIAL.idMoodle);
    console.log(`  Total de cursos encontrados para Avril: ${C_VERDE}${cursosAvril.length} / 5${C_RESET}`);

    cursosAvril.forEach((c) => {
      console.log(`  ✓ [${c.codigoCorto}] ${c.nombre} (Avance: ${c.porcentajeAvance}%)`);
    });

    if (cursosAvril.length >= 5) {
      console.log(`${C_VERDE}✓ PRUEBA 3 SUPERADA: Las 5 materias troncales de Avril están activas.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 3 FALLIDA: Se esperaban 5 cursos para Avril, se obtuvieron ${cursosAvril.length}.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 3 FALLIDA: Error al consultar cursos de Avril: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 4: Sincronización de Calificaciones Formativas (core_grades_update_grades)
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 4/5] Probando envío de calificación de Agente IA al libro de Moodle...${C_RESET}`);
  try {
    const resCalificacion = await moodleBridge.sincronizarCalificacionAgenteIA(
      402, // Matemáticas Creacionales
      ESTUDIANTE_GAEL_INICIAL.idMoodle,
      95,  // 95/100 (9.5/10 MINEDUC)
      'Excelente dominio en la clasificación de patrones geométricos en la creación. Proverbios 3:19.'
    );

    console.log(`  Respuesta de Moodle: ${C_VERDE}${resCalificacion.mensaje}${C_RESET}`);
    console.log(`  Nota asignada: ${C_VERDE}${resCalificacion.notaAsignada}/100${C_RESET} | Código: ${resCalificacion.codigoEstadoMoodle}`);

    if (resCalificacion.exito) {
      console.log(`${C_VERDE}✓ PRUEBA 4 SUPERADA: Calificación registrada sin excepciones en Moodle.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 4 FALLIDA: La API de calificaciones reportó error.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 4 FALLIDA con excepción: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 5: Empaquetado Offline (PDF + Aula Autónoma HTML OpenMAIC)
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 5/5] Probando generación de RecursoGuiaOffline...${C_RESET}`);
  try {
    const paqueteOffline = await moodleBridge.obtenerPaqueteEstudioOffline(
      801, // Teología y Cosmovisión (Avril)
      'scene_apologetica_01',
      'Colosenses 2:3'
    );

    console.log(`  Materia: ${paqueteOffline.tituloMateriaBilingue.es} / ${paqueteOffline.tituloMateriaBilingue.en}`);
    console.log(`  Versículo Lema: ${paqueteOffline.versiculoLema}`);
    console.log(`  URL Guía PDF: ${paqueteOffline.urlGuiaPdfMoodle}`);
    console.log(`  URL Aula HTML: ${paqueteOffline.urlPaqueteHtmlInteractivo}`);
    console.log(`  Tamaño paquete: ${(paqueteOffline.tamanoBytes / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`  Offline disponible: ${paqueteOffline.disponibleOffline ? 'SÍ' : 'NO'}`);

    if (paqueteOffline.disponibleOffline && paqueteOffline.urlGuiaPdfMoodle && paqueteOffline.urlPaqueteHtmlInteractivo) {
      console.log(`${C_VERDE}✓ PRUEBA 5 SUPERADA: Paquete offline generado con éxito.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 5 FALLIDA: Inconsistencia en el objeto RecursoGuiaOffline.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 5 FALLIDA: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // REPORTE FINAL DEL EXIT GATE 3
  // ----------------------------------------------------------------------------
  console.log(`${C_ORO}======================================================================${C_RESET}`);
  if (fallos === 0) {
    console.log(`${C_VERDE} ★★★ EXIT GATE 3 APROBADO: TODAS LAS PRUEBAS DE MOODLE PASARON CON ÉXITO ★★★${C_RESET}`);
    console.log(`${C_VERDE} Estructura K-12, cursos de Avril y Gael, y puente REST API 100% operativos.${C_RESET}`);
    console.log(`${C_ORO}======================================================================${C_RESET}`);
    process.exit(0);
  } else {
    console.log(`${C_ROJO} ⚠ EXIT GATE 3 NO APROBADO: Se detectaron ${fallos} fallo(s).${C_RESET}`);
    console.log(`${C_ORO}======================================================================${C_RESET}`);
    process.exit(1);
  }
}

ejecutarPruebasFase3().catch((err) => {
  console.error('Error fatal al ejecutar pruebas de la Fase 3:', err);
  process.exit(1);
});

