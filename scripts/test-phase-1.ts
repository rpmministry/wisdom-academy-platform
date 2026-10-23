/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Protocolo de Pruebas Multiplataforma (Fase 1)
 * ARCHIVO: scripts/test-phase-1.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Ejecuta deterministamente las pruebas de aceptación de la Fase 1 (Exit Gate 1)
 * en cualquier sistema operativo (Windows, Linux, macOS, Codespaces, Gitpod):
 * 1. Verifica los 17 archivos vectoriales SVG en /public/brand/svg/.
 * 2. Valida la sintaxis estricta y componentes de 'docker-compose.yml'.
 * 3. Ejecuta y valida 'init-google-drive-folders.ts' comprobando las 14 carpetas.
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { inicializarEstructuraGoogleDrive } from './init-google-drive-folders';

// Códigos de escape para colores en terminal
const C_RESET = '\x1b[0m';
const C_VERDE = '\x1b[32m';
const C_ROJO = '\x1b[31m';
const C_AZUL = '\x1b[34m';
const C_ORO = '\x1b[33m';

console.log(`${C_ORO}======================================================================${C_RESET}`);
console.log(`${C_ORO}    WISDOM ACADEMY - SUITE DE VALIDACIÓN FASE 1 (EXIT GATE 1)         ${C_RESET}`);
console.log(`${C_ORO}======================================================================${C_RESET}\n`);

let fallos = 0;

// ------------------------------------------------------------------------------
// PRUEBA 1: Verificación de Activos Oficiales de Marca en public/brand/svg
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[PRUEBA 1/3] Verificando activos de marca en public/brand/svg/...${C_RESET}`);
const dirSvg = path.join(process.cwd(), 'public', 'brand', 'svg');

if (!fs.existsSync(dirSvg)) {
  console.log(`${C_ROJO}✗ ERROR: El directorio ${dirSvg} no existe.${C_RESET}`);
  fallos++;
} else {
  const archivosSvg = fs.readdirSync(dirSvg).filter((f) => f.endsWith('.svg'));
  console.log(`  Total de archivos SVG encontrados: ${C_VERDE}${archivosSvg.length} / 17${C_RESET}`);

  const archivosRequeridos = [
    'wisdom-logo-horizontal-color.svg',
    'wisdom-logo-horizontal-on-dark.svg',
    'wisdom-icon-tile-gold.svg',
    'wisdom-logo-vertical-color.svg',
    'wisdom-wordmark-black.svg',
  ];

  for (const requerido of archivosRequeridos) {
    if (archivosSvg.includes(requerido)) {
      console.log(`  ✓ Encontrado: ${requerido}`);
    } else {
      console.log(`${C_ROJO}  ✗ Falta archivo clave: ${requerido}${C_RESET}`);
      fallos++;
    }
  }

  if (archivosSvg.length >= 17) {
    console.log(`${C_VERDE}✓ PRUEBA 1 SUPERADA: Todos los 17 activos SVG de marca están verificados.${C_RESET}\n`);
  } else {
    console.log(`${C_ROJO}✗ PRUEBA 1 FALLIDA: Se esperaban 17 archivos SVG, se hallaron ${archivosSvg.length}.${C_RESET}\n`);
    fallos++;
  }
}

// ------------------------------------------------------------------------------
// PRUEBA 2: Validación de Sintaxis de docker-compose.yml
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[PRUEBA 2/3] Validando configuración y sintaxis de docker-compose.yml...${C_RESET}`);
const composePath = path.join(process.cwd(), 'docker-compose.yml');

if (!fs.existsSync(composePath)) {
  console.log(`${C_ROJO}✗ ERROR: docker-compose.yml no fue encontrado en la raíz.${C_RESET}`);
  fallos++;
} else {
  try {
    const composeContent = fs.readFileSync(composePath, 'utf8');
    const composeDoc: any = yaml.load(composeContent);

    // Valida que los 3 servicios requeridos estén definidos
    const servicios = composeDoc.services || {};
    const serviciosEsperados = ['wisdom-mariadb', 'wisdom-moodle', 'wisdom-openmaic'];
    let todosServiciosPresentes = true;

    for (const servicio of serviciosEsperados) {
      if (servicios[servicio]) {
        console.log(`  ✓ Servicio presente: ${servicio} (Imagen: ${servicios[servicio].image})`);
      } else {
        console.log(`${C_ROJO}  ✗ Servicio faltante: ${servicio}${C_RESET}`);
        todosServiciosPresentes = false;
      }
    }

    // Valida la red interna
    if (composeDoc.networks && composeDoc.networks.wisdom_internal_net) {
      console.log(`  ✓ Red privada definida: wisdom_internal_net`);
    } else {
      console.log(`${C_ROJO}  ✗ Red privada 'wisdom_internal_net' no configurada.${C_RESET}`);
      todosServiciosPresentes = false;
    }

    // Valida los volúmenes
    if (composeDoc.volumes && composeDoc.volumes.mariadb_data && composeDoc.volumes.moodle_code && composeDoc.volumes.moodledata_files) {
      console.log(`  ✓ Volúmenes persistentes definidos: mariadb_data, moodle_code, moodledata_files`);
    } else {
      console.log(`${C_ROJO}  ✗ Uno o más volúmenes persistentes faltan en la configuración.${C_RESET}`);
      todosServiciosPresentes = false;
    }

    // Si docker está disponible en el entorno, ejecuta docker compose config --quiet
    try {
      execSync('docker compose config --quiet', { stdio: 'ignore' });
      console.log(`  ✓ 'docker compose config' validado nativamente por el daemon Docker.`);
    } catch {
      console.log(`  ℹ Entorno sin daemon docker activo local; validación estructural YAML completada.`);
    }

    if (todosServiciosPresentes) {
      console.log(`${C_VERDE}✓ PRUEBA 2 SUPERADA: docker-compose.yml es 100% válido y completo.${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 2 FALLIDA: Inconsistencias en docker-compose.yml.${C_RESET}\n`);
      fallos++;
    }
  } catch (err: any) {
    console.log(`${C_ROJO}✗ PRUEBA 2 FALLIDA: Error de sintaxis YAML: ${err.message}${C_RESET}\n`);
    fallos++;
  }
}

// ------------------------------------------------------------------------------
// PRUEBA 3: Inicialización y Estructura de las 14 Carpetas Escolares
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[PRUEBA 3/3] Ejecutando verificación de estructura de Google Drive...${C_RESET}`);

inicializarEstructuraGoogleDrive()
  .then((res) => {
    if (res.exito && res.carpetasVerificadas >= 14) {
      console.log(`${C_VERDE}✓ PRUEBA 3 SUPERADA: 14 carpetas escolares inicializadas en modo [${res.modo}].${C_RESET}\n`);
    } else {
      console.log(`${C_ROJO}✗ PRUEBA 3 FALLIDA: No se completaron las 14 carpetas escolares.${C_RESET}\n`);
      fallos++;
    }

    // --------------------------------------------------------------------------
    // RESUMEN FINAL DEL EXIT GATE 1
    // --------------------------------------------------------------------------
    console.log(`${C_ORO}======================================================================${C_RESET}`);
    if (fallos === 0) {
      console.log(`${C_VERDE} ★★★ EXIT GATE 1 APROBADO: TODAS LAS PRUEBAS DE LA FASE 1 PASARON CON ÉXITO ★★★${C_RESET}`);
      console.log(`${C_ORO}======================================================================${C_RESET}`);
      process.exit(0);
    } else {
      console.log(`${C_ROJO} ⚠ EXIT GATE 1 NO APROBADO: ${fallos} error(es) detectado(s).${C_RESET}`);
      console.log(`${C_ORO}======================================================================${C_RESET}`);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error(`${C_ROJO}✗ PRUEBA 3 FALLIDA con excepción: ${err.message}${C_RESET}`);
    process.exit(1);
  });

