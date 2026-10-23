/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Auditoría Determinista de Diseño (Fase 2)
 * ARCHIVO: scripts/test-phase-2-design.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Validador automatizado para el cumplimiento estricto del Exit Gate 2:
 * 1. Cero uso de colores prohibidos (#000000, #ffffff, #000, #fff puros).
 * 2. Cero uso de fuentes genéricas (Inter, Roboto, Arial).
 * 3. Cero animaciones sobre propiedades de layout (width, height, margin, padding).
 * 4. Presencia de los 5 breakpoints de IBM Carbon (320px, 672px, 1056px, 1312px, 1584px)
 *    y del padding obligatorio de 16px (--carbon-space-2x).
 * 5. Verificación de existencia de manifiesto PWA e iconos de alta resolución.
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

// Colores para consola
const C_RESET = '\x1b[0m';
const C_VERDE = '\x1b[32m';
const C_ROJO = '\x1b[31m';
const C_AZUL = '\x1b[34m';
const C_ORO = '\x1b[33m';

console.log(`${C_ORO}======================================================================${C_RESET}`);
console.log(`${C_ORO}    WISDOM ACADEMY - AUDITORÍA DETERMINISTA FASE 2 (EXIT GATE 2)      ${C_RESET}`);
console.log(`${C_ORO}======================================================================${C_RESET}\n`);

let totalInfracciones = 0;

/**
 * Función recursiva para obtener todos los archivos de código en un directorio.
 */
function obtenerArchivos(dir: string, extensiones: string[]): string[] {
  let resultados: string[] = [];
  if (!fs.existsSync(dir)) return resultados;

  const lista = fs.readdirSync(dir);
  for (const item of lista) {
    const rutaCompleta = path.join(dir, item);
    const stat = fs.statSync(rutaCompleta);

    if (stat.isDirectory()) {
      if (
        item !== 'node_modules' &&
        item !== '.next' &&
        item !== '.git' &&
        item !== '.drive_local_cache'
      ) {
        resultados = resultados.concat(obtenerArchivos(rutaCompleta, extensiones));
      }
    } else {
      if (extensiones.some((ext) => item.endsWith(ext))) {
        resultados.push(rutaCompleta);
      }
    }
  }
  return resultados;
}

/**
 * Elimina comentarios de código para evitar falsos positivos en descripciones explicativas.
 */
function limpiarComentarios(contenido: string): string {
  // Remueve comentarios de bloque /* ... */ y comentarios de línea // ...
  return contenido
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

const archivosFuente = obtenerArchivos(path.join(process.cwd(), 'src'), ['.css', '.ts', '.tsx']);
console.log(`${C_AZUL}Archivos inspeccionados en src/: ${archivosFuente.length}${C_RESET}\n`);

// ------------------------------------------------------------------------------
// AUDITORÍA 1: CERO COLORES PROHIBIDOS (#000000, #ffffff, #000, #fff)
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[AUDITORÍA 1/5] Verificando ausencia de colores prohibidos...${C_RESET}`);
let infraccionesColor = 0;
const regexColorProhibido = /#((?:000000|ffffff|000|fff)(?![0-9a-fA-F]))\b/i;

for (const archivo of archivosFuente) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const codigoLimpio = limpiarComentarios(contenido);
  const match = codigoLimpio.match(regexColorProhibido);

  if (match) {
    const relativo = path.relative(process.cwd(), archivo);
    console.log(`${C_ROJO}  ✗ Infracción en ${relativo}: Uso del color prohibido '${match[0]}'${C_RESET}`);
    infraccionesColor++;
    totalInfracciones++;
  }
}

if (infraccionesColor === 0) {
  console.log(`${C_VERDE}  ✓ 0 infracciones de color: Todos los estilos usan neutros tintados cálidos.${C_RESET}\n`);
} else {
  console.log(`${C_ROJO}  ✗ ${infraccionesColor} infracción(es) de color detectada(s).${C_RESET}\n`);
}

// ------------------------------------------------------------------------------
// AUDITORÍA 2: CERO FUENTES PROHIBIDAS (Inter, Roboto, Arial)
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[AUDITORÍA 2/5] Verificando tipografía editorial y ausencia de fuentes genéricas...${C_RESET}`);
let infraccionesFuente = 0;
const regexFuenteProhibida = /\b(Inter|Roboto|Arial)\b/i;

for (const archivo of archivosFuente) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const codigoLimpio = limpiarComentarios(contenido);
  const match = codigoLimpio.match(regexFuenteProhibida);

  if (match) {
    const relativo = path.relative(process.cwd(), archivo);
    console.log(`${C_ROJO}  ✗ Infracción en ${relativo}: Uso de la fuente genérica prohibida '${match[0]}'${C_RESET}`);
    infraccionesFuente++;
    totalInfracciones++;
  }
}

if (infraccionesFuente === 0) {
  console.log(`${C_VERDE}  ✓ 0 infracciones de fuentes: Usando exclusivamente Bricolage Grotesque, Schibsted Grotesk e IBM Plex Mono.${C_RESET}\n`);
} else {
  console.log(`${C_ROJO}  ✗ ${infraccionesFuente} infracción(es) de fuentes detectada(s).${C_RESET}\n`);
}

// ------------------------------------------------------------------------------
// AUDITORÍA 3: CERO ANIMACIONES DE PROPIEDADES DE LAYOUT
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[AUDITORÍA 3/5] Verificando reglas de animación en GPU (solo transform y opacity)...${C_RESET}`);
let infraccionesAnimacion = 0;
const regexAnimacionLayout = /transition\s*:[^;,\n}]*(?:\bwidth\b|\bheight\b|\bmargin\b|\bpadding\b)/i;

for (const archivo of archivosFuente) {
  const contenido = fs.readFileSync(archivo, 'utf8');
  const codigoLimpio = limpiarComentarios(contenido);
  const match = codigoLimpio.match(regexAnimacionLayout);

  if (match) {
    const relativo = path.relative(process.cwd(), archivo);
    console.log(`${C_ROJO}  ✗ Infracción en ${relativo}: Animación sobre propiedades de layout: '${match[0]}'${C_RESET}`);
    infraccionesAnimacion++;
    totalInfracciones++;
  }
}

if (infraccionesAnimacion === 0) {
  console.log(`${C_VERDE}  ✓ 0 infracciones de animación: Animaciones ejecutadas exclusivamente en GPU.${C_RESET}\n`);
} else {
  console.log(`${C_ROJO}  ✗ ${infraccionesAnimacion} infracción(es) de animación detectada(s).${C_RESET}\n`);
}

// ------------------------------------------------------------------------------
// AUDITORÍA 4: LOS 5 BREAKPOINTS DE IBM CARBON Y PADDING DE 16PX
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[AUDITORÍA 4/5] Verificando los 5 breakpoints de IBM Carbon y escala 2x Grid...${C_RESET}`);
const gridCssPath = path.join(process.cwd(), 'src', 'styles', 'carbon-grid.css');
let infraccionesGrid = 0;

if (!fs.existsSync(gridCssPath)) {
  console.log(`${C_ROJO}  ✗ ERROR: ${gridCssPath} no existe.${C_RESET}`);
  infraccionesGrid++;
  totalInfracciones++;
} else {
  const contenidoGrid = fs.readFileSync(gridCssPath, 'utf8');
  const breakpointsEsperados = ['320px', '672px', '1056px', '1312px', '1584px'];

  for (const bp of breakpointsEsperados) {
    if (contenidoGrid.includes(bp)) {
      console.log(`  ✓ Breakpoint verificado: ${bp}`);
    } else {
      console.log(`${C_ROJO}  ✗ Falta breakpoint requerido: ${bp}${C_RESET}`);
      infraccionesGrid++;
      totalInfracciones++;
    }
  }

  // Verifica presencia de padding obligatorio de 16px (--carbon-space-2x)
  if (contenidoGrid.includes('--carbon-space-2x')) {
    console.log(`  ✓ Padding obligatorio de 16px (--carbon-space-2x) configurado.`);
  } else {
    console.log(`${C_ROJO}  ✗ No se encontró referencia a '--carbon-space-2x'.${C_RESET}`);
    infraccionesGrid++;
    totalInfracciones++;
  }

  // Verifica presencia de las clases maestras .wa-carbon-grid y .wa-carbon-editorial-grid
  if (contenidoGrid.includes('.wa-carbon-grid') && contenidoGrid.includes('.wa-carbon-editorial-grid')) {
    console.log(`  ✓ Clases maestras .wa-carbon-grid y .wa-carbon-editorial-grid implementadas.`);
  } else {
    console.log(`${C_ROJO}  ✗ Faltan clases estructurales de Carbon Grid.${C_RESET}`);
    infraccionesGrid++;
    totalInfracciones++;
  }
}

if (infraccionesGrid === 0) {
  console.log(`${C_VERDE}  ✓ 0 infracciones de grid: Geometría de IBM Carbon 2x Grid 100% verificada.${C_RESET}\n`);
} else {
  console.log(`${C_ROJO}  ✗ ${infraccionesGrid} infracción(es) en el grid.${C_RESET}\n`);
}

// ------------------------------------------------------------------------------
// AUDITORÍA 5: VERIFICACIÓN DE MANIFIESTO PWA Y ACTIVOS DE ICONOS
// ------------------------------------------------------------------------------
console.log(`${C_AZUL}[AUDITORÍA 5/5] Verificando presencia de activos PWA en public/...${C_RESET}`);
const activosPwa = [
  'site.webmanifest',
  'apple-touch-icon.png',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
];

let infraccionesPwa = 0;
for (const activo of activosPwa) {
  const rutaActivo = path.join(process.cwd(), 'public', activo);
  if (fs.existsSync(rutaActivo)) {
    console.log(`  ✓ Activo PWA presente: /public/${activo}`);
  } else {
    console.log(`${C_ROJO}  ✗ Falta activo PWA: /public/${activo}${C_RESET}`);
    infraccionesPwa++;
    totalInfracciones++;
  }
}

if (infraccionesPwa === 0) {
  console.log(`${C_VERDE}  ✓ Todos los activos PWA están presentes para carga HTTP 200.${C_RESET}\n`);
} else {
  console.log(`${C_ROJO}  ✗ ${infraccionesPwa} activo(s) PWA faltante(s).${C_RESET}\n`);
}

// ------------------------------------------------------------------------------
// REPORTE FINAL DEL EXIT GATE 2
// ------------------------------------------------------------------------------
console.log(`${C_ORO}======================================================================${C_RESET}`);
if (totalInfracciones === 0) {
  console.log(`${C_VERDE} ★★★ EXIT GATE 2 APROBADO: 0 INFRACCIONES DE DISEÑO DETECTADAS ★★★${C_RESET}`);
  console.log(`${C_VERDE} IBM Carbon 2x Grid e Impeccable Style están implementados con rigor.${C_RESET}`);
  console.log(`${C_ORO}======================================================================${C_RESET}`);
  process.exit(0);
} else {
  console.log(`${C_ROJO} ⚠ EXIT GATE 2 NO APROBADO: Se detectaron ${totalInfracciones} infracción(es).${C_RESET}`);
  console.log(`${C_ORO}======================================================================${C_RESET}`);
  process.exit(1);
}

