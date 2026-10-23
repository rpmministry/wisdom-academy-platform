/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Utilidades del Reproductor Integrado
 * ARCHIVO: src/lib/educational-resources/embed.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centraliza la preparación segura de la URL del reproductor oficial de YouTube
 * y la traducción de sus códigos de error. Son funciones puras para poder
 * verificarlas sin red ni DOM.
 *
 * Reglas:
 * 1. Solo se aceptan URLs de inserción de dominios oficiales de YouTube.
 * 2. Nunca se habilitan reproducciones automáticas.
 * 3. La identificación del sitio (`origin`) y `enablejsapi` son obligatorias
 *    para que el reproductor pueda informar errores de inserción.
 * 4. Los parámetros obsoletos que alteran la marca de YouTube no se envían.
 * ==============================================================================
 */

const HOSTS_EMBED_PERMITIDOS = new Set([
  'youtube.com',
  'www.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export interface OpcionesUrlReproduccion {
  /** Segundo desde el que se reanuda el video, cuando se conoce. */
  inicioSegundos?: number;
  /** Origen real de Wisdom Academy para identificar la API del reproductor. */
  origen?: string;
}

/**
 * Prepara la URL de un iframe de YouTube ya validado por el servidor.
 * Devuelve `null` si la URL no pertenece a un dominio oficial o no contiene un
 * identificador de video reconocible.
 */
export function construirUrlReproduccion(
  embedUrl: string,
  opciones: OpcionesUrlReproduccion = {}
): string | null {
  let url: URL;
  try {
    url = new URL(embedUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (!HOSTS_EMBED_PERMITIDOS.has(url.hostname.toLowerCase())) return null;
  if (!/^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname)) return null;

  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', '1');
  url.searchParams.set('rel', '0');
  url.searchParams.delete('modestbranding');
  url.searchParams.delete('autoplay');

  if (opciones.origen) {
    url.searchParams.set('origin', opciones.origen);
  }

  const inicio = opciones.inicioSegundos;
  if (typeof inicio === 'number' && Number.isFinite(inicio) && inicio >= 3) {
    url.searchParams.set('start', String(Math.floor(inicio)));
  } else {
    url.searchParams.delete('start');
  }

  return url.toString();
}

/**
 * Traduce los códigos documentados de `onError` a un mensaje comprensible para
 * el estudiante. La interfaz conserva el título y las alternativas fuera de
 * este mensaje.
 */
export function mensajeErrorYouTube(codigo: number): string {
  if (codigo === 101 || codigo === 150) {
    return 'El propietario de este video no permite reproducirlo dentro de otra plataforma. Puedes abrirlo en YouTube o elegir otro recurso de la clase.';
  }
  if (codigo === 100) {
    return 'El video ya no está disponible: fue eliminado, es privado o cambió su visibilidad. Puedes elegir otro recurso de la clase.';
  }
  if (codigo === 2) {
    return 'La dirección del video no es válida. Puedes volver a los recursos y elegir otro video verificado.';
  }
  if (codigo === 5) {
    return 'El navegador no pudo reproducir este video. Puedes reintentar o abrirlo directamente en YouTube.';
  }
  if (codigo === 153) {
    return 'YouTube no pudo identificar el sitio donde está insertado el video. Actualiza la página y vuelve a intentarlo.';
  }
  return 'YouTube informó un problema al cargar este video. La clase sigue disponible y puedes elegir otro recurso.';
}
