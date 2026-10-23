'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente OpenMAIC: Teacher Avatar
 * ARCHIVO: src/components/openmaic/OpenMAICTeacherAvatar.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Renderiza el podio interactivo y la presencia visual de los profesores virtuales
 * de OpenMAIC (Prof. Mateo para Gael 8 años y Dra. Sofía para Avril 12 años):
 * - Halo de pulsación bio-ergonómica en GPU durante la locución de voz.
 * - Ecualizador de ondas de sonido SVG sincronizado con la síntesis de voz.
 * - Indicador de área epistemológica y estado pedagógico activo.
 * - Miniaturas de los compañeros de clase multi-agente (Lucas y Daniel).
 * ==============================================================================
 */

import React from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';

export interface OpenMAICTeacherAvatarProps {
  esGael: boolean;
  hablando: boolean;
  velocidadVoz: number;
  onToggleVoz: () => void;
  onCiclarVelocidad: () => void;
  dialogoCompaneroActivo: boolean;
  onToggleDialogoCompanero: () => void;
  versiculoTexto?: string;
  versiculoReferencia?: string;
}

export const OpenMAICTeacherAvatar: React.FC<OpenMAICTeacherAvatarProps> = ({
  esGael,
  hablando,
  velocidadVoz,
  onToggleVoz,
  onCiclarVelocidad,
  dialogoCompaneroActivo,
  onToggleDialogoCompanero,
  versiculoTexto = 'El principio de la sabiduría es el temor de Jehová.',
  versiculoReferencia = 'Proverbios 1:7',
}) => {
  const nombreProfesor = esGael ? 'Prof. Mateo' : 'Dra. Sofía de Valenzuela';
  const rolProfesor = esGael
    ? 'Pedagogo Lúdico y Andamiaje K-12'
    : 'Catedrática de Ciencias y Humanidades';
  const avatarSvg = esGael
    ? '/brand/teachers/profesor-mateo.jpg'
    : '/brand/teachers/profesora-sofia.jpg';
  const companeroNombre = esGael ? 'Lucas' : 'Daniel';
  const companeroAvatar = esGael
    ? '/brand/teachers/lucas-classmate.jpg'
    : '/brand/teachers/daniel-classmate.jpg';

  return (
    <div
      className="wa-teacher-podium"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--carbon-space-2x)',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--wa-radius-lg)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 4px 16px rgba(17, 22, 37, 0.04)',
        gap: 'var(--carbon-space-2x)',
        flexWrap: 'wrap',
      }}
    >
      {/* Avatar e Identidad del Profesor */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
          {/* Halo de animación al hablar */}
          {hablando && (
            <div
              className="wa-teacher-speaking-halo"
              style={{
                position: 'absolute',
                top: '-4px',
                left: '-4px',
                right: '-4px',
                bottom: '-4px',
                borderRadius: '50%',
                backgroundColor: 'var(--brand-gold-soft)',
                border: '2px solid var(--brand-gold)',
                pointerEvents: 'none',
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '2px solid var(--border-gold)',
              backgroundColor: 'var(--bg-elevated)',
            }}
          >
            <Image
              src={avatarSvg}
              alt={nombreProfesor}
              fill
              sizes="56px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h4
              style={{
                margin: 0,
                fontSize: '1rem',
                fontFamily: 'var(--wa-font-display)',
                color: 'var(--text-primary)',
              }}
            >
              {nombreProfesor}
            </h4>
            <Badge variant={hablando ? 'emerald' : 'gold'} size="sm">
              {hablando ? 'En Clase (Voz Activa)' : 'Profesor IA'}
            </Badge>
          </div>
          <p
            style={{
              margin: '0.125rem 0 0 0',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--wa-font-sans)',
            }}
          >
            {rolProfesor}
          </p>
        </div>
      </div>

      {/* Onda de sonido reactiva si está hablando */}
      {hablando && (
        <div
          className="wa-soundwave-active"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            height: '24px',
            padding: '0 0.5rem',
          }}
        >
          <div
            className="wa-bar-1"
            style={{ width: '3px', height: '18px', backgroundColor: 'var(--accent-study)', borderRadius: '2px' }}
          />
          <div
            className="wa-bar-2"
            style={{ width: '3px', height: '24px', backgroundColor: 'var(--brand-gold)', borderRadius: '2px' }}
          />
          <div
            className="wa-bar-3"
            style={{ width: '3px', height: '14px', backgroundColor: 'var(--accent-study)', borderRadius: '2px' }}
          />
          <div
            className="wa-bar-4"
            style={{ width: '3px', height: '20px', backgroundColor: 'var(--brand-gold)', borderRadius: '2px' }}
          />
        </div>
      )}

      {/* Controles multimedia de voz y compañero de clase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Compañero virtual */}
        <button
          onClick={onToggleDialogoCompanero}
          title={`Interacción con compañero ${companeroNombre}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.625rem',
            borderRadius: 'var(--wa-radius-md)',
            backgroundColor: dialogoCompaneroActivo
              ? 'var(--brand-gold-soft)'
              : 'var(--bg-subtle)',
            border: dialogoCompaneroActivo
              ? '1px solid var(--brand-gold)'
              : '1px solid var(--border-subtle)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontFamily: 'var(--wa-font-sans)',
            color: 'var(--text-primary)',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              overflow: 'hidden',
            }}
          >
            <Image
              src={companeroAvatar}
              alt={companeroNombre}
              fill
              sizes="20px"
              style={{ objectFit: 'cover' }}
            />
          </div>
          <span>{companeroNombre}</span>
        </button>

        {/* Velocidad de locución */}
        <button
          onClick={onCiclarVelocidad}
          title="Velocidad de reproducción del profesor"
          style={{
            padding: '0.375rem 0.5rem',
            borderRadius: 'var(--wa-radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            fontFamily: 'var(--wa-font-mono)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {velocidadVoz}x
        </button>

        {/* Botón principal de voz */}
        <button
          onClick={onToggleVoz}
          title={hablando ? 'Pausar explicación de voz' : 'Iniciar explicación de voz'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            borderRadius: 'var(--wa-radius-md)',
            backgroundColor: hablando
              ? 'var(--brand-gold)'
              : 'var(--brand-primary)',
            color: hablando ? 'var(--text-on-gold)' : 'var(--text-on-brand)',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--wa-font-sans)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            boxShadow: '0 2px 6px rgba(17, 22, 37, 0.12)',
          }}
        >
          <span>{hablando ? '⏸ Pausar' : '▶ Escuchar'}</span>
        </button>
      </div>
    </div>
  );
};

