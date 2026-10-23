'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Panel Lateral de Recursos Educativos
 * ARCHIVO: src/components/lms/EducationalResourcesPanel.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Panel retráctil de Recursos de apoyo del aula Homeschool. Conserva el
 * contexto curricular mientras el estudiante:
 * 1. Consulta las recomendaciones de la clase.
 * 2. Reproduce un video en un visor amplio dentro de Wisdom Academy.
 * 3. Busca otro video en la lista interna sin perder el actual.
 * 4. Vuelve al video anterior o regresa al aula.
 *
 * El panel nunca sustituye la navegación principal ni la URL de la clase. En
 * tablet y móvil funciona como cajón superpuesto con cierre accesible.
 * ==============================================================================
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ContextoAcademico,
  RecursoVideo,
  ResultadoRecomendaciones,
  ResultadoReporte,
  ResultadoSolicitudRevision,
  ResultadoValidacionEnlace,
  TipoIncidenciaVideo,
} from '@/types/educationalResources';
import {
  calcularClaveContexto,
  construirConsultaContextual,
  construirUrlBusquedaYouTube,
  deduplicarRecursos,
  normalizarComparacion,
} from '@/lib/educational-resources/text';
import { EducationalVideoPlayer } from '@/components/lms/EducationalVideoPlayer';
import { ResourceThumbnail } from '@/components/lms/ResourceThumbnail';
import { Modal } from '@/components/ui/Modal';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface EducationalResourcesPanelProps {
  contexto: ContextoAcademico;
  expandido: boolean;
  onToggle: () => void;
}

const PREFIJO_CACHE_CLIENTE = 'wa_recursos_cache_v1_';
const PREFIJO_ESTADO_PANEL = 'wa_recursos_panel_v2_';
const MAX_HISTORIAL = 8;

type VistaRecursos = 'clase' | 'buscar';

interface EstadoPanelPersistido {
  vista: VistaRecursos;
  consulta: string;
  recursoId: string | null;
  historialIds: string[];
}

const OPCIONES_INCIDENCIA: Array<{ id: TipoIncidenciaVideo; etiqueta: string }> = [
  { id: 'NO_REPRODUCE', etiqueta: 'El video no se reproduce' },
  { id: 'ENLACE_ROTO', etiqueta: 'El enlace está roto' },
  { id: 'ELIMINADO_O_PRIVADO', etiqueta: 'El video fue eliminado o es privado' },
  { id: 'NO_CORRESPONDE_TEMA', etiqueta: 'No corresponde al tema de la clase' },
  { id: 'IDIOMA_INCORRECTO', etiqueta: 'Está en un idioma distinto del esperado' },
  { id: 'CONTENIDO_INAPROPIADO', etiqueta: 'El contenido no es apropiado para el nivel' },
  { id: 'OTRO', etiqueta: 'Otro problema' },
];

/** Guarda una respuesta validada en el navegador para mostrarla al reabrir. */
function guardarCacheCliente(clave: string, datos: ResultadoRecomendaciones): void {
  try {
    const valor = JSON.stringify({ guardadoEn: Date.now(), datos });
    if (valor.length > 250_000) return;
    localStorage.setItem(`${PREFIJO_CACHE_CLIENTE}${clave}`, valor);
  } catch {
    // El almacenamiento puede estar lleno o deshabilitado; no afecta la clase.
  }
}

/** Recupera una respuesta vigente; descarta cachés vencidas o corruptas. */
function leerCacheCliente(clave: string): ResultadoRecomendaciones | null {
  try {
    const crudo = localStorage.getItem(`${PREFIJO_CACHE_CLIENTE}${clave}`);
    if (!crudo) return null;
    const parseado = JSON.parse(crudo) as {
      guardadoEn?: number;
      datos?: ResultadoRecomendaciones;
    };
    if (!parseado.datos || !parseado.datos.ok) return null;
    if (!Array.isArray(parseado.datos.recursos)) return null;
    const expira = new Date(parseado.datos.expiraEn).getTime();
    if (!Number.isFinite(expira) || expira <= Date.now()) return null;
    return parseado.datos;
  } catch {
    return null;
  }
}

/** Recupera la vista y la navegación de la sesión para el mismo contexto. */
function leerEstadoPanel(clave: string): EstadoPanelPersistido | null {
  try {
    const crudo = sessionStorage.getItem(`${PREFIJO_ESTADO_PANEL}${clave}`);
    if (!crudo) return null;
    const valor = JSON.parse(crudo) as Partial<EstadoPanelPersistido>;
    if (valor.vista !== 'clase' && valor.vista !== 'buscar') return null;
    return {
      vista: valor.vista,
      consulta: typeof valor.consulta === 'string' ? valor.consulta.slice(0, 80) : '',
      recursoId: typeof valor.recursoId === 'string' ? valor.recursoId : null,
      historialIds: Array.isArray(valor.historialIds)
        ? valor.historialIds
            .filter((id): id is string => typeof id === 'string')
            .slice(0, MAX_HISTORIAL)
        : [],
    };
  } catch {
    return null;
  }
}

/** Persiste únicamente estado de navegación, sin datos personales. */
function guardarEstadoPanel(clave: string, estado: EstadoPanelPersistido): void {
  try {
    sessionStorage.setItem(`${PREFIJO_ESTADO_PANEL}${clave}`, JSON.stringify(estado));
  } catch {
    // La sesión puede estar restringida; la interfaz sigue funcionando.
  }
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

/** Texto buscable de un recurso, sin depender de datos personales. */
function textoBuscable(recurso: RecursoVideo): string {
  return normalizarComparacion(
    `${recurso.titulo} ${recurso.canal} ${recurso.descripcion || ''} ${
      recurso.motivos?.join(' ') || ''
    }`
  );
}

/**
 * Componente principal del panel. No depende de datos personales del alumno.
 */
export const EducationalResourcesPanel: React.FC<EducationalResourcesPanelProps> = ({
  contexto,
  expandido,
  onToggle,
}) => {
  const claveContexto = useMemo(() => calcularClaveContexto(contexto), [contexto]);
  const consultaFallback = useMemo(
    () => construirConsultaContextual(contexto),
    [contexto]
  );
  const busquedaFallback = useMemo(
    () => construirUrlBusquedaYouTube(consultaFallback),
    [consultaFallback]
  );

  const [datos, setDatos] = useState<ResultadoRecomendaciones | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recargaVersion, setRecargaVersion] = useState(0);
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<RecursoVideo | null>(null);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [vista, setVista] = useState<VistaRecursos>('clase');
  const [consultaBusqueda, setConsultaBusqueda] = useState('');
  const [historial, setHistorial] = useState<RecursoVideo[]>([]);
  const [inicioReproduccion, setInicioReproduccion] = useState(0);
  const [solicitudFocoBusqueda, setSolicitudFocoBusqueda] = useState(0);

  const [mostrarValidadorEnlace, setMostrarValidadorEnlace] = useState(false);
  const [enlaceExterno, setEnlaceExterno] = useState('');
  const [validandoEnlace, setValidandoEnlace] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] =
    useState<ResultadoValidacionEnlace | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [validandoSugerenciaId, setValidandoSugerenciaId] = useState<string | null>(
    null
  );
  const [errorSugerencia, setErrorSugerencia] = useState<string | null>(null);

  const [modalReporte, setModalReporte] = useState(false);
  const [tipoIncidencia, setTipoIncidencia] = useState<TipoIncidenciaVideo>('NO_REPRODUCE');
  const [comentario, setComentario] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [resultadoReporte, setResultadoReporte] = useState<ResultadoReporte | null>(null);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);

  const [modoSuperpuesto, setModoSuperpuesto] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const [estadoRevision, setEstadoRevision] = useState<
    'idle' | 'enviando' | 'ok' | 'error'
  >('idle');
  const [mensajeRevision, setMensajeRevision] = useState('');

  const panelRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const railButtonRef = useRef<HTMLButtonElement>(null);
  const floatingTriggerRef = useRef<HTMLButtonElement>(null);
  const reporteButtonRef = useRef<HTMLButtonElement>(null);
  const peticionRef = useRef<AbortController | null>(null);
  const abrirDesdePanelRef = useRef(false);
  const expandidoPrevioRef = useRef(expandido);
  const montadoEnRef = useRef(Date.now());
  const contextoPrevioRef = useRef<string | null>(null);
  const estadoPendienteRef = useRef<EstadoPanelPersistido | null>(null);
  const puedePersistirRef = useRef(false);
  const seleccionadoRef = useRef<RecursoVideo | null>(null);
  const posicionesRef = useRef<Record<string, number>>({});
  const scrollPosicionesRef = useRef<Record<VistaRecursos, number>>({
    clase: 0,
    buscar: 0,
  });
  const buscadorRef = useRef<HTMLInputElement>(null);
  const tabClaseRef = useRef<HTMLButtonElement>(null);
  const tabBuscarRef = useRef<HTMLButtonElement>(null);

  /** Detecta el modo cajón para gestionar foco y cierre con Escape. */
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    const actualizar = () => setModoSuperpuesto(media.matches);
    actualizar();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', actualizar);
      return () => media.removeEventListener('change', actualizar);
    }
    media.addListener(actualizar);
    return () => media.removeListener(actualizar);
  }, []);

  /** Mantiene la referencia sincronizada sin reiniciar la carga. */
  useEffect(() => {
    seleccionadoRef.current = recursoSeleccionado;
  }, [recursoSeleccionado]);

  /** Carga recomendaciones al expandir y cuando cambia el contexto académico. */
  useEffect(() => {
    peticionRef.current?.abort();
    peticionRef.current = null;

    setResultadoValidacion(null);
    setErrorValidacion(null);
    setValidandoSugerenciaId(null);
    setErrorSugerencia(null);
    setResultadoReporte(null);
    setErrorReporte(null);
    setError(null);
    setModalReporte(false);
    setEnlaceExterno('');
    setMostrarValidadorEnlace(false);
    setEstadoRevision('idle');
    setMensajeRevision('');

    const nuevoContexto = contextoPrevioRef.current !== claveContexto;
    if (nuevoContexto) {
      contextoPrevioRef.current = claveContexto;
      puedePersistirRef.current = false;
      posicionesRef.current = {};
      scrollPosicionesRef.current = { clase: 0, buscar: 0 };
      setDatos(null);
      setCargando(false);
      setVisorAbierto(false);
      setHistorial([]);
      setRecursoSeleccionado(null);
      seleccionadoRef.current = null;
      setConsultaBusqueda('');
      setVista('clase');

      const guardado = leerEstadoPanel(claveContexto);
      estadoPendienteRef.current = guardado;
      if (guardado) {
        setVista(guardado.vista);
        setConsultaBusqueda(guardado.consulta);
      }
    }

    if (!expandido) {
      setCargando(false);
      return;
    }

    const aplicarResultado = (resultado: ResultadoRecomendaciones) => {
      setDatos(resultado);
      const disponibles = deduplicarRecursos([
        ...resultado.recursos,
        ...resultado.pendientes,
      ]);
      const pendiente = estadoPendienteRef.current;
      const previo = seleccionadoRef.current;
      const previoValido =
        previo && disponibles.some((recurso) => recurso.id === previo.id)
          ? previo
          : null;
      const guardado = pendiente?.recursoId
        ? disponibles.find((recurso) => recurso.id === pendiente.recursoId)
        : null;
      const elegido =
        previoValido ||
        guardado ||
        resultado.recursos[0] ||
        resultado.pendientes[0] ||
        null;

      seleccionadoRef.current = elegido;
      setRecursoSeleccionado(elegido);

      if (pendiente) {
        setHistorial(
          pendiente.historialIds
            .map((id) => disponibles.find((recurso) => recurso.id === id))
            .filter(
              (recurso): recurso is RecursoVideo =>
                Boolean(recurso) && recurso?.id !== elegido?.id
            )
            .slice(0, MAX_HISTORIAL)
        );
        estadoPendienteRef.current = null;
      }

      puedePersistirRef.current = true;
    };

    const cache = leerCacheCliente(claveContexto);
    if (cache) {
      aplicarResultado(cache);
    }

    const controlador = new AbortController();
    peticionRef.current = controlador;
    setCargando(true);

    fetch('/api/educational-resources/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ contexto }),
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const cuerpo = (await respuesta.json().catch(() => null)) as
          | ResultadoRecomendaciones
          | { mensaje?: string }
          | null;
        if (!respuesta.ok || !cuerpo || !('ok' in cuerpo) || !cuerpo.ok) {
          throw new Error(
            (cuerpo && 'mensaje' in cuerpo && cuerpo.mensaje) ||
              'No fue posible obtener recomendaciones.'
          );
        }
        return cuerpo as ResultadoRecomendaciones;
      })
      .then((resultado) => {
        if (controlador.signal.aborted) return;
        aplicarResultado(resultado);
        guardarCacheCliente(claveContexto, resultado);
        setCargando(false);
      })
      .catch((fallo: unknown) => {
        if (controlador.signal.aborted) return;
        const mensaje =
          fallo instanceof Error
            ? fallo.message
            : 'No fue posible obtener recomendaciones.';
        setError(mensaje);
        setCargando(false);
      });

    return () => {
      controlador.abort();
    };
    // La clave resume asignatura, unidad, tema, curso e idioma. Así se evita
    // una búsqueda nueva al avanzar diapositivas del mismo tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveContexto, expandido, recargaVersion]);

  /** Persiste en el navegador los cambios por sustitución o selección. */
  useEffect(() => {
    if (!datos || !datos.ok) return;
    guardarCacheCliente(claveContexto, datos);
  }, [datos, claveContexto]);

  /** Conserva vista, consulta, video actual e historial durante la sesión. */
  useEffect(() => {
    if (!puedePersistirRef.current) return;
    guardarEstadoPanel(claveContexto, {
      vista,
      consulta: consultaBusqueda,
      recursoId: recursoSeleccionado?.id || null,
      historialIds: historial.map((recurso) => recurso.id),
    });
  }, [claveContexto, vista, consultaBusqueda, recursoSeleccionado?.id, historial]);

  /** Restaura la posición de desplazamiento de cada vista y al reabrir el panel. */
  useEffect(() => {
    if (!expandido) return;
    const contenedor = scrollRef.current;
    if (contenedor) {
      contenedor.scrollTop = scrollPosicionesRef.current[vista] || 0;
    }
  }, [vista, expandido]);

  /** Lleva el foco al buscador cuando la vista se abrió desde el visor. */
  useEffect(() => {
    if (vista !== 'buscar' || solicitudFocoBusqueda === 0) return;
    const temporizador = window.setTimeout(() => {
      buscadorRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(temporizador);
  }, [vista, solicitudFocoBusqueda]);

  /** Gestiona el foco al abrir y cerrar el panel. */
  useEffect(() => {
    if (expandido && !expandidoPrevioRef.current) {
      const aperturaDeliberada =
        abrirDesdePanelRef.current || Date.now() - montadoEnRef.current > 500;
      abrirDesdePanelRef.current = false;
      if (aperturaDeliberada) {
        requestAnimationFrame(() => closeButtonRef.current?.focus());
      }
    }
    if (!expandido && expandidoPrevioRef.current) {
      requestAnimationFrame(() => {
        (modoSuperpuesto ? floatingTriggerRef.current : railButtonRef.current)?.focus();
      });
    }
    expandidoPrevioRef.current = expandido;
  }, [expandido, modoSuperpuesto]);

  /** Escape cierra el panel o el cajón, salvo que haya un diálogo abierto. */
  useEffect(() => {
    if (!expandido) return;
    const manejarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || modalReporte || visorAbierto) return;
      evento.preventDefault();
      onToggle();
    };
    document.addEventListener('keydown', manejarTecla);
    return () => document.removeEventListener('keydown', manejarTecla);
  }, [expandido, modalReporte, visorAbierto, onToggle]);

  /** Alterna el panel recordando que la acción nació del control lateral. */
  const alternarDesdePanel = useCallback(() => {
    abrirDesdePanelRef.current = !expandido;
    onToggle();
  }, [expandido, onToggle]);

  /** Reintenta la búsqueda manteniendo el contexto. */
  const reintentar = () => {
    setError(null);
    setRecargaVersion((version) => version + 1);
  };

  /**
   * Abre un recurso en el visor amplio. Si había otro video, lo conserva en el
   * historial de la sesión para poder recuperarlo sin repetir la búsqueda.
   */
  const abrirVisorRecurso = useCallback(
    (recurso: RecursoVideo, opciones: { registrarHistorial?: boolean } = {}) => {
      const previo = seleccionadoRef.current;
      if (
        opciones.registrarHistorial !== false &&
        previo &&
        previo.id !== recurso.id
      ) {
        setHistorial((actual) =>
          [
            previo,
            ...actual.filter(
              (item) => item.id !== previo.id && item.id !== recurso.id
            ),
          ].slice(0, MAX_HISTORIAL)
        );
        setEstadoRevision('idle');
        setMensajeRevision('');
        setErrorSugerencia(null);
      }
      seleccionadoRef.current = recurso;
      setRecursoSeleccionado(recurso);
      setInicioReproduccion(posicionesRef.current[recurso.id] || 0);
      setVisorAbierto(true);
      setAnuncio(`Reproduciendo ${recurso.titulo}.`);
    },
    []
  );

  /** Regresa al video consultado antes del actual y conserva su posición. */
  const volverAlVideoAnterior = useCallback(() => {
    const anterior = historial[0];
    if (!anterior) return;
    setHistorial((actual) => actual.slice(1));
    seleccionadoRef.current = anterior;
    setRecursoSeleccionado(anterior);
    setInicioReproduccion(posicionesRef.current[anterior.id] || 0);
    setVisorAbierto(true);
    setAnuncio(`Volviste a ${anterior.titulo}.`);
  }, [historial]);

  /** Recupera un video del historial y devuelve el actual a la pila. */
  const volverAHistorial = useCallback(
    (recurso: RecursoVideo) => {
      const actual = seleccionadoRef.current;
      setHistorial((previo) =>
        [
          ...(actual && actual.id !== recurso.id ? [actual] : []),
          ...previo.filter(
            (item) => item.id !== recurso.id && item.id !== actual?.id
          ),
        ].slice(0, MAX_HISTORIAL)
      );
      seleccionadoRef.current = recurso;
      setRecursoSeleccionado(recurso);
      setInicioReproduccion(posicionesRef.current[recurso.id] || 0);
      setVisorAbierto(true);
      setAnuncio(`Volviste a ${recurso.titulo}.`);
    },
    []
  );

  const cerrarVisor = useCallback(() => {
    setVisorAbierto(false);
    setAnuncio('Visor cerrado. La lista de recursos sigue disponible.');
  }, []);

  const volverAlAula = useCallback(() => {
    setVisorAbierto(false);
    setAnuncio('Regresaste al aula. Tu asignatura y lección se conservan.');
    if (expandido) onToggle();
  }, [expandido, onToggle]);

  const abrirBusqueda = useCallback(() => {
    setVisorAbierto(false);
    setVista('buscar');
    setSolicitudFocoBusqueda((valor) => valor + 1);
    setAnuncio('Búsqueda interna de videos. El video actual se conserva.');
  }, []);

  const registrarProgreso = useCallback((segundos: number) => {
    const actual = seleccionadoRef.current;
    if (actual && Number.isFinite(segundos) && segundos > 0) {
      posicionesRef.current[actual.id] = Math.floor(segundos);
    }
  }, []);

  const cambiarVista = (nueva: VistaRecursos) => {
    setVista(nueva);
  };

  const manejarTecladoTabs = (evento: React.KeyboardEvent<HTMLButtonElement>) => {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return;
    evento.preventDefault();
    const nueva: VistaRecursos = vista === 'clase' ? 'buscar' : 'clase';
    setVista(nueva);
    requestAnimationFrame(() => {
      (nueva === 'clase' ? tabClaseRef.current : tabBuscarRef.current)?.focus();
    });
  };

  /** Abre el modal de reporte y reinicia el formulario. */
  const abrirReporte = () => {
    setTipoIncidencia('NO_REPRODUCE');
    setComentario('');
    setErrorReporte(null);
    setResultadoReporte(null);
    setModalReporte(true);
  };

  /** Cierra el reporte y devuelve el foco al botón que lo abrió. */
  const cerrarReporte = () => {
    setModalReporte(false);
    requestAnimationFrame(() => reporteButtonRef.current?.focus());
  };

  /** Elimina de las listas un recurso reportado. */
  const retirarRecursoDeListas = (videoId: string) => {
    setDatos((previo) => {
      if (!previo) return previo;
      return {
        ...previo,
        recursos: previo.recursos.filter((recurso) => recurso.id !== videoId),
        pendientes: previo.pendientes.filter((recurso) => recurso.id !== videoId),
      };
    });
  };

  /** Incorpora un recurso validado o pendiente sin recargar la clase. */
  const incorporarRecurso = (
    recurso: RecursoVideo,
    reemplazarId?: string,
    opciones: { reproducir?: boolean } = {}
  ) => {
    setDatos((previo) => {
      if (!previo) return previo;
      const filtrar = (item: RecursoVideo) =>
        item.id !== recurso.id && item.id !== reemplazarId;
      const recursos = previo.recursos.filter(filtrar);
      const pendientes = previo.pendientes.filter(filtrar);
      if (recurso.estado === 'VALIDADO') recursos.unshift(recurso);
      else pendientes.unshift(recurso);
      return { ...previo, recursos, pendientes };
    });

    if (opciones.reproducir === true) {
      abrirVisorRecurso(recurso);
    } else {
      seleccionadoRef.current = recurso;
      setRecursoSeleccionado(recurso);
      setVisorAbierto(false);
    }
    setEstadoRevision('idle');
    setMensajeRevision('');
  };

  /** Envía el reporte y aplica la sustitución devuelta por el servidor. */
  const enviarReporte = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!recursoSeleccionado || enviandoReporte) return;

    setEnviandoReporte(true);
    setErrorReporte(null);
    setResultadoReporte(null);

    try {
      const respuesta = await fetch('/api/educational-resources/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          videoId: recursoSeleccionado.id,
          tipo: tipoIncidencia,
          comentario,
          contexto,
        }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | ResultadoReporte
        | { mensaje?: string }
        | null;

      if (!cuerpo || !('mensaje' in cuerpo)) {
        throw new Error('El servidor no devolvió un resultado válido.');
      }

      if (!respuesta.ok || !('ok' in cuerpo) || !(cuerpo as ResultadoReporte).ok) {
        throw new Error(cuerpo.mensaje || 'No fue posible registrar el reporte.');
      }

      const resultado = cuerpo as ResultadoReporte;
      setResultadoReporte(resultado);

      if (resultado.recursoSustituto) {
        incorporarRecurso(resultado.recursoSustituto, recursoSeleccionado.id);
        setAnuncio('Se actualizó la recomendación con una alternativa validada.');
      } else {
        const siguiente =
          datos?.recursos.find((recurso) => recurso.id !== recursoSeleccionado.id) ||
          datos?.pendientes.find((recurso) => recurso.id !== recursoSeleccionado.id) ||
          null;
        retirarRecursoDeListas(recursoSeleccionado.id);
        seleccionadoRef.current = siguiente;
        setRecursoSeleccionado(siguiente);
        setVisorAbierto(false);
        setAnuncio(
          'El recurso fue retirado de la vista. Usa la búsqueda interna para elegir otro video.'
        );
      }
    } catch (fallo) {
      setErrorReporte(
        fallo instanceof Error
          ? fallo.message
          : 'No fue posible registrar el reporte.'
      );
    } finally {
      setEnviandoReporte(false);
    }
  };

  /** Valida un enlace elegido por el estudiante antes de incorporarlo. */
  const validarEnlace = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!enlaceExterno.trim() || validandoEnlace) return;

    setValidandoEnlace(true);
    setErrorValidacion(null);
    setResultadoValidacion(null);

    try {
      const respuesta = await fetch('/api/educational-resources/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ videoId: enlaceExterno.trim(), contexto }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | ResultadoValidacionEnlace
        | { mensaje?: string }
        | null;
      if (!cuerpo || !('mensaje' in cuerpo)) {
        throw new Error('El servidor no devolvió un resultado válido.');
      }
      if (!respuesta.ok) {
        throw new Error(cuerpo.mensaje || 'No fue posible validar el enlace.');
      }
      setResultadoValidacion(cuerpo as ResultadoValidacionEnlace);
    } catch (fallo) {
      setErrorValidacion(
        fallo instanceof Error ? fallo.message : 'No fue posible validar el enlace.'
      );
    } finally {
      setValidandoEnlace(false);
    }
  };

  /**
   * Valida una sugerencia desde el propio visor. Si el servidor devuelve un
   * recurso, se incorpora a las listas, se selecciona y se reproduce.
   */
  const validarSugerencia = async (recurso: RecursoVideo) => {
    if (recurso.estado === 'VALIDADO') {
      abrirVisorRecurso(recurso);
      return;
    }
    if (validandoSugerenciaId) return;

    setValidandoSugerenciaId(recurso.id);
    setErrorSugerencia(null);

    try {
      const respuesta = await fetch('/api/educational-resources/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ videoId: recurso.id, contexto }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | ResultadoValidacionEnlace
        | { mensaje?: string }
        | null;

      if (!cuerpo || !('mensaje' in cuerpo)) {
        throw new Error('El servidor no devolvió un resultado válido.');
      }
      if (!respuesta.ok || ('ok' in cuerpo && !cuerpo.ok)) {
        throw new Error(cuerpo.mensaje || 'No fue posible validar esta sugerencia.');
      }
      if (!('recurso' in cuerpo) || !cuerpo.recurso) {
        setErrorSugerencia(
          cuerpo.mensaje ||
            'El video no supera los controles disponibles para esta lección.'
        );
        return;
      }

      const validado = cuerpo.recurso;
      incorporarRecurso(validado, recurso.id, { reproducir: true });
      setAnuncio(
        validado.estado === 'VALIDADO'
          ? 'Video validado. Se reproduce dentro del aula.'
          : 'Video verificado. Se reproduce como apoyo mientras completa la revisión docente.'
      );
    } catch (fallo) {
      setErrorSugerencia(
        fallo instanceof Error
          ? fallo.message
          : 'No fue posible validar esta sugerencia.'
      );
    } finally {
      setValidandoSugerenciaId(null);
    }
  };

  /** Solicita al equipo docente la revisión del video pendiente. */
  const solicitarRevision = async () => {
    if (!recursoSeleccionado || estadoRevision === 'enviando') return;
    setEstadoRevision('enviando');
    setMensajeRevision('');
    try {
      const respuesta = await fetch('/api/educational-resources/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          videoId: recursoSeleccionado.id,
          contexto,
        }),
      });
      const cuerpo = (await respuesta.json().catch(() => null)) as
        | ResultadoSolicitudRevision
        | { mensaje?: string }
        | null;
      if (!cuerpo || !('mensaje' in cuerpo)) {
        throw new Error('El servidor no devolvió un resultado válido.');
      }
      if (!respuesta.ok || !('ok' in cuerpo) || !cuerpo.ok) {
        throw new Error(cuerpo.mensaje || 'No fue posible solicitar la revisión.');
      }
      const estado = 'estado' in cuerpo ? cuerpo.estado : undefined;
      setEstadoRevision(estado === 'SOLICITADA' ? 'ok' : 'idle');
      setMensajeRevision(cuerpo.mensaje);
      setAnuncio(cuerpo.mensaje);
    } catch (fallo) {
      setEstadoRevision('error');
      setMensajeRevision(
        fallo instanceof Error
          ? fallo.message
          : 'No fue posible solicitar la revisión.'
      );
    }
  };

  const todosLosRecursos = useMemo(() => {
    if (!datos) return [];
    return deduplicarRecursos([...datos.recursos, ...datos.pendientes]);
  }, [datos]);

  const alternativas = useMemo(
    () =>
      todosLosRecursos.filter(
        (recurso) => recurso.id !== recursoSeleccionado?.id
      ),
    [todosLosRecursos, recursoSeleccionado?.id]
  );

  const resultadosBusqueda = useMemo(() => {
    const consulta = normalizarComparacion(consultaBusqueda.trim());
    const sinActual = alternativas;
    if (!consulta) return sinActual;
    return sinActual.filter((recurso) => textoBuscable(recurso).includes(consulta));
  }, [alternativas, consultaBusqueda]);

  const historialVisible = useMemo(
    () =>
      historial.filter((recurso) => recurso.id !== recursoSeleccionado?.id),
    [historial, recursoSeleccionado?.id]
  );

  const sugerenciasVisor = useMemo(
    () => alternativas.slice(0, 6),
    [alternativas]
  );

  const busquedaUrl = datos?.busquedaUrl || busquedaFallback;
  const fechaValidacion = recursoSeleccionado
    ? new Date(recursoSeleccionado.validacion.fechaValidacion).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';
  const comprobaciones = recursoSeleccionado
    ? recursoSeleccionado.validacion.tecnica.comprobaciones
    : [];

  const renderListaRecursos = (
    recursos: RecursoVideo[],
    opciones?: { etiquetaHistorial?: boolean }
  ) => (
    <ul className="wa-resource-list">
      {recursos.map((recurso) => (
        <li key={recurso.id}>
          <button
            type="button"
            className="wa-resource-list-card"
            onClick={() => {
              if (opciones?.etiquetaHistorial) {
                volverAHistorial(recurso);
              } else {
                abrirVisorRecurso(recurso);
              }
            }}
            aria-label={
              opciones?.etiquetaHistorial
                ? `Volver a ${recurso.titulo}`
                : `Reproducir ${recurso.titulo}`
            }
            data-testid={
              opciones?.etiquetaHistorial
                ? `educational-history-${recurso.id}`
                : `educational-alternative-${recurso.id}`
            }
          >
            <ResourceThumbnail
              recurso={recurso}
              variante="compact"
              mostrarDuracion={false}
            />
            <span className="wa-resource-list-copy">
              <span className={`wa-resource-badge ${claseEstado(recurso)}`}>
                {etiquetaEstado(recurso)}
              </span>
              <strong title={recurso.titulo}>{recurso.titulo}</strong>
              <span className="wa-resource-list-meta">
                {recurso.canal}
                {recurso.duracionTexto ? ` · ${recurso.duracionTexto}` : ''}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside
        id="wa-recursos-apoyo"
        ref={panelRef}
        className={`wa-resources-panel${expandido ? ' is-expanded' : ' is-collapsed'}`}
        data-expanded={expandido}
        aria-label="Recursos de apoyo"
        aria-labelledby={expandido ? 'wa-recursos-titulo' : undefined}
        aria-hidden={!expandido && modoSuperpuesto ? true : undefined}
        data-testid="educational-resources-panel"
      >
        {expandido ? (
          <div className="wa-resources-inner">
            <header className="wa-resources-header">
              <div className="wa-resources-heading">
                <span className="wa-resources-eyebrow">OpenMAIC · Apoyo audiovisual</span>
                <h2 id="wa-recursos-titulo">Recursos de apoyo</h2>
                <p className="wa-resources-context">
                  <span>{contexto.asignatura}</span>
                  <span aria-hidden="true"> · </span>
                  {contexto.unidad}
                </p>
                <span className="wa-resources-course">
                  {contexto.curso} · {contexto.nivel}
                </span>
              </div>
              <div className="wa-resources-header-actions">
                <button
                  type="button"
                  className="wa-resource-icon-btn"
                  onClick={() => setRecargaVersion((version) => version + 1)}
                  aria-label="Actualizar recomendaciones"
                  title="Actualizar recomendaciones"
                  disabled={cargando}
                  data-testid="educational-refresh"
                >
                  <WisdomIcon
                    name="refresh"
                    size={17}
                    style={{
                      animation: cargando
                        ? 'wa-resources-spin 800ms linear infinite'
                        : undefined,
                    }}
                  />
                </button>
                <button
                  type="button"
                  ref={closeButtonRef}
                  className="wa-resource-icon-btn wa-resources-close"
                  onClick={alternarDesdePanel}
                  aria-label="Contraer recursos de apoyo"
                  title="Contraer recursos de apoyo"
                  data-testid="educational-resources-close"
                >
                  <WisdomIcon
                    name="chevron-right"
                    size={18}
                    style={{ transform: 'rotate(180deg)' }}
                  />
                </button>
              </div>
            </header>

            <div
              className="wa-resources-tabs"
              role="tablist"
              aria-label="Secciones de recursos de apoyo"
            >
              <button
                type="button"
                role="tab"
                id="wa-tab-clase"
                ref={tabClaseRef}
                className={`wa-resources-tab${vista === 'clase' ? ' is-active' : ''}`}
                aria-selected={vista === 'clase'}
                aria-controls="wa-panel-clase"
                tabIndex={vista === 'clase' ? 0 : -1}
                onClick={() => cambiarVista('clase')}
                onKeyDown={manejarTecladoTabs}
                data-testid="educational-tab-class"
              >
                <WisdomIcon name="video" size={15} />
                Para esta clase
              </button>
              <button
                type="button"
                role="tab"
                id="wa-tab-buscar"
                ref={tabBuscarRef}
                className={`wa-resources-tab${vista === 'buscar' ? ' is-active' : ''}`}
                aria-selected={vista === 'buscar'}
                aria-controls="wa-panel-buscar"
                tabIndex={vista === 'buscar' ? 0 : -1}
                onClick={() => cambiarVista('buscar')}
                onKeyDown={manejarTecladoTabs}
                data-testid="educational-tab-search"
              >
                <WisdomIcon name="search" size={15} />
                Buscar otros videos
              </button>
            </div>

            <div
              ref={scrollRef}
              className="wa-resources-scroll"
              aria-busy={cargando}
              onScroll={(evento) => {
                scrollPosicionesRef.current[vista] = evento.currentTarget.scrollTop;
              }}
            >
              <span className="wa-sr-only" role="status" aria-live="polite">
                {anuncio}
              </span>

              {datos?.advertencia && (
                <p className="wa-resources-advisory" role="note">
                  {datos.advertencia}
                </p>
              )}

              {cargando && !datos && (
                <div className="wa-resources-loading" data-testid="educational-resources-loading">
                  <span className="wa-resources-spinner" aria-hidden="true" />
                  <p>
                    Buscando explicaciones sobre <strong>{contexto.tema}</strong> para{' '}
                    {contexto.curso}.
                  </p>
                  <div className="wa-resources-skeleton" />
                  <div className="wa-resources-skeleton wa-resources-skeleton--short" />
                </div>
              )}

              {error && !datos && (
                <div className="wa-resources-empty" role="alert">
                  <WisdomIcon name="shield" size={26} color="gold" />
                  <strong>No pudimos verificar recursos en este momento</strong>
                  <p>{error}</p>
                  <div className="wa-resources-empty-actions">
                    <button
                      type="button"
                      className="wa-resource-btn wa-resource-btn--secondary"
                      onClick={reintentar}
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      className="wa-resource-btn wa-resource-btn--primary"
                      onClick={abrirBusqueda}
                    >
                      <WisdomIcon name="search" size={16} />
                      Buscar otros videos
                    </button>
                  </div>
                  <p className="wa-resources-note">
                    La clase y el visor de diapositivas siguen funcionando normalmente.
                  </p>
                </div>
              )}

              {cargando && datos && (
                <p className="wa-resources-updating" role="status">
                  Actualizando recomendaciones…
                </p>
              )}

              {error && datos && (
                <div className="wa-resources-inline-error" role="alert">
                  <p>{error}</p>
                  <button
                    type="button"
                    className="wa-resource-btn wa-resource-btn--ghost"
                    onClick={reintentar}
                  >
                    Reintentar
                  </button>
                </div>
              )}

              <div
                id="wa-panel-clase"
                role="tabpanel"
                aria-labelledby="wa-tab-clase"
                hidden={vista !== 'clase'}
              >
                {vista === 'clase' && datos && !recursoSeleccionado && (
                  <div className="wa-resources-empty" data-testid="educational-resources-empty">
                    <WisdomIcon name="video" size={26} color="gold" />
                    <strong>Sin videos validados para este tema</strong>
                    <p>
                      {datos.mensaje ||
                        'No encontramos una opción que supere todos los controles de validación.'}
                    </p>
                    <button
                      type="button"
                      className="wa-resource-btn wa-resource-btn--primary"
                      onClick={abrirBusqueda}
                      data-testid="educational-search-link"
                    >
                      <WisdomIcon name="search" size={16} />
                      Buscar otros videos
                    </button>
                    <p className="wa-resources-note">
                      La búsqueda interna conserva la asignatura y el tema. También
                      puedes validar un enlace antes de incorporarlo.
                    </p>
                  </div>
                )}

                {vista === 'clase' && datos && recursoSeleccionado && (
                  <>
                    <article
                      className="wa-resource-card wa-resource-card--selected"
                      aria-current="true"
                      aria-label={
                        recursoSeleccionado.estado === 'VALIDADO'
                          ? 'Video educativo recomendado'
                          : 'Video de apoyo sugerido, pendiente de revisión'
                      }
                      data-testid="educational-resource-card"
                    >
                      <button
                        type="button"
                        className="wa-resource-thumb-button"
                        onClick={() => abrirVisorRecurso(recursoSeleccionado)}
                        aria-label={`Reproducir ${recursoSeleccionado.titulo} en el visor del aula`}
                        data-testid="educational-thumb-play"
                      >
                        <ResourceThumbnail
                          recurso={recursoSeleccionado}
                          variante="hero"
                        />
                        <span className="wa-resource-thumb-play" aria-hidden="true">
                          <span className="wa-resource-thumb-play-badge">
                            <WisdomIcon name="play" size={22} />
                          </span>
                        </span>
                      </button>

                      <div className="wa-resource-body">
                        <div className="wa-resource-status">
                          <span
                            className={`wa-resource-badge ${claseEstado(recursoSeleccionado)}`}
                            title="Estado de validación del recurso"
                          >
                            <WisdomIcon name="shield" size={12} />
                            {etiquetaEstado(recursoSeleccionado)}
                          </span>
                          <span className="wa-resource-source">
                            {recursoSeleccionado.origen === 'catalogo_curado'
                              ? 'Catálogo curado'
                              : recursoSeleccionado.origen === 'youtube_api'
                              ? 'Búsqueda oficial'
                              : 'Enlace elegido por el estudiante'}
                          </span>
                        </div>

                        {recursoSeleccionado.estado !== 'VALIDADO' && (
                          <p className="wa-resource-kicker">
                            Video de apoyo · mejor coincidencia para esta clase
                          </p>
                        )}
                        <h3 className="wa-resource-title" title={recursoSeleccionado.titulo}>
                          {recursoSeleccionado.titulo}
                        </h3>
                        <p className="wa-resource-channel">{recursoSeleccionado.canal}</p>

                        {recursoSeleccionado.estado !== 'VALIDADO' && (
                          <p className="wa-resource-warning" role="note">
                            Este video es la mejor coincidencia encontrada, pero aún no
                            completó todos los controles. Puedes usarlo como apoyo o
                            solicitar la revisión del equipo docente.
                          </p>
                        )}

                        <div className="wa-resource-actions">
                          <button
                            type="button"
                            className="wa-resource-btn wa-resource-btn--primary"
                            onClick={() => abrirVisorRecurso(recursoSeleccionado)}
                            data-testid="educational-play-button"
                          >
                            <WisdomIcon name="play" size={16} />
                            {recursoSeleccionado.reproduceIntegrado
                              ? 'Reproducir en el aula'
                              : 'Ver opciones y alternativas'}
                          </button>
                          {!recursoSeleccionado.reproduceIntegrado && (
                            <a
                              href={recursoSeleccionado.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wa-resource-btn wa-resource-btn--secondary"
                            >
                              <WisdomIcon name="arrow-right" size={16} />
                              Abrir en YouTube
                            </a>
                          )}
                          <button
                            type="button"
                            ref={reporteButtonRef}
                            className="wa-resource-btn wa-resource-btn--ghost"
                            onClick={abrirReporte}
                            data-testid="educational-report-button"
                          >
                            <WisdomIcon name="shield" size={14} />
                            Reportar video
                          </button>
                          {recursoSeleccionado.estado !== 'VALIDADO' && (
                            <button
                              type="button"
                              className="wa-resource-btn wa-resource-btn--secondary"
                              onClick={solicitarRevision}
                              disabled={
                                estadoRevision === 'enviando' || estadoRevision === 'ok'
                              }
                              data-testid="educational-request-review"
                            >
                              <WisdomIcon name="check" size={14} />
                              {estadoRevision === 'enviando'
                                ? 'Solicitando…'
                                : estadoRevision === 'ok'
                                ? 'Revisión solicitada'
                                : 'Solicitar revisión'}
                            </button>
                          )}
                        </div>

                        {mensajeRevision && (
                          <p
                            className={`wa-resource-review-status ${
                              estadoRevision === 'error' ? 'is-error' : 'is-ok'
                            }`}
                            role="status"
                          >
                            {mensajeRevision}
                          </p>
                        )}

                        <details className="wa-resource-details">
                          <summary>Detalles de validación</summary>
                          <p>
                            Fecha: {fechaValidacion} · Criterios:{' '}
                            {recursoSeleccionado.validacion.versionCriterios}
                          </p>
                          <ul>
                            {comprobaciones.map((comprobacion) => (
                              <li
                                key={comprobacion.id}
                                className={
                                  comprobacion.resultado === 'pasa'
                                    ? 'wa-validation-pass'
                                    : comprobacion.resultado === 'falla'
                                    ? 'wa-validation-fail'
                                    : 'wa-validation-pending'
                                }
                              >
                                <strong>{comprobacion.etiqueta}:</strong>{' '}
                                {comprobacion.detalle}
                              </li>
                            ))}
                          </ul>
                          <p className="wa-resource-evidence">
                            <strong>Evidencia académica:</strong>{' '}
                            {recursoSeleccionado.puntuacion}/100 ·{' '}
                            {recursoSeleccionado.validacion.academica.nivelEvidencia ===
                            'revision_manual'
                              ? 'revisión manual'
                              : 'metadatos públicos'}
                          </p>
                          <ul>
                            {recursoSeleccionado.motivos
                              .slice(0, 3)
                              .map((motivo, indice) => (
                                <li key={`${recursoSeleccionado.id}-motivo-${indice}`}>
                                  {motivo}
                                </li>
                              ))}
                          </ul>
                          <p className="wa-resources-note">
                            La evidencia académica se basa en metadatos públicos y
                            coincidencia curricular. No se analiza el video completo ni
                            sus subtítulos.
                          </p>
                        </details>
                      </div>
                    </article>

                    {alternativas.length > 0 && (
                      <section
                        className="wa-resources-alternatives"
                        aria-label="Otros recursos para esta clase"
                      >
                        <div className="wa-resources-section-head">
                          <h3>Otros recursos de esta clase</h3>
                          <span>{alternativas.length}</span>
                        </div>
                        {renderListaRecursos(alternativas)}
                      </section>
                    )}

                    <button
                      type="button"
                      className="wa-resource-btn wa-resource-btn--secondary wa-resource-btn--full"
                      onClick={abrirBusqueda}
                      data-testid="educational-search-link"
                    >
                      <WisdomIcon name="search" size={16} />
                      Buscar otros videos
                    </button>
                  </>
                )}
              </div>

              <div
                id="wa-panel-buscar"
                role="tabpanel"
                aria-labelledby="wa-tab-buscar"
                hidden={vista !== 'buscar'}
              >
                {vista === 'buscar' && (
                  <div className="wa-resource-search-view">
                    {recursoSeleccionado && (
                      <section
                        className="wa-resource-current"
                        aria-label="Video actual"
                      >
                        <div className="wa-resource-current-head">
                          <span className="wa-resource-current-label">
                            <WisdomIcon name="play" size={12} />
                            Video actual
                          </span>
                          <span className={`wa-resource-badge ${claseEstado(recursoSeleccionado)}`}>
                            {etiquetaEstado(recursoSeleccionado)}
                          </span>
                        </div>
                        <strong className="wa-resource-current-title">
                          {recursoSeleccionado.titulo}
                        </strong>
                        <span className="wa-resource-current-meta">
                          {recursoSeleccionado.canal}
                          {recursoSeleccionado.duracionTexto
                            ? ` · ${recursoSeleccionado.duracionTexto}`
                            : ''}
                        </span>
                        <div className="wa-resource-actions">
                          <button
                            type="button"
                            className="wa-resource-btn wa-resource-btn--primary"
                            onClick={() => abrirVisorRecurso(recursoSeleccionado)}
                            data-testid="educational-return-current"
                          >
                            <WisdomIcon name="play" size={16} />
                            Volver al video
                          </button>
                        </div>
                      </section>
                    )}

                    {datos ? (
                      <>
                        <form
                          className="wa-resource-search-form"
                          role="search"
                          onSubmit={(evento) => evento.preventDefault()}
                        >
                          <label htmlFor="wa-buscar-videos">
                            Buscar entre los recursos de esta clase
                          </label>
                          <div className="wa-resource-search-field">
                            <WisdomIcon
                              name="search"
                              size={16}
                              className="wa-resource-search-icon"
                            />
                            <input
                              id="wa-buscar-videos"
                              ref={buscadorRef}
                              type="search"
                              value={consultaBusqueda}
                              onChange={(evento) =>
                                setConsultaBusqueda(evento.target.value.slice(0, 80))
                              }
                              placeholder="Título, canal o palabra clave"
                              autoComplete="off"
                              data-testid="educational-search-input"
                            />
                            {consultaBusqueda && (
                              <button
                                type="button"
                                className="wa-resource-search-clear"
                                onClick={() => {
                                  setConsultaBusqueda('');
                                  buscadorRef.current?.focus();
                                }}
                                aria-label="Limpiar la búsqueda"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </form>

                        <p className="wa-resource-search-status" role="status" aria-live="polite">
                          {consultaBusqueda.trim()
                            ? `${resultadosBusqueda.length} ${
                                resultadosBusqueda.length === 1
                                  ? 'resultado'
                                  : 'resultados'
                              } para “${consultaBusqueda.trim()}”. El video actual no se pierde.`
                            : `${resultadosBusqueda.length} ${
                                resultadosBusqueda.length === 1
                                  ? 'recurso adicional'
                                  : 'recursos adicionales'
                              } disponibles para esta clase.`}
                        </p>

                        {resultadosBusqueda.length > 0 ? (
                          <section aria-label="Resultados de la búsqueda">
                            {renderListaRecursos(resultadosBusqueda)}
                          </section>
                        ) : (
                          <div className="wa-resources-empty" role="status">
                            <WisdomIcon name="search" size={24} color="gold" />
                            <strong>No encontramos coincidencias en esta clase</strong>
                            <p>
                              Puedes borrar la búsqueda para ver todos los recursos,
                              validar un enlace de YouTube o consultar la búsqueda
                              externa como alternativa.
                            </p>
                            {consultaBusqueda && (
                              <button
                                type="button"
                                className="wa-resource-btn wa-resource-btn--secondary"
                                onClick={() => {
                                  setConsultaBusqueda('');
                                  buscadorRef.current?.focus();
                                }}
                              >
                                Ver todos los recursos
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="wa-resources-note">
                        Las recomendaciones no están disponibles en este momento. Puedes
                        validar un enlace concreto o abrir la búsqueda externa como
                        alternativa controlada.
                      </p>
                    )}

                    {historialVisible.length > 0 && (
                      <section
                        className="wa-resource-history"
                        aria-label="Videos que ya viste"
                      >
                        <div className="wa-resources-section-head">
                          <h3>Videos que ya viste</h3>
                          <span>{historialVisible.length}</span>
                        </div>
                        <p className="wa-resources-note">
                          Se conservan durante esta sesión para que no tengas que
                          buscarlos de nuevo.
                        </p>
                        {renderListaRecursos(historialVisible, {
                          etiquetaHistorial: true,
                        })}
                      </section>
                    )}

                    <button
                      type="button"
                      className="wa-resources-disclosure"
                      onClick={() => setMostrarValidadorEnlace((valor) => !valor)}
                      aria-expanded={mostrarValidadorEnlace}
                      aria-controls="wa-validador-enlace"
                    >
                      <span>¿Elegiste otro video? Validar enlace</span>
                      <WisdomIcon
                        name="chevron-down"
                        size={16}
                        style={{
                          transform: mostrarValidadorEnlace ? 'rotate(180deg)' : 'none',
                        }}
                      />
                    </button>

                    {mostrarValidadorEnlace && (
                      <div id="wa-validador-enlace" className="wa-resources-validator">
                        <form onSubmit={validarEnlace}>
                          <label htmlFor="wa-enlace-video">
                            Enlace del video de YouTube
                          </label>
                          <input
                            id="wa-enlace-video"
                            type="text"
                            inputMode="url"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={enlaceExterno}
                            onChange={(evento) => setEnlaceExterno(evento.target.value)}
                            maxLength={300}
                            disabled={validandoEnlace}
                          />
                          <button
                            type="submit"
                            className="wa-resource-btn wa-resource-btn--secondary"
                            disabled={validandoEnlace || !enlaceExterno.trim()}
                          >
                            {validandoEnlace ? 'Validando…' : 'Validar enlace'}
                          </button>
                        </form>

                        {errorValidacion && (
                          <p className="wa-resource-warning" role="alert">
                            {errorValidacion}
                          </p>
                        )}

                        {resultadoValidacion && (
                          <div className="wa-resources-validator-result" role="status">
                            <p>{resultadoValidacion.mensaje}</p>
                            {resultadoValidacion.recurso && (
                              <>
                                <strong>{resultadoValidacion.recurso.titulo}</strong>
                                <span>
                                  {resultadoValidacion.recurso.canal}
                                  {resultadoValidacion.recurso.duracionTexto
                                    ? ` · ${resultadoValidacion.recurso.duracionTexto}`
                                    : ''}
                                </span>
                                <div className="wa-resource-actions">
                                  <button
                                    type="button"
                                    className="wa-resource-btn wa-resource-btn--primary"
                                    onClick={() => {
                                      if (!resultadoValidacion.recurso) return;
                                      incorporarRecurso(
                                        resultadoValidacion.recurso,
                                        undefined,
                                        { reproducir: true }
                                      );
                                      setAnuncio(
                                        'Se incorporó el video validado y está listo para reproducirse.'
                                      );
                                    }}
                                  >
                                    Usar este video
                                  </button>
                                  <a
                                    href={resultadoValidacion.recurso.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="wa-resource-btn wa-resource-btn--ghost"
                                  >
                                    Abrir en YouTube
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <details className="wa-resource-external">
                      <summary>¿No está en la lista? Buscar en YouTube</summary>
                      <p>
                        La búsqueda externa se abre en otra pestaña. Los resultados no
                        se consideran validados hasta incorporarlos a la clase.
                      </p>
                      <a
                        href={busquedaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="wa-resource-btn wa-resource-btn--secondary"
                        data-testid="educational-external-search-link"
                      >
                        <WisdomIcon name="search" size={16} />
                        Buscar en YouTube (pestaña nueva)
                      </a>
                    </details>
                  </div>
                )}
              </div>

              {datos && (
                <p className="wa-resources-source-note">
                  {datos.origen === 'youtube_api'
                    ? 'Búsqueda oficial de YouTube con validación por metadatos públicos.'
                    : datos.origen === 'catalogo_curado'
                    ? 'Selección del catálogo curado institucional con revisión manual registrada.'
                    : 'La búsqueda automática no está configurada. Se ofrece una búsqueda contextualizada.'}
                  {!datos.advertencia && datos.cache === 'stale'
                    ? ' No se pudo actualizar la búsqueda; se muestran recursos verificados anteriormente.'
                    : ''}
                </p>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            ref={railButtonRef}
            className="wa-resources-rail"
            onClick={alternarDesdePanel}
            aria-expanded={false}
            aria-controls="wa-recursos-apoyo"
            title="Abrir recursos de apoyo"
            data-testid="educational-resources-toggle"
          >
            <WisdomIcon name="video" size={18} />
            <span>Recursos de apoyo</span>
            <WisdomIcon name="chevron-right" size={16} />
          </button>
        )}
      </aside>

      {!expandido && (
        <button
          type="button"
          ref={floatingTriggerRef}
          className="wa-resources-floating-trigger"
          onClick={alternarDesdePanel}
          aria-expanded={false}
          aria-controls="wa-recursos-apoyo"
          title="Abrir recursos de apoyo"
          data-testid="educational-resources-floating-trigger"
        >
          <WisdomIcon name="video" size={18} />
          <span>Recursos</span>
        </button>
      )}

      {expandido && (
        <button
          type="button"
          className="wa-resources-backdrop"
          onClick={alternarDesdePanel}
          tabIndex={-1}
          aria-label="Cerrar recursos de apoyo"
          aria-hidden="true"
        />
      )}

      <Modal
        abierto={modalReporte}
        onCerrar={cerrarReporte}
        titulo="Reportar video"
        subtitulo={recursoSeleccionado?.titulo}
        anchoMaximo="560px"
      >
        {resultadoReporte ? (
          <div
            className="wa-report-result"
            role="status"
            aria-live="polite"
            data-testid="educational-report-result"
          >
            <WisdomIcon name="shield" size={26} color="emerald" />
            <strong>
              {resultadoReporte.duplicado
                ? 'Reporte ya registrado'
                : 'Reporte registrado'}
            </strong>
            <p>{resultadoReporte.mensaje}</p>
            {resultadoReporte.recursoSustituto && (
              <div className="wa-report-replacement">
                <span>Nueva recomendación</span>
                <strong>{resultadoReporte.recursoSustituto.titulo}</strong>
                <span>{resultadoReporte.recursoSustituto.canal}</span>
              </div>
            )}
            <div className="wa-resource-actions">
              {!resultadoReporte.sustitucion?.encontrada && (
                <button
                  type="button"
                  className="wa-resource-btn wa-resource-btn--primary"
                  onClick={() => {
                    cerrarReporte();
                    abrirBusqueda();
                  }}
                >
                  <WisdomIcon name="search" size={16} />
                  Buscar otros videos
                </button>
              )}
              <button
                type="button"
                className="wa-resource-btn wa-resource-btn--secondary"
                onClick={cerrarReporte}
              >
                Volver a la clase
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviarReporte} className="wa-report-form">
            <fieldset>
              <legend>¿Qué problema encontraste?</legend>
              {OPCIONES_INCIDENCIA.map((opcion) => (
                <label key={opcion.id} className="wa-report-option">
                  <input
                    type="radio"
                    name="incidencia"
                    value={opcion.id}
                    checked={tipoIncidencia === opcion.id}
                    onChange={() => setTipoIncidencia(opcion.id)}
                  />
                  <span>{opcion.etiqueta}</span>
                </label>
              ))}
            </fieldset>

            <label className="wa-report-comment" htmlFor="wa-reporte-comentario">
              Comentario opcional
              <span>No incluyas datos personales.</span>
              <textarea
                id="wa-reporte-comentario"
                value={comentario}
                onChange={(evento) => setComentario(evento.target.value)}
                maxLength={240}
                rows={3}
                placeholder="Puedes describir el problema sin escribir tu nombre."
              />
            </label>

            {errorReporte && (
              <p className="wa-resource-warning" role="alert">
                {errorReporte}
              </p>
            )}

            <p className="wa-resources-note">
              El reporte se usa para revisar el recurso y buscar una alternativa. No
              solicitamos nombre, correo ni otros datos personales.
            </p>

            <div className="wa-resource-actions">
              <button
                type="button"
                className="wa-resource-btn wa-resource-btn--ghost"
                onClick={cerrarReporte}
                disabled={enviandoReporte}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="wa-resource-btn wa-resource-btn--primary"
                disabled={enviandoReporte}
              >
                {enviandoReporte ? 'Enviando…' : 'Enviar reporte'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        abierto={visorAbierto && Boolean(recursoSeleccionado)}
        onCerrar={cerrarVisor}
        titulo="Video de apoyo"
        subtitulo={
          recursoSeleccionado
            ? `${contexto.asignatura} · ${contexto.unidad}`
            : undefined
        }
        anchoMaximo="980px"
      >
        {recursoSeleccionado && (
          <EducationalVideoPlayer
            recurso={recursoSeleccionado}
            onCerrar={cerrarVisor}
            onBuscarOtros={abrirBusqueda}
            onVolverAlAula={volverAlAula}
            onVolverAnterior={
              historial.length > 0 ? volverAlVideoAnterior : undefined
            }
            historialCount={historial.length}
            inicioSegundos={inicioReproduccion}
            onProgreso={registrarProgreso}
            sugerencias={sugerenciasVisor}
            onSeleccionarSugerencia={abrirVisorRecurso}
            onValidarSugerencia={validarSugerencia}
            validandoSugerenciaId={validandoSugerenciaId}
            errorSugerencia={errorSugerencia}
          />
        )}
      </Modal>
    </>
  );
};
