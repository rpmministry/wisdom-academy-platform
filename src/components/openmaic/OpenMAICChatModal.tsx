'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente OpenMAIC: Socratic Chat Modal
 * ARCHIVO: src/components/openmaic/OpenMAICChatModal.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Modal interactivo de diálogo socrático entre el estudiante y los profesores IA
 * (Prof. Mateo o Dra. Sofía). Se conecta en tiempo real al endpoint
 * `/api/openmaic/explain` alimentado por el Orquestador de IAs Gratuitas
 * (`orquestadorahorro`), asegurando respuesta inmediata sin coste ni interrupciones.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { teacherSpeechManager } from '@/utils/speechSynthesis';

export interface OpenMAICChatModalProps {
  abierto: boolean;
  onCerrar: () => void;
  estudianteNombre: string;
  edad: number;
  grado: string;
  materia: string;
  temaActual: string;
  diapositivaNumero: number;
}

export const OpenMAICChatModal: React.FC<OpenMAICChatModalProps> = ({
  abierto,
  onCerrar,
  estudianteNombre,
  edad,
  grado,
  materia,
  temaActual,
  diapositivaNumero,
}) => {
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [hablando, setHablando] = useState(false);
  const [proveedorUsado, setProveedorUsado] = useState<string | null>(null);
  const [esCache, setEsCache] = useState(false);

  const esGael = edad <= 10;
  const esTeologiaMateria = /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(materia);
  const nombreProfesor = esGael ? 'Prof. Mateo' : 'Dra. Sofía de Valenzuela';

  const enviarPregunta = async () => {
    if (!pregunta.trim() || cargando) return;
    setCargando(true);
    setRespuesta(null);
    setEsCache(false);

    try {
      const res = await fetch('/api/openmaic/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: estudianteNombre,
          edad,
          grado,
          materia,
          temaActual,
          diapositivaNumero,
          preguntaEstudiante: pregunta.trim(),
        }),
      });

      const datos = await res.json();
      if (datos?.explicacion) {
        setRespuesta(datos.explicacion);
        setProveedorUsado(datos.proveedor || 'orquestador-inteligente');
        setEsCache(Boolean(datos.enCache));
      } else {
        setRespuesta(
          esTeologiaMateria
            ? 'Gracias por tu pregunta. Vuelve al texto bíblico y examinemos juntos su contexto y su aplicación.'
            : 'Gracias por tu pregunta. Revisemos el concepto con la evidencia y el procedimiento de la clase.'
        );
      }
    } catch {
      setRespuesta(
        esTeologiaMateria
          ? 'Hubo una pausa en la conexión. Mientras tanto, lee el pasaje completo y anota el contexto.'
          : 'Hubo una pausa en la conexión. Mientras tanto, revisa los datos y el procedimiento de la lección.'
      );
    } finally {
      setCargando(false);
    }
  };

  const reproducirVozRespuesta = () => {
    if (!respuesta) return;
    if (hablando) {
      teacherSpeechManager.detener();
      setHablando(false);
      return;
    }

    setHablando(true);
    teacherSpeechManager.hablar(
      respuesta,
      {
        idioma: materia.toLowerCase().includes('english') ? 'en' : 'es',
        velocidad: 1,
        perfil: esGael ? 'mateo' : 'sofia',
      },
      {
        onStart: () => setHablando(true),
        onEnd: () => setHablando(false),
        onError: () => setHablando(false),
      }
    );
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={() => {
        teacherSpeechManager.detener();
        setHablando(false);
        onCerrar();
      }}
      titulo={`Consulta Pedagógica con el ${nombreProfesor}`}
      subtitulo={`Lección activa: ${materia} • Diapositiva ${diapositivaNumero}`}
      anchoMaximo="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
        {/* Banner de andamiaje socrático */}
        <div
          style={{
            padding: 'var(--carbon-space-2x)',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--wa-radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Haz cualquier pregunta sobre {temaActual || materia}. El profesor te responderá con la técnica Feynman.
          </span>
          <Badge variant="gold" size="sm">
            Orquestador IA Libre
          </Badge>
        </div>

        {/* Campo de texto de la pregunta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--wa-font-sans)',
            }}
          >
            Tu pregunta para el profesor:
          </label>
          <textarea
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            placeholder={
              esGael
                ? 'Ejemplo: ¿Por qué partimos la pizza en 4 partes iguales, profe Mateo?'
                : 'Ejemplo: ¿Cómo se relacionan los números enteros negativos con situaciones de la vida real?'
            }
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--wa-font-sans)',
              fontSize: '0.875rem',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Botón de envío */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button
            variant="primary-navy"
            disabled={cargando || !pregunta.trim()}
            onClick={enviarPregunta}
          >
            {cargando ? 'Consultando al Profesor IA...' : 'Preguntar al Profesor'}
          </Button>
        </div>

        {/* Respuesta del Profesor */}
        {respuesta && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: 'var(--carbon-space-3x)',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--wa-radius-lg)',
              border: '1px solid var(--border-gold)',
              boxShadow: '0 4px 16px rgba(184, 134, 11, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--brand-gold-dark)' }}>
                  {nombreProfesor} dice:
                </span>
                {proveedorUsado && (
                  <Badge variant={esCache ? "emerald" : "subtle"} size="sm">
                    {esCache ? '⚡ ' : ''}{proveedorUsado}
                  </Badge>
                )}
              </div>
              <Button
                variant={hablando ? 'primary-gold' : 'secondary'}
                size="sm"
                onClick={reproducirVozRespuesta}
              >
                {hablando ? '⏸ Pausar Voz' : '🔊 Escuchar Respuesta'}
              </Button>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                lineHeight: 1.6,
                color: 'var(--text-primary)',
                fontFamily: 'var(--wa-font-sans)',
                whiteSpace: 'pre-line',
              }}
            >
              {respuesta}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

