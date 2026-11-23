/**
 * Contenido oficial del taller «Paz en la mesa, Orden en el bolsillo y fuego en el corazón».
 *
 * Fuentes autorizadas (16-11-2026):
 * - Manual Integral de Producción, Pedagogía, Guiones y Trazabilidad.
 * - Guiones actualizados de Samuel y Gabby Palacio.
 * - Cuaderno de Trabajo oficial de 24 páginas e instructivo del Reto de 7 días.
 *
 * Este archivo es la única fuente de verdad para la landing, el seed de la
 * plataforma y los materiales del programa. No inventa contenido: toda la
 * estructura proviene de los documentos entregados por MAIM Casa de Oración.
 */

export const PAZ_PROGRAM_SLUG = 'paz-en-la-mesa';

export const PAZ_BRAND = {
  title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
  shortTitle: 'Paz en la mesa',
  subtitle: '4 clases para sanar tu mesa, ordenar tu economía, oír a Dios y encender tu hogar.',
  hosts: 'Samuel y Gabby Palacio',
  institution: 'Wisdom Academy',
  foundation: 'Fundación Casa Main',
  agency: 'AlsizTech',
  eyebrow: 'NUEVO TALLER DE FIN DE AÑO · ESTRENO 8 DE DICIEMBRE',
  kicker: 'La Mesa Real · Cierre de año 2026',
  description:
    'Una experiencia de cuatro clases magistrales, un cuaderno de trabajo de 24 páginas, una sesión exclusiva en vivo y un reto de 7 días para cerrar el año con la mesa limpia, los bolsillos ordenados y el altar familiar encendido.',
  promise:
    'No es teoría lejana: son cuatro encuentros prácticos y bíblicos para llevar la paz de Dios a la mesa real de tu casa y entrar al 2027 con dirección.',
  coverImage: '/brand/paz-en-la-mesa/portada-paz-en-la-mesa.svg',
  pastorsImage: '/brand/paz-en-la-mesa/pastores-samuel-gabby.jpg',
  artImage: '/brand/paz-en-la-mesa/portada-paz-en-la-mesa.svg',
  ogImage: '/brand/paz-en-la-mesa/og-paz-en-la-mesa.svg',
  logoMark: '/brand/paz-en-la-mesa/isotipo-paz-en-la-mesa.svg',
  palette: {
    terracotta: '#B36A50',
    terracottaDeep: '#8F4E38',
    olive: '#5C5847',
    oliveSoft: '#7A7256',
    wheat: '#C5A059',
    cream: '#FAF8F5',
    paper: '#F2EDE4',
    charcoal: '#2B2927',
    stone: '#66615B',
    line: '#E4DACB',
  },
} as const;

export const PAZ_DATES = {
  timezone: 'America/Guayaquil',
  timezoneLabel: 'Hora de Ecuador (UTC-5)',
  presaleStart: '2026-12-03T20:00:00-05:00',
  presaleEnds: '2026-12-08T23:59:59-05:00',
  launch: '2026-12-08T12:00:00-05:00',
  premiereLive: '2026-12-08T20:00:00-05:00',
  officialStarts: '2026-12-09T00:00:00-05:00',
  enrollmentCloses: '2026-12-20T23:59:59-05:00',
  closingLive: '2026-12-20T20:00:00-05:00',
  studentLive: '2026-12-22T20:00:00-05:00',
  challengeStarts: '2026-12-23T00:00:00-05:00',
  challengeEnds: '2026-12-30T23:59:59-05:00',
  qa3Live: '2026-12-13T20:00:00-05:00',
  qa2Live: '2026-12-02T20:00:00-05:00',
  qa1Live: '2026-12-01T20:00:00-05:00',
  live1: '2026-11-24T20:00:00-05:00',
  live2: '2026-11-29T20:00:00-05:00',
} as const;

export const PAZ_PRICING = {
  currency: 'USD',
  presaleCents: 2700,
  officialCents: 3700,
  scholarshipCents: 2700,
  unit: 'por hogar',
  presaleLabel: 'Preventa Madrugador',
  officialLabel: 'Precio Oficial',
  scholarshipLabel: 'Beca un Hogar',
  presaleWindow: 'Del 3 al 8 de diciembre',
  officialWindow: 'Del 9 al 20 de diciembre',
  scholarshipDescription:
    'Aporta USD 27 para que un matrimonio vulnerable de la Fundación Casa Main reciba el taller completo.',
  includes: [
    '4 clases magistrales en video (35–40 min cada una)',
    'Cuaderno de Trabajo PDF interactivo e imprimible de 24 páginas',
    'Sesión exclusiva para alumnos el martes 22 de diciembre, 20:00',
    'Reto de 7 días de Altar Familiar con checklist en la plataforma',
    'Acceso 24/7 en Wisdom Academy y comunidad oficial de WhatsApp',
  ],
} as const;

export const PAZ_OFFICIAL_WHATSAPP_PHONE = '+593998755759';
export const PAZ_OFFICIAL_WHATSAPP_NUMBER_RAW = '593998755759';

export const PAZ_PUBLIC_LINKS = {
  whatsappPhone: PAZ_OFFICIAL_WHATSAPP_PHONE,
  whatsappFallback: `https://wa.me/${PAZ_OFFICIAL_WHATSAPP_NUMBER_RAW}?text=Hola%20Wisdom%20Academy%2C%20deseo%20m%C3%A1s%20informaci%C3%B3n%20sobre%20el%20taller%20Paz%20en%20la%20mesa.`,
  payphoneFallback: '',
} as const;

export type PazPhase = 'anticipation' | 'presale' | 'official' | 'closed';
export type PazPlan = 'presale' | 'official' | 'scholarship';

export const PAZ_LIVE_EVENTS = [
  {
    id: 'live-1',
    date: '2026-11-24T20:00:00-05:00',
    dateLabel: 'Martes 24 de noviembre · 20:00',
    title: 'Mesa Limpia',
    description:
      'Lo que no se dice en casa en diciembre: familia, adolescentes y familias ensambladas.',
    cta: 'Entra al grupo de WhatsApp y recibe el resumen',
    status: 'previo',
  },
  {
    id: 'live-2',
    date: '2026-11-29T20:00:00-05:00',
    dateLabel: 'Domingo 29 de noviembre · 20:00',
    title: 'Bolsillos con Propósito',
    description: 'Por qué el dinero divide hogares en diciembre y cómo ordenarlo en paz.',
    cta: 'Lista prioritaria para el taller',
    status: 'previo',
  },
  {
    id: 'live-3',
    date: '2026-12-01T20:00:00-05:00',
    dateLabel: 'Martes 1 de diciembre · 20:00',
    title: '¿Es Dios o es mi miedo?',
    description: 'Cómo escuchar Su voz y discernir tu mapa para el 2027.',
    cta: 'Reserva tu cupo',
    status: 'previo',
  },
  {
    id: 'live-4',
    date: '2026-12-02T20:00:00-05:00',
    dateLabel: 'Miércoles 2 de diciembre · 20:00',
    title: 'El mito del altar familiar perfecto',
    description: '15 minutos que cambian tu casa.',
    cta: 'Mañana revelamos el taller completo',
    status: 'previo',
  },
  {
    id: 'live-launch',
    date: '2026-12-03T20:00:00-05:00',
    dateLabel: 'Jueves 3 de diciembre · 20:00',
    title: 'Gran En Vivo de lanzamiento y apertura de preventa',
    description: 'Presentación oficial del taller y apertura de la preventa de USD 27.',
    cta: 'Inscríbete hoy por enlace o transferencia',
    status: 'lanzamiento',
  },
  {
    id: 'live-premiere',
    date: '2026-12-08T20:00:00-05:00',
    dateLabel: 'Martes 8 de diciembre · 20:00',
    title: 'Estreno oficial en Wisdom Academy',
    description: 'Clases liberadas y En Vivo de estreno. Cierre de preventa a las 23:59.',
    cta: 'Entra antes de que el precio suba a USD 37',
    status: 'estreno',
  },
  {
    id: 'live-qa',
    date: '2026-12-13T20:00:00-05:00',
    dateLabel: 'Domingo 13 de diciembre · 20:00',
    title: 'Preguntas y respuestas: casos reales',
    description: 'Familia, finanzas y discernimiento con Samuel y Gabby.',
    cta: 'Escríbenos al WhatsApp',
    status: 'oficial',
  },
  {
    id: 'live-close',
    date: '2026-12-20T20:00:00-05:00',
    dateLabel: 'Domingo 20 de diciembre · 20:00',
    title: 'Último llamado: cohorte de fin de año',
    description: 'Cierre de inscripciones a las 23:59.',
    cta: 'Inscríbete antes de las 23:59',
    status: 'oficial',
  },
  {
    id: 'live-students',
    date: '2026-12-22T20:00:00-05:00',
    dateLabel: 'Martes 22 de diciembre · 20:00',
    title: 'Sesión exclusiva para alumnos',
    description: 'Preguntas, oración y activación del Reto de 7 días de Altar Familiar.',
    cta: 'Día 1 del Reto: 23 de diciembre',
    status: 'alumnos',
  },
] as const;

export interface PazBlock {
  number: number;
  title: string;
  timeRange: string;
  start: string;
  end: string;
  summary: string;
  points: string[];
  scriptures: string[];
}

export interface PazClass {
  number: number;
  key: string;
  title: string;
  headline: string;
  summary: string;
  leader: string;
  leaderDetail: string;
  durationMinutes: number;
  durationLabel: string;
  pages: string;
  tool: string;
  toolPages: string;
  scriptures: string[];
  blocks: PazBlock[];
  outcomes: string[];
  accent: string;
  soft: string;
}

export const PAZ_CLASSES: PazClass[] = [
  {
    number: 1,
    key: 'mesa-limpia',
    title: 'Mesa Limpia',
    headline:
      'Sanando heridas, matrimonio y dinámica familiar antes de cerrar el año',
    summary:
      'Un alto en el camino para cerrar el año con honestidad: entregar el ayer, atravesar duelos sin respuestas, recuperar la escucha en casa y agendar una conversación familiar antes del 31 de diciembre.',
    leader: 'Gabby Palacio',
    leaderDetail: 'Lidera 28 min · Intervención de Samuel: 12 min',
    durationMinutes: 40,
    durationLabel: '40 min',
    pages: 'Págs. 03–07',
    tool: 'Protocolo de conversación de cierre de año',
    toolPages: 'Páginas 03 a 07 del Cuaderno de Trabajo',
    scriptures: [
      'Mateo 6:11',
      'Deuteronomio 29:29',
      'Santiago 1:2-4',
      'Proverbios 3:33',
      'Salmos 84:7',
      'Efesios 2:10',
      'Deuteronomio 6:5-7',
      '1 Juan 5:3',
      'Juan 14:15',
      'Mateo 6:21',
    ],
    blocks: [
      {
        number: 1,
        title: 'El Principio Eterno',
        timeRange: '00:00 – 10:00',
        start: '00:00',
        end: '10:00',
        summary:
          'Dios diseñó la vida para vivirse en compartimentos de 24 horas. Cerrar el ayer y recordar desde el otro lado de la cruz y de la tumba vacía cambia la narrativa de toda una casa.',
        points: [
          'Mateo 6:11: la gracia y la provisión están calibradas para hoy, no para el ayer ni para un mañana que aún no nace.',
          'Sepultar los ayeres muertos requiere decisión; abrirse al futuro exige fe.',
          'Casi el 80% de los pensamientos diarios pueden inclinarse a lo negativo: la voz del crítico interior se vuelve profecía autocumplida si no se entrega a Dios.',
          'Recordar la historia desde la cruz y la tumba vacía: lo que hiciste mal no define tu identidad; lo que Cristo hizo bien sí.',
          'Efesios 2:10: somos obra maestra de Dios, creados para las buenas obras que Él preparó de antemano.',
        ],
        scriptures: ['Mateo 6:11', 'Efesios 2:10', 'Deuteronomio 29:29', 'Santiago 1:2-4', 'Salmos 84:7', 'Proverbios 3:33'],
      },
      {
        number: 2,
        title: 'La Mesa Real',
        timeRange: '10:00 – 22:00',
        start: '10:00',
        end: '22:00',
        summary:
          'La mesa real de un hogar que ama a Dios también atraviesa pérdidas, cansancio y preguntas sin respuesta. La diferencia está en dónde se guardan esas preguntas y cómo se vuelve a casa.',
        points: [
          'Los duelos no se olvidan de la noche a la mañana, pero con Dios se atraviesan sin quedarse atrapado en ellos.',
          'Deuteronomio 29:29: lo revelado nos pertenece; lo secreto es de Dios. Las preguntas sin respuesta se guardan con reverencia, no con resentimiento.',
          'El cansancio laboral pasa factura al volver a casa: se necesita un ritual de transición y fortaleza espiritual con inteligencia emocional.',
          'Deuteronomio 6:5-7: los padres son la influencia más poderosa y son insustituibles; los hijos perciben lo importante por el tiempo que reciben.',
          'La adolescencia tiene un final: la escucha activa, sin sermones ni peleas, mantiene abierta la puerta de la conversación.',
        ],
        scriptures: ['Deuteronomio 29:29', 'Deuteronomio 6:5-7', 'Santiago 1:2-4', 'Salmos 84:7', 'Proverbios 3:33'],
      },
      {
        number: 3,
        title: 'La Herramienta en Mano',
        timeRange: '22:00 – 32:00',
        start: '22:00',
        end: '32:00',
        summary:
          'El Protocolo de conversación de cierre de año convierte la buena intención en una cita concreta: fecha, hora y lugar, con tres movimientos de gracia.',
        points: [
          'Agendar fecha, hora y lugar exactos antes del 31 de diciembre: el plan concreto multiplica el cumplimiento.',
          'Movimiento 1 · Entregar el ayer: identificar cargas, reclamos y duelos cerrados que no deben pasar al 2027.',
          'Movimiento 2 · Hablar con verdad y escucha sin acusaciones: escuchar antes de responder.',
          'Movimiento 3 · Escribir acuerdos: dejar por escrito los compromisos de cierre de año.',
          'El éxito relacional se mide en casa: cuando el cónyuge y los hijos, que te conocen mejor, te respetan y aman.',
        ],
        scriptures: ['Mateo 6:11', 'Efesios 2:10', 'Santiago 1:2-4', '1 Juan 5:3', 'Juan 14:15', 'Mateo 6:21'],
      },
      {
        number: 4,
        title: 'Aterrizaje Q&A y Oración',
        timeRange: '32:00 – 40:00',
        start: '32:00',
        end: '40:00',
        summary:
          'Respuestas a dos casos reales de la comunidad y una oración pastoral guiada para entregar la mesa de cada hogar.',
        points: [
          '¿Qué hacer cuando se llega agotado del trabajo y las discusiones dañan el ambiente? Un ritual de transición antes de entrar por la puerta.',
          '¿Cómo tener paz cuando aún no se entiende una pérdida o una crisis? La paz no exige comprenderlo todo hoy.',
          'Oración: entregar heridas, silencios, tensiones del matrimonio y distancia entre padres e hijos a la gracia de la cruz.',
          'Bendición: oídos dispuestos, valentía para pedir perdón y sabiduría para cerrar el 2026 sanos y unidos.',
        ],
        scriptures: ['Deuteronomio 29:29', 'Efesios 2:10', '1 Juan 5:3', 'Juan 14:15'],
      },
    ],
    outcomes: [
      'Cerrar conversaciones pendientes con un protocolo claro.',
      'Distinguir duelo de culpa y preguntas sin respuesta de falta de fe.',
      'Recuperar la escucha activa con hijos y adolescentes.',
      'Agendar una conversación familiar real antes del 31 de diciembre.',
    ],
    accent: '#B36A50',
    soft: '#F5E7E0',
  },
  {
    number: 2,
    key: 'bolsillos-con-proposito',
    title: 'Bolsillos con Propósito',
    headline: 'Finanzas dentro del plan eterno de Dios para el 2027',
    summary:
      'Una enseñanza que une lo espiritual y lo material: economía con consciencia, balanza de Espíritu y Verdad, alerta frente al espíritu de Mamón, altar de primicia y presupuesto familiar para el 2027.',
    leader: 'Samuel Palacio',
    leaderDetail: 'Lidera 25 min · Intervención de Gabby: 10 min',
    durationMinutes: 35,
    durationLabel: '35 min',
    pages: 'Págs. 08–12',
    tool: 'Matriz de asignación de fin de año y presupuesto 2027',
    toolPages: 'Páginas 08 a 12 del Cuaderno de Trabajo',
    scriptures: [
      'Mateo 6:21',
      'Hebreos 11:3',
      'Juan 4',
      'Marcos 4',
      'Efesios 6:12',
      'Filipenses 4:11-12',
      'Salmos 7:15',
      'Salmos 37:21',
      'Deuteronomio 8:18',
      'Hechos 5',
      'Job 28:16-17',
      'Eclesiastés 2:26',
      'Mateo 25:23',
      'Mateo 13:12',
    ],
    blocks: [
      {
        number: 1,
        title: 'El Principio Eterno',
        timeRange: '00:00 – 10:00',
        start: '00:00',
        end: '10:00',
        summary:
          'Ni la prosperidad sin orden ni la pobreza como señal de espiritualidad: la Biblia llama a una economía con consciencia, amar personas y usar cosas.',
        points: [
          'Dos extremos incompletos: riqueza sin esfuerzo ni orden, y escasez consagrada como mayor espiritualidad.',
          'Mateo 6:21: donde está tu tesoro está tu corazón. El dinero revela la condición del corazón.',
          'El Nuevo Testamento contiene 2.084 versículos sobre mayordomía y dinero; 16 de las 38 parábolas de Jesús tratan sobre finanzas.',
          'La sabiduría financiera opera primero en lo invisible (Hebreos 11:3): la prosperidad nace en una mentalidad renovada.',
          'Balanza de Espíritu y Verdad (Juan 4): principios naturales de administración en secuencia + batalla espiritual, guía del Espíritu y gracia.',
          'El séptimo ladrillo es la siembra y la cosecha (Marcos 4); no se puede cosechar sin edificar los seis cimientos anteriores.',
        ],
        scriptures: ['Mateo 6:21', 'Hebreos 11:3', 'Juan 4', 'Marcos 4', 'Efesios 6:12'],
      },
      {
        number: 2,
        title: 'La Mesa Real',
        timeRange: '10:00 – 22:00',
        start: '10:00',
        end: '22:00',
        summary:
          'La ansiedad financiera se combate con mayordomía y confianza; el espíritu de Mamón se identifica y se resiste con altar, primicia y orden.',
        points: [
          'Dos actitudes contra la ansiedad: reconocer que todo es regalo y mayordomía; confiar en que Dios cuida y puede guardar o reemplazar.',
          'Trampa 1 · Necesidad financiera continua por falta de administración: la fe no sustituye el registro ni el presupuesto.',
          'Trampa 2 · Descontento: el sistema del mundo crea necesidades artificiales; Filipenses 4:11-12 enseña contentamiento.',
          'Trampa 3 · Esclavitud a las deudas: Salmos 7:15 y 37:21 advierten sobre el consumo impulsivo y la gratificación inmediata.',
          'Trampa 4 · Convertir bienes generacionales en dinero líquido para el desorden: Deuteronomio 8:18, Hechos 5, la codicia de Mamón.',
          'Altar como Noé: antes de la casa, el altar; la primicia es dar a Dios lo primero y lo mejor.',
          'Libertad financiera = inteligencia financiera + inteligencia emocional. Ingresos activos y pasivos, trabajo creativo y no intercambiable.',
        ],
        scriptures: ['Filipenses 4:11-12', 'Salmos 7:15', 'Salmos 37:21', 'Deuteronomio 8:18', 'Hechos 5', 'Job 28:16-17', 'Eclesiastés 2:26'],
      },
      {
        number: 3,
        title: 'La Herramienta en Mano',
        timeRange: '22:00 – 30:00',
        start: '22:00',
        end: '30:00',
        summary:
          'La Matriz de asignación de fin de año ordena ingresos habituales y extraordinarios —como el décimo tercer sueldo— y prepara un presupuesto sostenible para el 2027.',
        points: [
          'Registrar ingresos habituales y extraordinarios de diciembre antes de gastar por impulso.',
          'Altar de primicias: separar lo primero con gratitud y honra a Dios.',
          'Cuadrantes: deudas con plan de salida, ahorro/inversión y gasto familiar con propósito.',
          'Blindaje contra Mamón: cortar gastos por impulso, descontento y deudas innecesarias.',
          'Mateo 25:23: la fidelidad en lo poco abre la puerta a lo mucho.',
          'Mateo 13:12: la mano abierta es la primera que se llena; administrar con pasión y responsabilidad total.',
        ],
        scriptures: ['Mateo 25:23', 'Mateo 13:12', 'Deuteronomio 8:18', 'Filipenses 4:11-12'],
      },
      {
        number: 4,
        title: 'Aterrizaje Q&A y Oración',
        timeRange: '30:00 – 35:00',
        start: '30:00',
        end: '35:00',
        summary:
          'Por qué sembrar sin orden administrativo produce estancamiento y una oración para renunciar a la ansiedad, al descontento y a la esclavitud de las deudas.',
        points: [
          'La siembra sin cimientos de presupuesto, registro, ahorro y control de deudas produce estancamiento.',
          'Obediencia espiritual + orden práctico = estabilidad y paz.',
          'Oración de renuncia a la ansiedad, al consumismo y a la esclavitud financiera.',
          'Acuerdo de pareja para entrar al 2027 con bolsillos con propósito.',
        ],
        scriptures: ['Marcos 4', 'Efesios 6:12', 'Mateo 25:23'],
      },
    ],
    outcomes: [
      'Identificar las cuatro trampas del espíritu de Mamón.',
      'Separar la primicia y ordenar los ingresos extraordinarios de diciembre.',
      'Construir un presupuesto familiar sostenible para el 2027.',
      'Renunciar a la ansiedad financiera y acordar en pareja.',
    ],
    accent: '#5C5847',
    soft: '#EDEAE0',
  },
  {
    number: 3,
    key: 'oidos-despiertos',
    title: 'Oídos Despiertos',
    headline:
      'Cómo escuchar la voz de Dios y discernir tu mapa para el 2027',
    summary:
      'Una clase para afinar los cinco sentidos espirituales, reconocer los ocho medios por los que Dios habla, quitar los cinco bloqueadores y construir el mapa profético familiar del 2027.',
    leader: 'Gabby Palacio',
    leaderDetail: 'Lidera 25 min · Intervención de Samuel: 15 min',
    durationMinutes: 40,
    durationLabel: '40 min',
    pages: 'Págs. 13–18',
    tool: 'Bitácora de discernimiento y mapa profético familiar',
    toolPages: 'Páginas 13 a 18 del Cuaderno de Trabajo',
    scriptures: [
      'Salmo 28:1',
      'Génesis 20:7',
      'Isaías 41:8',
      'Santiago 2:23',
      'Juan 15:14-15',
      'Hebreos 5:12-14',
      'Salmo 34:8',
      'Salmo 119:103',
      'Efesios 1:16-18',
      'Apocalipsis 2:7',
      '2 Corintios 2:14-16',
      'Hebreos 4:12',
      'Romanos 8:16',
      'Joel 2:28',
      'Lucas 10:42',
      'Mateo 13:19-23',
      'Isaías 59:2',
      'Apocalipsis 3:20',
      '1 Samuel 3:10',
      '2 Corintios 10:5',
      'Efesios 2:10',
    ],
    blocks: [
      {
        number: 1,
        title: 'El Principio Eterno',
        timeRange: '00:00 – 10:00',
        start: '00:00',
        end: '10:00',
        summary:
          'La amistad con Dios es el fundamento profético. La madurez espiritual ejercita los cinco sentidos para discernir el bien y el mal.',
        points: [
          'Cualquier hijo de Dios puede oír Su voz por medio del Espíritu Santo (Salmo 28:1).',
          'Abraham fue llamado profeta por ser amigo de Dios: oía, creía y obedecía (Génesis 20:7; Isaías 41:8; Santiago 2:23).',
          'Jesús llama amigos a los que le obedecen y les da a conocer lo que oyó del Padre (Juan 15:14-15).',
          'Hebreos 5:12-14: el alimento sólido pertenece a quienes tienen los sentidos ejercitados en el discernimiento.',
          'Gusto: saborear la Palabra. Tacto: sensibilidad a la santidad. Vista: ojos del entendimiento. Oído: escuchar la voz y las alertas. Olfato: discernir ambientes y personas en oración.',
        ],
        scriptures: ['Salmo 28:1', 'Génesis 20:7', 'Isaías 41:8', 'Santiago 2:23', 'Juan 15:14-15', 'Hebreos 5:12-14', 'Salmo 34:8', 'Salmo 119:103', '2 Corintios 2:14-16', 'Apocalipsis 2:7'],
      },
      {
        number: 2,
        title: 'La Mesa Real',
        timeRange: '10:00 – 22:00',
        start: '10:00',
        end: '22:00',
        summary:
          'Dios habla por ocho medios bíblicos; la confusión aparece cuando cinco bloqueadores endurecen la sensibilidad espiritual.',
        points: [
          'Ocho medios: la Biblia, el Espíritu Santo, Jesucristo, las personas, las circunstancias, la naturaleza, los sueños y las visiones.',
          'La Biblia se lee antes (revelación), durante (humildad y meditación) y después (conversación en casa).',
          'Sueños y visiones se interpretan con contexto, oración, discernimiento y la Palabra; nunca desde el temor.',
          'Bloqueador 1 · Distracciones: Marta y María; no es falta de tiempo sino de prioridad (Lucas 10:42).',
          'Bloqueador 2 · Voces competitivas: se filtran por Palabra, voluntad, carácter y propósito de Dios.',
          'Bloqueador 3 · Corazón no preparado y falta de perdón: la semilla se pierde en un corazón superficial o ahogado (Mateo 13:19-23).',
          'Bloqueador 4 · Ídolos de codicia u obstinación (Colosenses 3:5-6; 1 Samuel 15:23).',
          'Bloqueador 5 · Pecado sin arrepentimiento: separa y oscurece (Isaías 59:2; Apocalipsis 2:5); volverse al Señor quita el velo.',
        ],
        scriptures: ['Lucas 10:42', 'Mateo 13:19-23', 'Isaías 59:2', 'Apocalipsis 3:20', 'Hebreos 4:12', 'Romanos 8:16', 'Joel 2:28'],
      },
      {
        number: 3,
        title: 'La Herramienta en Mano',
        timeRange: '22:00 – 32:00',
        start: '22:00',
        end: '32:00',
        summary:
          'Siete actitudes de escucha, cinco pasos de lo profético y la construcción del Mapa Familiar 2027 en la bitácora.',
        points: [
          '7 actitudes: posicionarse para escuchar, priorizar la Palabra, vivir en expectativa, obedecer de inmediato, reconocer Su tono, pedir claridad y quitar bloqueos.',
          '5 pasos de lo profético: Indicio, Intercesión, Identificación, Involucramiento e Intencionalidad.',
          'Tomar cautiva la visión (2 Corintios 10:5) y escribirla; somos obra maestra de Dios (Efesios 2:10).',
          'Lenguaje de convicción y responsabilidad total: no llegar al 2027 repitiendo el miedo del ayer.',
          'Autoevaluación FODA familiar bajo la Palabra: fortalezas, oportunidades, debilidades y amenazas.',
          'Calendario: definir cuándo y dónde se dará el siguiente paso posible.',
          'Confesión, adoración y Diario Profético para registrar lo que Dios confirma.',
        ],
        scriptures: ['1 Samuel 3:10', '2 Corintios 10:5', 'Efesios 2:10', 'Efesios 1:16-18'],
      },
      {
        number: 4,
        title: 'Aterrizaje Q&A y Oración',
        timeRange: '32:00 – 40:00',
        start: '32:00',
        end: '40:00',
        summary:
          'Cómo distinguir la voz de Dios del miedo propio, qué hacer durante la espera y una oración de revelación.',
        points: [
          'Filtro cuádruple: ¿concuerda con la Biblia, la voluntad revelada, el carácter de Cristo y el propósito de Dios?',
          'Esperar el testimonio de paz del Espíritu Santo, sin prisa.',
          'La espera no cancela la obediencia inmediata en lo que ya sabes hacer hoy.',
          'Oración basada en Efesios 1:16-18 y 2 Corintios 3:16: espíritu de sabiduría, revelación y ojos iluminados.',
        ],
        scriptures: ['Efesios 1:16-18', '2 Corintios 3:16', 'Apocalipsis 3:20', 'Juan 10:27'],
      },
    ],
    outcomes: [
      'Ejercitar los cinco sentidos espirituales.',
      'Reconocer los ocho medios bíblicos de comunicación de Dios.',
      'Identificar y quitar los cinco bloqueadores.',
      'Construir el Mapa Familiar 2027 con FODA, calendario y diario profético.',
    ],
    accent: '#7A7256',
    soft: '#F0ECE1',
  },
  {
    number: 4,
    key: 'fuego-en-el-hogar',
    title: 'Fuego en el Hogar',
    headline: 'Cómo levantar un altar familiar vivo en 15 minutos diarios',
    summary:
      'El cierre del taller: desmontar el mito del altar perfecto, asumir el rol insustituible de los padres y activar un altar familiar sencillo, constante y lleno de presencia.',
    leader: 'Samuel Palacio',
    leaderDetail: 'Lidera 20 min · Intervención de Gabby: 15 min',
    durationMinutes: 35,
    durationLabel: '35 min',
    pages: 'Págs. 19–24',
    tool: 'Reto de 7 días de altar familiar',
    toolPages: 'Páginas 19 a 24 del Cuaderno de Trabajo',
    scriptures: [
      'Deuteronomio 6:1-8',
      '1 Juan 5:3',
      'Juan 14:15',
      'Mateo 6:21',
      'Salmo 19:7',
      'Éxodo 23:29-30',
      'Éxodo 20:8',
      'Mateo 6:11',
      'Mateo 25:23',
    ],
    blocks: [
      {
        number: 1,
        title: 'El Principio Eterno',
        timeRange: '00:00 – 10:00',
        start: '00:00',
        end: '10:00',
        summary:
          'El altar es protección espiritual de la casa. Amar a Dios en tres dimensiones y esconder Su Palabra primero en el corazón.',
        points: [
          'Noé levantó primero un altar antes de construir casa: una casa sin altar queda expuesta.',
          'Deuteronomio 6:5: amar a Dios con todo el corazón (decisión), toda el alma (vitalidad) y todas las fuerzas (recursos y trabajo).',
          '1 Juan 5:3 y Juan 14:15: amar es obedecer, no endurecer el corazón.',
          'Deuteronomio 6:6: la Palabra debe estar primero sobre tu corazón; nadie puede dar lo que no tiene.',
          'Salmo 19:7 y Mateo 6:21: la Palabra convierte el alma y el tesoro revela el corazón.',
        ],
        scriptures: ['Deuteronomio 6:1-8', '1 Juan 5:3', 'Juan 14:15', 'Mateo 6:21', 'Salmo 19:7'],
      },
      {
        number: 2,
        title: 'La Mesa Real',
        timeRange: '10:00 – 22:00',
        start: '10:00',
        end: '22:00',
        summary:
          'El altar familiar no necesita ser perfecto: necesita ser constante, cotidiano y sostenido por padres que no delegan su rol espiritual.',
        points: [
          'Desmontar el mito del altar perfecto: no se necesita una predicación larga ni una hora inmóvil.',
          'Deuteronomio 6:7: la repetición en la vida cotidiana —al sentarse, caminar, acostarse y levantarse— educa más que una charla aislada.',
          'Los padres son insustituibles: los hijos descubren lo importante por el tiempo y la prioridad que reciben.',
          'Deuteronomio 6:8: recordatorios visibles, mezuzá en los marcos y tefilín en el brazo izquierdo, para vencer la amnesia espiritual.',
          'La consistencia vence a la intensidad: 15 minutos diarios transforman más que dos horas un domingo.',
          'Éxodo 23:29-30: Dios avanza poco a poco; Éxodo 20:8: el Sabbat recuerda que Dios sostiene la casa sin nuestra ansiedad.',
        ],
        scriptures: ['Deuteronomio 6:7-8', 'Éxodo 23:29-30', 'Éxodo 20:8', 'Salmo 19:7'],
      },
      {
        number: 3,
        title: 'La Herramienta en Mano',
        timeRange: '22:00 – 30:00',
        start: '22:00',
        end: '30:00',
        summary:
          'Acuerdo de encuentro —hora, lugar y días— y estructura de 15 minutos: Palabra, gratitud/confesión y oración/bendición.',
        points: [
          'Definir hoy el cuándo y el dónde: la hora exacta y el lugar en la sala o alrededor de la mesa.',
          'Minutos 0–5: leer un pasaje breve y conversar dos o tres frases sobre cómo aplicarlo.',
          'Minutos 5–10: gratitud concreta y confesión; vencer la amnesia espiritual.',
          'Minutos 10–15: oración por el pan cotidiano y bendición sobre cónyuge e hijos.',
          'Versión de emergencia de 5 minutos: un versículo, un motivo de gratitud y la bendición. No romper la racha.',
          'Activar el Reto de 7 días con checklist diario en la plataforma.',
        ],
        scriptures: ['Deuteronomio 6:7', 'Mateo 6:11', 'Salmo 19:7', 'Mateo 25:23'],
      },
      {
        number: 4,
        title: 'Aterrizaje Q&A y Oración',
        timeRange: '30:00 – 35:00',
        start: '30:00',
        end: '35:00',
        summary:
          'Cómo retomar el hábito sin culpa después de fallar y una oración final de envío y bendición sacerdotal para el 2027.',
        points: [
          'Vivir en compartimentos de 24 horas: Dios no mide los días fallidos de ayer, honra la fidelidad de hoy.',
          'Empezar hoy por un solo día en el horario acordado, sin culpa paralizante.',
          'Oración final: altar espiritual sobre cada hogar, protección del matrimonio, las finanzas y el corazón de los hijos.',
          'Declaración: paz en tu mesa, orden en tu bolsillo y fuego en tu corazón durante el 2027.',
        ],
        scriptures: ['Mateo 6:11', 'Mateo 25:23', 'Deuteronomio 6:1-8'],
      },
    ],
    outcomes: [
      'Desmontar la exigencia del altar perfecto.',
      'Fijar hora, lugar y días del altar familiar.',
      'Practicar la estructura diaria de 15 minutos y la versión de emergencia.',
      'Activar y sostener el Reto de 7 días.',
    ],
    accent: '#8F4E38',
    soft: '#F6E9E1',
  },
];

export const PAZ_GLOBAL_RESOURCES = [
  {
    id: 'bienvenida',
    type: 'video',
    title: 'Video de bienvenida y tráiler comercial',
    description:
      'Una pieza de 3 minutos grabada en La Mesa Real para recibir a los hogares y presentar el recorrido de las cuatro clases.',
    meta: '3 min · Video de apertura',
    badge: 'Incluido',
  },
  {
    id: 'cuaderno',
    type: 'pdf',
    title: 'Cuaderno de Trabajo PDF de 24 páginas',
    description:
      'Interactivo e imprimible. Contiene las cuatro herramientas prácticas, espacios de reflexión, oración y el instructivo completo del Reto de 7 días.',
    meta: '24 páginas · 4 herramientas',
    badge: 'Descargable',
  },
  {
    id: 'sesion-vivo',
    type: 'live',
    title: 'Sesión exclusiva en vivo para alumnos',
    description:
      'Martes 22 de diciembre de 2026, 20:00 h Ecuador. Preguntas, oración y activación del Reto de 7 días.',
    meta: '22 de diciembre · 20:00',
    badge: 'Bono',
  },
  {
    id: 'reto-7',
    type: 'challenge',
    title: 'Reto de 7 días de Altar Familiar',
    description:
      'Del 23 al 30 de diciembre. Checklist diario en la plataforma, versión de 5 minutos y revisión de descanso Sabbat.',
    meta: '7 días · 15 min diarios',
    badge: 'Interactivo',
  },
] as const;

export const PAZ_CHALLENGE_DAYS = [
  {
    day: 1,
    title: 'El Fundamento de la Casa',
    passage: 'Mateo 6:11 / Deuteronomio 6:5-7',
    focus: 'Declarar que Dios es el centro y dueño del hogar. Entregar el día en sus manos.',
    practice: 'Definan juntos la hora y el lugar del altar para los próximos siete días.',
    prayer: 'Señor, hoy te entregamos nuestra casa y este día. Sé Tú el centro de nuestra mesa.',
  },
  {
    day: 2,
    title: 'Sanando la Mesa',
    passage: 'Efesios 4:31-32',
    focus: 'Pedir perdón por enojos o palabras ásperas y practicar la gracia en familia.',
    practice: 'Cada integrante pide perdón por una palabra dicha este año y recibe perdón.',
    prayer: 'Padre, limpia nuestra mesa de toda aspereza y enséñanos a hablar con gracia.',
  },
  {
    day: 3,
    title: 'Mayordomía y Paz Financiera',
    passage: 'Filipenses 4:11-13',
    focus: 'Agradecer lo que hay en casa, renunciar al afán y consagrar el presupuesto del 2027.',
    practice: 'Agradezcan tres provisiones concretas y oren por el presupuesto familiar.',
    prayer: 'Dios, gracias por lo que tenemos. Renunciamos al afán y confiamos en Tu provisión.',
  },
  {
    day: 4,
    title: 'Oídos Abiertos a Su Voz',
    passage: '1 Samuel 3:10 / Juan 10:27',
    focus: 'Silenciar distracciones y pedir al Espíritu Santo dirección clara para las decisiones familiares.',
    practice: 'Cinco minutos de silencio y cada uno comparte una impresión o versículo.',
    prayer: 'Habla, Señor, que tu siervo escucha. Danos dirección clara para nuestra familia.',
  },
  {
    day: 5,
    title: 'Gratitud contra la Amnesia Espiritual',
    passage: 'Salmo 103:1-5',
    focus: 'Hacer una ronda donde cada miembro mencione tres favores específicos de Dios en este año.',
    practice: 'Escriban los tres favores de cada uno en el cuaderno o en una hoja del altar.',
    prayer: 'Bendice, alma mía, a Jehová, y no olvides ninguno de sus beneficios.',
  },
  {
    day: 6,
    title: 'Fortaleza para los Hijos y la Juventud',
    passage: 'Proverbios 22:6 / Efesios 2:10',
    focus: 'Orar específicamente por el futuro, los estudios y el propósito de los hijos y adolescentes.',
    practice: 'Oren uno por uno por los hijos, nietos o jóvenes del hogar.',
    prayer: 'Señor, guía el futuro de nuestros hijos y recuérdales que son Tu obra maestra.',
  },
  {
    day: 7,
    title: 'Consagración del Año 2027',
    passage: 'Josué 24:15 / Salmos 84:7',
    focus: 'Declarar: «Mi casa y yo serviremos a Jehová», sellando el pacto de caminar de poder en poder.',
    practice: 'Escriban el pacto familiar y colóquenlo en un lugar visible.',
    prayer: 'Mi casa y yo serviremos a Jehová. Llévanos de poder en poder en el 2027.',
  },
] as const;

export const PAZ_SABBATH_REVIEW = {
  title: 'Revisión de descanso Sabbat',
  passage: 'Éxodo 20:8-11 / Salmo 127:2',
  focus:
    'Cerrar el reto descansando: repasar la semana, celebrar lo que Dios hizo y soltar la ansiedad de sostener la casa por fuerzas propias.',
  practice:
    'El día 30 de diciembre, revisen el checklist, den gracias por cada día completado y elijan un horario sostenible para el 2027.',
  prayer:
    'Señor, descansamos en Ti. Tú sostienes nuestra casa; nosotros respondemos con fidelidad y gratitud.',
} as const;

export const PAZ_FAQ = [
  {
    question: '¿Cuándo puedo entrar a las clases?',
    answer:
      'Las cuatro clases y el Cuaderno de Trabajo se desbloquean el martes 8 de diciembre de 2026. Quien compra en preventa recibe confirmación inmediata, el video de bienvenida y acceso a la comunidad; las clases se liberan el día del estreno.',
  },
  {
    question: '¿El precio es por persona o por hogar?',
    answer:
      'El precio es por hogar: USD 27 en preventa (3 al 8 de diciembre) y USD 37 en precio oficial (9 al 20 de diciembre). Un solo acceso reúne a la familia alrededor de la misma mesa.',
  },
  {
    question: '¿Cómo puedo pagar?',
    answer:
      'Puedes pagar por transferencia o depósito a la cuenta de Fundación Casa Main (0% comisión) o con tarjeta mediante el enlace de PayPhone. Ambos flujos se validan antes de activar el acceso.',
  },
  {
    question: '¿Qué es «Beca un Hogar»?',
    answer:
      'Es el botón solidario para aportar USD 27 y regalar el taller a un matrimonio vulnerable de la Fundación Casa Main. Tu aporte se registra por separado de tu propia inscripción.',
  },
  {
    question: '¿Qué incluye el Reto de 7 días?',
    answer:
      'Un checklist diario en la plataforma con pasaje, enfoque y oración para el 23 al 30 de diciembre, una versión de emergencia de 5 minutos y la revisión del descanso Sabbat. Se activa en la sesión exclusiva del martes 22 de diciembre.',
  },
  {
    question: '¿Puedo volver a ver las clases?',
    answer:
      'Sí. Las clases quedan disponibles en Wisdom Academy para verlas a tu ritmo, junto con el Cuaderno PDF y el checklist del Reto.',
  },
] as const;

export const PAZ_MOVEMENTS = [
  {
    number: '01',
    title: 'Paz en la mesa',
    text: 'Sanar heridas, matrimonio y dinámica familiar antes de cerrar el año.',
    accent: '#B36A50',
  },
  {
    number: '02',
    title: 'Orden en el bolsillo',
    text: 'Poner las finanzas dentro del plan eterno de Dios para el 2027.',
    accent: '#5C5847',
  },
  {
    number: '03',
    title: 'Oídos despiertos',
    text: 'Escuchar la voz de Dios y discernir el mapa profético de tu familia.',
    accent: '#C5A059',
  },
  {
    number: '04',
    title: 'Fuego en el corazón',
    text: 'Levantar un altar familiar vivo en 15 minutos diarios.',
    accent: '#8F4E38',
  },
] as const;

export const PAZ_OBJECTIVES = [
  'Cerrar el año con una mesa reconciliada y conversaciones pendientes agendadas.',
  'Ordenar la economía familiar en Espíritu y Verdad, con primicia y presupuesto 2027.',
  'Ejercitar los sentidos espirituales y discernir la voz de Dios con filtro bíblico.',
  'Instaurar un altar familiar diario de 15 minutos y sostenerlo con el Reto de 7 días.',
];

export const PAZ_REQUIREMENTS = [
  'Un corazón dispuesto a conversar con honestidad en familia.',
  'Acceso a internet para ver las clases y descargar el Cuaderno PDF.',
  '15 minutos diarios durante el Reto de 7 días de Altar Familiar.',
];

export const PAZ_PROGRAM_METADATA = {
  structureTemplate: 'paz-en-la-mesa',
  sequential: false,
  passPercentage: 0,
  workshopMode: 'coming_soon',
  presaleStartsAt: PAZ_DATES.presaleStart,
  releaseAt: PAZ_DATES.launch,
  enrollmentClosesAt: PAZ_DATES.enrollmentCloses,
  studentLiveAt: PAZ_DATES.studentLive,
  challengeStartsAt: PAZ_DATES.challengeStarts,
  challengeEndsAt: PAZ_DATES.challengeEnds,
  presalePriceCents: PAZ_PRICING.presaleCents,
  officialPriceCents: PAZ_PRICING.officialCents,
  scholarshipPriceCents: PAZ_PRICING.scholarshipCents,
  priceUnit: 'household',
  currency: PAZ_PRICING.currency,
  coverImage: PAZ_BRAND.coverImage,
  logoUrl: PAZ_BRAND.logoMark,
  institution: PAZ_BRAND.institution,
  hosts: PAZ_BRAND.hosts,
  credential: 'Constancia digital del taller y Cuaderno de Trabajo',
  disclaimer:
    'Taller de formación familiar y mayordomía. No otorga título académico ni aval ministerial. Wisdom Academy emite constancia digital de participación.',
} as const;

export const PAZ_PRODUCT_METADATA = {
  pazEnLaMesa: true,
  salesMode: 'external',
  modality: 'Online · 4 clases grabadas + sesión en vivo',
  hours: 3,
  accessDays: 365,
  presalePriceCents: PAZ_PRICING.presaleCents,
  officialPriceCents: PAZ_PRICING.officialCents,
  scholarshipPriceCents: PAZ_PRICING.scholarshipCents,
  priceUnit: 'household',
  presaleStartsAt: PAZ_DATES.presaleStart,
  presaleEndsAt: PAZ_DATES.presaleEnds,
  officialStartsAt: PAZ_DATES.officialStarts,
  enrollmentClosesAt: PAZ_DATES.enrollmentCloses,
  paymentMethods: ['bank_transfer', 'payphone'],
  landingPath: '/paz-en-la-mesa',
} as const;

export function pazClassByNumber(value: number): PazClass | null {
  return PAZ_CLASSES.find((item) => item.number === value) || null;
}

export function pazChallengeDay(value: number) {
  return PAZ_CHALLENGE_DAYS.find((item) => item.day === value) || null;
}
