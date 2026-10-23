'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface LessonPlayerProps {
  slug: string;
  lessonId: string;
  title: string;
  fallbackImage?: string;
  videos: Array<{ id: string; embedUrl: string; watchUrl: string }>;
  initialCompleted: boolean;
}

export const LessonPlayer: React.FC<LessonPlayerProps> = ({
  slug,
  lessonId,
  title,
  fallbackImage,
  videos,
  initialCompleted,
}) => {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlaybackHelp, setShowPlaybackHelp] = useState(false);
  const [activeVideo, setActiveVideo] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  const [posterFailed, setPosterFailed] = useState(false);

  const video = videos[activeVideo];
  const embedKey = useMemo(() => `${lessonId}-${activeVideo}`, [lessonId, activeVideo]);
  const posterUrls = useMemo(
    () =>
      video
        ? [
            `https://i.ytimg.com/vi/${video.id}/hq2.jpg`,
            `https://i.ytimg.com/vi/${video.id}/hq3.jpg`,
            `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
            `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          ]
        : [],
    [video]
  );

  useEffect(() => {
    setPlaying(false);
    setPosterIndex(0);
    setPosterFailed(false);
    setShowPlaybackHelp(false);
  }, [activeVideo]);

  const posterSrc = posterFailed ? fallbackImage : posterUrls[posterIndex] || fallbackImage;

  const markCompleted = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/courses/${slug}/progress`, {
        method: 'POST',
        body: { lessonId, completed: true },
      });
      setCompleted(true);
      router.refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wa-lp">
      {video ? (
        <>
          <div className="wa-lp-media">
            <div className="wa-lp-media-head">
              <span><WisdomIcon name="video" size={15} /> Video de la sesión</span>
              <a href={video.watchUrl} target="_blank" rel="noopener noreferrer">
                Abrir en YouTube <WisdomIcon name="arrow-right" size={13} />
              </a>
            </div>
            <div className="wa-lp-frame">
              {playing ? (
                <iframe
                  key={embedKey}
                  src={`${video.embedUrl}&autoplay=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="wa-lp-poster"
                  onClick={() => setPlaying(true)}
                  aria-label={`Reproducir ${title}`}
                >
                  {posterSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterSrc}
                      alt=""
                      className="wa-lp-poster-img"
                      referrerPolicy="no-referrer"
                      onError={() => {
                        if (!posterFailed && posterIndex < posterUrls.length - 1) {
                          setPosterIndex((current) => current + 1);
                        } else {
                          setPosterFailed(true);
                        }
                      }}
                    />
                  ) : null}
                  <span className="wa-lp-poster-shade" />
                  <span className="wa-lp-poster-content">
                    <span className="wa-lp-poster-kicker">Clase en video</span>
                    <strong>{title}</strong>
                    <span className="wa-lp-poster-play"><WisdomIcon name="play" size={22} /></span>
                    <small>Reproducir sesión</small>
                  </span>
                </button>
              )}
            </div>
            <div className="wa-lp-media-foot">
              <div className="wa-lp-video-tabs" role="tablist" aria-label="Videos de la clase">
                {videos.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeVideo}
                    className={`wa-lp-tab ${index === activeVideo ? 'is-active' : ''}`}
                    onClick={() => setActiveVideo(index)}
                  >
                    <span>{index + 1}</span> Video {index + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className={`wa-lp-tab ${showPlaybackHelp ? 'is-active' : ''}`}
                  onClick={() => setShowPlaybackHelp((current) => !current)}
                >
                  <WisdomIcon name="shield" size={13} /> ¿No carga?
                </button>
              </div>
            </div>
            {showPlaybackHelp && (
              <div className="wa-lp-help">
                Si el video no se reproduce, puede tener la inserción deshabilitada, una restricción de
                edad o una limitación regional configurada en YouTube. El enlace de YouTube sigue siendo
                la fuente oficial del recurso. Wisdom Academy no descarga ni re-aloja videos de YouTube.
              </div>
            )}
          </div>

          <div className={`wa-lp-progress ${completed ? 'is-complete' : ''}`}>
            <div className="wa-lp-progress-info">
              <span className="wa-lp-progress-icon">
                <WisdomIcon name={completed ? 'check' : 'play'} size={16} />
              </span>
              <div>
                <strong>{completed ? 'Clase completada' : '¿Terminaste esta sesión?'}</strong>
                <small>
                  {completed
                    ? 'Tu progreso quedó guardado en la cuenta.'
                    : 'Marca la clase para registrar tu avance en el semestre.'}
                </small>
              </div>
            </div>
            <button
              type="button"
              className={`wa-lp-btn ${completed ? 'is-done' : 'primary'}`}
              onClick={markCompleted}
              disabled={saving || completed}
            >
              {completed ? <WisdomIcon name="check" size={15} /> : null}
              {completed ? 'Completada' : saving ? 'Guardando…' : 'Marcar como completada'}
            </button>
          </div>
        </>
      ) : (
        <div className="wa-lp-empty">
          <span className="wa-lp-empty-icon"><WisdomIcon name="video" size={24} /></span>
          <div>
            <strong>Video pendiente de asignación</strong>
            <p>El administrador todavía no ha asociado un video a esta sesión.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="wa-lp-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};
