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
 * 3. Segmentación en Frases (Sentence Chunking) con Keep-Alive:
 *    Resuelve de forma definitiva el límite de 15 segundos de Chromium, reproduciendo
 *    lecciones completas con cadencia humana ininterrumpida.
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
  private timerKeepAlive: any = null;
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
      t = t.replace(/\bℤ\b/g, 'los números enteros');
      t = t.replace(/\b\+\s*([0-9]+)\b/g, 'positivo $1');
      t = t.replace(/\b-\s*([0-9]+)\b/g, 'menos $1');
      t = t.replace(/\b([0-9]+)\s*×\s*([0-9]+)\b/g, '$1 por $2');
      t = t.replace(/\b([0-9]+)\s*÷\s*([0-9]+)\b/g, '$1 dividido para $2');
      t = t.replace(/\bO₂\b/g, 'oxígeno');
      t = t.replace(/\bCO₂\b/g, 'dióxido de carbono');
      t = t.replace(/\b([0-9]+)\s*°C\b/g, '$1 grados centígrados');
      t = t.replace(/\b([0-9]+)\s*°\s*C\b/g, '$1 grados centígrados');

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
   * Divide el texto en oraciones naturales respetando signos de puntuación,
   * evitando que Chromium congele la voz en textos largos (> 15 segundos).
   */
  private segmentarEnOraciones(texto: string): string[] {
    // Expresión regular que divide por puntos, signos de exclamación o interrogación
    const segmentos = texto
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return segmentos.length > 0 ? segmentos : [texto];
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

    // Dividir en frases para una reproducción fluida sin límites de tiempo
    this.colaFrases = this.segmentarEnOraciones(textoProcesado);
    this.indiceFraseActual = 0;
    this.isSpeaking = true;
    this.estaPausado = false;

    // Iniciar keep-alive de Chrome para evitar que el navegador suspenda el audio
    this.iniciarKeepAlive();

    callbacks?.onStart?.();

    // Comenzar la reproducción de la primera frase
    this.reproducirSiguienteFrase();
    return true;
  }

  /**
   * Reproduce la siguiente frase en la cola secuencial.
   */
  private reproducirSiguienteFrase() {
    if (!this.isSpeaking || this.estaPausado) return;

    if (this.indiceFraseActual >= this.colaFrases.length) {
      // Fin exitoso de todas las frases
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
        // Prof. Mateo: Tono ligeramente más cálido y dinámico
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

      utterance.onend = () => {
        this.indiceFraseActual++;
        // Micro-pausa natural entre frases (60ms) para una cadencia ultra orgánica
        setTimeout(() => {
          if (this.isSpeaking && !this.estaPausado) {
            this.reproducirSiguienteFrase();
          }
        }, 60);
      };

      utterance.onerror = (e) => {
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

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error('Error al emitir frase de síntesis:', e);
      this.finalizarLocucion(false, e);
    }
  }

  /**
   * Mantiene viva la síntesis de voz en Chrome evitando el freeze de los 15s.
   */
  private iniciarKeepAlive() {
    this.detenerKeepAlive();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.timerKeepAlive = setInterval(() => {
        if (this.isSpeaking && !this.estaPausado && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);
    }
  }

  private detenerKeepAlive() {
    if (this.timerKeepAlive) {
      clearInterval(this.timerKeepAlive);
      this.timerKeepAlive = null;
    }
  }

  /**
   * Finaliza la locución y dispara los callbacks correspondientes.
   */
  private finalizarLocucion(exito: boolean, error?: any) {
    this.detenerKeepAlive();
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
    }
  }

  /**
   * Detiene inmediatamente cualquier locución en curso y reinicia la cola.
   */
  public detener() {
    this.detenerKeepAlive();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
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
