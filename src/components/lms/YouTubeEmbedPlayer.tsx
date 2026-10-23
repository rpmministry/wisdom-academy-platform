'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Reproductor Oficial de YouTube
 * ARCHIVO: src/components/lms/YouTubeEmbedPlayer.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Inserta el reproductor oficial de YouTube dentro del aula y escucha los
 * errores documentados por la IFrame Player API. Si el propietario prohíbe la
 * inserción, el video fue eliminado o el navegador no puede reproducirlo, el
 * componente reemplaza el marco por un mensaje comprensible y conserva una
 * salida controlada hacia YouTube.
 *
 * Reglas:
 * 1. Nunca se inicia la reproducción automáticamente.
 * 2. No se ocultan ni se superponen controles del reproductor.
 * 3. Se usa el dominio de privacidad youtube-nocookie.com.
 * 4. La URL se valida antes de insertarse; no se aceptan hosts arbitrarios.
 * ==============================================================================
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { RecursoVideo } from '@/types/educationalResources';
import {
  construirUrlReproduccion,
  mensajeErrorYouTube,
} from '@/lib/educational-resources/embed';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface EventoYouTube {
  target: PlayerYouTube;
  data?: number;
}

interface PlayerYouTube {
  getCurrentTime?: () => number;
  getPlayerState?: () => number;
  destroy?: () => void;
}

interface ApiYouTube {
  Player: new (
    elemento: string | HTMLElement,
    opciones: {
      events?: {
        onReady?: (evento: EventoYouTube) => void;
        onStateChange?: (evento: EventoYouTube) => void;
        onError?: (evento: EventoYouTube) => void;
      };
    }
  ) => PlayerYouTube;
}

declare global {
  interface Window {
    YT?: ApiYouTube;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const URL_API_YOUTUBE = 'https://www.youtube.com/iframe_api';
let promesaApiYouTube: Promise<ApiYouTube> | null = null;

/** Carga la API oficial una sola vez y la comparte entre reproductores. */
function cargarApiYouTube(): Promise<ApiYouTube> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('La API de YouTube requiere el navegador.'));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promesaApiYouTube) return promesaApiYouTube;

  promesaApiYouTube = new Promise<ApiYouTube>((resolver, rechazar) => {
    let resuelta = false;
    const anterior = window.onYouTubeIframeAPIReady;
    const finalizar = () => {
      if (resuelta) return;
      if (window.YT?.Player) {
        resuelta = true;
        resolver(window.YT);
      }
    };

    window.onYouTubeIframeAPIReady = () => {
      try {
        anterior?.();
      } finally {
        finalizar();
      }
    };

    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${URL_API_YOUTUBE}"]`
    );
    if (!script) {
      script = document.createElement('script');
      script.src = URL_API_YOUTUBE;
      script.async = true;
      script.onerror = () => {
        if (!resuelta) {
          promesaApiYouTube = null;
          rechazar(new Error('No fue posible cargar la API de YouTube.'));
        }
      };
      document.head.appendChild(script);
    }

    window.setTimeout(() => {
      if (!resuelta) {
        promesaApiYouTube = null;
        rechazar(new Error('La API de YouTube tardó demasiado en responder.'));
      }
    }, 8000);
  });

  return promesaApiYouTube;
}

export interface YouTubeEmbedPlayerProps {
  recurso: Pick<RecursoVideo, 'id' | 'titulo' | 'url' | 'embedUrl'>;
  inicioSegundos?: number;
  onEstadoCambio?: (estado: 'listo' | 'reproduciendo' | 'pausado' | 'finalizado') => void;
  onProgreso?: (segundos: number) => void;
}

/** Reproductor integrado que informa errores de inserción sin bloquear el aula. */
export const YouTubeEmbedPlayer: React.FC<YouTubeEmbedPlayerProps> = ({
  recurso,
  inicioSegundos = 0,
  onEstadoCambio,
  onProgreso,
}) => {
  const idReact = useId();
  const iframeId = useMemo(
    () => `wa-yt-${idReact.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [idReact]
  );
  const [codigoError, setCodigoError] = useState<number | null>(null);
  const [intento, setIntento] = useState(0);
  const [estado, setEstado] = useState<
    'listo' | 'reproduciendo' | 'pausado' | 'finalizado'
  >('listo');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<PlayerYouTube | null>(null);
  const intervaloRef = useRef<number | null>(null);
  const onEstadoRef = useRef(onEstadoCambio);
  const onProgresoRef = useRef(onProgreso);

  useEffect(() => {
    onEstadoRef.current = onEstadoCambio;
  }, [onEstadoCambio]);

  useEffect(() => {
    onProgresoRef.current = onProgreso;
  }, [onProgreso]);

  const src = useMemo(
    () =>
      construirUrlReproduccion(recurso.embedUrl, {
        inicioSegundos,
        origen: typeof window === 'undefined' ? undefined : window.location.origin,
      }),
    [recurso.embedUrl, inicioSegundos]
  );

  const detenerIntervalo = useCallback(() => {
    if (intervaloRef.current !== null) {
      window.clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!src || codigoError !== null) return;
    if (playerRef.current) return;

    cargarApiYouTube()
      .then((api) => {
        const iframe = iframeRef.current;
        if (!iframe || playerRef.current) return;

        const player = new api.Player(iframeId, {
          events: {
            onReady: () => {
              onEstadoRef.current?.('listo');
            },
            onStateChange: (evento) => {
              const valor = evento.data;
              if (valor === 1) {
                setEstado('reproduciendo');
                onEstadoRef.current?.('reproduciendo');
              } else if (valor === 2) {
                setEstado('pausado');
                onEstadoRef.current?.('pausado');
                try {
                  const tiempo = playerRef.current?.getCurrentTime?.() || 0;
                  if (tiempo > 0) onProgresoRef.current?.(tiempo);
                } catch {
                  // La posición es una mejora, nunca un requisito de reproducción.
                }
              } else if (valor === 0) {
                setEstado('finalizado');
                onEstadoRef.current?.('finalizado');
              }
            },
            onError: (evento) => {
              const codigo =
                typeof evento.data === 'number' ? evento.data : -1;
              setEstado('listo');
              setCodigoError(codigo);
              playerRef.current = null;
              detenerIntervalo();
            },
          },
        });

        playerRef.current = player;
        detenerIntervalo();
        intervaloRef.current = window.setInterval(() => {
          try {
            const tiempo = playerRef.current?.getCurrentTime?.() || 0;
            if (tiempo > 0) onProgresoRef.current?.(tiempo);
          } catch {
            // Si el reproductor aún no está listo, se reintenta en el próximo ciclo.
          }
        }, 2000);
      })
      .catch(() => {
        // La API puede estar bloqueada por la red o una extensión. El iframe
        // sigue siendo operable y conserva los controles nativos de YouTube.
      });

    return () => {
      detenerIntervalo();
    };
  }, [codigoError, detenerIntervalo, iframeId, intento, src]);

  if (!src) {
    return (
      <div className="wa-resource-player-fallback" role="alert">
        <WisdomIcon name="video" size={26} color="gold" />
        <strong>No pudimos preparar este video dentro del aula.</strong>
        <p>La dirección de inserción no pertenece a un dominio oficial de YouTube.</p>
        <a
          href={recurso.url}
          target="_blank"
          rel="noopener noreferrer"
          className="wa-resource-btn wa-resource-btn--secondary"
        >
          <WisdomIcon name="arrow-right" size={16} />
          Abrir en YouTube
        </a>
      </div>
    );
  }

  if (codigoError !== null) {
    return (
      <div
        className="wa-resource-player-fallback"
        role="alert"
        data-testid="educational-video-error"
        data-error-code={codigoError}
      >
        <WisdomIcon name="shield" size={26} color="gold" />
        <strong>No pudimos reproducir este video dentro del aula.</strong>
        <p>{mensajeErrorYouTube(codigoError)}</p>
        <div className="wa-resource-actions">
          <button
            type="button"
            className="wa-resource-btn wa-resource-btn--secondary"
            onClick={() => {
              setCodigoError(null);
              setIntento((valor) => valor + 1);
            }}
          >
            Reintentar reproducción
          </button>
          <a
            href={recurso.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-resource-btn wa-resource-btn--primary"
          >
            <WisdomIcon name="arrow-right" size={16} />
            Abrir en YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-resource-player-media">
      <div className="wa-resource-player-frame">
        <iframe
          ref={iframeRef}
          id={iframeId}
          key={intento}
          src={src}
          title={`Video educativo: ${recurso.titulo}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          data-testid="educational-video-iframe"
        />
      </div>
      <p className="wa-resource-player-status" role="status" aria-live="polite">
        {estado === 'reproduciendo'
          ? 'Reproduciendo el video.'
          : estado === 'pausado'
          ? 'Video en pausa.'
          : estado === 'finalizado'
          ? 'El video terminó. Puedes elegir otro recurso.'
          : 'Reproductor listo. Usa los controles de YouTube para iniciar.'}
      </p>
    </div>
  );
};
