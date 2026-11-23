'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ProgramDetail, LessonView } from '@/server/domain/coursePrograms';
import { PAZ_CLASSES } from '@/lib/paz-en-la-mesa/content';
import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl } from '@/lib/courses/youtube';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazActivityTracker } from './PazActivityTracker';
import { apiFetch } from '@/lib/api/client';

export interface PazUnifiedClassroomProps {
  slug: string;
  detail: ProgramDetail;
  isStaff?: boolean;
}

export function PazUnifiedClassroom({ slug, detail }: PazUnifiedClassroomProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(1);
  const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const m of detail.modules) {
      for (const l of m.lessons) {
        if (l.progress?.status === 'completed') {
          set.add(l.id);
        }
      }
    }
    return set;
  });
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null);

  // Mapeo de módulos por número de clase
  const classModuleMap = useMemo(() => {
    const map = new Map<number, (typeof detail.modules)[0]>();
    for (const m of detail.modules) {
      // Intentamos extraer número de clase del título o posición
      const match = /(\d+)/.exec(m.title);
      const num = match ? Number(match[1]) : m.position;
      map.set(num, m);
    }
    return map;
  }, [detail.modules]);

  const activeClassConfig = PAZ_CLASSES.find((c) => c.number === selectedClassNum) || PAZ_CLASSES[0];
  const activeModule = classModuleMap.get(selectedClassNum) || detail.modules[0];
  const activeLessons: LessonView[] = activeModule?.lessons || [];

  // Video de la clase seleccionada
  // Si es la clase 1, el video es Fiv6IQ-omIs; para otras clases, buscamos en los bloques
  const classVideoId = useMemo(() => {
    if (selectedClassNum === 1) return 'Fiv6IQ-omIs';
    for (const lesson of activeLessons) {
      if (lesson.videoIds && lesson.videoIds.length > 0) {
        return lesson.videoIds[0];
      }
    }
    return null;
  }, [selectedClassNum, activeLessons]);

  const embedUrl = classVideoId ? buildYouTubeEmbedUrl(classVideoId) : null;
  const watchUrl = classVideoId ? buildYouTubeWatchUrl(classVideoId) : null;

  const toggleLessonCompleted = async (lessonId: string) => {
    const isCompleted = completedLessonIds.has(lessonId);
    setSavingLessonId(lessonId);
    try {
      await apiFetch(`/api/courses/${slug}/progress`, {
        method: 'POST',
        body: { lessonId, completed: !isCompleted },
      });
      setCompletedLessonIds((prev) => {
        const next = new Set(prev);
        if (isCompleted) next.delete(lessonId);
        else next.add(lessonId);
        return next;
      });
    } catch {
      // Silencioso o revertir
    } finally {
      setSavingLessonId(null);
    }
  };

  const totalClassBlocks = 4;
  const completedInActiveClass = activeLessons.filter((l) => completedLessonIds.has(l.id)).length;

  return (
    <div
      id="aula-virtual"
      style={{
        margin: '0 0 2.5rem',
        padding: '2rem',
        borderRadius: '24px',
        background: 'var(--lms-surface, #ffffff)',
        border: '1px solid var(--lms-border, rgba(197, 160, 89, 0.35))',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.08)',
        color: 'var(--lms-ink, #2b2927)',
        fontFamily: 'var(--paz-sans, sans-serif)',
      }}
    >
      <PazActivityTracker
        programSlug={slug}
        classNumber={selectedClassNum}
        isVideoPlaying={isPlayingVideo}
      />

      {/* Cabecera del Aula Unificada */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid var(--lms-line, rgba(197, 160, 89, 0.2))',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--lms-terracotta, #8f4e38)',
              marginBottom: '0.25rem',
            }}
          >
            Aula Virtual · Taller Intensivo
          </span>
          <h2
            style={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 800,
              color: 'var(--lms-ink, #2b2927)',
              fontFamily: 'var(--paz-serif, serif)',
              lineHeight: 1.25,
            }}
          >
            Paz en la mesa, Orden en el bolsillo y fuego en el corazón
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--lms-muted, #6b665f)' }}>
            Impartido por <strong style={{ color: 'var(--lms-ink, #2b2927)' }}>Samuel y Gabby Palacio</strong> · Wisdom Academy
          </p>
        </div>

        {/* Acciones directas de recursos */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          <a
            href="/docs/cuaderno-de-trabajo-paz-en-la-mesa.pdf"
            download
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              background: 'var(--lms-gold-soft, rgba(197, 160, 89, 0.15))',
              border: '1px solid var(--lms-border, rgba(197, 160, 89, 0.4))',
              color: 'var(--lms-gold, #8f6820)',
              fontWeight: 700,
              fontSize: '0.86rem',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <WisdomIcon name="download" size={15} /> Cuaderno de Trabajo (PDF 24 Págs)
          </a>

          <Link
            href={`/cursos/${slug}/reto`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              background: '#b36a50',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              textDecoration: 'none',
            }}
          >
            <WisdomIcon name="sparkles" size={15} /> Reto de 7 Días
          </Link>
        </div>
      </div>

      {/* Selector de las 4 Clases Magistrales */}
      <div style={{ marginBottom: '1.75rem' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--lms-muted, #6b665f)',
            marginBottom: '0.6rem',
          }}
        >
          Selecciona una Clase Magistral:
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {PAZ_CLASSES.map((cls) => {
            const isSelected = cls.number === selectedClassNum;
            const isAvailable = cls.number === 1;
            return (
              <button
                key={cls.number}
                type="button"
                onClick={() => {
                  setSelectedClassNum(cls.number);
                  setIsPlayingVideo(false);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '1rem',
                  borderRadius: '14px',
                  background: isSelected
                    ? 'var(--lms-terracotta-soft, rgba(179, 106, 80, 0.12))'
                    : 'var(--lms-surface-inner, #faf8f5)',
                  border: isSelected
                    ? '2px solid var(--lms-terracotta, #b36a50)'
                    : '1px solid var(--lms-border, rgba(197, 160, 89, 0.25))',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginBottom: '0.35rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      color: isSelected
                        ? 'var(--lms-terracotta, #8f4e38)'
                        : 'var(--lms-muted, #8a8379)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Clase 0{cls.number}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: isAvailable
                        ? 'var(--lms-badge-available-bg, rgba(23, 96, 58, 0.15))'
                        : 'var(--lms-badge-upcoming-bg, rgba(138, 131, 121, 0.15))',
                      color: isAvailable
                        ? 'var(--lms-badge-available-text, #17603a)'
                        : 'var(--lms-badge-upcoming-text, #6b665f)',
                    }}
                  >
                    {isAvailable ? 'Video Listo' : 'Próximamente'}
                  </span>
                </div>
                <strong
                  style={{
                    fontSize: '0.98rem',
                    color: 'var(--lms-ink, #2b2927)',
                    fontFamily: 'var(--paz-serif, serif)',
                    lineHeight: 1.25,
                    marginBottom: '0.25rem',
                  }}
                >
                  {cls.title}
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--lms-muted, #6b665f)' }}>
                  {cls.leader} · {cls.durationLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ÁREA DEL REPRODUCTOR PRINCIPAL DE LA CLASE */}
      <div
        style={{
          borderRadius: '18px',
          overflow: 'hidden',
          background: '#1a1918',
          border: '1px solid rgba(197, 160, 89, 0.4)',
          marginBottom: '2rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(43, 41, 39, 0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#FAF8F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#b36a50',
                color: '#ffffff',
              }}
            >
              <WisdomIcon name="play" size={14} />
            </span>
            <div>
              <strong style={{ fontSize: '0.95rem' }}>
                Clase 0{activeClassConfig.number}: {activeClassConfig.title}
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#c9c0b4', marginLeft: '0.5rem' }}>
                ({activeClassConfig.durationLabel} · 4 bloques unificados)
              </span>
            </div>
          </div>

          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#e6c78c',
                fontSize: '0.82rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Abrir en YouTube <WisdomIcon name="arrow-right" size={12} />
            </a>
          )}
        </div>

        {/* Reproductor o Vista Previa */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0e0d0d' }}>
          {classVideoId && embedUrl ? (
            isPlayingVideo ? (
              <iframe
                src={`${embedUrl}&autoplay=1`}
                title={`Clase 0${activeClassConfig.number}: ${activeClassConfig.title}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url('https://i.ytimg.com/vi/${classVideoId}/maxresdefault.jpg')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
                onClick={() => setIsPlayingVideo(true)}
              >
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    background: '#b36a50',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 12px 36px rgba(179,106,80,0.6)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <WisdomIcon name="play" size={38} />
                </div>
                <strong style={{ color: '#ffffff', fontSize: '1.25rem', marginTop: '1.25rem', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  Reproducir Clase 0{activeClassConfig.number}
                </strong>
                <span style={{ color: '#e6c78c', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {activeClassConfig.headline}
                </span>
              </div>
            )
          ) : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
                background: 'linear-gradient(145deg, #1f1d1b, #2b2927)',
                color: '#FAF8F5',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(197, 160, 89, 0.15)',
                  border: '1px solid rgba(197, 160, 89, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#e6c78c',
                  marginBottom: '1rem',
                }}
              >
                <WisdomIcon name="clock" size={28} />
              </div>
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', fontFamily: 'var(--paz-serif, serif)' }}>
                Clase 0{activeClassConfig.number} · Estreno 8 de Diciembre
              </h3>
              <p style={{ maxWidth: '540px', fontSize: '0.92rem', color: '#c9c0b4', lineHeight: 1.55 }}>
                Esta clase magistral estará disponible para todos los estudiantes inscritos el{' '}
                <strong>martes 8 de diciembre</strong>. Mientras tanto, puedes explorar sus 4 bloques temáticos y
                recursos a continuación.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LOS 4 BLOQUES PEDAGÓGICOS UNIFICADOS DE LA CLASE */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--lms-ink, #2b2927)',
                fontFamily: 'var(--paz-serif, serif)',
              }}
            >
              Bloques Temáticos de la Clase 0{activeClassConfig.number}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--lms-muted, #6b665f)' }}>
              Los 4 bloques se desarrollan de forma continua en el video principal de esta clase.
            </p>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              background: 'var(--lms-gold-soft, rgba(197, 160, 89, 0.15))',
              color: 'var(--lms-gold, #8f6820)',
            }}
          >
            {completedInActiveClass} de {totalClassBlocks} bloques completados
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {activeClassConfig.blocks.map((block) => {
            // Buscamos la lección correspondiente para guardar progreso
            const matchingLesson = activeLessons.find((l) => l.position === block.number) || activeLessons[block.number - 1];
            const isCompleted = matchingLesson ? completedLessonIds.has(matchingLesson.id) : false;
            const isSaving = matchingLesson ? savingLessonId === matchingLesson.id : false;

            return (
              <div
                key={block.number}
                style={{
                  padding: '1.25rem',
                  borderRadius: '16px',
                  background: isCompleted ? 'rgba(23, 96, 58, 0.08)' : 'var(--lms-surface-inner, #faf8f5)',
                  border: isCompleted
                    ? '1px solid rgba(23, 96, 58, 0.35)'
                    : '1px solid var(--lms-line, rgba(197, 160, 89, 0.2))',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        background: 'var(--lms-terracotta, #b36a50)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      Bloque 0{block.number}
                    </span>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--lms-terracotta, #8f4e38)',
                        background: 'var(--lms-terracotta-soft, rgba(179, 106, 80, 0.12))',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                      }}
                    >
                      {block.timeRange}
                    </span>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--lms-ink, #2b2927)' }}>
                      {block.title}
                    </strong>
                  </div>

                  {matchingLesson && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => toggleLessonCompleted(matchingLesson.id)}
                        disabled={isSaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          border: isCompleted ? '1px solid #17603a' : '1px solid var(--lms-line, rgba(138, 131, 121, 0.4))',
                          background: isCompleted ? '#17603a' : 'var(--lms-surface, #ffffff)',
                          color: isCompleted ? '#ffffff' : 'var(--lms-ink, #2b2927)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isCompleted && <WisdomIcon name="check" size={13} />}
                        {isCompleted ? 'Completado' : isSaving ? 'Guardando…' : 'Marcar completado'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingVideo(true);
                          const el = document.getElementById('aula-virtual');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          background: 'var(--lms-surface-inner, #faf8f5)',
                          border: '1px solid var(--lms-line, rgba(197, 160, 89, 0.35))',
                          color: 'var(--lms-terracotta, #8f4e38)',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <WisdomIcon name="play" size={11} /> Ver capítulo
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--lms-muted, #4a4641)', lineHeight: 1.55 }}>
                  {block.summary}
                </p>

                {/* Puntos de estudio y citas bíblicas */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    background: 'var(--lms-surface, #ffffff)',
                    border: '1px solid var(--lms-line, rgba(197, 160, 89, 0.15))',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--lms-terracotta, #8f4e38)', display: 'block', marginBottom: '0.35rem' }}>
                      Claves y principios prácticos:
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--lms-ink, #55514b)' }}>
                      {block.points.slice(0, 2).map((pt, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong style={{ color: 'var(--lms-terracotta, #8f4e38)', display: 'block', marginBottom: '0.35rem' }}>
                      Fundamento bíblico:
                    </strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {block.scriptures.map((sc, i) => (
                        <span
                          key={i}
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: 'var(--lms-gold-soft, rgba(197, 160, 89, 0.12))',
                            color: 'var(--lms-gold, #7a5a1f)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {sc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN DE MATERIALES DE CLASE Y MANUAL DE ESTUDIO */}
      <div
        style={{
          marginTop: '2.5rem',
          padding: '1.75rem',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(179,106,80,0.08), rgba(197,160,89,0.14))',
          border: '1px solid var(--lms-line, rgba(197,160,89,0.35))',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--lms-terracotta, #8f4e38)',
              }}
            >
              Recursos de estudio
            </span>
            <h3
              style={{
                margin: '0.2rem 0 0',
                fontSize: '1.3rem',
                fontWeight: 800,
                color: 'var(--lms-ink, #2b2927)',
                fontFamily: 'var(--paz-serif, serif)',
              }}
            >
              Materiales de clase
            </h3>
          </div>
          <span
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '0.25rem 0.65rem',
              borderRadius: '999px',
              background: 'var(--lms-gold-soft, rgba(197, 160, 89, 0.2))',
              color: 'var(--lms-gold, #8f6820)',
            }}
          >
            PDF Imprimible e Interactivo
          </span>
        </div>

        {/* Tarjeta destacada del Manual */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.25rem',
            padding: '1.25rem',
            borderRadius: '14px',
            background: 'var(--lms-surface, #ffffff)',
            border: '1px solid var(--lms-line, rgba(179,106,80,0.25))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px', flex: '1 1 auto' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--lms-terracotta, #b36a50)',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <WisdomIcon name="file-text" size={24} />
            </span>
            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--lms-ink, #2b2927)', display: 'block' }}>
                Cuaderno de Trabajo y Manual de Estudio (24 páginas)
              </strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--lms-muted, #6b665f)', lineHeight: 1.45 }}>
                Herramienta oficial de la Clase 0{activeClassConfig.number}: <strong>{activeClassConfig.tool}</strong> ({activeClassConfig.toolPages}).
                Incluye preguntas de reflexión familiar, balance financiero, mapa de discernimiento y el Reto de 7 Días.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <a
              href="/docs/cuaderno-de-trabajo-paz-en-la-mesa.pdf"
              download="Cuaderno_de_Trabajo_Paz_en_la_Mesa_24_paginas.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                background: 'var(--lms-terracotta, #b36a50)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(179,106,80,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <WisdomIcon name="download" size={16} /> Descargar Manual PDF
            </a>

            <a
              href="/docs/cuaderno-de-trabajo-paz-en-la-mesa.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'var(--lms-surface-inner, #faf8f5)',
                border: '1px solid var(--lms-line, rgba(197, 160, 89, 0.35))',
                color: 'var(--lms-ink, #6b665f)',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              Ver en línea <WisdomIcon name="arrow-right" size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PazUnifiedClassroom;
