/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Protocolo de Pruebas de la Fase 4 (Exit Gate 4)
 * ARCHIVO: scripts/test-phase-4-drive-openmaic.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Valida deterministamente los tres requisitos de salida del Exit Gate 4:
 * 1. Banderas de seguridad y perfiles en config/openmaic.yml (lockModelSettings, forbidUserApiKeys).
 * 2. Generación matemática exacta de horarios diarios para Gael (35 min) y Avril (45 min).
 * 3. Despacho diario de material de Google Drive a OpenMAIC con las 4 escenas interactivas.
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { curriculumSynchronizer } from '../src/services/googleDriveCurriculumSync';
import { ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL } from '../src/types/wisdom';

// Colores para consola
const C_RESET = '\x1b[0m';
const C_VERDE = '\x1b[32m';
const C_ROJO = '\x1b[31m';
const C_AZUL = '\x1b[34m';
const C_ORO = '\x1b[33m';

console.log(`${C_ORO}======================================================================${C_RESET}`);
console.log(`${C_ORO}    WISDOM ACADEMY - SUITE DE VALIDACIÓN FASE 4 (EXIT GATE 4)         ${C_RESET}`);
console.log(`${C_ORO}======================================================================${C_RESET}\n`);

async function ejecutarPruebasFase4() {
  let fallos = 0;

  // ----------------------------------------------------------------------------
  // PRUEBA 1: Validación de config/openmaic.yml
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 1/3] Verificando políticas de seguridad en config/openmaic.yml...${C_RESET}`);
  const rutaYml = path.join(process.cwd(), 'config', 'openmaic.yml');

  if (!fs.existsSync(rutaYml)) {
    console.log(`${C_ROJO}✗ ERROR: El archivo ${rutaYml} no existe.${C_RESET}`);
    fallos++;
  } else {
    try {
      const contenidoYml: any = yaml.load(fs.readFileSync(rutaYml, 'utf8'));

      if (contenidoYml.lockModelSettings === true && contenidoYml.forbidUserApiKeys === true) {
        console.log(`  ✓ Banderas de bloqueo activas: lockModelSettings=true, forbidUserApiKeys=true`);
      } else {
        console.log(`${C_ROJO}  ✗ Las políticas de bloqueo no están configuradas en true.${C_RESET}`);
        fallos++;
      }

      const perfiles = contenidoYml.profiles || {};
      if (perfiles.elementary_gael_8yo && perfiles.middle_school_avril_12yo) {
        console.log(`  ✓ Perfil de Gael verificado: ${perfiles.elementary_gael_8yo.displayName}`);
        console.log(`  ✓ Perfil de Avril verificado: ${perfiles.middle_school_avril_12yo.displayName}`);
        console.log(`${C_VERDE}✓ PRUEBA 1 SUPERADA: Configuración centralizada de OpenMAIC conforme a norma.${C_RESET}\n`);
      } else {
        console.log(`${C_ROJO}  ✗ Faltan perfiles pedagógicos obligatorios en openmaic.yml.${C_RESET}\n`);
        fallos++;
      }
    } catch (err: any) {
      console.log(`${C_ROJO}✗ ERROR al parsear openmaic.yml: ${err.message}${C_RESET}\n`);
      fallos++;
    }
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 2: Horarios Automáticos Exactos de Gael (35m) y Avril (45m)
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 2/3] Validando matemática horaria para Gael (35m) y Avril (45m)...${C_RESET}`);

  try {
    // 1. Horario de Gael (4° EGB - 8 años)
    console.log(`  --- Horario de Gael (4° EGB - 8 años) ---`);
    const horarioGael = await curriculumSynchronizer.generarHorarioAutomaticoPorAlumno(ESTUDIANTE_GAEL_INICIAL);
    console.log(`  Total bloques diarios: ${horarioGael.bloques.length} / 4`);

    const secuenciaEsperadaGael = [
      { inicio: '08:30', fin: '09:05' },
      { inicio: '09:20', fin: '09:55' },
      { inicio: '10:10', fin: '10:45' },
      { inicio: '11:00', fin: '11:35' },
    ];

    let gaelCorrecto = horarioGael.bloques.length === 4;
    horarioGael.bloques.forEach((b, idx) => {
      const esp = secuenciaEsperadaGael[idx];
      const coincide = b.horaInicio === esp.inicio && b.horaFin === esp.fin;
      console.log(`  Bloque ${b.numeroBloque}: ${b.horaInicio} - ${b.horaFin} | ${b.nombreMateria} [${b.modalidad}]`);
      if (!coincide) gaelCorrecto = false;
    });

    if (gaelCorrecto) {
      console.log(`  ${C_VERDE}✓ Horario de Gael validado: Bloques de 35 min con 15 min de recreo activo.${C_RESET}\n`);
    } else {
      console.log(`  ${C_ROJO}✗ Desajuste en la secuencia horaria de Gael.${C_RESET}\n`);
      fallos++;
    }

    // 2. Horario de Avril (8° EGB - 12 años)
    console.log(`  --- Horario de Avril (8° EGB - 12 años) ---`);
    const horarioAvril = await curriculumSynchronizer.generarHorarioAutomaticoPorAlumno(ESTUDIANTE_AVRIL_INICIAL);
    console.log(`  Total bloques diarios: ${horarioAvril.bloques.length} / 5`);

    const secuenciaEsperadaAvril = [
      { inicio: '08:30', fin: '09:15' },
      { inicio: '09:30', fin: '10:15' },
      { inicio: '10:30', fin: '11:15' },
      { inicio: '11:30', fin: '12:15' },
      { inicio: '12:30', fin: '13:15' },
    ];

    let avrilCorrecto = horarioAvril.bloques.length === 5;
    horarioAvril.bloques.forEach((b, idx) => {
      const esp = secuenciaEsperadaAvril[idx];
      const coincide = b.horaInicio === esp.inicio && b.horaFin === esp.fin;
      console.log(`  Bloque ${b.numeroBloque}: ${b.horaInicio} - ${b.horaFin} | ${b.nombreMateria} [${b.modalidad}]`);
      if (!coincide) avrilCorrecto = false;
    });

    if (avrilCorrecto) {
      console.log(`  ${C_VERDE}✓ Horario de Avril validado: Bloques de 45 min con 15 min de recreo activo.${C_RESET}\n`);
    } else {
      console.log(`  ${C_ROJO}✗ Desajuste en la secuencia horaria de Avril.${C_RESET}\n`);
      fallos++;
    }

    if (gaelCorrecto && avrilCorrecto) {
      console.log(`${C_VERDE}✓ PRUEBA 2 SUPERADA: Los horarios automáticos respetan la concentración por edad.${C_RESET}\n`);
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ ERROR al generar horarios: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // PRUEBA 3: Despacho de Documento de Google Drive a OpenMAIC
  // ----------------------------------------------------------------------------
  console.log(`${C_AZUL}[PRUEBA 3/3] Despachando material de Drive hacia motor OpenMAIC (MinerU + LangGraph)...${C_RESET}`);
  try {
    const sesionAvril = await curriculumSynchronizer.despacharMaterialDriveHaciaAgenteOpenMaic(
      ESTUDIANTE_AVRIL_INICIAL,
      {
        nombreArchivo: 'Semana1_Lunes_Teologia_y_Cosmovision.pdf',
        materia: 'Teología y Cosmovisión Bíblica',
        versiculoBiblico: 'Colosenses 2:3: En quien están escondidos todos los tesoros de la sabiduría.',
      }
    );

    console.log(`  ID Sesión Generada: ${sesionAvril.idSesion}`);
    console.log(`  URL Aula Interactiva: ${C_VERDE}${sesionAvril.urlAulaInteractiva}${C_RESET}`);
    console.log(`  Voz Neural Bilingüe: ${sesionAvril.narradorNeural}`);
    console.log(`  Escenas Generadas:`);
    console.log(`    1. Diapositivas (slides): ${sesionAvril.escenas.slides.totalDiapositivas} láminas ilustradas`);
    console.log(`    2. Pizarra (interactive): ${sesionAvril.escenas.interactive.tipoSimulacion}`);
    console.log(`    3. Quiz (quiz): ${sesionAvril.escenas.quiz.totalPreguntas} preguntas sobre ${sesionAvril.escenas.quiz.escalaNota} pts`);
    console.log(`    4. Reto (pbl): ${sesionAvril.escenas.pbl.tituloReto} (${sesionAvril.escenas.pbl.formatoEntrega})`);

    const tiene4Escenas =
      sesionAvril.escenas.slides &&
      sesionAvril.escenas.interactive &&
      sesionAvril.escenas.quiz &&
      sesionAvril.escenas.pbl;

    if (sesionAvril.urlAulaInteractiva && tiene4Escenas) {
      console.log(`${C_VERDE}✓ PRUEBA 3 SUPERADA: Documento despachado y las 4 escenas generadas con éxito.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 3 FALLIDA: Inconsistencias en el aula generada por OpenMAIC.${C_RESET}\n`);
      fallos++;
    }
  } catch (error: any) {
    console.log(`${C_ROJO}✗ PRUEBA 3 FALLIDA con excepción: ${error.message}${C_RESET}\n`);
    fallos++;
  }

  // ----------------------------------------------------------------------------
  // REPORTE FINAL DEL EXIT GATE 4
  // ----------------------------------------------------------------------------
  console.log(`${C_ORO}======================================================================${C_RESET}`);
  if (fallos === 0) {
    console.log(`${C_VERDE} ★★★ EXIT GATE 4 APROBADO: TODAS LAS PRUEBAS DE LA FASE 4 PASARON CON ÉXITO ★★★${C_RESET}`);
    console.log(`${C_VERDE} Horarios automáticos por edad y despacho de clases IA a OpenMAIC 100% listos.${C_RESET}`);
    console.log(`${C_ORO}======================================================================${C_RESET}`);
    process.exit(0);
  } else {
    console.log(`${C_ROJO} ⚠ EXIT GATE 4 NO APROBADO: Se detectaron ${fallos} error(es).${C_RESET}`);
    console.log(`${C_ORO}======================================================================${C_RESET}`);
    process.exit(1);
  }
}

ejecutarPruebasFase4().catch((err) => {
  console.error('Error fatal al ejecutar pruebas de la Fase 4:', err);
  process.exit(1);
});

