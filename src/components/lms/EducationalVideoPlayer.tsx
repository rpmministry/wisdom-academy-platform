'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Reproductor Educativo Integrado
 * ARCHIVO: src/components/lms/EducationalVideoPlayer.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Presenta el video elegido dentro de un visor amplio de Wisdom Academy. El
 * video se reproduce con el reproductor oficial de YouTube y la navegación
 * interna permite buscar otro recurso, volver al video anterior o regresar al
 * aula sin perder el contexto de la lección.
 *
 * Reglas:
 * 1. El reproductor nunca se impone en la columna estrecha de recursos.
 * 2. Los controles, la marca y las restricciones de YouTube no se alteran.
 * 3. Si un video no admite inserción, se conserva su información y se ofrece
 *    una salida controlada, además de las alternativas de la clase.
 * 4. La reproducción siempre requiere una acción voluntaria del estudiante.
 * ==============================================================================
 */

import React from 'react';
import type { RecursoVideo } from '@/types/educationalResources';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { ResourceThumbnail } from '@/components/lms/ResourceThumbnail';
import { YouTubeEmbedPlayer } from '@/components/lms/YouTubeEmbedPlayer';

export interface EducationalVideoPlayerProps {
  recurso: RecursoVideo;
  onCerrar: () => void;
  /** Abre la vista interna de búsqueda conservando el video actual. */
  onBuscarOtros?: () => void;
  /** Cierra el visor y contrae el panel para regresar a la clase. */
  onVolverAlAula?: () => void;
  /** Recupera el video consultado antes del actual. */
  onVolverAnterior?: () => void;
  historialCount?: number;
  /** Posición aproximada que puede restaurarse mediante el parámetro `start`. */
  inicioSegundos?: number;
  onProgreso?: (segundos: number) => void;
  compacto?: boolean;
  /** Alternativas de la clase que pueden seleccionarse desde el visor. */
  sugerencias?: RecursoVideo[];
  onSeleccionarSugerencia?: (recurso: RecursoVideo) => void;
  /** Valida y, si corresponde, incorpora la sugerencia sin salir del aula. */
  onValidarSugerencia?: (recurso: RecursoVideo) => void;
  validandoSugerenciaId?: string | null;
  errorSugerencia?: string | null;
}

/** Etiqueta legible del estado de validación. */
function etiquetaEstado(recurso: RecursoVideo): string {
  if (recurso.estado === 'VALIDADO') return 'Validado';
  if (recurso.estado === 'PENDIENTE_REVISION') return 'Pendiente de revisión';
  if (recurso.estado === 'RETIRADO_TEMPORAL') return 'Retirado temporalmente';
  return 'No validado';
}

/** Clase visual del estado de validación. */
function claseEstado(recurso: RecursoVideo): string {
  if (recurso.estado === 'VALIDADO') return 'wa-resource-badge--validated';
  if (recurso.estado === 'PENDIENTE_REVISION') return 'wa-resource-badge--pending';
  return 'wa-resource-badge--rejected';
}

export const EducationalVideoPlayer: React.FC<EducationalVideoPlayerProps> = ({
  recurso,
  onCerrar,
  onBuscarOtros,
  onVolverAlAula,
  onVolverAnterior,
  historialCount = 0,
  inicioSegundos = 0,
  onProgreso,
  compacto = false,
  sugerencias = [],
  onSeleccionarSugerencia,
  onValidarSugerencia,
  validandoSugerenciaId = null,
  errorSugerencia = null,
}) => {
  const puedeReproducir =
    recurso.reproduceIntegrado && recurso.estado !== 'RECHAZADO';
  const alternativas = sugerencias.filter(
    (sugerencia) => sugerencia.id !== recurso.id
  );

  return (
    <section
      className={`wa-resource-player${compacto ? ' wa-resource-player--compact' : ''}`}
      aria-label={`Reproductor de video: ${recurso.titulo}`}
      data-testid="educational-video-player"
    >
      {puedeReproducir ? (
        <YouTubeEmbedPlayer
          key={recurso.id}
          recurso={recurso}
          inicioSegundos={inicioSegundos}
          onProgreso={onProgreso}
        />
      ) : (
        <div
          className="wa-resource-player-fallback"
          role="note"
          data-testid="educational-video-unavailable"
        >
          <WisdomIcon name="video" size={26} color="gold" />
          <strong>Este video no puede reproducirse dentro del aula.</strong>
          <p>
            YouTube no confirma la reproducción integrada para este recurso. Tu
            clase y la información del video siguen disponibles; puedes elegir
            otra alternativa o abrirlo en YouTube de forma controlada.
          </p>
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
      )}

      <div className="wa-resource-player-bar">
        <div className="wa-resource-player-copy">
          <strong title={recurso.titulo}>{recurso.titulo}</strong>
          <span>
            {recurso.canal}
            {recurso.duracionTexto ? ` · ${recurso.duracionTexto}` : ''}
          </span>
        </div>

        <div className="wa-resource-player-actions">
          <button
            type="button"
            className="wa-resource-icon-btn"
            onClick={onCerrar}
            title="Cerrar visor y volver a los recursos"
            aria-label="Cerrar visor y volver a los recursos"
            data-testid="educational-player-close"
          >
            ✕
          </button>
          <a
            href={recurso.url}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-resource-icon-btn"
            title="Abrir el video original en YouTube"
            aria-label="Abrir el video original en YouTube"
          >
            <WisdomIcon name="arrow-right" size={16} />
          </a>
        </div>
      </div>

      <div className="wa-resource-player-footer">
        {onBuscarOtros && (
          <button
            type="button"
            className="wa-resource-btn wa-resource-btn--primary"
            onClick={onBuscarOtros}
            data-testid="educational-player-search"
          >
            <WisdomIcon name="search" size={16} />
            Buscar otros videos
          </button>
        )}
        {onVolverAnterior && (
          <button
            type="button"
            className="wa-resource-btn wa-resource-btn--secondary"
            onClick={onVolverAnterior}
            data-testid="educational-player-previous"
          >
            <WisdomIcon name="refresh" size={16} />
            Volver al video anterior
            {historialCount > 1 ? ` (${historialCount})` : ''}
          </button>
        )}
        {onVolverAlAula && (
          <button
            type="button"
            className="wa-resource-btn wa-resource-btn--ghost"
            onClick={onVolverAlAula}
            data-testid="educational-player-back-to-class"
          >
            <WisdomIcon
              name="chevron-right"
              size={16}
              style={{ transform: 'rotate(180deg)' }}
            />
            Volver al aula
          </button>
        )}
      </div>

      <p className="wa-resource-player-privacy">
        Video insertado con el reproductor oficial de YouTube en su dominio de
        privacidad mejorada. Al iniciar la reproducción, YouTube puede tratar datos
        técnicos conforme a sus políticas. Wisdom Academy no envía nombres, correos
        ni identificadores de la cuenta al reproductor.
      </p>

      {alternativas.length > 0 && onSeleccionarSugerencia && (
        <section
          className="wa-resource-player-suggestions"
          aria-label="Videos sugeridos para esta clase"
          data-testid="educational-player-suggestions"
        >
          <div className="wa-resource-player-suggestions-head">
            <strong>Otras explicaciones para este tema</strong>
            <span>
              Cambia de video o valida una alternativa sin salir de la clase.
            </span>
          </div>
          <ul>
            {alternativas.slice(0, 6).map((sugerencia) => (
              <li key={sugerencia.id}>
                <button
                  type="button"
                  className="wa-resource-player-suggestion"
                  onClick={() => onSeleccionarSugerencia(sugerencia)}
                  aria-label={`Reproducir ${sugerencia.titulo}`}
                  data-testid={`educational-suggestion-select-${sugerencia.id}`}
                >
                  <ResourceThumbnail
                    recurso={sugerencia}
                    variante="compact"
                    mostrarDuracion={false}
                  />
                  <span className="wa-resource-player-suggestion-copy">
                    <span
                      className={`wa-resource-badge ${claseEstado(sugerencia)}`}
                    >
                      {etiquetaEstado(sugerencia)}
                    </span>
                    <strong>{sugerencia.titulo}</strong>
                    <span>
                      {sugerencia.canal}
                      {sugerencia.duracionTexto
                        ? ` · ${sugerencia.duracionTexto}`
                        : ''}
                    </span>
                  </span>
                  <span className="wa-resource-player-suggestion-play">
                    <WisdomIcon name="play" size={14} />
                    {sugerencia.reproduceIntegrado ? 'Reproducir' : 'Ver video'}
                  </span>
                </button>
                {onValidarSugerencia && sugerencia.estado !== 'VALIDADO' && (
                  <button
                    type="button"
                    className="wa-resource-btn wa-resource-btn--secondary wa-resource-player-suggestion-validate"
                    onClick={() => onValidarSugerencia(sugerencia)}
                    disabled={validandoSugerenciaId !== null}
                    data-testid={`educational-suggestion-validate-${sugerencia.id}`}
                  >
                    <WisdomIcon name="shield" size={14} />
                    {validandoSugerenciaId === sugerencia.id
                      ? 'Validando…'
                      : 'Validar y reproducir'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {errorSugerencia && (
            <p className="wa-resource-warning" role="alert">
              {errorSugerencia}
            </p>
          )}
        </section>
      )}
    </section>
  );
};
