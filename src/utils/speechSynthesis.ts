/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Locución Neural y Prosodia Pedagógica
 * ARCHIVO: src/utils/speechSynthesis.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Provee una experiencia de voz 100% natural, fluida, ágil y expresiva para los
 * profesores IA de Wisdom Academy (Prof. Mateo para Gael y Dra. Sofía para Avril)
 * utilizando únicamente las capacidades nativas y gratuitas de la Web Speech API
 * del navegador, sin dependencias de servidores externos ni costos adicionales.
 *
 * CARACTERÍSTICAS PRINCIPALES:
 * 1. Detección Inteligente de Voces Neuronales/Naturales:
 *    Prioriza voces de alta fidelidad como Microsoft Natural (Edge), Google Natural
 *    (Chrome) y Apple Enhanced (Safari), emparejando género y personalidad docente.
 * 2. Preprocesador de Prosodia y Fonética Pedagógica:
 *    Convierte fracciones (1/4 -> un cuarto), signos matemáticos (+24 -> más 24, ℤ -> números enteros)
 *    e inyecta micro-pausas respiratorias (...) para eliminar la monotonía robótica.
 * 3. Micro-Segmentación en Cláusulas (Max 12-14 palabras por chunk):
 *    Garantiza que ningún enunciado supere los 5-6 segundos, neutralizando de raíz
 *    el límite fatal de 15 segundos de Chromium y WebKit.
 * 4. Inmunidad a Garbage Collection de V8:
 *    Ancla fuertemente cada SpeechSynthesisUtterance a memoria global durante la
 *    reproducción, impidiendo que el motor de JS limpie el objeto y pierda el evento onend.
 * 5. Watchdog de Autorrecuperación Asíncrono:
 *    Monitorea de forma no destructiva el tiempo de habla de cada frase. Si el navegador
 *    o el driver de audio silencia el evento onend, el watchdog avanza fluidamente a la
 *    siguiente frase y paso pedagógico sin congelar la clase.
 * ==============================================================================
 */

export interface SpeechCallbacks {
  onStart?: () => void;
  onSentence?: (sentence: string, index: number, total: number) => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export type PerfilProfesorVoz = 'mateo' | 'sofia' | 'auto';

export interface OpcionesLocucion {
  idioma?: 'es' | 'en';
  velocidad?: number;
  perfil?: PerfilProfesorVoz;
  tono?: number;
}

export class TeacherSpeechManager {
  private colaFrases: string[] = [];
  private indiceFraseActual: number = 0;
  private isSpeaking: boolean = false;
  private estaPausado: boolean = false;
  private timerRecuperacion: any = null;
  private timerWatchdog: any = null;
  private utteranceActiva: SpeechSynthesisUtterance | null = null;
  private callbacksActuales?: SpeechCallbacks;
  private vocesCargadas: SpeechSynthesisVoice[] = [];
  private idiomaActual: 'es' | 'en' = 'es';
  private velocidadActual: number = 1;
  private perfilActual: PerfilProfesorVoz = 'auto';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.actualizarCatalogoVoces();
      window.speechSynthesis.onvoiceschanged = () => {
        this.actualizarCatalogoVoces();
      };
    }
  }

  /**
   * Actualiza y almacena en caché las voces disponibles en el navegador.
   */
  private actualizarCatalogoVoces() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      this.vocesCargadas = window.speechSynthesis.getVoices() || [];
    } catch {
      this.vocesCargadas = [];
    }
  }

  /**
   * Preprocesador fonético y de prosodia:
   * Convierte notaciones matemáticas, fracciones y símbolos a lenguaje hablado natural,
   * e inserta micro-pausas naturales para generar una cadencia humana y expresiva.
   */
  public prepararTextoParaLocucion(texto: string, idioma: 'es' | 'en' = 'es'): string {
    if (!texto) return '';

    let t = texto;

    // 1. Limpieza de markdown
    t = t.replace(/\*\*(.*?)\*\*/g, '$1');
    t = t.replace(/\*(.*?)\*/g, '$1');
    t = t.replace(/_(.*?)_/g, '$1');
    t = t.replace(/`([^`]+)`/g, '$1');
    t = t.replace(/~~(.*?)~~/g, '$1');
    t = t.replace(/#{1,6}\s+/g, '');
    t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    t = t.replace(/\[(.*?)\]/g, '$1');

    if (idioma === 'es') {
      // 2. Expansión fonética de fracciones comunes
      t = t.replace(/\b1\/2\b/g, 'un medio');
      t = t.replace(/\b1\/4\b/g, 'un cuarto');
      t = t.replace(/\b2\/4\b/g, 'dos cuartos');
      t = t.replace(/\b3\/4\b/g, 'tres cuartos');
      t = t.replace(/\b4\/4\b/g, 'cuatro cuartos');
      t = t.replace(/\b1\/3\b/g, 'un tercio');
      t = t.replace(/\b2\/3\b/g, 'dos tercios');
      t = t.replace(/\b1\/8\b/g, 'un octavo');
      t = t.replace(/\b3\/8\b/g, 'tres octavos');
      t = t.replace(/\b5\/8\b/g, 'cinco octavos');

      // 3. Notaciones matemáticas y científicas
      t = t.replace(/(?<!\p{L})ℤ(?!\p{L})/gu, 'los números enteros');
      t = t.replace(/(?:^|\s)\+\s*([0-9]+)/g, ' positivo $1');
      t = t.replace(/(?:^|\s)-\s*([0-9]+)/g, ' menos $1');
      t = t.replace(/\b([0-9]+)\s*×\s*([0-9]+)\b/g, '$1 por $2');
      t = t.replace(/\b([0-9]+)\s*÷\s*([0-9]+)\b/g, '$1 dividido para $2');
      t = t.replace(/\bO₂\b/g, 'oxígeno');
      t = t.replace(/\bCO₂\b/g, 'dióxido de carbono');
      t = t.replace(/\b([0-9]+)\s*°\s*C\b/gi, '$1 grados centígrados');

      // 4. Modulación pedagógica: insertar micro-pausas expresivas en conectores
      t = t.replace(/\b(En primer lugar|En segundo lugar|Por ejemplo|Fíjate bien|Recuerda que|Observa que|De este modo),/gi, '$1,...');
      t = t.replace(/\b(Paso 1|Paso 2|Paso 3|Paso 4):/gi, '$1:... ');

      // 5. Suavizado de siglas pedagógicas
      t = t.replace(/\bPBL\b/g, 'proyectos');
      t = t.replace(/\b4°\s*EGB\b/gi, 'cuarto de básica');
      t = t.replace(/\b8°\s*EGB\b/gi, 'octavo de básica');
    }

    // Normalizar espacios múltiples
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  /**
   * Divide el texto en oraciones y micro-cláusulas respetando pausas semánticas
   * y garantizando que ningún fragmento supere ~12-14 palabras. Esto elimina por
   * completo el corte a los 15 segundos de Chromium y WebKit.
   */
  public segmentarEnOraciones(texto: string): string[] {
    if (!texto) return [];

    // Paso 1: Dividir por puntuación fuerte (. ! ? y saltos de línea)
    const oracionesPrincipales = texto
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const subSegmentos: string[] = [];

    for (const oracion of oracionesPrincipales) {
      const palabras = oracion.split(/\s+/).filter(Boolean);
      // Si la oración tiene 14 palabras o menos, se mantiene íntegra
      if (palabras.length <= 14) {
        subSegmentos.push(oracion);
        continue;
      }

      // Si es más larga, subdividir por signos de puntuación intermedia (, ; : — – …)
      const clausulas = oracion
        .split(/(?<=[,;:—–…])\s+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      for (const clausula of clausulas) {
        const palabrasClausula = clausula.split(/\s+/).filter(Boolean);
        if (palabrasClausula.length <= 14) {
          subSegmentos.push(clausula);
        } else {
          // Si una cláusula aislada sigue teniendo más de 14 palabras, fragmentar por límites de 12 palabras
          for (let i = 0; i < palabrasClausula.length; i += 12) {
            const rebanada = palabrasClausula.slice(i, i + 12).join(' ');
            if (rebanada.length > 0) {
              subSegmentos.push(rebanada);
            }
          }
        }
      }
    }

    return subSegmentos.length > 0 ? subSegmentos : [texto];
  }

  /**
   * Selecciona la voz neuronal o natural óptima del catálogo del navegador
   * en función del perfil docente (Mateo vs Sofía) y del idioma.
   */
  public seleccionarMejorVoz(idioma: 'es' | 'en', perfil: PerfilProfesorVoz): SpeechSynthesisVoice | null {
    if (this.vocesCargadas.length === 0) {
      this.actualizarCatalogoVoces();
    }
    if (this.vocesCargadas.length === 0) return null;

    const prefijoIdioma = idioma === 'en' ? 'en' : 'es';
    const candidatas = this.vocesCargadas.filter((v) => v.lang.toLowerCase().startsWith(prefijoIdioma));
    if (candidatas.length === 0) return this.vocesCargadas[0] || null;

    // Función de puntuación heurística de calidad de voz
    const calcularPuntaje = (v: SpeechSynthesisVoice): number => {
      let score = 0;
      const nombre = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();

      // Bonificación por tecnologías neuronales / en línea de última generación
      if (nombre.includes('natural')) score += 120;
      if (nombre.includes('neural')) score += 120;
      if (nombre.includes('online')) score += 60;
      if (nombre.includes('google')) score += 50;
      if (nombre.includes('enhanced')) score += 50;
      if (nombre.includes('premium')) score += 50;

      // Preferencia dialectal para español latinoamericano
      if (lang.includes('mx') || lang.includes('ec') || lang.includes('us') || lang.includes('co')) {
        score += 30;
      }

      // Emparejamiento por perfil docente
      if (idioma === 'es') {
        if (perfil === 'mateo') {
          // Mateo: voz masculina cálida, dinámica y entusiasta
          if (
            nombre.includes('jorge') ||
            nombre.includes('alvaro') ||
            nombre.includes('gonzalo') ||
            nombre.includes('alonso') ||
            nombre.includes('david') ||
            nombre.includes('mateo') ||
            nombre.includes('male')
          ) {
            score += 80;
          }
        } else if (perfil === 'sofia') {
          // Sofía: voz femenina clara, elocuente y académica
          if (
            nombre.includes('dalia') ||
            nombre.includes('elvira') ||
            nombre.includes('paloma') ||
            nombre.includes('sabina') ||
            nombre.includes('helena') ||
            nombre.includes('paulina') ||
            nombre.includes('monica') ||
            nombre.includes('laura') ||
            nombre.includes('female')
          ) {
            score += 80;
          }
        }
      }

      return score;
    };

    // Ordenar de mayor a menor calidad
    const ordenadas = [...candidatas].sort((a, b) => calcularPuntaje(b) - calcularPuntaje(a));
    return ordenadas[0] || candidatas[0];
  }

  /**
   * Ejecuta la locución pedagógica paso a paso con cadencia ágil y expresiva.
   */
  public hablar(
    texto: string,
    idiomaOpciones: 'es' | 'en' | OpcionesLocucion = 'es',
    callbacks?: SpeechCallbacks,
    velocidadLegacy?: number,
    perfilLegacy?: PerfilProfesorVoz
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('La síntesis de voz no está soportada en este entorno.');
      callbacks?.onEnd?.();
      return false;
    }

    // Detener cualquier locución previa
    this.detener();

    // Normalizar opciones
    let idioma: 'es' | 'en' = 'es';
    let velocidad: number = 1;
    let perfil: PerfilProfesorVoz = 'auto';

    if (typeof idiomaOpciones === 'object') {
      idioma = idiomaOpciones.idioma || 'es';
      velocidad = idiomaOpciones.velocidad || 1;
      perfil = idiomaOpciones.perfil || 'auto';
    } else {
      idioma = idiomaOpciones;
      velocidad = velocidadLegacy || 1;
      perfil = perfilLegacy || 'auto';
    }

    this.idiomaActual = idioma;
    this.velocidadActual = velocidad;
    this.perfilActual = perfil;
    this.callbacksActuales = callbacks;

    // Preparar el texto enriquecido fonéticamente
    const textoProcesado = this.prepararTextoParaLocucion(texto, idioma);
    if (!textoProcesado) {
      callbacks?.onEnd?.();
      return false;
    }

    // Dividir en frases seguras para una reproducción fluida sin límites de tiempo
    this.colaFrases = this.segmentarEnOraciones(textoProcesado);
    this.indiceFraseActual = 0;
    this.isSpeaking = true;
    this.estaPausado = false;

    // Iniciar monitor de recuperación no destructivo
    this.iniciarVigilanciaRecuperacion();

    callbacks?.onStart?.();

    // Comenzar la reproducción de la primera frase
    this.reproducirSiguienteFrase();
    return true;
  }

  /**
   * Limpia el temporizador de seguridad de la frase activa.
   */
  private limpiarWatchdog() {
    if (this.timerWatchdog) {
      clearTimeout(this.timerWatchdog);
      this.timerWatchdog = null;
    }
  }

  /**
   * Reproduce la siguiente frase en la cola secuencial con anclaje a memoria
   * y temporizador de seguridad que evita que el motor se congele a mitad de texto.
   */
  private reproducirSiguienteFrase() {
    if (!this.isSpeaking || this.estaPausado) return;

    this.limpiarWatchdog();

    if (this.indiceFraseActual >= this.colaFrases.length) {
      // Fin exitoso de todas las frases de este paso pedagógico
      this.finalizarLocucion(true);
      return;
    }

    const frase = this.colaFrases[this.indiceFraseActual];
    this.callbacksActuales?.onSentence?.(frase, this.indiceFraseActual, this.colaFrases.length);

    try {
      const utterance = new SpeechSynthesisUtterance(frase);
      utterance.lang = this.idiomaActual === 'en' ? 'en-US' : 'es-ES';

      // Configuración de prosodia y tono según el profesor
      let tono = 1.0;
      let factorRitmo = 1.0;

      if (this.perfilActual === 'mateo') {
        // Prof. Mateo: Tono cálido, dinámico y pedagógico
        tono = 1.04;
        factorRitmo = 1.02;
      } else if (this.perfilActual === 'sofia') {
        // Dra. Sofía: Tono sereno, elocuente y articulado
        tono = 0.98;
        factorRitmo = 0.97;
      }

      utterance.pitch = Math.max(0.7, Math.min(1.5, tono));
      utterance.rate = Math.max(0.7, Math.min(1.8, factorRitmo * this.velocidadActual));

      // Asignar la mejor voz disponible
      const mejorVoz = this.seleccionarMejorVoz(this.idiomaActual, this.perfilActual);
      if (mejorVoz) {
        utterance.voice = mejorVoz;
      }

      // ANCLAJE CONTRA V8 GARBAGE COLLECTION:
      // Mantener la referencia viva tanto en el Manager como en window para evitar
      // que el GC destruya el objeto y deje de emitir onend.
      this.utteranceActiva = utterance;
      if (typeof window !== 'undefined') {
        (window as any).__wisdom_active_utterance = utterance;
      }

      utterance.onend = () => {
        this.limpiarWatchdog();
        this.utteranceActiva = null;
        if (typeof window !== 'undefined') {
          (window as any).__wisdom_active_utterance = null;
        }
        this.indiceFraseActual++;
        // Micro-pausa natural entre frases (50ms) para una cadencia ultra orgánica
        setTimeout(() => {
          if (this.isSpeaking && !this.estaPausado) {
            this.reproducirSiguienteFrase();
          }
        }, 50);
      };

      utterance.onerror = (e) => {
        this.limpiarWatchdog();
        this.utteranceActiva = null;
        if (typeof window !== 'undefined') {
          (window as any).__wisdom_active_utterance = null;
        }

        // Si fue un corte intencional ('interrupted' o 'canceled'), no tratamos como fallo crítico
        if ((e as any).error === 'interrupted' || (e as any).error === 'canceled') {
          return;
        }
        console.warn('Aviso en síntesis de voz:', (e as any).error);
        this.indiceFraseActual++;
        if (this.indiceFraseActual < this.colaFrases.length) {
          this.reproducirSiguienteFrase();
        } else {
          this.finalizarLocucion(false, e);
        }
      };

      // WATCHDOG DE SEGURIDAD ASÍNCRONO:
      // Si el navegador o el driver de audio silencia el evento onend,
      // el watchdog auto-avanza a la siguiente frase sin colapsar la lección.
      const palabrasCount = frase.split(/\s+/).filter(Boolean).length;
      const tiempoEstimadoMs = Math.max(
        3200,
        Math.ceil((palabrasCount * 480) / this.velocidadActual) + 3800
      );

      this.timerWatchdog = setTimeout(() => {
        if (!this.isSpeaking || this.estaPausado) return;
        this.limpiarWatchdog();
        this.utteranceActiva = null;
        if (typeof window !== 'undefined') {
          (window as any).__wisdom_active_utterance = null;
          try {
            if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {
            // No-op
          }
        }
        this.indiceFraseActual++;
        if (this.indiceFraseActual < this.colaFrases.length) {
          this.reproducirSiguienteFrase();
        } else {
          this.finalizarLocucion(true);
        }
      }, tiempoEstimadoMs);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Error al emitir frase de síntesis:', e);
      this.finalizarLocucion(false, e);
    }
  }

  /**
   * Monitorea pasivamente el estado de la síntesis y reanuda si el navegador
   * se ha quedado en pausa involuntaria (sin llamar a pause() destructivo).
   */
  private iniciarVigilanciaRecuperacion() {
    this.detenerVigilanciaRecuperacion();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.timerRecuperacion = setInterval(() => {
        if (this.isSpeaking && !this.estaPausado) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          } catch {
            // No-op
          }
        }
      }, 2500);
    }
  }

  private detenerVigilanciaRecuperacion() {
    if (this.timerRecuperacion) {
      clearInterval(this.timerRecuperacion);
      this.timerRecuperacion = null;
    }
  }

  /**
   * Finaliza la locución y dispara los callbacks correspondientes.
   */
  private finalizarLocucion(exito: boolean, error?: any) {
    this.limpiarWatchdog();
    this.detenerVigilanciaRecuperacion();
    this.utteranceActiva = null;
    if (typeof window !== 'undefined') {
      (window as any).__wisdom_active_utterance = null;
    }
    this.isSpeaking = false;
    this.estaPausado = false;
    this.colaFrases = [];
    this.indiceFraseActual = 0;

    if (exito) {
      this.callbacksActuales?.onEnd?.();
    } else {
      this.callbacksActuales?.onError?.(error);
    }
  }

  /**
   * Pausa temporalmente la locución actual.
   */
  public pausar() {
    this.limpiarWatchdog();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.estaPausado = true;
    }
  }

  /**
   * Reanuda la locución previamente pausada.
   */
  public reanudar() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.estaPausado = false;
      // Continuar con la frase activa o siguiente
      if (this.isSpeaking && this.colaFrases.length > 0) {
        this.reproducirSiguienteFrase();
      }
    }
  }

  /**
   * Detiene inmediatamente cualquier locución en curso y reinicia la cola.
   */
  public detener() {
    this.limpiarWatchdog();
    this.detenerVigilanciaRecuperacion();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // No-op
      }
      (window as any).__wisdom_active_utterance = null;
    }
    this.utteranceActiva = null;
    this.isSpeaking = false;
    this.estaPausado = false;
    this.colaFrases = [];
    this.indiceFraseActual = 0;
  }

  /**
   * Indica si el profesor está hablando activamente.
   */
  public estaHablando(): boolean {
    return this.isSpeaking;
  }
}

export const teacherSpeechManager = new TeacherSpeechManager();
