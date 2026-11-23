'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { pazPublicConfig } from '@/lib/paz-en-la-mesa/config';

export interface PazTrailerPlayerProps {
  videoUrl?: string;
  title?: string;
  posterImage?: string;
  className?: string;
}

function parseVideoEmbed(urlStr: string): { type: 'youtube' | 'video' | 'iframe'; src: string } | null {
  if (!urlStr || !urlStr.trim()) return null;
  const trimmed = urlStr.trim();

  // YouTube matchers
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?enablejsapi=1&rel=0&playsinline=1&autoplay=1`,
    };
  }

  // Direct MP4 / WebM
  if (/\.(mp4|webm|ogg)$/i.test(trimmed)) {
    return { type: 'video', src: trimmed };
  }

  // Any other secure embed / URL
  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'iframe', src: trimmed };
  }

  return null;
}

export function PazTrailerPlayer({
  videoUrl,
  title = 'Tráiler oficial de presentación',
  posterImage,
  className = '',
}: PazTrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const activeUrl = videoUrl || pazPublicConfig.trailerVideoUrl;
  const embed = useMemo(() => parseVideoEmbed(activeUrl), [activeUrl]);
  const poster = posterImage || PAZ_BRAND.coverImage;

  return (
    <div
      className={`paz-trailer-box ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '920px',
        margin: '0 auto',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(43,41,39,0.18)',
        background: '#2b2927',
        border: '1px solid rgba(197,160,89,0.3)',
      }}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
        {embed && isPlaying ? (
          embed.type === 'youtube' || embed.type === 'iframe' ? (
            <iframe
              src={embed.src}
              title={title}
              style={{
                width: '100%',
                height: '100%',
                border: 0,
                display: 'block',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              src={embed.src}
              controls
              autoPlay
              playsInline
              poster={poster}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, rgba(43,41,39,0.7) 0%, rgba(43,41,39,0.92) 100%)',
              color: '#faf8f5',
              textAlign: 'center',
              padding: '1.5rem',
            }}
          >
            {poster && (
              <Image
                src={poster}
                alt={title}
                fill
                sizes="(max-width: 920px) 100vw, 920px"
                unoptimized
                style={{
                  objectFit: 'cover',
                  opacity: embed ? 0.35 : 0.22,
                  filter: 'blur(2px)',
                }}
              />
            )}

            <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  background: 'rgba(197,160,89,0.22)',
                  border: '1px solid rgba(197,160,89,0.45)',
                  color: '#f3e2bd',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                }}
              >
                <WisdomIcon name="video" size={14} />
                {embed ? 'Video disponible · Clic para reproducir' : 'Tráiler oficial · Próximamente'}
              </span>

              <h3
                style={{
                  fontFamily: 'var(--paz-serif)',
                  fontSize: 'clamp(1.2rem, 3.2vw, 1.85rem)',
                  fontWeight: 600,
                  margin: '0 0 0.6rem 0',
                  lineHeight: 1.25,
                }}
              >
                Paz en la mesa, Orden en el bolsillo y fuego en el corazón
              </h3>

              <p
                style={{
                  fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                  color: 'rgba(250,248,245,0.85)',
                  margin: '0 0 1.25rem 0',
                  lineHeight: 1.5,
                }}
              >
                Samuel y Gabby Palacio presentan la experiencia que transformará la mesa, las finanzas y el altar de tu hogar.
              </p>

              {embed ? (
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="paz-btn paz-btn--primary"
                  style={{
                    padding: '0.85rem 1.75rem',
                    fontSize: '1rem',
                    boxShadow: '0 10px 30px rgba(197,160,89,0.4)',
                  }}
                  aria-label="Reproducir tráiler oficial"
                >
                  <WisdomIcon name="play" size={20} />
                  Ver el tráiler aquí
                </button>
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '12px',
                    background: 'rgba(250,248,245,0.1)',
                    border: '1px dashed rgba(250,248,245,0.3)',
                    fontSize: '0.86rem',
                    color: 'rgba(250,248,245,0.8)',
                  }}
                >
                  <WisdomIcon name="clock" size={16} />
                  Espacio preparado para reproducción in-page sin salir de la plataforma
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PazTrailerPlayer;
