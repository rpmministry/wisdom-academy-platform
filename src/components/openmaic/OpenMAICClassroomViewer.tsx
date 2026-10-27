'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Visionado Interactivo de Clase Estilo OpenMAIC
 * ARCHIVO: src/components/OpenMAICClassroomViewer.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Recrea con absoluta fidelidad pedagógica y visual el aula interactiva de OpenMAIC:
 * 1. Enseñanza paso a paso estructurada: Descompone cada lección en 4 fases
 *    (Paso 1: Enfoque, Paso 2: Gráfico, Paso 3: Procedimiento, Paso 4: Sabiduría Bíblica).
 * 2. Resaltado dinámico y sincronizado (Spotlight): Al explicar cada fase, el elemento
 *    correspondiente (pregunta, gráfico, objetivos o versículo) se ilumina y enfoca.
 * 3. Botón de reproducción inteligente: El botón central flotante DESAPARECE automáticamente
 *    al iniciar la reproducción para no tapar los dibujos ni el contenido pedagógico.
 * 4. Infografías e ilustraciones visuales ricas: Gráficos interactivos vectoriales en SVG
 *    (Pizza de Fracciones, Recta Numérica y Termómetro ℤ, Célula Eucariota, Árbol Gramatical
 *    y Balanza de Fe y Razón).
 * 5. Barra multimedia completa: Velocidades (1x, 1.25x, 1.5x), audio, lápiz de anotación,
 *    subtítulos en tiempo real y comunidad multi-agente con compañeros de clase.
 * ==============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  curriculumContentEngine,
  DiapositivaLeccion,
  IntervencionOpenMAIC,
  PasoExplicacionLeccion,
} from '@/services/curriculumContentEngine';
import { teacherSpeechManager } from '@/utils/speechSynthesis';
import { Modal } from '@/components/ui/Modal';

export interface OpenMAICClassroomViewerProps {
  diapositiva: DiapositivaLeccion;
  diapositivaActual: number;
  totalDiapositivas: number;
  nombreMateria: string;
  nombreEstudiante: string;
  esGael: boolean;
  intervencion: IntervencionOpenMAIC;
  hablandoProfesor: boolean;
  ritmoAprendizaje?: 'lento' | 'normal' | 'acelerado';
  modoTeatro?: boolean;
  onToggleTeatro?: () => void;
  onCambiarRitmo?: (ritmo: 'lento' | 'normal' | 'acelerado') => void;
  onPasoCambiado?: (nuevoPaso: number) => void;
  onLeccionCompletada?: () => void;
  onToggleVoz: (velocidad?: number) => void;
  onCambiarDiapositiva: (nuevaDiapo: number) => void;
  onAbrirModalIA: () => void;
}

export const OpenMAICClassroomViewer: React.FC<OpenMAICClassroomViewerProps> = ({
  diapositiva,
  diapositivaActual,
  totalDiapositivas,
  nombreMateria,
  nombreEstudiante,
  esGael,
  intervencion,
  hablandoProfesor,
  ritmoAprendizaje = 'normal',
  modoTeatro = false,
  onToggleTeatro,
  onCambiarRitmo,
  onPasoCambiado,
  onLeccionCompletada,
  onToggleVoz,
  onCambiarDiapositiva,
  onAbrirModalIA,
}) => {
  // Secuencia de pasos pedagógicos estructurados de OpenMAIC
  const esMateriaTeologia = /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(nombreMateria);

  const pasos: PasoExplicacionLeccion[] = curriculumContentEngine.obtenerPasosExplicacion(
    diapositiva,
    esGael,
    nombreMateria
  );

  // Estados de progresión y reproducción paso a paso
  const [pasoActivo, setPasoActivo] = useState<number>(0);
  const [reproduciendoLocal, setReproduciendoLocal] = useState<boolean>(false);

  // Estados interactivos para los widgets didácticos
  const [rebanadasComidas, setRebanadasComidas] = useState<Set<number>>(new Set());
  const [puntoRecta, setPuntoRecta] = useState<number>(0);
  const [organeloActivo, setOrganeloActivo] = useState<string | null>(null);
  const [parteArbolActiva, setParteArbolActiva] = useState<string | null>(null);
  const [ladoBalanzaActivo, setLadoBalanzaActivo] = useState<string | null>(null);
  const [nodoMapaActivo, setNodoMapaActivo] = useState<string | null>(null);

  // Estados de la barra multimedia OpenMAIC
  const [velocidadVoz, setVelocidadVoz] = useState<number>(1);
  const [silenciado, setSilenciado] = useState<boolean>(false);
  const [modoLapiz, setModoLapiz] = useState<boolean>(false);
  const [dialogoCompaneroActivo, setDialogoCompaneroActivo] = useState<boolean>(false);
  const [explicacionCompleta, setExplicacionCompleta] = useState<boolean>(false);

  // Lienzo de diapositiva con escala "fit" (CSS-Tricks / slides.com) y zoom manual.
  const stageRef = useRef<HTMLDivElement>(null);
  type ModoCanvas = 'landscape' | 'portrait' | 'phone';
  const [zoomManual, setZoomManual] = useState(1);
  const [canvas, setCanvas] = useState<{
    modo: ModoCanvas;
    ancho: number;
    alto: number;
    escalaAjuste: number;
  }>({ modo: 'landscape', ancho: 1040, alto: 520, escalaAjuste: 0.8 });
  const zoomActual = Math.max(0.2, Math.min(2, Number((canvas.escalaAjuste * zoomManual).toFixed(3))));

  const pasoActualData = pasos[pasoActivo] || pasos[0];
  const focoActual = pasoActualData?.focoVisual || 'pregunta';
  const estaReproduciendo = hablandoProfesor || reproduciendoLocal;

  // Sincronizar velocidad de voz con el ritmo de aprendizaje pedagógico
  useEffect(() => {
    if (ritmoAprendizaje === 'lento') setVelocidadVoz(0.85);
    else if (ritmoAprendizaje === 'acelerado') setVelocidadVoz(1.25);
    else setVelocidadVoz(1);
  }, [ritmoAprendizaje]);

  // Reiniciar paso al cambiar de diapositiva o materia
  useEffect(() => {
    setPasoActivo(0);
    onPasoCambiado?.(0);
    setReproduciendoLocal(false);
    teacherSpeechManager.detener();
  }, [diapositivaActual, diapositiva.titulo]);

  // Si externamente el padre apaga la voz, reflejarlo localmente
  useEffect(() => {
    if (!hablandoProfesor && reproduciendoLocal) {
      setReproduciendoLocal(false);
    }
  }, [hablandoProfesor]);

  // Calcula un lienzo fijo (horizontal, vertical o móvil) y lo escala para que
  // TODA la diapositiva quepa en el visor sin recortes. El zoom manual permite
  // ampliar y desplazarse cuando el estudiante necesite más detalle.
  useEffect(() => {
    const calcularLienzo = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const anchoDisponible = Math.max(120, stage.clientWidth - 24);
      const altoDisponible = Math.max(120, stage.clientHeight - 24);
      const modo: ModoCanvas =
        stage.clientWidth < 560
          ? 'phone'
          : stage.clientWidth < 900 && stage.clientHeight > stage.clientWidth * 0.9
          ? 'portrait'
          : 'landscape';
      const dimensiones =
        modo === 'phone'
          ? { ancho: 420, alto: 920 }
          : modo === 'portrait'
          ? { ancho: 840, alto: 890 }
          : { ancho: 1040, alto: 520 };
      // En móvil el lienzo se ajusta por ancho y el visor crece en vertical;
      // en tablet/escritorio se ajusta por ancho y alto para verse completo.
      const escalaAjuste =
        modo === 'phone'
          ? anchoDisponible / dimensiones.ancho
          : Math.min(
              anchoDisponible / dimensiones.ancho,
              altoDisponible / dimensiones.alto
            );

      setCanvas((previo) => {
        const siguiente = {
          modo,
          ancho: dimensiones.ancho,
          alto: dimensiones.alto,
          escalaAjuste: Math.max(0.2, Number(escalaAjuste.toFixed(4))),
        };
        return previo.modo === siguiente.modo &&
          Math.abs(previo.escalaAjuste - siguiente.escalaAjuste) < 0.001
          ? previo
          : siguiente;
      });
    };

    const frame = window.requestAnimationFrame(calcularLienzo);
    const observer = new ResizeObserver(() => window.requestAnimationFrame(calcularLienzo));
    if (stageRef.current) observer.observe(stageRef.current);
    window.addEventListener('resize', calcularLienzo);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', calcularLienzo);
    };
  }, [diapositivaActual, diapositiva.titulo, totalDiapositivas]);

  // Ciclo de velocidades de reproducción
  const handleCiclarVelocidad = () => {
    const velocidades = [1, 1.25, 1.5];
    const indexActual = velocidades.indexOf(velocidadVoz);
    const siguiente = velocidades[(indexActual + 1) % velocidades.length];
    setVelocidadVoz(siguiente);
    if (estaReproduciendo) {
      reproducirDesdePaso(pasoActivo, siguiente);
    }
  };

  // ----------------------------------------------------------------------------
  // ORQUESTADOR DE ENSEÑANZA PASO A PASO ESTILO OPENMAIC
  // ----------------------------------------------------------------------------
  const reproducirDesdePaso = (indicePaso: number, velocidad: number = velocidadVoz) => {
    if (indicePaso < 0 || indicePaso >= pasos.length) {
      setReproduciendoLocal(false);
      if (hablandoProfesor) onToggleVoz();
      return;
    }

    setPasoActivo(indicePaso);
    onPasoCambiado?.(indicePaso);
    setReproduciendoLocal(true);
    if (!hablandoProfesor) {
      onToggleVoz(velocidad);
    }

    const paso = pasos[indicePaso];
    const esIngles = nombreMateria.toLowerCase().includes('english');

    teacherSpeechManager.hablar(
      paso.guionVoz,
      {
        idioma: esIngles ? 'en' : 'es',
        velocidad,
        perfil: esGael ? 'mateo' : 'sofia',
      },
      {
        onStart: () => {
          setReproduciendoLocal(true);
        },
        onEnd: () => {
          // Si hay un siguiente paso, avanzar automáticamente con una pausa pedagógica suave
          if (indicePaso < pasos.length - 1) {
            setTimeout(() => {
              reproducirDesdePaso(indicePaso + 1, velocidad);
            }, 600);
          } else {
            // Último paso completado con éxito
            setReproduciendoLocal(false);
            if (hablandoProfesor) onToggleVoz();
            onLeccionCompletada?.();
          }
        },
        onError: () => {
          setReproduciendoLocal(false);
          if (hablandoProfesor) onToggleVoz();
        },
      }
    );
  };

  const handleTogglePlayPasoAPaso = () => {
    if (estaReproduciendo) {
      teacherSpeechManager.detener();
      setReproduciendoLocal(false);
      if (hablandoProfesor) onToggleVoz();
    } else {
      reproducirDesdePaso(pasoActivo, velocidadVoz);
    }
  };

  const handleSeleccionarPaso = (indice: number) => {
    teacherSpeechManager.detener();
    setPasoActivo(indice);
    onPasoCambiado?.(indice);
    if (estaReproduciendo) {
      reproducirDesdePaso(indice, velocidadVoz);
    }
  };

  // Alternancia de rebanadas de pizza
  const handleToggleRebanada = (indice: number) => {
    setRebanadasComidas((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(indice)) {
        nuevo.delete(indice);
      } else {
        nuevo.add(indice);
      }
      return nuevo;
    });
  };

  // ----------------------------------------------------------------------------
  // 1. INFOGRAFÍA VECTORIAL: PIZZA DE FRACCIONES INTERACTIVA (GAEL - 4° EGB)
  // ----------------------------------------------------------------------------
  const renderPizzaFracciones = () => {
    const totalRebanadas = 4;
    const tomadas = rebanadasComidas.size;
    const porcentaje = Math.round((tomadas / totalRebanadas) * 100);
    const estaEnPasoGrafico = focoActual === 'grafico';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 6px 14px rgba(17, 22, 37, 0.14))' }}>
            {/* Tabla de cortar de madera rústica texturizada */}
            <circle cx="100" cy="100" r="98" fill="#D97706" opacity="0.22" stroke="#B45309" strokeWidth="4" />
            <circle cx="100" cy="100" r="92" fill="#FDFBF7" stroke="#E4E0D8" strokeWidth="2" />
            <circle cx="100" cy="100" r="86" fill="#FBF7EE" stroke="#D1CBC0" strokeWidth="1" strokeDasharray="4 3" />

            {/* 4 Rebanadas interactivas de pizza con orégano y albahaca */}
            {[
              { d: 'M100 100 L180 100 A80 80 0 0 1 100 180 Z', id: 0, angulo: 45, dx: 4, dy: 4 },
              { d: 'M100 100 L100 180 A80 80 0 0 1 20 100 Z', id: 1, angulo: 135, dx: -4, dy: 4 },
              { d: 'M100 100 L20 100 A80 80 0 0 1 100 20 Z', id: 2, angulo: 225, dx: -4, dy: -4 },
              { d: 'M100 100 L100 20 A80 80 0 0 1 180 100 Z', id: 3, angulo: 315, dx: 4, dy: -4 },
            ].map((slice) => {
              const comida = rebanadasComidas.has(slice.id);
              const destacadaPaso = estaEnPasoGrafico && slice.id === 0 && !comida;
              return (
                <g
                  key={slice.id}
                  onClick={() => handleToggleRebanada(slice.id)}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 200ms ease',
                    transform: destacadaPaso ? `translate(${slice.dx * 1.8}px, ${slice.dy * 1.8}px)` : 'none',
                  }}
                >
                  {comida ? (
                    // Rebanada consumida: silueta punteada en el plato
                    <path d={slice.d} fill="rgba(228, 224, 216, 0.4)" stroke="#D1CBC0" strokeWidth="2" strokeDasharray="4 4" />
                  ) : (
                    // Rebanada presente: masa crocante, salsa de tomate y queso mozzarella fundido
                    <g>
                      <path d={slice.d} fill="#F59E0B" stroke="#B45309" strokeWidth="2.5" />
                      <path d={slice.d} fill="#FEF3C7" opacity="0.65" />
                      {/* Puntos de salsa de tomate */}
                      <circle cx="115" cy="115" r="4" fill="#DC2626" opacity="0.8" />
                      <circle cx="85" cy="115" r="4" fill="#DC2626" opacity="0.8" />
                      <circle cx="85" cy="85" r="4" fill="#DC2626" opacity="0.8" />
                      <circle cx="115" cy="85" r="4" fill="#DC2626" opacity="0.8" />
                      {/* Pepperoni & Hojas de albahaca fresca */}
                      {slice.id === 0 && (
                        <g>
                          <circle cx="140" cy="135" r="9" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1" />
                          <circle cx="138" cy="133" r="2" fill="#F87171" opacity="0.7" />
                          <path d="M125 155 Q130 150 135 155 Q130 160 125 155" fill="#059669" />
                        </g>
                      )}
                      {slice.id === 1 && (
                        <g>
                          <circle cx="65" cy="135" r="9" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1" />
                          <circle cx="63" cy="133" r="2" fill="#F87171" opacity="0.7" />
                          <path d="M50 120 Q55 115 60 120 Q55 125 50 120" fill="#059669" />
                        </g>
                      )}
                      {slice.id === 2 && (
                        <g>
                          <circle cx="65" cy="65" r="9" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1" />
                          <circle cx="63" cy="63" r="2" fill="#F87171" opacity="0.7" />
                          <path d="M75 45 Q80 40 85 45 Q80 50 75 45" fill="#059669" />
                        </g>
                      )}
                      {slice.id === 3 && (
                        <g>
                          <circle cx="140" cy="65" r="9" fill="#991B1B" stroke="#7F1D1D" strokeWidth="1" />
                          <circle cx="138" cy="63" r="2" fill="#F87171" opacity="0.7" />
                          <path d="M150 75 Q155 70 160 75 Q155 80 150 75" fill="#059669" />
                        </g>
                      )}
                    </g>
                  )}
                </g>
              );
            })}

            {/* Centro dorado de la pizza */}
            <circle cx="100" cy="100" r="14" fill="#D97706" stroke="#B45309" strokeWidth="1.5" />
            <circle cx="100" cy="100" r="6" fill="#FDFBF7" />
          </svg>
        </div>

        {/* FÓRMULA DE FRACCIÓN VISUAL Y ECUACIÓN DESGLOSADA */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--wa-radius-md)',
            padding: '8px 14px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {/* Bloque de fracción matemática */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--wa-font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand-primary)', lineHeight: 1 }}>
              {tomadas}
            </span>
            <div style={{ width: '24px', height: '3px', backgroundColor: 'var(--brand-primary)', margin: '3px 0', borderRadius: '1px' }} />
            <span style={{ fontFamily: 'var(--wa-font-mono)', fontWeight: 800, fontSize: '1.25rem', color: 'var(--brand-primary)', lineHeight: 1 }}>
              4
            </span>
          </div>

          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {tomadas === 0 && '¡Pizza completa sin repartir (0/4)!'}
                {tomadas === 1 && 'Un cuarto (1/4 = 25%)'}
                {tomadas === 2 && 'La mitad (2/4 = 1/2 = 50%)'}
                {tomadas === 3 && 'Tres cuartos (3/4 = 75%)'}
                {tomadas === 4 && '¡Compartida en su totalidad (4/4 = 1)!'}
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--wa-font-mono)',
                  backgroundColor: 'var(--accent-study-soft)',
                  color: 'var(--accent-study)',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                {porcentaje}%
              </span>
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
              Numerador ({tomadas}) = partes tomadas • Denominador (4) = total instituido
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // 2. INFOGRAFÍA VECTORIAL: RECTA NUMÉRICA ℤ Y TERMÓMETRO (AVRIL - 8° EGB)
  // ----------------------------------------------------------------------------
  const renderRectaNumerica = () => {
    const valores = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
        {/* Termómetro de elevación vs profundidad y eje coordinado */}
        <div style={{ width: '100%', maxWidth: '380px', padding: '8px 4px', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>🌊 Profundidad Submarina (-℃)</span>
            <span style={{ color: 'var(--brand-gold)', fontWeight: 700 }}>⚓ Nivel del Mar (0)</span>
            <span style={{ color: 'var(--brand-gold-dark)', fontWeight: 600 }}>☀️ Cima Volcánica (+℃)</span>
          </div>

          {/* Eje horizontal con botones numéricos */}
          <div style={{ position: 'relative', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', backgroundColor: 'var(--border-strong)', borderRadius: '2px' }} />
            {valores.map((v) => {
              const esCero = v === 0;
              const esSeleccionado = v === puntoRecta;
              return (
                <button
                  key={v}
                  onClick={() => setPuntoRecta(v)}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    background: esSeleccionado
                      ? 'var(--brand-gold)'
                      : esCero
                      ? 'var(--brand-primary)'
                      : 'var(--bg-surface)',
                    color: esSeleccionado
                      ? 'var(--text-on-gold)'
                      : esCero
                      ? 'var(--text-on-brand)'
                      : v < 0
                      ? 'var(--brand-primary)'
                      : 'var(--brand-gold-dark)',
                    border: esSeleccionado
                      ? '2px solid var(--brand-primary)'
                      : esCero
                      ? '2px solid var(--brand-gold)'
                      : '1px solid var(--border-default)',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--wa-font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 140ms ease',
                    transform: esSeleccionado ? 'scale(1.18)' : 'scale(1)',
                    boxShadow: esSeleccionado ? '0 4px 10px rgba(184, 134, 11, 0.3)' : 'none',
                  }}
                >
                  {v > 0 ? `+${v}` : v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarjeta de interpretación física y valor absoluto */}
        <div
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--wa-radius-sm)',
            padding: '8px 12px',
            width: '100%',
            maxWidth: '380px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
              Punto Seleccionado: {puntoRecta > 0 ? `+${puntoRecta}` : puntoRecta}
            </span>
            <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--brand-gold)', fontWeight: 700 }}>
              Distancia |{puntoRecta}| = {Math.abs(puntoRecta)} unidades
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {puntoRecta < 0 && `Magnitud negativa bajo cero: su distancia absoluta al origen es de ${Math.abs(puntoRecta)} unidades.`}
            {puntoRecta === 0 && 'Punto neutro absoluto: eje de simetría que separa magnitudes positivas y negativas.'}
            {puntoRecta > 0 && `Magnitud positiva sobre el nivel de referencia: ${puntoRecta} unidades de altitud.`}
          </p>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // 3. INFOGRAFÍA VECTORIAL: CÉLULA EUCARIOTA INTERACTIVA (CIENCIAS NATURALES)
  // ----------------------------------------------------------------------------
  const renderCelulaViva = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{ position: 'relative', width: '230px', height: '175px' }}>
          <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%' }}>
            {/* Membrana plasmática externa con canales proteicos */}
            <path
              d="M30 90 C30 30, 80 15, 140 20 C200 25, 225 60, 220 110 C215 160, 160 170, 100 165 C40 160, 30 150, 30 90 Z"
              fill="#E6F4EF"
              stroke="#0F6E56"
              strokeWidth="4"
              onClick={() => setOrganeloActivo('Membrana')}
              style={{ cursor: 'pointer' }}
            />
            {/* Citoplasma interior */}
            <path
              d="M40 90 C40 40, 85 28, 135 32 C185 36, 210 68, 205 105 C200 145, 150 155, 105 150 C55 145, 40 140, 40 90 Z"
              fill="#F2FBF7"
            />
            {/* Núcleo con ADN cromatina */}
            <circle
              cx="110"
              cy="85"
              r="34"
              fill="#C9F2DE"
              stroke="var(--brand-primary)"
              strokeWidth="3"
              onClick={() => setOrganeloActivo('Núcleo')}
              style={{ cursor: 'pointer' }}
            />
            <circle cx="110" cy="85" r="14" fill="var(--brand-primary)" />
            <path d="M102 82 Q110 75 118 82 Q110 89 102 82" stroke="var(--brand-gold-metallic)" strokeWidth="1.5" fill="none" />

            {/* Mitocondrias con crestas productoras de ATP */}
            <ellipse
              cx="170"
              cy="65"
              rx="18"
              ry="10"
              transform="rotate(25 170 65)"
              fill="#FDE68A"
              stroke="#B45309"
              strokeWidth="2"
              onClick={() => setOrganeloActivo('Mitocondria')}
              style={{ cursor: 'pointer' }}
            />
            <ellipse
              cx="70"
              cy="125"
              rx="16"
              ry="9"
              transform="rotate(-20 70 125)"
              fill="#FDE68A"
              stroke="#B45309"
              strokeWidth="2"
              onClick={() => setOrganeloActivo('Mitocondria')}
              style={{ cursor: 'pointer' }}
            />

            {/* Ribosomas / Puntos proteicos */}
            <circle cx="70" cy="55" r="3" fill="#0F6E56" />
            <circle cx="155" cy="130" r="3" fill="#0F6E56" />
            <circle cx="180" cy="110" r="3" fill="#0F6E56" />
          </svg>
        </div>

        <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-subtle)', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block' }}>
            {organeloActivo ? `Organelo: ${organeloActivo}` : 'Toca el Núcleo, Membrana o Mitocondria'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            {organeloActivo === 'Núcleo' && 'Alberga el ADN: las instrucciones que regulan la función y la herencia celular.'}
            {organeloActivo === 'Mitocondria' && 'Central bio-energética que sintetiza ATP para el funcionamiento biológico.'}
            {organeloActivo === 'Membrana' && 'Frontera selectiva que resguarda la homeostasis con inteligencia nanométrica.'}
            {!organeloActivo && 'Micro-ingeniería celular descubierta por la ciencia experimental.'}
          </span>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // 4. INFOGRAFÍA VECTORIAL: ÁRBOL DE MORFOLOGÍA Y PALABRAS (LENGUA Y LITERATURA)
  // ----------------------------------------------------------------------------
  const renderArbolGramatical = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{ position: 'relative', width: '230px', height: '175px' }}>
          <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%' }}>
            {/* Suelo y raíces (Lexema / Raíz) */}
            <line x1="20" y1="140" x2="220" y2="140" stroke="#926806" strokeWidth="3" />
            <path
              d="M120 140 Q100 160 80 170 M120 140 Q140 160 160 170"
              stroke="#B45309"
              strokeWidth="3"
              fill="none"
              onClick={() => setParteArbolActiva('Raíz')}
              style={{ cursor: 'pointer' }}
            />
            {/* Tronco (Palabra Base) */}
            <rect
              x="105"
              y="70"
              width="30"
              height="70"
              fill="#D97706"
              stroke="#B45309"
              strokeWidth="2"
              rx="4"
              onClick={() => setParteArbolActiva('Tronco')}
              style={{ cursor: 'pointer' }}
            />
            <text x="120" y="110" fill="var(--text-on-brand)" fontSize="10" fontWeight="bold" textAnchor="middle">
              CREAR
            </text>
            {/* Copa y Hojas (Prefijos y Sufijos) */}
            <circle
              cx="120"
              cy="50"
              r="38"
              fill="var(--accent-study-soft)"
              stroke="var(--accent-study)"
              strokeWidth="3"
              onClick={() => setParteArbolActiva('Copa')}
              style={{ cursor: 'pointer' }}
            />
            <text x="120" y="44" fill="var(--accent-study)" fontSize="9" fontWeight="bold" textAnchor="middle">
              Re-crear
            </text>
            <text x="120" y="58" fill="var(--accent-study)" fontSize="9" fontWeight="bold" textAnchor="middle">
              Creación
            </text>
          </svg>
        </div>

        <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-subtle)', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block' }}>
            {parteArbolActiva ? `Elemento: ${parteArbolActiva}` : 'Estructura Morfológica de la Palabra'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            {parteArbolActiva === 'Raíz' && 'Raíz / Lexema: aporta el significado fundamental instituido en el lenguaje.'}
            {parteArbolActiva === 'Tronco' && 'Palabra Primitiva: base sobre la cual se estructuran las oraciones con sentido.'}
            {parteArbolActiva === 'Copa' && 'Afijos: prefijos y sufijos que enriquecen y matizan la comunicación humana.'}
            {!parteArbolActiva && 'La morfología estudia cómo las palabras se forman y se relacionan dentro de la lengua.'}
          </span>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // 5. INFOGRAFÍA VECTORIAL: BALANZA DE LA VERDAD Y LA FE (TEOLOGÍA Y COSMOVISIÓN)
  // ----------------------------------------------------------------------------
  const renderBalanzaTeologica = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{ position: 'relative', width: '230px', height: '175px' }}>
          <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%' }}>
            {/* Pilar base de la balanza */}
            <rect x="115" y="50" width="10" height="90" fill="#FBBF24" rx="2" />
            <rect x="80" y="140" width="80" height="12" fill="#926806" rx="3" />
            <circle cx="120" cy="50" r="8" fill="#D4AF37" />

            {/* Brazo en equilibrio */}
            <line x1="50" y1="65" x2="190" y2="65" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round" />

            {/* Platillo Izquierdo: Fe Bíblica */}
            <line x1="60" y1="65" x2="60" y2="95" stroke="var(--border-default)" strokeWidth="1.5" />
            <path
              d="M40 95 Q60 115 80 95 Z"
              fill="var(--brand-primary-soft)"
              stroke="var(--brand-primary)"
              strokeWidth="2"
              onClick={() => setLadoBalanzaActivo('Fe')}
              style={{ cursor: 'pointer' }}
            />
            <text x="60" y="125" fill="var(--brand-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
              FE
            </text>

            {/* Platillo Derecho: Ciencia y Razón */}
            <line x1="180" y1="65" x2="180" y2="95" stroke="var(--border-default)" strokeWidth="1.5" />
            <path
              d="M160 95 Q180 115 200 95 Z"
              fill="var(--brand-gold-soft)"
              stroke="var(--brand-gold)"
              strokeWidth="2"
              onClick={() => setLadoBalanzaActivo('Razón')}
              style={{ cursor: 'pointer' }}
            />
            <text x="180" y="125" fill="var(--brand-gold)" fontSize="9" fontWeight="bold" textAnchor="middle">
              RAZÓN
            </text>
          </svg>
        </div>

        <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-subtle)', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block' }}>
            {ladoBalanzaActivo ? `Fundamento: ${ladoBalanzaActivo}` : 'Armonía Divina entre Fe y Razón'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            {ladoBalanzaActivo === 'Fe' && 'Fe Revelada (Hebreos 11:1): da el propósito y la cosmovisión trascendente de la vida.'}
            {ladoBalanzaActivo === 'Razón' && 'Razón y Ciencia (Colosenses 2:3): exploran y confirman el orden puesto por el Creador.'}
            {!ladoBalanzaActivo && 'La reflexión teológica integra exégesis, doctrina y aplicación pastoral.'}
          </span>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // 6. MAPA CONCEPTUAL ACADÉMICO (CIENCIAS SOCIALES, POLÍTICA, ADMINISTRACIÓN, ARTE)
  // ----------------------------------------------------------------------------
  const renderMapaConceptualAcademico = () => {
    const nodos = [
      { id: 'Pregunta', x: 120, y: 28 },
      { id: 'Evidencia', x: 205, y: 90 },
      { id: 'Método', x: 120, y: 152 },
      { id: 'Síntesis', x: 35, y: 90 },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
        <div style={{ position: 'relative', width: '230px', height: '175px' }}>
          <svg viewBox="0 0 240 180" style={{ width: '100%', height: '100%' }}>
            {nodos.map((nodo) => (
              <line
                key={`line-${nodo.id}`}
                x1="120"
                y1="90"
                x2={nodo.x}
                y2={nodo.y}
                stroke="var(--border-default)"
                strokeWidth="2"
              />
            ))}
            <circle cx="120" cy="90" r="25" fill="var(--accent-study-soft)" stroke="var(--accent-study)" strokeWidth="3" />
            <text x="120" y="94" fill="var(--accent-study)" fontSize="9" fontWeight="bold" textAnchor="middle">
              TEMA
            </text>
            {nodos.map((nodo) => (
              <g key={nodo.id} onClick={() => setNodoMapaActivo(nodo.id)} style={{ cursor: 'pointer' }}>
                <circle cx={nodo.x} cy={nodo.y} r="22" fill="var(--bg-surface)" stroke="var(--brand-gold)" strokeWidth="2" />
                <text x={nodo.x} y={nodo.y + 3} fill="var(--brand-primary)" fontSize="7" fontWeight="bold" textAnchor="middle">
                  {nodo.id}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-canvas)', padding: '6px 12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-subtle)', width: '100%', boxSizing: 'border-box' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'block' }}>
            {nodoMapaActivo ? `Elemento: ${nodoMapaActivo}` : 'Mapa de análisis académico'}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
            {nodoMapaActivo === 'Pregunta' && 'Delimita el problema y formula una pregunta investigable.'}
            {nodoMapaActivo === 'Evidencia' && 'Selecciona datos, fuentes y ejemplos verificables.'}
            {nodoMapaActivo === 'Método' && 'Aplica el procedimiento propio de la disciplina.'}
            {nodoMapaActivo === 'Síntesis' && 'Integra los hallazgos y comunica una conclusión fundamentada.'}
            {!nodoMapaActivo && 'Toca cada nodo para recorrer el proceso de análisis.'}
          </span>
        </div>
      </div>
    );
  };

  // Selector de render según materia o tipo configurado
  const renderGraficoSegunTipo = () => {
    const mat = nombreMateria.toLowerCase();
    if (diapositiva.tipoGrafico === 'PIZZA_FRACCIONES' || (esGael && mat.includes('matematica'))) {
      return renderPizzaFracciones();
    }
    if (diapositiva.tipoGrafico === 'RECTA_NUMERICA' || (!esGael && mat.includes('matematica'))) {
      return renderRectaNumerica();
    }
    if (
      diapositiva.tipoGrafico === 'CELULA_VIVA' ||
      (mat.includes('ciencia') && !mat.includes('politica')) ||
      mat.includes('fisica')
    ) {
      return renderCelulaViva();
    }
    if (
      diapositiva.tipoGrafico === 'ARBOL_GRAMATICAL' ||
      mat.includes('lengua') ||
      mat.includes('literature') ||
      mat.includes('english')
    ) {
      return renderArbolGramatical();
    }
    if (
      diapositiva.tipoGrafico === 'COSMOS_CREACION' ||
      mat.includes('social') ||
      mat.includes('politica') ||
      mat.includes('administracion') ||
      mat.includes('arte') ||
      mat.includes('artistica') ||
      mat.includes('programacion') ||
      mat.includes('software')
    ) {
      return renderMapaConceptualAcademico();
    }
    if (esMateriaTeologia) {
      return renderBalanzaTeologica();
    }
    // Fallback estándar
    return esGael ? renderPizzaFracciones() : renderRectaNumerica();
  };

  return (
    <div
      className="wa-openmaic-viewer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--bg-canvas)',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ======================================================================
        1. BARRA SUPERIOR EDITORIAL (CABECERA ESTILO OPENMAIC)
      ======================================================================= */}
      <div
        className="wa-openmaic-topbar"
        style={{
          minHeight: '52px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.375rem var(--carbon-space-2x)',
          backgroundColor: 'var(--bg-surface)',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: '0.375rem 0.75rem',
        }}
      >
        <div className="wa-openmaic-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 240px' }}>
          <button
            onClick={() => onCambiarDiapositiva(Math.max(1, diapositivaActual - 1))}
            title="Volver a la diapositiva anterior"
            aria-label="Volver a la diapositiva anterior"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            ←
          </button>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.625rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ESCENA ACTUAL • DIAPOSITIVA {diapositivaActual} DE {totalDiapositivas}
            </span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'var(--wa-font-display)', lineHeight: 1.2 }}>
              {diapositiva.titulo}
            </span>
          </div>
        </div>

        {/* CONTROLES SUPERIORES: RITMO, ZOOM Y MODO TEATRO */}
        <div className="wa-openmaic-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Selector de Ritmo de Aprendizaje */}
          {onCambiarRitmo && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '2px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(['lento', 'normal', 'acelerado'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onCambiarRitmo(r)}
                  title={`Ritmo de clase: ${r}`}
                  aria-label={`Ritmo de clase: ${r}`}
                  aria-pressed={ritmoAprendizaje === r}
                  style={{
                    padding: '2px 6px',
                    fontSize: '0.6875rem',
                    fontWeight: ritmoAprendizaje === r ? 700 : 500,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: ritmoAprendizaje === r ? 'var(--brand-primary)' : 'transparent',
                    color: ritmoAprendizaje === r ? 'var(--text-on-brand)' : 'var(--text-secondary)',
                  }}
                >
                  {r === 'lento' ? '0.85x' : r === 'normal' ? '1.0x' : '1.25x'}
                </button>
              ))}
            </div>
          )}

          {/* Botón Modo Teatro / Pantalla Completa */}
          {onToggleTeatro && (
            <button
              onClick={onToggleTeatro}
              title={modoTeatro ? 'Salir del Modo Teatro' : 'Modo Teatro / Enfoque'}
              aria-label={modoTeatro ? 'Salir del Modo Teatro' : 'Activar Modo Teatro o Enfoque'}
              aria-pressed={Boolean(modoTeatro)}
              style={{
                background: modoTeatro ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                color: modoTeatro ? 'var(--text-on-brand)' : 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '5px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {modoTeatro ? '⤢ Normal' : '⤡ Teatro'}
            </button>
          )}

          <div
            className="wa-zoom-controls"
            role="group"
            aria-label="Zoom de la diapositiva. 100% equivale a ajustar al visor."
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--wa-radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setZoomManual((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
              title="Reducir zoom"
              aria-label="Reducir zoom de la diapositiva"
              style={{ width: '26px', height: '26px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
            >
              −
            </button>
            <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', minWidth: '34px', textAlign: 'center', color: 'var(--text-primary)' }}>
              {Math.round(zoomManual * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomManual((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
              title="Ampliar zoom"
              aria-label="Ampliar zoom de la diapositiva"
              style={{ width: '26px', height: '26px', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700 }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomManual(1)}
              title="Ajustar la diapositiva al visor"
              aria-label="Ajustar la diapositiva al visor"
              style={{ border: 'none', background: 'transparent', color: 'var(--brand-primary)', cursor: 'pointer', fontSize: '0.625rem', fontWeight: 700, padding: '0 4px' }}
            >
              Ajustar
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================================
        2. ESCENARIO CENTRAL (LIENZO DE DIAPOSITIVA DINÁMICA OPENMAIC)
      ======================================================================= */}
      <div
        ref={stageRef}
        className={`wa-openmaic-stage ${zoomManual > 1 ? 'wa-openmaic-stage--zoomed' : ''}`}
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 'clamp(12px, 2vw, 24px)',
          boxSizing: 'border-box',
          position: 'relative',
          backgroundColor: 'var(--bg-canvas)',
          overflowY: 'auto',
          '--wa-zoom-manual': zoomManual,
        } as React.CSSProperties}
      >
        {/* MARCO ESCALADO: conserva el tamaño del lienzo en el layout */}
        <div
          className="wa-slide-frame"
          style={{
            width: canvas.ancho * zoomActual,
            height: canvas.alto * zoomActual,
            margin: 'auto',
            flexShrink: 0,
            position: 'relative',
          }}
        >
        {/* TARJETA PRINCIPAL DE LA DIAPOSITIVA (LIENZO FIJO ESCALADO) */}
        <div
          className={`wa-slide-card wa-slide-canvas wa-slide-canvas--${canvas.modo}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvas.ancho,
            height: canvas.alto,
            transform: `scale(${zoomActual})`,
            transformOrigin: 'top left',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px 24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflow: 'hidden',
          }}
        >
          {/* WATERMARK DE NÚMERO DE DIAPOSITIVA EN FONDO */}
          <span
            className="wa-slide-watermark"
            style={{
              position: 'absolute',
              top: '8px',
              right: '20px',
              fontFamily: 'var(--wa-font-mono)',
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'var(--border-subtle)',
              opacity: 0.35,
              userSelect: 'none',
              pointerEvents: 'none',
              lineHeight: 1,
            }}
          >
            0{diapositivaActual}
          </span>

          {/* TÍTULO Y SUBRAYADO DE SABIDURÍA (GOLD ACCENT) */}
          <div className="wa-slide-header" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <h2
              className="wa-slide-title"
              style={{
                fontFamily: 'var(--wa-font-display)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: '0 0 6px 0',
                lineHeight: 1.25,
              }}
            >
              {diapositiva.titulo}
            </h2>
            <div
              style={{
                width: '72px',
                height: '4px',
                backgroundColor: 'var(--brand-gold)',
                margin: '0 auto 8px auto',
                borderRadius: '2px',
              }}
            />
            <p
              style={{
                fontFamily: 'var(--wa-font-sans)',
                fontSize: '0.9375rem',
                color: 'var(--text-secondary)',
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              {diapositiva.subtitulo}
            </p>
          </div>

          {/* BARRA DE PROGRESO PEDAGÓGICO PASO A PASO (OPENMAIC STEPPER) */}
          <div
            className="wa-slide-steps"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              margin: '2px 0 10px 0',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {pasos.map((paso, idx) => {
              const esActivo = pasoActivo === idx;
              const esCompletado = pasoActivo > idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSeleccionarPaso(idx)}
                  title={`Paso ${idx + 1}: ${paso.titulo}`}
                  aria-label={`Paso ${idx + 1}: ${paso.titulo}`}
                  aria-pressed={esActivo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: esActivo
                      ? '1px solid var(--selected-border)'
                      : esCompletado
                      ? '1px solid var(--accent-study)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: esActivo
                      ? 'var(--selected-surface)'
                      : esCompletado
                      ? 'var(--accent-study-soft)'
                      : 'var(--bg-subtle)',
                    color: esActivo
                      ? 'var(--selected-text)'
                      : esCompletado
                      ? 'var(--accent-study)'
                      : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--wa-font-sans)',
                    fontWeight: esActivo ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, background-color 180ms ease',
                    transform: esActivo ? 'scale(1.04)' : 'scale(1)',
                    boxShadow: esActivo ? '0 4px 12px rgba(15, 86, 110, 0.18)' : 'none',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: '1px solid currentColor',
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--wa-font-mono)',
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span>{paso.etiqueta}</span>
                  {esActivo && estaReproduciendo && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--selected-text)' }}>●</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* DISTRIBUCIÓN DIDÁCTICA ADAPTABLE (GRÁFICO + TARJETAS VIVAS) */}
          <div
            className="wa-slide-body"
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '14px',
              alignItems: 'stretch',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {/* COLUMNA IZQUIERDA: ÁREA ILUSTRADA E INTERACTIVA CON FOCO ACTIVO */}
            <div
              className="wa-slide-visual"
              style={{
                flex: '1 1 320px',
                minWidth: 0,
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--wa-radius-lg)',
                border: focoActual === 'grafico' ? '2px solid var(--brand-gold)' : '1px solid var(--border-subtle)',
                boxShadow: focoActual === 'grafico'
                  ? '0 0 0 4px rgba(184, 134, 11, 0.28), 0 8px 24px rgba(184, 134, 11, 0.15)'
                  : 'var(--shadow-sm)',
                transform: focoActual === 'grafico' ? 'scale(1.015)' : 'scale(1)',
                transition: 'border-color 240ms ease, box-shadow 240ms ease, transform 240ms ease',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxSizing: 'border-box',
                minHeight: '260px',
              }}
            >
              {/* Badge temático en la esquina superior */}
              <div
                className="wa-visual-badge"
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--wa-radius-sm)',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span>{diapositiva.insigniaGrafico || (esGael ? '🍕 ¿Compartes pizza?' : '🌡️ Recta y Magnitudes')}</span>
                {focoActual === 'grafico' && (
                  <span
                    style={{
                      fontSize: '0.625rem',
                      fontFamily: 'var(--wa-font-mono)',
                      backgroundColor: 'var(--brand-gold)',
                      color: 'var(--bg-canvas)',
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontWeight: 700,
                    }}
                  >
                    ● OBSERVACIÓN
                  </span>
                )}
              </div>

              {/* RENDER DEL WIDGET EDUCATIVO */}
              {renderGraficoSegunTipo()}
            </div>

            {/* COLUMNA DERECHA: PREGUNTA EXPLORATORIA + OBJETIVOS + ESCRITURA */}
            <div
              className="wa-slide-copy"
              style={{
                flex: '1 1 360px',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                justifyContent: 'center',
              }}
            >
              {/* TARJETA PRINCIPAL: EXPLICACIÓN DE LA CLASE */}
              <div
                className="wa-copy-card wa-explanation-card"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--wa-radius-md)',
                  padding: '10px 12px',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Explicación de la clase:
                  </span>
                  <button
                    type="button"
                    className="wa-explanation-link"
                    onClick={() => setExplicacionCompleta(true)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--brand-secondary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}
                  >
                    Leer completa →
                  </button>
                </div>
                <p className="wa-explanation-text" style={{ margin: '4px 0 0 0', fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.38, fontWeight: 500 }}>
                  {diapositiva.contenidoExplicativo}
                </p>
              </div>

              {/* TARJETA CELESTE: PREGUNTA DISPARADORA CON FOCO ACTIVO */}
              <div
                className="wa-copy-card"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--wa-radius-md)',
                  padding: '12px 16px',
                  border: focoActual === 'pregunta' ? '2px solid var(--brand-secondary)' : '1px solid var(--border-default)',
                  boxShadow: focoActual === 'pregunta'
                    ? '0 0 0 3px var(--brand-secondary-soft), 0 6px 18px rgba(0, 0, 0, 0.15)'
                    : 'none',
                  transform: focoActual === 'pregunta' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'border-color 240ms ease, box-shadow 240ms ease, transform 240ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Pregunta de Enfoque:
                  </span>
                  {focoActual === 'pregunta' && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--wa-font-mono)',
                        backgroundColor: 'var(--brand-primary-bright-soft)',
                        color: 'var(--status-warning)',
                        border: '1px solid rgba(217, 119, 6, 0.30)',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      ● ENFOCADO
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.9375rem', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>
                  &ldquo;{diapositiva.preguntaDisparadora || (esGael ? '¿Alguna vez has compartido una pizza en partes iguales?' : '¿Cómo se representan magnitudes opuestas como la temperatura bajo cero?')}&rdquo;
                </p>
              </div>

              {/* TARJETA MENTA: OBJETIVOS FORMATIVOS Y PROCEDIMIENTO CON FOCO ACTIVO */}
              <div
                className="wa-copy-card"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--wa-radius-md)',
                  padding: '12px 16px',
                  border: focoActual === 'objetivos' ? '2px solid var(--accent-study)' : '1px solid var(--border-default)',
                  boxShadow: focoActual === 'objetivos'
                    ? '0 0 0 3px var(--accent-study-soft), 0 6px 18px rgba(0, 0, 0, 0.15)'
                    : 'none',
                  transform: focoActual === 'objetivos' ? 'scale(1.02)' : 'scale(1)',
                  transition: 'border-color 240ms ease, box-shadow 240ms ease, transform 240ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 700, color: 'var(--accent-study)', textTransform: 'uppercase' }}>
                    Objetivo de hoy & Procedimiento:
                  </span>
                  {focoActual === 'objetivos' && (
                    <span
                      style={{
                        fontSize: '0.625rem',
                        fontFamily: 'var(--wa-font-mono)',
                        backgroundColor: 'var(--accent-study)',
                        color: 'var(--text-on-brand)',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontWeight: 700,
                      }}
                    >
                      ● PROCEDIMIENTO
                    </span>
                  )}
                </div>
                <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {(diapositiva.objetivosHoy || [
                    'Comprender el concepto esencial paso a paso',
                    'Aplicar el procedimiento con rigor y orden',
                    esMateriaTeologia
                      ? 'Reconocer el fundamento bíblico de la lección'
                      : 'Reconocer el principio académico y su aplicación',
                  ]).map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

        </div>
        </div>
      </div>

      {/* ======================================================================
        3. BARRA DE CONTROLES MULTIMEDIA (DIRECTAMENTE BAJO LA DIAPOSITIVA)
      ======================================================================= */}
      <div
        className="wa-openmaic-mediabar"
        style={{
          minHeight: '44px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--carbon-space-2x)',
          flexShrink: 0,
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {/* Contador de diapositiva */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            ⊞ {diapositivaActual} / {totalDiapositivas}
          </span>
        </div>

        {/* Controles de reproducción centrados */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Silenciar */}
          <button
            onClick={() => setSilenciado(!silenciado)}
            title={silenciado ? 'Activar audio' : 'Silenciar'}
            aria-label={silenciado ? 'Activar audio de la clase' : 'Silenciar audio de la clase'}
            aria-pressed={silenciado}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            {silenciado ? '🔇' : '🔊'}
          </button>

          {/* Selector de velocidad */}
          <button
            onClick={handleCiclarVelocidad}
            title="Velocidad de reproducción de la profesora"
            aria-label={`Velocidad de reproducción: ${velocidadVoz} por uno`}
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '2px 8px',
              fontFamily: 'var(--wa-font-mono)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              cursor: 'pointer',
            }}
          >
            {velocidadVoz}x
          </button>

          {/* Anterior */}
          <button
            onClick={() => onCambiarDiapositiva(Math.max(1, diapositivaActual - 1))}
            disabled={diapositivaActual === 1}
            title="Diapositiva anterior"
            aria-label="Diapositiva anterior"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: diapositivaActual === 1 ? 'not-allowed' : 'pointer',
              opacity: diapositivaActual === 1 ? 0.35 : 1,
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            ❮
          </button>

          {/* Play / Pause Principal */}
          <button
            onClick={handleTogglePlayPasoAPaso}
            title={estaReproduciendo ? 'Pausar' : 'Reproducir paso a paso'}
            aria-label={estaReproduciendo ? 'Pausar la clase' : 'Reproducir la clase paso a paso'}
            aria-pressed={estaReproduciendo}
            style={{
              background: 'var(--brand-gold)',
              color: 'var(--text-on-gold)',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            {estaReproduciendo ? '⏸' : '▶'}
          </button>

          {/* Siguiente */}
          <button
            onClick={() => onCambiarDiapositiva(Math.min(totalDiapositivas, diapositivaActual + 1))}
            disabled={diapositivaActual === totalDiapositivas}
            title="Siguiente diapositiva"
            aria-label="Siguiente diapositiva"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: diapositivaActual === totalDiapositivas ? 'not-allowed' : 'pointer',
              opacity: diapositivaActual === totalDiapositivas ? 0.35 : 1,
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            ❯
          </button>

          {/* Lápiz / Marcador interactivo */}
          <button
            onClick={() => setModoLapiz(!modoLapiz)}
            title="Activar lápiz para anotar en pantalla"
            aria-label={modoLapiz ? 'Desactivar lápiz de anotación' : 'Activar lápiz de anotación'}
            aria-pressed={modoLapiz}
            style={{
              background: modoLapiz ? 'var(--brand-gold)' : 'transparent',
              color: modoLapiz ? 'var(--text-on-brand)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '4px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            ✏️
          </button>
        </div>

        {/* Botón de consulta con IA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onAbrirModalIA}
            title="Hacer una pregunta a Gemini 3.8 Flash sobre esta clase"
            aria-label="Preguntar al Profesor IA sobre esta clase"
            className="wa-openmaic-ai-btn"
            style={{
              background: 'var(--brand-gold)',
              border: '1px solid var(--brand-gold)',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '4px 8px',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-on-gold)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>💬</span> Preguntar al Profesor IA
          </button>
        </div>
      </div>

      {/* ======================================================================
        4. BARRA INFERIOR MULTI-AGENTE (OPENMAIC LIVE SPEECH & COMMUNITY)
      ======================================================================= */}
      <div
        className="wa-speechbar wa-openmaic-speechbar"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box',
          flexShrink: 0,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {/* AVATAR DEL PROFESOR CON HALO VIBRANTE */}
        <div className="wa-speechbar-teacher" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '42px', height: '42px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={intervencion.avatarProfesor}
              alt={intervencion.nombreProfesor}
              className={estaReproduciendo ? 'wa-teacher-speaking-halo' : ''}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                border: '2px solid var(--brand-gold)',
                objectFit: 'cover',
                backgroundColor: 'var(--bg-surface)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: estaReproduciendo ? 'var(--brand-secondary)' : 'var(--text-muted)',
                border: '1.5px solid var(--bg-surface)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {intervencion.nombreProfesor}
            </span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {estaReproduciendo ? `Enseñando ${pasoActualData?.etiqueta}...` : 'En Espera'}
            </span>
          </div>
        </div>

        {/* BURBUJA DE DIÁLOGO / SUBTÍTULOS EN VIVO CON EL PASO PEDAGÓGICO */}
        <div
          className="wa-speechbar-bubble"
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--wa-radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)',
            minHeight: '38px',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {pasoActualData?.etiqueta}: {pasoActualData?.titulo}
            </span>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.35, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              &ldquo;{pasoActualData?.guionVoz}&rdquo;
            </p>
          </div>

          <button
            onClick={() => reproducirDesdePaso(pasoActivo, velocidadVoz)}
            title="Repetir este paso pedagógico"
            aria-label="Repetir este paso pedagógico"
            aria-pressed={estaReproduciendo}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--brand-primary)',
              fontSize: '0.875rem',
              flexShrink: 0,
            }}
          >
            {estaReproduciendo ? '⏸' : '▶'}
          </button>
        </div>

        {/* COMUNIDAD DE COMPAÑEROS DE CLASE VIRTUALES (DANIEL / LUCAS) */}
        {intervencion.companero && (
          <button
            type="button"
            onClick={() => setDialogoCompaneroActivo(!dialogoCompaneroActivo)}
            title={`Pregunta de tu compañero ${intervencion.companero.nombre}`}
            aria-label={`Pregunta de tu compañero ${intervencion.companero.nombre}`}
            aria-pressed={dialogoCompaneroActivo}
            className="wa-speechbar-companion"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '4px 8px',
              cursor: 'pointer',
              flexShrink: 0,
              fontFamily: 'var(--wa-font-sans)',
              color: 'var(--text-primary)',
              textAlign: 'left',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={intervencion.companero.avatar}
              alt=""
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {intervencion.companero.nombre}
            </span>
          </button>
        )}
      </div>

      <Modal
        abierto={explicacionCompleta}
        onCerrar={() => setExplicacionCompleta(false)}
        titulo="Explicación completa de la clase"
        subtitulo={diapositiva.titulo}
        anchoMaximo="820px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '1.0625rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
            {diapositiva.contenidoExplicativo}
          </p>

          {diapositiva.objetivosHoy && diapositiva.objetivosHoy.length > 0 && (
            <div>
              <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8125rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Objetivos de la clase
              </strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                {diapositiva.objetivosHoy.map((objetivo, indice) => (
                  <li key={indice}>{objetivo}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ padding: '0.875rem 1rem', borderRadius: 'var(--wa-radius-md)', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
            <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', color: 'var(--brand-gold-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {esMateriaTeologia ? 'Fundamento bíblico' : 'Principio académico'} · {diapositiva.versiculoBiblico.referencia}
            </strong>
            <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              &ldquo;{diapositiva.versiculoBiblico.texto}&rdquo;
            </p>
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Fuente de la clase: {diapositiva.referenciaLibroTexto}
          </p>
        </div>
      </Modal>
    </div>
  );
};
