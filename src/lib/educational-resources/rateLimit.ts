/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Limitador de Peticiones
 * ARCHIVO: src/lib/educational-resources/rateLimit.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Protege las rutas de recomendaciones, reportes y validación frente a abuso o
 * bucles accidentales. El limitador es en memoria y por proceso: en un
 * despliegue con varias instancias se recomienda complementarlo con un límite
 * en el proxy o en la plataforma de hosting.
 * ==============================================================================
 */

export interface ResultadoLimite {
  permitido: boolean;
  restantes: number;
  reintentarEnSegundos: number;
}

/** Limitador de ventana deslizante simple y determinista. */
export class LimitadorPeticiones {
  private readonly eventos = new Map<string, number[]>();
  private readonly ahora: () => number;
  private readonly maxClaves: number;

  constructor(ahora: () => number = () => Date.now(), maxClaves = 5_000) {
    this.ahora = ahora;
    this.maxClaves = maxClaves;
  }

  /**
   * Consume un intento para una clave. Devuelve además cuántos segundos faltan
   * para el siguiente intento permitido.
   */
  public consumir(clave: string, maximo: number, ventanaMs: number): ResultadoLimite {
    const instante = this.ahora();
    const desde = instante - ventanaMs;
    const previos = (this.eventos.get(clave) || []).filter((marca) => marca > desde);

    if (previos.length >= maximo) {
      const masAntiguo = previos[0] || instante;
      const reintentarEnSegundos = Math.max(
        1,
        Math.ceil((masAntiguo + ventanaMs - instante) / 1000)
      );
      this.eventos.set(clave, previos);
      return { permitido: false, restantes: 0, reintentarEnSegundos };
    }

    previos.push(instante);
    this.eventos.set(clave, previos);
    this.limpiarSiEsNecesario();
    return {
      permitido: true,
      restantes: Math.max(0, maximo - previos.length),
      reintentarEnSegundos: 0,
    };
  }

  /** Consulta el estado sin consumir un intento. */
  public estado(clave: string, maximo: number, ventanaMs: number): ResultadoLimite {
    const instante = this.ahora();
    const desde = instante - ventanaMs;
    const previos = (this.eventos.get(clave) || []).filter((marca) => marca > desde);
    if (previos.length >= maximo) {
      const masAntiguo = previos[0] || instante;
      return {
        permitido: false,
        restantes: 0,
        reintentarEnSegundos: Math.max(
          1,
          Math.ceil((masAntiguo + ventanaMs - instante) / 1000)
        ),
      };
    }
    return {
      permitido: true,
      restantes: Math.max(0, maximo - previos.length),
      reintentarEnSegundos: 0,
    };
  }

  /** Evita crecimiento ilimitado cuando muchas IP anónimas consultan. */
  private limpiarSiEsNecesario(): void {
    if (this.eventos.size <= this.maxClaves) return;
    const instante = this.ahora();
    for (const [clave, marcas] of this.eventos.entries()) {
      const vigentes = marcas.filter((marca) => marca > instante - 24 * 60 * 60 * 1000);
      if (vigentes.length === 0) this.eventos.delete(clave);
      else this.eventos.set(clave, vigentes);
    }
  }
}
