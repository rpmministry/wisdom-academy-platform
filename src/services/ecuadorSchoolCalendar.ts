/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Calendario Escolar Oficial Sierra-Amazonía
 * ARCHIVO: src/services/ecuadorSchoolCalendar.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Administra el calendario escolar oficial para el régimen Sierra - Amazonía
 * de Ecuador (Año Lectivo 2026 - 2027) según la normativa del Ministerio de
 * Educación (MINEDUC) y la Ley de Feriados Nacionales (reformas al Código
 * del Trabajo y LOSEP).
 *
 * CARACTERÍSTICAS:
 * 1. Inicio oficial de clases: Lunes 26 de Octubre de 2026.
 * 2. Estructura de 3 Trimestres pedagógicos (200 días laborables).
 * 3. Detección automática de feriados nacionales ecuatorianos inamovibles y puentes turísticos.
 * 4. Vacaciones escolares oficiales (Navidad/Fin de Año, Carnaval, Intertrimestrales).
 * 5. Secuencia progresiva día a día con foco especial en Matemáticas y explicaciones
 *    fundacionales iniciales para Gael (4° EGB) y Avril (8° EGB).
 * ==============================================================================
 */

export interface FeriadoEcuador {
  fecha: string; // YYYY-MM-DD
  nombre: string;
  tipo: 'FERIADO_NACIONAL' | 'FERIADO_LOCAL_SIERRA' | 'VACACION_ESCOLAR';
  descripcion: string;
  esInamovible?: boolean;
}

export interface DetalleDiaLectivo {
  fechaIso: string; // YYYY-MM-DD
  diaSemana: 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes';
  diaSemanaLargo: string; // e.g. "Lunes 26 de Octubre de 2026"
  numeroDiaLectivo: number;
  semanaNumero: number;
  trimestre: 1 | 2 | 3;
  esDiaHabil: boolean;
  feriado?: FeriadoEcuador;
  enfoquePedagogicoGael: {
    materiaDestacada: string;
    temaMatematicas: string;
    explicacionInicial: string;
    versiculoBiblico: { referencia: string; texto: string };
  };
  enfoquePedagogicoAvril: {
    materiaDestacada: string;
    temaMatematicas: string;
    explicacionInicial: string;
    versiculoBiblico: { referencia: string; texto: string };
  };
}

/**
 * Catálogo Oficial de Feriados y Vacaciones Escolares Ecuador 2026 - 2027
 * Régimen Sierra - Amazonía (Ley de Feriados Nacionales).
 */
export const FERIADOS_ECUADOR_2026_2027: FeriadoEcuador[] = [
  // Noviembre 2026: Día de los Difuntos e Independencia de Cuenca (Puente)
  {
    fecha: '2026-11-02',
    nombre: 'Día de los Difuntos',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Descanso nacional obligatorio conforme a la Ley de Feriados del Ecuador.',
    esInamovible: false,
  },
  {
    fecha: '2026-11-03',
    nombre: 'Independencia de Cuenca',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Conmemoración de la gesta libertaria de Cuenca (Puente turístico nacional).',
    esInamovible: false,
  },
  // Diciembre 2026: Fundación de Quito (Feriado local Sierra trasladado)
  {
    fecha: '2026-12-04',
    nombre: 'Fundación de Quito (Traslado oficial)',
    tipo: 'FERIADO_LOCAL_SIERRA',
    descripcion: 'Traslado del feriado del 6 de diciembre (domingo) al viernes previo según normativa.',
  },
  // Vacaciones estudiantiles de Navidad y Año Nuevo (24 Dic 2026 al 03 Ene 2027)
  {
    fecha: '2026-12-24',
    nombre: 'Vacaciones de Navidad (Inicio)',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Receso escolar decembrino autorizado por el Ministerio de Educación.',
  },
  {
    fecha: '2026-12-25',
    nombre: 'Navidad',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Celebración de la Natividad de Jesús (Feriado nacional inamovible).',
    esInamovible: true,
  },
  {
    fecha: '2026-12-28',
    nombre: 'Vacaciones de Fin de Año',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Receso escolar ministerial de fin de año.',
  },
  {
    fecha: '2026-12-29',
    nombre: 'Vacaciones de Fin de Año',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Receso escolar ministerial de fin de año.',
  },
  {
    fecha: '2026-12-30',
    nombre: 'Vacaciones de Fin de Año',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Receso escolar ministerial de fin de año.',
  },
  {
    fecha: '2026-12-31',
    nombre: 'Vacaciones de Fin de Año',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Receso escolar ministerial de fin de año.',
  },
  {
    fecha: '2027-01-01',
    nombre: 'Año Nuevo 2027',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Bienvenida al nuevo año civil (Feriado nacional inamovible).',
    esInamovible: true,
  },
  // Febrero 2027: Carnaval
  {
    fecha: '2027-02-08',
    nombre: 'Lunes de Carnaval',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Feriado nacional no recuperable de Carnaval.',
    esInamovible: true,
  },
  {
    fecha: '2027-02-09',
    nombre: 'Martes de Carnaval',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Segundo día de Carnaval conforme al calendario oficial.',
    esInamovible: true,
  },
  // Marzo 2027: Descanso Intertrimestral (Trimestre 2 a 3) y Viernes Santo
  {
    fecha: '2027-03-22',
    nombre: 'Receso Intertrimestral Estudiantil',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Semana de descanso académico entre el 2° y 3° trimestre.',
  },
  {
    fecha: '2027-03-23',
    nombre: 'Receso Intertrimestral Estudiantil',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Semana de descanso académico entre el 2° y 3° trimestre.',
  },
  {
    fecha: '2027-03-24',
    nombre: 'Receso Intertrimestral Estudiantil',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Semana de descanso académico entre el 2° y 3° trimestre.',
  },
  {
    fecha: '2027-03-25',
    nombre: 'Jueves Santo',
    tipo: 'VACACION_ESCOLAR',
    descripcion: 'Conmemoración de la Semana Santa.',
  },
  {
    fecha: '2027-03-26',
    nombre: 'Viernes Santo',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Feriado nacional de Viernes Santo (tradición religiosa cristiana, fecha inamovible).',
    esInamovible: true,
  },
  // Abril / Mayo 2027: Día del Trabajo (Traslado oficial al viernes 30 de abril)
  {
    fecha: '2027-04-30',
    nombre: 'Día Internacional del Trabajo (Traslado)',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Traslado por ley del 1 de Mayo para fomento del descanso laboral y familiar.',
  },
  // Mayo 2027: Batalla de Pichincha (Traslado al viernes 21 o lunes 24)
  {
    fecha: '2027-05-24',
    nombre: 'Batalla de Pichincha',
    tipo: 'FERIADO_NACIONAL',
    descripcion: 'Conmemoración cívica de la independencia nacional.',
  },
];

/**
 * Plan Curricular Progresivo: Secuencia de lecciones de inicio y consolidación
 * a partir del Lunes 26 de Octubre de 2026.
 */
export const SECUENCIA_LECTIVA_INICIAL: Array<{
  diaLectivo: number;
  offsetDiasHabiles: number;
  enfoqueGael: {
    materia: string;
    temaMatematicas: string;
    explicacionInicial: string;
    versiculo: { referencia: string; texto: string };
  };
  enfoqueAvril: {
    materia: string;
    temaMatematicas: string;
    explicacionInicial: string;
    versiculo: { referencia: string; texto: string };
  };
}> = [
  {
    diaLectivo: 1,
    offsetDiasHabiles: 0,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '1. Valor posicional hasta 9.999',
      explicacionInicial:
        '¡Bienvenido a tu primer día de clases, Gael! Hoy exploramos cómo funciona el sistema decimal: unidades, decenas, centenas y unidades de mil con material concreto y ejemplos cotidianos.',
      versiculo: {
        referencia: 'Principio de valor posicional',
        texto: 'Cada posición vale diez veces más que la posición situada a su derecha.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '1. Los números enteros y la recta numérica',
      explicacionInicial:
        'Avril, iniciamos el año construyendo los cimientos del álgebra formal: la recta numérica, los enteros positivos, negativos y el cero como punto de referencia.',
      versiculo: {
        referencia: 'Principio de recta numérica',
        texto: 'Todo número entero tiene una posición y una distancia definida respecto del cero.',
      },
    },
  },
  {
    diaLectivo: 2,
    offsetDiasHabiles: 1,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '2. Suma y resta con reagrupación',
      explicacionInicial:
        'Gael, hoy aprendemos a juntar y restar cantidades grandes sin miedo usando el método de reagrupación paso a paso y la comprobación con la operación inversa.',
      versiculo: {
        referencia: 'Principio de operaciones inversas',
        texto: 'La suma y la resta se comprueban mutuamente porque deshacen el mismo efecto.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '2. Valor absoluto y distancia en la recta',
      explicacionInicial:
        'Avril, examinamos el valor absoluto como magnitud de distancia y lo aplicamos a temperaturas, altitudes y desplazamientos.',
      versiculo: {
        referencia: 'Principio de valor absoluto',
        texto: 'El valor absoluto mide la distancia de un número al cero y nunca es negativo.',
      },
    },
  },
  {
    diaLectivo: 3,
    offsetDiasHabiles: 2,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '3. La multiplicación como suma repetida y patrones',
      explicacionInicial:
        'Descubrimos las tablas de multiplicar como grupos iguales y patrones geométricos en pétalos, panales y mosaicos.',
      versiculo: {
        referencia: 'Principio multiplicativo',
        texto: 'Multiplicar es reunir varias veces la misma cantidad en grupos iguales.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '3. Adición y sustracción de enteros: leyes de signos',
      explicacionInicial:
        'Avril, comprendemos la suma y resta de números con signo mediante el razonamiento de créditos, deudas y vectores de movimiento.',
      versiculo: {
        referencia: 'Principio de los enteros',
        texto: 'Sumar un número negativo equivale a restar su valor absoluto.',
      },
    },
  },
  {
    diaLectivo: 4,
    offsetDiasHabiles: 3,
    enfoqueGael: {
      materia: 'Matemáticas y Ciencias',
      temaMatematicas: '4. Cuerpos geométricos y figuras del entorno',
      explicacionInicial:
        'Identificamos esferas, cilindros, conos y prismas en objetos y formas de la naturaleza, y describimos sus caras, aristas y vértices.',
      versiculo: {
        referencia: 'Principio geométrico',
        texto: 'Las figuras y los cuerpos se describen mediante lados, vértices, caras y medidas.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '4. Multiplicación y división de enteros',
      explicacionInicial:
        'Avril, demostramos por qué el producto de dos negativos es positivo y aplicamos las leyes de signos con justificación algebraica.',
      versiculo: {
        referencia: 'Principio de signos',
        texto: 'El producto de dos números negativos es positivo; el de signos distintos es negativo.',
      },
    },
  },
  {
    diaLectivo: 5,
    offsetDiasHabiles: 4,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '5. Fracciones concretas: medios, cuartos y octavos',
      explicacionInicial:
        'Aprendemos a partir y compartir porciones exactamente iguales con material concreto, identificando numerador y denominador.',
      versiculo: {
        referencia: 'Principio de fracciones',
        texto: 'Una fracción representa una o varias partes iguales de un todo.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '5. Lenguaje algebraico y variables',
      explicacionInicial:
        'Avril, aprendemos a formalizar problemas verbales en expresiones algebraicas con variables, constantes y coeficientes.',
      versiculo: {
        referencia: 'Principio algebraico',
        texto: 'Una variable representa una cantidad desconocida o cambiante dentro de una relación.',
      },
    },
  },
  {
    diaLectivo: 6,
    offsetDiasHabiles: 5,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '6. Problemas cotidianos con números de cuatro cifras',
      explicacionInicial:
        'Gael, resolvemos problemas de compras familiares y conteo usando suma, resta y estimación para comprobar resultados.',
      versiculo: {
        referencia: 'Principio de resolución de problemas',
        texto: 'Comprender los datos y comprobar el resultado es tan importante como calcular.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '6. Potenciación de enteros y propiedades de exponentes',
      explicacionInicial:
        'Avril, profundizamos en la multiplicación iterada, las bases negativas, los exponentes pares e impares y las leyes de exponentes.',
      versiculo: {
        referencia: 'Principio de potenciación',
        texto: 'Una potencia expresa una multiplicación repetida de la misma base.',
      },
    },
  },
  {
    diaLectivo: 7,
    offsetDiasHabiles: 6,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '7. Multiplicación por 10, 100 y 1.000',
      explicacionInicial:
        'Gael, descubrimos el patrón posicional al multiplicar por potencias de diez y lo aplicamos a medidas y dinero.',
      versiculo: {
        referencia: 'Principio posicional',
        texto: 'Multiplicar por diez desplaza cada cifra una posición hacia la izquierda.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '7. Radicación de enteros y raíces exactas',
      explicacionInicial:
        'Avril, estudiamos la operación inversa de la potenciación, la raíz cuadrada y cúbica, y sus restricciones en los números reales.',
      versiculo: {
        referencia: 'Principio de radicación',
        texto: 'La radicación busca el número que, elevado a una potencia, produce el radicando.',
      },
    },
  },
  {
    diaLectivo: 8,
    offsetDiasHabiles: 7,
    enfoqueGael: {
      materia: 'Matemáticas',
      temaMatematicas: '8. Medidas de longitud: metro, decímetro y centímetro',
      explicacionInicial:
        'Medimos objetos de la casa y del jardín con regla y cinta métrica, aprendiendo precisión, unidades y conversión.',
      versiculo: {
        referencia: 'Principio de medición',
        texto: 'Medir exige elegir una unidad, usar un instrumento adecuado y expresar el resultado con precisión.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '8. Operaciones combinadas y jerarquía (PEMDAS)',
      explicacionInicial:
        'Avril, dominamos la jerarquía de operaciones: paréntesis, corchetes, llaves, potencias, productos y sumas.',
      versiculo: {
        referencia: 'Principio de jerarquía',
        texto: 'El orden de las operaciones evita ambigüedades y garantiza un resultado único.',
      },
    },
  },
  {
    diaLectivo: 9,
    offsetDiasHabiles: 8,
    enfoqueGael: {
      materia: 'Matemáticas y Arte',
      temaMatematicas: '9. Simetría y patrones en el diseño',
      explicacionInicial:
        'Gael, descubrimos ejes de simetría en hojas, mariposas y dibujos geométricos, y creamos patrones con ritmo visual.',
      versiculo: {
        referencia: 'Principio de simetría',
        texto: 'Una figura simétrica puede dividirse en partes que se corresponden mediante una transformación.',
      },
    },
    enfoqueAvril: {
      materia: 'Matemáticas y Pre-Álgebra',
      temaMatematicas: '9. Ecuaciones lineales: equilibrio y despeje',
      explicacionInicial:
        'Avril, resolvemos ecuaciones de primer grado preservando el equilibrio en ambos miembros y comprobando la solución.',
      versiculo: {
        referencia: 'Principio de igualdad',
        texto: 'Si se aplica la misma operación a ambos miembros, la igualdad se conserva.',
      },
    },
  },
  {
    diaLectivo: 10,
    offsetDiasHabiles: 9,
    enfoqueGael: {
      materia: 'Estudios Sociales y Matemáticas',
      temaMatematicas: '10. Estadística infantil: gráficos de barras y civismo',
      explicacionInicial:
        'Gael, conmemoramos el Día del Escudo Nacional y aprendemos a organizar datos patrios en tablas y gráficos de barras.',
      versiculo: {
        referencia: 'Principio de estadística',
        texto: 'Los datos se organizan en tablas y se visualizan en gráficos para comparar frecuencias.',
      },
    },
    enfoqueAvril: {
      materia: 'Historia, Civismo y Álgebra',
      temaMatematicas: '10. Modelado matemático de problemas reales y civismo',
      explicacionInicial:
        'Avril, aplicamos ecuaciones lineales para modelar problemas socioeconómicos reales del Ecuador en el Día del Escudo Nacional.',
      versiculo: {
        referencia: 'Principio de modelado',
        texto: 'Un modelo matemático representa una situación real mediante variables y relaciones verificables.',
      },
    },
  },
];

/**
 * Motor de Cálculo del Calendario Escolar Ecuador
 */
export class EcuadorSchoolCalendarEngine {
  public static readonly FECHA_INICIO_OFICIAL = '2026-10-26'; // Lunes 26 de Octubre 2026

  /**
   * Consulta si una fecha específica (YYYY-MM-DD) es feriado o asueto oficial en Ecuador.
   */
  public static obtenerFeriadoOAsueto(fechaIso: string): FeriadoEcuador | undefined {
    return FERIADOS_ECUADOR_2026_2027.find((f) => f.fecha === fechaIso);
  }

  /**
   * Verifica si una fecha dada es un día hábil lectivo (Lunes a Viernes y NO feriado/vacación).
   */
  public static esDiaLectivo(fechaIso: string): boolean {
    const fecha = new Date(`${fechaIso}T12:00:00Z`);
    const diaSemana = fecha.getUTCDay();
    // 0 = Domingo, 6 = Sábado
    if (diaSemana === 0 || diaSemana === 6) return false;

    // Verificar si es feriado
    const feriado = this.obtenerFeriadoOAsueto(fechaIso);
    return !feriado;
  }

  /**
   * Genera la lista de los primeros N días hábiles lectivos a partir del Lunes 26 de Octubre de 2026,
   * saltándose automáticamente fines de semana y feriados oficiales.
   */
  public static generarDiasLectivos(totalDias: number = 30): DetalleDiaLectivo[] {
    const dias: DetalleDiaLectivo[] = [];
    const fechaActual = new Date(`${this.FECHA_INICIO_OFICIAL}T12:00:00Z`);
    let numeroDiaLectivo = 1;
    let indexSecuencia = 0;

    const nombresDiasSemana: Array<'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes'> = [
      'Lunes',
      'Martes',
      'Miercoles',
      'Jueves',
      'Viernes',
    ];

    while (dias.length < totalDias) {
      const fechaIso = fechaActual.toISOString().split('T')[0];
      const diaSemanaIndex = fechaActual.getUTCDay();

      // Solo procesamos lunes a viernes
      if (diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
        const diaSemana = nombresDiasSemana[diaSemanaIndex - 1];
        const feriado = this.obtenerFeriadoOAsueto(fechaIso);

        const fechaFormateada = fechaActual.toLocaleDateString('es-EC', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        });
        const diaSemanaLargo = fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);

        const semanaNumero = Math.floor((numeroDiaLectivo - 1) / 5) + 1;
        const trimestre = numeroDiaLectivo <= 40 ? 1 : numeroDiaLectivo <= 120 ? 2 : 3;

        // Recuperar enfoque pedagógico secuencial
        const planBase =
          SECUENCIA_LECTIVA_INICIAL[indexSecuencia % SECUENCIA_LECTIVA_INICIAL.length];

        dias.push({
          fechaIso,
          diaSemana,
          diaSemanaLargo,
          numeroDiaLectivo: feriado ? 0 : numeroDiaLectivo,
          semanaNumero,
          trimestre,
          esDiaHabil: !feriado,
          feriado,
          enfoquePedagogicoGael: {
            materiaDestacada: planBase.enfoqueGael.materia,
            temaMatematicas: planBase.enfoqueGael.temaMatematicas,
            explicacionInicial: planBase.enfoqueGael.explicacionInicial,
            versiculoBiblico: planBase.enfoqueGael.versiculo,
          },
          enfoquePedagogicoAvril: {
            materiaDestacada: planBase.enfoqueAvril.materia,
            temaMatematicas: planBase.enfoqueAvril.temaMatematicas,
            explicacionInicial: planBase.enfoqueAvril.explicacionInicial,
            versiculoBiblico: planBase.enfoqueAvril.versiculo,
          },
        });

        if (!feriado) {
          numeroDiaLectivo++;
          indexSecuencia++;
        }
      }

      // Avanza un día
      fechaActual.setUTCDate(fechaActual.getUTCDate() + 1);
    }

    return dias;
  }

  /**
   * Devuelve únicamente los días escolares reales (sin feriados ni fines de
   * semana). Los feriados se conservan en `generarDiasLectivos` para las vistas
   * de calendario, pero los planes y guías se numeran sobre días efectivos.
   */
  public static obtenerDiasEscolares(totalDias: number = 200): DetalleDiaLectivo[] {
    const raw = this.generarDiasLectivos(
      totalDias + FERIADOS_ECUADOR_2026_2027.length + 20
    );
    return raw.filter((dia) => dia.esDiaHabil).slice(0, totalDias);
  }

  /**
   * Obtiene la configuración del día escolar específico por índice
   * (0 = lunes 26 de octubre de 2026).
   */
  public static obtenerDiaPorIndice(indice: number = 0): DetalleDiaLectivo {
    const dias = this.obtenerDiasEscolares(Math.max(indice + 5, 15));
    return dias[indice] || dias[0];
  }
}

