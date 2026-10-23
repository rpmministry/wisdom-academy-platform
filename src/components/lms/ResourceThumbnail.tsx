'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Miniatura de Recurso Audiovisual
 * ARCHIVO: src/components/lms/ResourceThumbnail.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Presenta la miniatura oficial de YouTube en una caja 16:9 que nunca deforma
 * la imagen. Si la miniatura no carga, muestra un marcador estable en lugar de
 * dejar un espacio vacío o conservar un estilo de error de una selección
 * anterior.
 *
 * El texto alternativo se deja vacío porque el título visible y el nombre
 * accesible del botón que contiene la miniatura ya describen el recurso.
 * ==============================================================================
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { RecursoVideo } from '@/types/educationalResources';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface ResourceThumbnailProps {
  recurso: Pick<
    RecursoVideo,
    'id' | 'titulo' | 'miniaturaUrl' | 'duracionTexto'
  >;
  variante?: 'hero' | 'compact';
  mostrarDuracion?: boolean;
  className?: string;
}

export const ResourceThumbnail: React.FC<ResourceThumbnailProps> = ({
  recurso,
  variante = 'hero',
  mostrarDuracion = true,
  className = '',
}) => {
  const fuentes = useMemo(() => {
    const candidatas = [
      recurso.miniaturaUrl,
      `https://i.ytimg.com/vi/${recurso.id}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${recurso.id}/hqdefault.jpg`,
    ].filter(Boolean);
    return Array.from(new Set(candidatas));
  }, [recurso.id, recurso.miniaturaUrl]);

  const [indiceFuente, setIndiceFuente] = useState(0);
  const [sinImagen, setSinImagen] = useState(false);

  useEffect(() => {
    setIndiceFuente(0);
    setSinImagen(false);
  }, [fuentes]);

  const fuente = fuentes[indiceFuente];

  const manejarError = () => {
    if (indiceFuente + 1 < fuentes.length) {
      setIndiceFuente((indice) => indice + 1);
    } else {
      setSinImagen(true);
    }
  };

  return (
    <span
      className={`wa-resource-thumb wa-resource-thumb--${variante} ${className}`.trim()}
      data-testid={`educational-thumbnail-${recurso.id}`}
      data-image-failed={sinImagen ? 'true' : undefined}
    >
      {!sinImagen && fuente ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fuente}
          alt=""
          width={640}
          height={360}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={manejarError}
        />
      ) : (
        <span className="wa-resource-thumb-fallback" aria-hidden="true">
          <WisdomIcon name="video" size={variante === 'compact' ? 20 : 28} />
          <span>Miniatura no disponible</span>
        </span>
      )}

      {mostrarDuracion && recurso.duracionTexto && (
        <span className="wa-resource-duration">
          <WisdomIcon name="clock" size={12} />
          {recurso.duracionTexto}
        </span>
      )}
    </span>
  );
};
