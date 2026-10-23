/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Auditoría de Recursos por Currículo
 * ARCHIVO: scripts/audit-educational-resources.ts
 *
 * PROPÓSITO:
 * Enumera TODAS las asignaturas y unidades de los perfiles curriculares
 * registrados (hoy Avril y Gael; mañana cualquier perfil nuevo) y genera la
 * consulta contextual y la URL de búsqueda de YouTube para cada clase.
 *
 * Uso:
 *   npm run resources:audit
 *   npm run resources:audit -- --live --limit=5
 *
 * El modo --live consulta la API real y consume cuota de YouTube. Sin --live
 * no hace peticiones de red: sirve como mapa de cobertura curricular.
 * ==============================================================================
 */

import { PERFILES_CURRICULARES } from '../src/data/curriculum';
import { curriculumContentEngine } from '../src/services/curriculumContentEngine';
import {
  construirConsultaContextual,
  construirUrlBusquedaYouTube,
} from '../src/lib/educational-resources/text';
import { VERSION_CRITERIOS } from '../src/lib/educational-resources/constants';

interface FilaAuditoria {
  perfil: string;
  grado: string;
  asignatura: string;
  unidad: string;
  tema: string;
  consulta: string;
  busquedaUrl: string;
}

function escaparCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

async function main(): Promise<void> {
  const argumentos = process.argv.slice(2);
  const modoLive = argumentos.includes('--live');
  const argumentoLimite = argumentos.find((item) => item.startsWith('--limit='));
  const limiteSolicitado = argumentoLimite
    ? Number(argumentoLimite.split('=')[1])
    : 5;
  const limiteLive = Math.min(
    20,
    Math.max(1, Number.isFinite(limiteSolicitado) ? limiteSolicitado : 5)
  );

  const filas: FilaAuditoria[] = [];
  const contextos: Array<{
    fila: FilaAuditoria;
    contexto: ReturnType<
      typeof curriculumContentEngine.obtenerContextoAprendizajeDesdePerfil
    >;
  }> = [];

  for (const perfil of Object.values(PERFILES_CURRICULARES)) {
    for (const asignatura of perfil.asignaturas) {
      for (const unidad of asignatura.unidades) {
        const contexto = curriculumContentEngine.obtenerContextoAprendizajeDesdePerfil(
          perfil,
          asignatura.nombre,
          unidad.titulo,
          1
        );
        const consulta = construirConsultaContextual(contexto);
        const fila: FilaAuditoria = {
          perfil: `${perfil.estudiante} (${perfil.grado})`,
          grado: perfil.grado,
          asignatura: asignatura.nombre,
          unidad: unidad.titulo,
          tema: contexto.tema,
          consulta,
          busquedaUrl: construirUrlBusquedaYouTube(consulta),
        };
        filas.push(fila);
        contextos.push({ fila, contexto });
      }
    }
  }

  console.log(
    `# Auditoría de recursos audiovisuales · ${VERSION_CRITERIOS}`
  );
  console.log(`# Perfiles: ${Object.keys(PERFILES_CURRICULARES).length}`);
  console.log(`# Clases/unidades: ${filas.length}`);
  console.log('');
  console.log(
    [
      'perfil',
      'grado',
      'asignatura',
      'unidad',
      'tema',
      'consulta',
      'busqueda_url',
    ]
      .map(escaparCsv)
      .join(',')
  );
  for (const fila of filas) {
    console.log(
      [
        fila.perfil,
        fila.grado,
        fila.asignatura,
        fila.unidad,
        fila.tema,
        fila.consulta,
        fila.busquedaUrl,
      ]
        .map(escaparCsv)
        .join(',')
    );
  }

  if (!modoLive) {
    console.error(
      '\nModo estático: no se consultó YouTube. Usa --live --limit=N para validar una muestra real.'
    );
    return;
  }

  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());
  const { EducationalResourcesService } = await import(
    '../src/lib/educational-resources/service'
  );
  const servicio = new EducationalResourcesService();
  const muestra = contextos.slice(0, limiteLive);

  console.error(
    `\nConsultando ${muestra.length} clase(s) con la API real (límite ${limiteLive}).`
  );
  for (const { fila, contexto } of muestra) {
    const resultado = await servicio.obtenerRecomendaciones(contexto, {
      forzar: true,
    });
    const mejor =
      resultado.recursos[0]?.titulo ||
      resultado.pendientes[0]?.titulo ||
      'sin candidatos';
    console.error(
      `- ${fila.asignatura} / ${fila.unidad}: origen=${resultado.origen} validados=${resultado.recursos.length} pendientes=${resultado.pendientes.length} · ${mejor}`
    );
  }
  console.error(
    'La cola de revisión docente quedó actualizada en .data/educational-resources/state.json.'
  );
}

void main().catch((error) => {
  console.error(
    `Error en la auditoría: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});
