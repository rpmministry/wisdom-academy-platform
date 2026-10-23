/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Caché con Vencimiento
 * ARCHIVO: src/lib/educational-resources/cache.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Evita ejecutar búsquedas repetitivas por cada diapositiva. La clave incluye
 * el contexto académico y la versión de criterios; el valor guarda los
 * resultados ya validados y su fecha de expiración. Se conserva una entrada
 * expirada para poder responder con datos previos si YouTube no está disponible
 * (stale-if-error), indicándolo siempre en la respuesta.
 * ==============================================================================
 */

export interface EntradaCache<T> {
  valor: T;
  creadoEn: number;
  expiraEn: number;
}

export interface LecturaCache<T> {
  valor: T;
  expirado: boolean;
  creadoEn: number;
  expiraEn: number;
}

/**
 * Caché acotada con expiración explícita. No usa timers: la limpieza ocurre
 * al leer o escribir, lo cual es seguro en entornos serverless.
 */
export class CacheConVencimiento<T> {
  private readonly mapa = new Map<string, EntradaCache<T>>();
  private readonly maxEntradas: number;
  private readonly ahora: () => number;

  constructor(maxEntradas = 200, ahora: () => number = () => Date.now()) {
    this.maxEntradas = Math.max(1, maxEntradas);
    this.ahora = ahora;
  }

  /** Lee una entrada. Si `permitirExpirado`, devuelve también las vencidas. */
  public leer(
    clave: string,
    opciones?: { permitirExpirado?: boolean }
  ): LecturaCache<T> | null {
    const entrada = this.mapa.get(clave);
    if (!entrada) return null;
    const expirado = entrada.expiraEn <= this.ahora();
    if (expirado && !opciones?.permitirExpirado) {
      // Se conserva la entrada vencida para poder usarla como respaldo si
      // YouTube falla (stale-if-error). La evicción FIFO acota la memoria.
      return null;
    }
    return {
      valor: entrada.valor,
      expirado,
      creadoEn: entrada.creadoEn,
      expiraEn: entrada.expiraEn,
    };
  }

  /** Guarda un valor con su tiempo de vida y aplica evicción FIFO. */
  public guardar(clave: string, valor: T, ttlMs: number): EntradaCache<T> {
    const entrada: EntradaCache<T> = {
      valor,
      creadoEn: this.ahora(),
      expiraEn: this.ahora() + Math.max(1_000, ttlMs),
    };
    this.mapa.set(clave, entrada);

    while (this.mapa.size > this.maxEntradas) {
      const primera = this.mapa.keys().next();
      if (primera.done) break;
      this.mapa.delete(primera.value);
    }

    return entrada;
  }

  /** Invalida una entrada concreta. */
  public eliminar(clave: string): void {
    this.mapa.delete(clave);
  }

  /** Vacía la caché completa. */
  public limpiar(): void {
    this.mapa.clear();
  }

  /** Exporta las entradas para persistirlas opcionalmente en disco. */
  public exportar(): Record<string, EntradaCache<T>> {
    return Object.fromEntries(Array.from(this.mapa.entries()));
  }

  /**
   * Importa entradas persistidas, descartando formatos inválidos y valores ya
   * vencidos hace más de una hora para no revivir recomendaciones obsoletas.
   */
  public importar(entradas: Record<string, EntradaCache<T>> | null | undefined): void {
    if (!entradas || typeof entradas !== 'object') return;
    const limite = this.ahora() - 60 * 60 * 1000;
    for (const [clave, entrada] of Object.entries(entradas)) {
      if (!entrada || typeof entrada !== 'object') continue;
      if (typeof entrada.expiraEn !== 'number' || !entrada.valor) continue;
      if (entrada.expiraEn < limite) continue;
      this.mapa.set(clave, entrada);
    }
    while (this.mapa.size > this.maxEntradas) {
      const primera = this.mapa.keys().next();
      if (primera.done) break;
      this.mapa.delete(primera.value);
    }
  }

  /** Número de entradas actuales, útil para diagnóstico y pruebas. */
  public tamano(): number {
    return this.mapa.size;
  }
}
