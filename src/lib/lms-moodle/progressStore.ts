/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Progreso Local por Estudiante
 * ARCHIVO: src/lib/lms-moodle/progressStore.ts
 *
 * PROPÓSITO:
 * Persiste el avance real de cada estudiante por asignatura y lección. El
 * progreso inicia en cero y se incrementa cuando el estudiante completa el
 * quiz formativo de una lección. El dashboard y el panel de ruta escuchan el
 * evento `wa-progress-updated` para refrescar sus métricas.
 * ==============================================================================
 */

export interface ProgresoMateria {
  lecciones: number[];
  notas: Record<string, number>;
}

type ProgresoUsuario = Record<string, ProgresoMateria>;

const PREFIJO = 'wa_progress_v2';
const EVENTO = 'wa-progress-updated';
const CLAVE_RESET = 'wa_progress_reset_2026_10_20';

function claveUsuario(usuarioId: string): string {
  return `${PREFIJO}_${usuarioId}`;
}

function vacio(): ProgresoMateria {
  return { lecciones: [], notas: {} };
}

function leerTodo(usuarioId: string): ProgresoUsuario {
  if (typeof window === 'undefined') return {};
  try {
    const crudo = window.localStorage.getItem(claveUsuario(usuarioId));
    if (!crudo) return {};
    const parseado = JSON.parse(crudo) as ProgresoUsuario;
    return parseado && typeof parseado === 'object' ? parseado : {};
  } catch {
    return {};
  }
}

function escribirTodo(usuarioId: string, progreso: ProgresoUsuario): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(claveUsuario(usuarioId), JSON.stringify(progreso));
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { usuarioId } }));
  } catch {
    // Si el almacenamiento está bloqueado, el avance permanece en memoria de la sesión.
  }
}

export function obtenerProgresoMateria(usuarioId: string, codigoMateria: string): ProgresoMateria {
  const todo = leerTodo(usuarioId);
  const materia = todo[codigoMateria];
  return materia && Array.isArray(materia.lecciones)
    ? { lecciones: materia.lecciones, notas: materia.notas || {} }
    : vacio();
}

export function obtenerLeccionesCompletadas(usuarioId: string, codigoMateria: string): number[] {
  return obtenerProgresoMateria(usuarioId, codigoMateria).lecciones;
}

export function marcarLeccionCompletada(
  usuarioId: string,
  codigoMateria: string,
  leccionId: number,
  nota?: number
): void {
  const todo = leerTodo(usuarioId);
  const materia = todo[codigoMateria] || vacio();
  if (!materia.lecciones.includes(leccionId)) {
    materia.lecciones.push(leccionId);
  }
  if (typeof nota === 'number' && Number.isFinite(nota)) {
    materia.notas[String(leccionId)] = Math.max(0, Math.min(10, nota));
  }
  todo[codigoMateria] = materia;
  escribirTodo(usuarioId, todo);
}

export function obtenerPorcentajeMateria(
  usuarioId: string,
  codigoMateria: string,
  totalLecciones: number
): number {
  if (totalLecciones <= 0) return 0;
  const completadas = obtenerLeccionesCompletadas(usuarioId, codigoMateria).length;
  return Math.min(100, Math.round((completadas / totalLecciones) * 100));
}

export function obtenerPromedioMateria(usuarioId: string, codigoMateria: string): number | null {
  const notas = Object.values(obtenerProgresoMateria(usuarioId, codigoMateria).notas);
  if (notas.length === 0) return null;
  return Math.round((notas.reduce((total, nota) => total + nota, 0) / notas.length) * 10) / 10;
}

/**
 * Reinicia una sola vez el progreso de los navegadores que ya tenían datos
 * demo. Después de esta marca, el avance real se conserva y se incrementa.
 */
export function asegurarProgresoInicial(usuarioId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const clave = `${CLAVE_RESET}_${usuarioId}`;
    if (window.localStorage.getItem(clave)) return;
    window.localStorage.removeItem(claveUsuario(usuarioId));
    window.localStorage.setItem(clave, '1');
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { usuarioId } }));
  } catch {
    // Sin almacenamiento, el estado inicial ya es cero.
  }
}

export function reiniciarProgreso(usuarioId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(claveUsuario(usuarioId));
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: { usuarioId } }));
  } catch {
    // Sin almacenamiento disponible no hay nada persistido que reiniciar.
  }
}

export function suscribirseAProgreso(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => callback();
  window.addEventListener(EVENTO, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENTO, handler);
    window.removeEventListener('storage', handler);
  };
}
