/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Malla Curricular de Avril (8.° EGB)
 * ARCHIVO: src/data/curriculum/avril-8vo.ts
 *
 * PROPÓSITO:
 * Define las once asignaturas reales de la carpeta "08_Octavo_EGB_Avril":
 * matemáticas, lengua, ciencias, estudios sociales, inglés académico,
 * programación, ciencias políticas, administración y marketing, arte,
 * educación física y teología. Las diez primeras son rigurosamente académicas;
 * la última concentra la formación bíblica y teológica.
 * ==============================================================================
 */

import type { AsignaturaCurricular, PerfilCurricular } from './tipos';

const MATEMATICAS: AsignaturaCurricular = {
  codigo: '01_Matematicas',
  nombre: 'Matemáticas y Pre-Álgebra',
  nombreCorto: 'Matemáticas 8.°',
  area: 'MATEMATICAS',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '01_Matematicas',
  driveFolderId: '17oH54g6fR6we0_0fc7x1t0EBTnMywBCw',
  textoPrincipal: 'MATEMATICA 8.pdf • Macro y Micro Currículo Matemáticas 8vo',
  bibliografia: [
    { titulo: 'Matemática 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'OpenStax Prealgebra 2e', tipo: 'UNIVERSITARIO' },
    { titulo: 'Art of Problem Solving: Prealgebra', tipo: 'UNIVERSITARIO' },
    { titulo: 'Khan Academy: Pre-algebra and Algebra basics', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'El pre-álgebra conecta la aritmética con el pensamiento algebraico formal. Se estudian los números enteros, sus operaciones y propiedades, las fracciones y decimales, las potencias y raíces, el lenguaje algebraico y las ecuaciones lineales. Cada regla se justifica mediante propiedades de los números y se aplica en situaciones modelables. La precisión simbólica y la verificación son criterios centrales del trabajo matemático.',
  analisisModelo:
    'La recta numérica representa el orden y la distancia entre números. El valor absoluto mide distancia al cero. Las leyes de signos se derivan de la estructura de los enteros y de la multiplicación repetida. Una ecuación es una igualdad que se conserva al aplicar la misma operación en ambos miembros. Las variables representan cantidades desconocidas o cambiantes y permiten generalizar patrones.',
  aplicacionVida:
    'El álgebra modela presupuestos, temperaturas, distancias, promedios y crecimiento. La proporcionalidad permite interpretar escalas, porcentajes y recetas. La estadística describe datos y ayuda a tomar decisiones informadas. El razonamiento simbólico es una herramienta transversal para la ciencia, la tecnología y la economía.',
  sintesis:
    'Un procedimiento algebraico es válido cuando cada transformación se justifica. Resolver un problema exige definir variables, plantear una ecuación, resolverla y comprobar la solución en el contexto. La estimación y el análisis de sensibilidad permiten evaluar si el resultado es razonable.',
  preguntaDisparadora: '¿Por qué los números negativos son necesarios para describir el mundo real?',
  objetivos: [
    'Operar con números enteros y justificar las leyes de signos.',
    'Traducir situaciones al lenguaje algebraico y resolver ecuaciones lineales.',
    'Interpretar datos y relaciones en el plano cartesiano.',
  ],
  metodo: [
    'Definir variables y restricciones del problema.',
    'Traducir el enunciado a una expresión o ecuación.',
    'Aplicar propiedades justificando cada transformación.',
    'Comprobar la solución y analizar su coherencia contextual.',
  ],
  conceptosFundamentales: [
    { termino: 'Número entero', definicion: 'Número que pertenece al conjunto Z e incluye positivos, negativos y cero.' },
    { termino: 'Ecuación lineal', definicion: 'Igualdad algebraica de primer grado que puede escribirse como ax + b = c.' },
    { termino: 'Proporcionalidad', definicion: 'Relación en la que dos magnitudes varían en la misma razón.' },
  ],
  lema: {
    referencia: 'Galileo Galilei (atribuida)',
    texto: 'La matemática es el alfabeto con el que se ha escrito el universo.',
  },
  tipoGrafico: 'RECTA_NUMERICA',
  insigniaGrafico: 'Recta numérica, valor absoluto y balanza algebraica',
  simulacion: {
    tipo: 'MATH_EXPLORER',
    titulo: 'Laboratorio de enteros y ecuaciones',
    instrucciones:
      'Ubica -3 y 5 en la recta numérica, calcula su distancia y resuelve la ecuación 2x - 4 = 10 paso a paso.',
    codigoOTextoInicial: 'recta: -5 ... 0 ... 5\necuación: 2x - 4 = 10\nverificación: 2(7) - 4 = 10',
    demostracionInteractiva:
      'La distancia entre -3 y 5 es 8 unidades. La solución de 2x - 4 = 10 es x = 7; al sustituir se obtiene 10 = 10.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Cuál es el resultado de (-4) × (-3)?',
      opciones: ['12', '-12', '-7'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El producto de dos números negativos es positivo.',
    },
    {
      enunciado: '¿Qué propiedad se aplica al sumar 5 a ambos miembros de una ecuación?',
      opciones: ['Propiedad uniforme de la igualdad', 'Propiedad conmutativa', 'Propiedad distributiva'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Si se suma la misma cantidad a ambos miembros, la igualdad se conserva.',
    },
    {
      enunciado: '¿Qué representa la pendiente en una relación lineal?',
      opciones: ['La razón de cambio entre las variables', 'El valor inicial', 'La suma de los datos'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La pendiente mide cuánto cambia y por cada unidad de cambio en x.',
    },
  ],
  retoPbl: {
    titulo: 'Modelo matemático de un emprendimiento escolar',
    descripcion:
      'Define costos fijos y variables, construye una función de ingreso y calcula el punto de equilibrio. Presenta una tabla, una gráfica y una conclusión.',
    criteriosMineduc: [
      'Definición correcta de variables.',
      'Modelado algebraico coherente.',
      'Cálculos verificados.',
      'Interpretación económica fundamentada.',
    ],
    entregableEsperado: 'Informe de dos páginas con modelo, tabla, gráfica y conclusiones.',
  },
  unidades: [
    { titulo: 'Números enteros y recta numérica', conceptoClave: 'Los enteros representan cantidades con dirección y se ordenan en la recta numérica.', aplicacion: 'Representa temperaturas y altitudes con números enteros.' },
    { titulo: 'Valor absoluto y distancia', conceptoClave: 'El valor absoluto mide la distancia de un número al cero.', aplicacion: 'Calcula distancias entre puntos de la recta.' },
    { titulo: 'Adición y sustracción de enteros', conceptoClave: 'Sumar un negativo equivale a restar su valor absoluto.', aplicacion: 'Resuelve problemas de ganancias y pérdidas.' },
    { titulo: 'Multiplicación y división de enteros', conceptoClave: 'Las leyes de signos se deducen de la estructura multiplicativa.', aplicacion: 'Justifica el signo del producto en cinco casos.' },
    { titulo: 'Potencias y leyes de exponentes', conceptoClave: 'Una potencia es una multiplicación repetida y sigue reglas algebraicas.', aplicacion: 'Simplifica expresiones con exponentes.' },
    { titulo: 'Raíces y propiedades', conceptoClave: 'La radicación es la operación inversa de la potenciación en el dominio permitido.', aplicacion: 'Calcula raíces exactas y aproximadas.' },
    { titulo: 'Jerarquía de operaciones', conceptoClave: 'El orden de las operaciones evita ambigüedades y errores.', aplicacion: 'Resuelve expresiones combinadas con paréntesis.' },
    { titulo: 'Lenguaje algebraico', conceptoClave: 'Las variables expresan generalizaciones y relaciones entre cantidades.', aplicacion: 'Traduce cinco enunciados a expresiones algebraicas.' },
    { titulo: 'Ecuaciones lineales de primer grado', conceptoClave: 'Resolver una ecuación es encontrar el valor que hace verdadera la igualdad.', aplicacion: 'Resuelve ecuaciones con una incógnita y comprueba.' },
    { titulo: 'Proporcionalidad y porcentajes', conceptoClave: 'Las razones y proporciones comparan magnitudes y permiten calcular porcentajes.', aplicacion: 'Calcula descuentos, aumentos e intereses simples.' },
    { titulo: 'Plano cartesiano y relaciones lineales', conceptoClave: 'Las coordenadas ubican puntos y las relaciones lineales modelan cambios constantes.', aplicacion: 'Grafica una relación lineal y describe su pendiente.' },
    { titulo: 'Estadística descriptiva', conceptoClave: 'Las medidas de tendencia central resumen un conjunto de datos.', aplicacion: 'Calcula media, mediana y moda de datos escolares.' },
  ],
};

const LENGUA: AsignaturaCurricular = {
  codigo: '02_Lengua_y_Literatura',
  nombre: 'Lengua y Literatura',
  nombreCorto: 'Lengua 8.°',
  area: 'LENGUA_Y_LITERATURA',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '02_Lengua_y_Literatura',
  driveFolderId: '1LY00FVFUmn1nhkPA9ACapMEkvfpA8IVO',
  textoPrincipal: 'LENGUA Y LITERATURA 8.pdf • Macro y Micro Currículo Lengua y Literatura 8vo',
  bibliografia: [
    { titulo: 'Lengua y Literatura 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'La cocina de la escritura (Cassany)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Cómo se escribe (Serafini)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Biblioteca Digital Mundial / Biblioteca Cervantes', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La lengua y la literatura estudian la comunicación humana, sus estructuras y sus manifestaciones estéticas. En octavo de básica se profundiza en el texto argumentativo, la cohesión, la coherencia, la lectura crítica y el análisis literario. La escritura se aborda como proceso: planificación, redacción, revisión y edición. La literatura se interpreta a partir de género, contexto, voz narrativa, figuras y temas.',
  analisisModelo:
    'Un argumento sólido tiene tesis, razones y evidencia. Las falacias son errores de razonamiento que parecen válidos. La cohesión se logra con conectores, pronombres y progresión temática; la coherencia depende de la unidad de sentido. En literatura, el narrador, el punto de vista, el tiempo y el espacio construyen significado. La intertextualidad conecta obras con tradiciones y contextos.',
  aplicacionVida:
    'Escribir y argumentar permite participar en debates, defender ideas con evidencia y comprender textos complejos. La lectura literaria desarrolla empatía e imaginación. La comunicación clara es una competencia esencial para el estudio, el trabajo y la ciudadanía.',
  sintesis:
    'Leer críticamente exige distinguir tesis, argumentos y evidencia. Escribir bien requiere revisar el contenido antes que la forma. La literatura no se reduce a resumen: se interpreta con evidencia textual y contexto.',
  preguntaDisparadora: '¿Qué diferencia una opinión de un argumento con evidencia?',
  objetivos: [
    'Construir argumentos con tesis, razones y evidencia textual.',
    'Analizar obras literarias con categorías narrativas y poéticas.',
    'Aplicar normas de citación y revisión académica.',
  ],
  metodo: [
    'Leer el texto y anotar la tesis o el tema central.',
    'Identificar argumentos, evidencia y posibles falacias.',
    'Planificar la respuesta con introducción, desarrollo y cierre.',
    'Revisar coherencia, cohesión, ortografía y citas.',
  ],
  conceptosFundamentales: [
    { termino: 'Tesis', definicion: 'Afirmación central que un texto argumentativo defiende con razones.' },
    { termino: 'Falacia', definicion: 'Razonamiento inválido que aparenta ser correcto.' },
    { termino: 'Intertextualidad', definicion: 'Relación entre una obra y otros textos o tradiciones culturales.' },
  ],
  lema: {
    referencia: 'Wittgenstein, Tractatus',
    texto: 'Los límites de mi lenguaje significan los límites de mi mundo.',
  },
  tipoGrafico: 'ARBOL_GRAMATICAL',
  insigniaGrafico: 'Mapa argumental: tesis, razones y evidencia',
  simulacion: {
    tipo: 'LANGUAGE_STUDIO',
    titulo: 'Taller de argumentación y análisis literario',
    instrucciones:
      'Lee un fragmento breve, identifica la tesis del autor y evalúa si la evidencia presentada es suficiente. Luego redacta un contraargumento.',
    codigoOTextoInicial:
      'texto: fragmento de ensayo\npaso 1: subrayar tesis\npaso 2: identificar razones y evidencia\npaso 3: formular contraargumento',
    demostracionInteractiva:
      'Tesis: la lectura diaria mejora la comprensión. Razón: exposición a vocabulario y estructuras. Evidencia: estudios longitudinales. Contraargumento: se requiere práctica guiada, no solo cantidad.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué es una falacia?',
      opciones: ['Un razonamiento inválido que parece correcto', 'Una cita bibliográfica', 'Una figura literaria'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Las falacias afectan la validez del argumento aunque parezcan persuasivas.',
    },
    {
      enunciado: '¿Qué elemento sostiene la unidad de un texto?',
      opciones: ['La coherencia', 'La cantidad de adjetivos', 'El tipo de letra'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La coherencia organiza las ideas en torno a un sentido global.',
    },
    {
      enunciado: '¿Qué analiza la voz narrativa?',
      opciones: ['Quién cuenta la historia y desde qué perspectiva', 'La ortografía del título', 'El número de páginas'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El narrador y su punto de vista condicionan la interpretación.',
    },
  ],
  retoPbl: {
    titulo: 'Revista literaria y argumentativa',
    descripcion:
      'Crea una revista digital o impresa con un ensayo argumentativo, una reseña literaria y una entrevista. Aplica proceso de escritura, citas y edición.',
    criteriosMineduc: [
      'Tesis clara y argumentos con evidencia.',
      'Coherencia y cohesión textual.',
      'Análisis literario con evidencia.',
      'Uso correcto de citas y referencias.',
    ],
    entregableEsperado: 'Revista de cuatro páginas con tres textos editados.',
  },
  unidades: [
    { titulo: 'El texto argumentativo y la tesis', conceptoClave: 'La tesis es la afirmación central que organiza todo el argumento.', aplicacion: 'Formula una tesis sobre un tema escolar y tres razones.' },
    { titulo: 'Párrafo, conectores y progresión temática', conceptoClave: 'La cohesión se construye con conectores y progresión de ideas.', aplicacion: 'Reescribe un párrafo mejorando conectores y orden.' },
    { titulo: 'Falacias y pensamiento crítico', conceptoClave: 'Identificar falacias permite evaluar la calidad de un argumento.', aplicacion: 'Clasifica cinco falacias en anuncios y discursos.' },
    { titulo: 'Géneros literarios y contexto', conceptoClave: 'Los géneros orientan la interpretación y responden a contextos históricos.', aplicacion: 'Compara un cuento y un poema de un mismo tema.' },
    { titulo: 'Análisis poético: voz, ritmo y figura', conceptoClave: 'El poema construye sentido con forma, sonido e imagen.', aplicacion: 'Analiza una metáfora y explica su efecto.' },
    { titulo: 'Narrativa latinoamericana', conceptoClave: 'La narrativa latinoamericana dialoga con la historia y la identidad de la región.', aplicacion: 'Investiga un autor y presenta su obra en contexto.' },
    { titulo: 'Ensayo académico: estructura y evidencia', conceptoClave: 'El ensayo académico defiende una tesis con argumentos y fuentes.', aplicacion: 'Escribe un ensayo breve con introducción, desarrollo y conclusión.' },
    { titulo: 'Citas, paráfrasis y honestidad intelectual', conceptoClave: 'Citar correctamente reconoce la autoría y evita el plagio.', aplicacion: 'Convierte una cita directa en paráfrasis con referencia.' },
    { titulo: 'Debate y oratoria', conceptoClave: 'El debate exige argumentos, escucha activa y respeto.', aplicacion: 'Participa en un debate con roles y rúbrica.' },
    { titulo: 'Medios, sesgo y desinformación', conceptoClave: 'La lectura crítica de medios evalúa fuentes, intereses y evidencia.', aplicacion: 'Compara dos noticias sobre el mismo hecho.' },
    { titulo: 'Literatura ecuatoriana', conceptoClave: 'La literatura ecuatoriana expresa tensiones sociales, territoriales e identitarias.', aplicacion: 'Analiza un fragmento y su contexto de producción.' },
    { titulo: 'Portafolio de escritura y metacognición', conceptoClave: 'La revisión metacognitiva mejora la calidad de la escritura.', aplicacion: 'Selecciona tres textos y escribe una reflexión de mejora.' },
  ],
};

const CIENCIAS: AsignaturaCurricular = {
  codigo: '03_Ciencias_Naturales',
  nombre: 'Ciencias Naturales Integradas',
  nombreCorto: 'Ciencias 8.°',
  area: 'CIENCIAS_NATURALES',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '03_Ciencias_Naturales',
  driveFolderId: '1v4evxy3nrUPp2RInT9Uau6shTaGq02mQ',
  textoPrincipal: 'CIENCIAS NATURALES 8.pdf • Macro y Micro Currículo Ciencias Naturales 8',
  bibliografia: [
    { titulo: 'Ciencias Naturales 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'OpenStax Biology 2e', tipo: 'UNIVERSITARIO' },
    { titulo: 'CK-12 Physical Science and Life Science', tipo: 'RECURSO_DIGITAL' },
    { titulo: 'PhET Interactive Simulations (University of Colorado)', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'Las ciencias naturales integradas articulan biología, química y física para explicar la materia, la vida, la energía y las interacciones. En octavo de básica se estudian la célula, la genética, la evolución, los ecosistemas, los sistemas del cuerpo humano, el movimiento, la energía, la estructura atómica y las reacciones químicas. El conocimiento se construye con evidencia experimental, modelos y comunicación científica.',
  analisisModelo:
    'La célula es la unidad de la vida y contiene información genética. El ADN se transmite y expresa mediante procesos moleculares. La evolución explica la diversidad biológica por selección natural y otros mecanismos. Los ecosistemas intercambian materia y energía. Las leyes de Newton describen el movimiento; la termodinámica explica la energía. Los átomos se combinan mediante enlaces y reacciones que conservan la masa.',
  aplicacionVida:
    'La ciencia permite comprender la salud, prevenir enfermedades, evaluar riesgos ambientales y tomar decisiones tecnológicas. La alfabetización científica ayuda a distinguir evidencia de pseudociencia. El cuidado de los ecosistemas y el uso responsable de la energía son aplicaciones directas del conocimiento.',
  sintesis:
    'El método científico combina observación, hipótesis, experimentación, análisis y comunicación. Los modelos son representaciones provisionales que se ajustan con nueva evidencia. La ciencia es una empresa colectiva, crítica y autocorrectiva.',
  preguntaDisparadora: '¿Cómo se transmite la información que define a un ser vivo?',
  objetivos: [
    'Explicar la relación entre ADN, proteínas y características hereditarias.',
    'Analizar interacciones entre sistemas vivos y factores ambientales.',
    'Aplicar modelos físicos y químicos a fenómenos cotidianos.',
  ],
  metodo: [
    'Observar el fenómeno y delimitarlo con precisión.',
    'Formular una hipótesis basada en conocimiento previo.',
    'Diseñar un experimento o modelo con variables controladas.',
    'Analizar datos, concluir y comunicar con lenguaje científico.',
  ],
  conceptosFundamentales: [
    { termino: 'ADN', definicion: 'Molécula que almacena la información genética de los seres vivos.' },
    { termino: 'Selección natural', definicion: 'Mecanismo evolutivo por el cual los rasgos ventajosos se vuelven más frecuentes.' },
    { termino: 'Reacción química', definicion: 'Transformación en la que se rompen y forman enlaces conservando la masa.' },
  ],
  lema: {
    referencia: 'Richard Feynman',
    texto: 'El primer principio es que no debes engañarte a ti mismo, y tú eres la persona más fácil de engañar.',
  },
  tipoGrafico: 'CELULA_VIVA',
  insigniaGrafico: 'Célula, ADN y niveles de organización biológica',
  simulacion: {
    tipo: 'SCIENCE_LAB',
    titulo: 'Laboratorio integrado: genética, energía y reacciones',
    instrucciones:
      'Modela una cruza genética simple, calcula la energía cinética de un objeto y balancea una ecuación química. Registra cada resultado y su justificación.',
    codigoOTextoInicial:
      'cruza: Aa × Aa → 1 AA : 2 Aa : 1 aa\nenergía: Ec = ½mv²\necuación: CH4 + 2O2 → CO2 + 2H2O',
    demostracionInteractiva:
      'La cruza produce 75% de fenotipo dominante. La energía cinética aumenta con el cuadrado de la velocidad. La ecuación balanceada conserva cuatro átomos de hidrógeno y cuatro de oxígeno.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué molécula almacena la información genética?',
      opciones: ['El ADN', 'La glucosa', 'El agua'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El ADN contiene la secuencia que codifica las proteínas.',
    },
    {
      enunciado: '¿Qué mecanismo explica la frecuencia de rasgos ventajosos?',
      opciones: ['La selección natural', 'La combustión', 'La gravedad'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La selección natural favorece la reproducción de rasgos ventajosos en un ambiente.',
    },
    {
      enunciado: '¿Qué se conserva en una ecuación química balanceada?',
      opciones: ['La masa y el número de átomos', 'Solo el color', 'La temperatura'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La ley de conservación de la masa exige igual número de átomos en reactivos y productos.',
    },
  ],
  retoPbl: {
    titulo: 'Informe de investigación sobre un problema ambiental local',
    descripcion:
      'Identifica un problema ambiental de tu entorno, formula una pregunta, recoge datos, analiza causas y propone una solución basada en evidencia científica.',
    criteriosMineduc: [
      'Pregunta investigable y hipótesis clara.',
      'Metodología y datos verificables.',
      'Análisis con conceptos científicos.',
      'Propuesta viable y ética.',
    ],
    entregableEsperado: 'Informe de investigación de cuatro páginas con gráficos.',
  },
  unidades: [
    { titulo: 'Método científico, magnitudes y medición', conceptoClave: 'Medir exige unidades, instrumentos y estimación de incertidumbre.', aplicacion: 'Diseña una tabla de medición con unidades y errores.' },
    { titulo: 'La célula y las biomoléculas', conceptoClave: 'La célula integra estructuras y moléculas para realizar funciones vitales.', aplicacion: 'Compara célula procariota y eucariota.' },
    { titulo: 'Genética mendeliana y ADN', conceptoClave: 'Los genes se transmiten y expresan según patrones y mecanismos moleculares.', aplicacion: 'Resuelve una cruza monohíbrida y calcula proporciones.' },
    { titulo: 'Evolución y biodiversidad', conceptoClave: 'La evolución explica la diversidad de la vida mediante mecanismos como la selección natural.', aplicacion: 'Analiza evidencia de adaptación en una especie.' },
    { titulo: 'Ecología, ciclos y flujos de energía', conceptoClave: 'Los ecosistemas intercambian materia y energía entre organismos y ambiente.', aplicacion: 'Construye una pirámide trófica con datos.' },
    { titulo: 'Sistemas del cuerpo humano', conceptoClave: 'Los sistemas integran funciones para mantener la homeostasis.', aplicacion: 'Explica la relación entre digestión y circulación.' },
    { titulo: 'Fuerza, movimiento y leyes de Newton', conceptoClave: 'Las fuerzas modifican el movimiento y se relacionan con masa y aceleración.', aplicacion: 'Mide fuerza y aceleración en un experimento simple.' },
    { titulo: 'Energía, trabajo y potencia', conceptoClave: 'La energía se transforma y el trabajo mide la transferencia de energía.', aplicacion: 'Calcula trabajo y potencia en una actividad cotidiana.' },
    { titulo: 'Termodinámica y calor', conceptoClave: 'La energía térmica fluye del cuerpo de mayor al de menor temperatura.', aplicacion: 'Compara la conducción en distintos materiales.' },
    { titulo: 'Átomo, tabla periódica y enlaces', conceptoClave: 'La estructura atómica explica las propiedades y la combinación de elementos.', aplicacion: 'Ubica elementos y predice un tipo de enlace.' },
    { titulo: 'Reacciones químicas y conservación de la masa', conceptoClave: 'En una reacción se conserva el número de átomos de cada elemento.', aplicacion: 'Balancea tres ecuaciones químicas.' },
    { titulo: 'Ética científica y comunicación de resultados', conceptoClave: 'La honestidad, la reproducibilidad y la revisión son condiciones del conocimiento científico.', aplicacion: 'Evalúa un artículo con una lista de verificación.' },
  ],
};

const SOCIALES: AsignaturaCurricular = {
  codigo: '04_Estudios_Sociales',
  nombre: 'Estudios Sociales e Historia del Ecuador',
  nombreCorto: 'Sociales 8.°',
  area: 'ESTUDIOS_SOCIALES',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '04_Estudios_Sociales',
  driveFolderId: '1yE04TDZzTNK8IjmiRRT2YGM4xT9etrQQ',
  textoPrincipal: '8° EGB ESTUDIOS SOCIALES.pdf • Macro y Micro Currículo Estudios Sociales',
  bibliografia: [
    { titulo: 'Estudios Sociales 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Historia del Ecuador (Ayala Mora)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Módulo de etnoeducación para docentes de 8.° EGB', tipo: 'UNIVERSITARIO' },
    { titulo: 'Constitución de la República del Ecuador (2008)', tipo: 'FUENTE_PRIMARIA' },
  ],
  enfoqueAcademico:
    'Los estudios sociales analizan la organización de las sociedades en el tiempo y el espacio, sus instituciones, economías, culturas y conflictos. En octavo de básica se estudia la historia del Ecuador desde las sociedades prehispánicas hasta el presente, la geografía humana, el sistema político y los derechos. El análisis histórico utiliza fuentes primarias y secundarias, causalidad, continuidad y cambio.',
  analisisModelo:
    'Toda sociedad organiza el poder, la producción y la cultura. La colonia transformó el territorio, el trabajo y las jerarquías. La independencia y la república crearon nuevas instituciones, pero mantuvieron desigualdades. La economía del cacao y luego del petróleo configuraron el país. La Constitución define derechos, garantías y competencias del Estado. La geografía humana explica la distribución de la población y sus migraciones.',
  aplicacionVida:
    'Comprender la historia permite interpretar el presente y evitar reproducir injusticias. Conocer derechos y deberes fortalece la ciudadanía. El análisis de fuentes desarrolla pensamiento crítico frente a la desinformación. La geografía ayuda a gestionar riesgos y recursos.',
  sintesis:
    'La historia no es una lista de fechas, sino un análisis de causas, consecuencias y experiencias. Toda interpretación debe contrastarse con fuentes. La ciudadanía democrática exige participación, legalidad y respeto por la diversidad.',
  preguntaDisparadora: '¿Qué continuidades y rupturas dejó la independencia en la sociedad ecuatoriana?',
  objetivos: [
    'Interpretar procesos históricos con causas y consecuencias.',
    'Analizar la organización política y los derechos constitucionales.',
    'Explicar la relación entre territorio, economía y sociedad.',
  ],
  metodo: [
    'Ubicar el proceso en tiempo y espacio.',
    'Identificar actores, intereses y relaciones de poder.',
    'Comparar fuentes y distinguir hechos de interpretaciones.',
    'Argumentar una conclusión con evidencia histórica.',
  ],
  conceptosFundamentales: [
    { termino: 'Causalidad histórica', definicion: 'Relación entre condiciones, acciones y consecuencias de un proceso.' },
    { termino: 'Estado', definicion: 'Organización política que ejerce soberanía sobre un territorio y su población.' },
    { termino: 'Derecho constitucional', definicion: 'Facultad reconocida y garantizada por la Constitución.' },
  ],
  lema: {
    referencia: 'Marc Bloch',
    texto: 'La historia es la ciencia de los hombres en el tiempo.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Línea de tiempo del Ecuador y mapa político',
  simulacion: {
    tipo: 'HISTORY_TIMELINE',
    titulo: 'Análisis de fuentes y línea de tiempo republicana',
    instrucciones:
      'Clasifica tres fuentes como primarias o secundarias, ubica cuatro procesos en una línea de tiempo y explica una causa y una consecuencia de cada uno.',
    codigoOTextoInicial:
      'procesos: colonia, independencia, república cacaotera, boom petrolero\nfuentes: acta, fotografía, libro de historia',
    demostracionInteractiva:
      'El acta y la fotografía son fuentes primarias; el libro es secundario. La independencia tuvo causas políticas y económicas y consecuencias institucionales.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué caracteriza a una fuente primaria?',
      opciones: ['Fue producida en el contexto del hecho estudiado', 'Es siempre un libro de texto', 'No tiene autor'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Las fuentes primarias aportan testimonio directo del periodo.',
    },
    {
      enunciado: '¿Qué poder del Estado elabora las leyes?',
      opciones: ['El Legislativo', 'El Ejecutivo', 'El Judicial'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La Asamblea Nacional ejerce el poder legislativo.',
    },
    {
      enunciado: '¿Qué explica mejor la migración interna en Ecuador?',
      opciones: ['La búsqueda de empleo y servicios', 'El azar sin causas', 'La inexistencia de ciudades'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Las migraciones responden a factores económicos, sociales y ambientales.',
    },
  ],
  retoPbl: {
    titulo: 'Archivo histórico del barrio',
    descripcion:
      'Recopila testimonios, fotografías y documentos sobre la historia de tu barrio. Elabora una línea de tiempo y un texto que explique cambios y continuidades.',
    criteriosMineduc: [
      'Uso y clasificación de fuentes.',
      'Precisión cronológica.',
      'Análisis de causas y consecuencias.',
      'Redacción clara y ética.',
    ],
    entregableEsperado: 'Dosier histórico de cuatro páginas con línea de tiempo.',
  },
  unidades: [
    { titulo: 'Historia y ciencias sociales: objeto y método', conceptoClave: 'Las ciencias sociales estudian fenómenos humanos con métodos y fuentes.', aplicacion: 'Clasifica fuentes y formula una pregunta histórica.' },
    { titulo: 'Ecuador prehispánico', conceptoClave: 'Las sociedades prehispánicas desarrollaron agricultura, comercio y organización política.', aplicacion: 'Compara dos culturas prehispánicas del territorio.' },
    { titulo: 'Conquista y organización colonial', conceptoClave: 'La colonia transformó el territorio, el trabajo y las jerarquías sociales.', aplicacion: 'Analiza una fuente colonial y sus intereses.' },
    { titulo: 'Independencia y nacimiento de la República', conceptoClave: 'La independencia abrió un proceso de construcción estatal con conflictos y exclusiones.', aplicacion: 'Explica causas y consecuencias de la independencia.' },
    { titulo: 'Siglo XIX: cacao, región y poder', conceptoClave: 'La economía cacaotera articuló regiones y transformó la sociedad.', aplicacion: 'Relaciona el auge cacaotero con la política del periodo.' },
    { titulo: 'Siglo XX: petróleo, urbanización y conflicto', conceptoClave: 'El petróleo reconfiguró la economía y la geografía política.', aplicacion: 'Analiza un conflicto social del siglo XX con fuentes.' },
    { titulo: 'Constitución, derechos y garantías', conceptoClave: 'La Constitución organiza el Estado y reconoce derechos fundamentales.', aplicacion: 'Clasifica derechos y garantías en un caso concreto.' },
    { titulo: 'Estado, poderes y participación', conceptoClave: 'La división de poderes y la participación ciudadana limitan el abuso de poder.', aplicacion: 'Elabora un mapa de instituciones del Estado.' },
    { titulo: 'Geografía humana: población y territorio', conceptoClave: 'La distribución de la población depende de factores naturales y socioeconómicos.', aplicacion: 'Interpreta una pirámide poblacional y un mapa.' },
    { titulo: 'Economía, trabajo y desigualdad', conceptoClave: 'Las estructuras económicas producen oportunidades y desigualdades.', aplicacion: 'Analiza datos de empleo y propone una política pública.' },
    { titulo: 'Migración, diversidad y derechos', conceptoClave: 'La movilidad humana plantea desafíos de integración y protección de derechos.', aplicacion: 'Investiga un flujo migratorio y sus efectos.' },
    { titulo: 'América Latina y el sistema internacional', conceptoClave: 'Los países latinoamericanos comparten procesos y participan en organizaciones regionales.', aplicacion: 'Compara dos procesos de integración regional.' },
  ],
};

const INGLES: AsignaturaCurricular = {
  codigo: '05_Ingles',
  nombre: 'Academic English & Literature',
  nombreCorto: 'English 8.°',
  area: 'LENGUA_EXTRANJERA',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '05_Ingles',
  driveFolderId: '1kenOXneIVVn_vqEEBfrdyB5Bs2knhk77',
  textoPrincipal: '8th_EGB_ENGLISH Librosdetextoecuador.org.pdf • Macro y Micro Currículo Inglés',
  bibliografia: [
    { titulo: 'English 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Oxford Academic English: reading and writing', tipo: 'UNIVERSITARIO' },
    { titulo: 'The Elements of Style (Strunk & White)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Purdue Online Writing Lab (OWL)', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'Academic English develops the reading, writing, listening and speaking skills required to understand and produce academic texts. In eighth grade students analyze structure, identify main ideas and evidence, write thesis-driven paragraphs and short essays, and discuss complex topics with clarity. Literature study introduces narrative voice, characterization, theme, figurative language and context.',
  analisisModelo:
    'Academic texts are organized around a claim supported by evidence and reasoning. Cohesion is built through transitions and referencing. Literary texts construct meaning through form and style. Rhetorical analysis examines audience, purpose, ethos, pathos and logos. Reliable research distinguishes primary and secondary sources and cites them accurately.',
  aplicacionVida:
    'English is a global language for science, technology, business and diplomacy. Academic literacy enables access to research and international collaboration. Clear writing and speaking are essential for presentations, interviews and informed citizenship.',
  sintesis:
    'Strong academic writing states a clear claim, supports it with evidence and explains the reasoning. Reading literature develops interpretive precision and empathy. Language growth requires deliberate practice, feedback and revision.',
  preguntaDisparadora: 'How does an author convince a reader without stating the thesis directly?',
  objetivos: [
    'Analyze academic texts and identify claims, evidence and reasoning.',
    'Write a thesis-driven essay with accurate citation.',
    'Interpret literary texts using narrative and stylistic categories.',
  ],
  metodo: [
    'Read the text and identify the central claim.',
    'Annotate evidence and evaluate its relevance.',
    'Outline the response with claim, evidence and explanation.',
    'Revise for clarity, accuracy and academic register.',
  ],
  conceptosFundamentales: [
    { termino: 'Claim', definicion: 'A statement the writer defends with evidence and reasoning.' },
    { termino: 'Rhetorical analysis', definicion: 'Examination of how a text persuades a specific audience.' },
    { termino: 'Citation', definicion: 'Formal acknowledgment of the source of information or ideas.' },
  ],
  lema: {
    referencia: 'Ludwig Wittgenstein',
    texto: 'Los límites de mi lenguaje significan los límites de mi mundo.',
  },
  tipoGrafico: 'ARBOL_GRAMATICAL',
  insigniaGrafico: 'Essay map: claim, evidence and reasoning',
  simulacion: {
    tipo: 'LANGUAGE_STUDIO',
    titulo: 'Academic writing workshop and rhetorical analyzer',
    instrucciones:
      'Read a short argument, identify its claim and evidence, and write a counterargument. Then revise the paragraph for cohesion and academic register.',
    codigoOTextoInicial:
      'claim: reading fiction improves empathy\nevidence: experimental studies\ncounterargument: effect depends on text and context',
    demostracionInteractiva:
      'A strong response states the claim, presents evidence, explains the link and acknowledges a limitation.',
  },
  preguntasQuiz: [
    {
      enunciado: 'What is a thesis statement?',
      opciones: ['The central claim of an academic text', 'A random quotation', 'The title of a dictionary'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'A thesis states the position the text will defend.',
    },
    {
      enunciado: 'What does rhetorical analysis examine?',
      opciones: ['How a text persuades its audience', 'Only grammar mistakes', 'The number of pages'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Rhetorical analysis studies audience, purpose and persuasive strategies.',
    },
    {
      enunciado: 'Why are citations required?',
      opciones: ['To acknowledge sources and avoid plagiarism', 'To make the text longer', 'To hide the author'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Citations protect intellectual honesty and allow verification.',
    },
  ],
  retoPbl: {
    titulo: 'Academic magazine: global issues',
    descripcion:
      'Produce a four-page English magazine with an argumentative essay, a literary review and a short interview about a global issue. Include citations and a references page.',
    criteriosMineduc: [
      'Clear thesis and logical organization.',
      'Relevant evidence and accurate citation.',
      'Academic register and cohesion.',
      'Oral presentation of the project.',
    ],
    entregableEsperado: 'Four-page English magazine with APA references.',
  },
  unidades: [
    { titulo: 'Academic reading strategies', conceptoClave: 'Skimming, scanning and annotation improve comprehension and retention.', aplicacion: 'Annotate a two-page article and summarize its structure.' },
    { titulo: 'Summary, paraphrase and quotation', conceptoClave: 'Each form of source use serves a different rhetorical purpose.', aplicacion: 'Summarize, paraphrase and quote the same passage.' },
    { titulo: 'Thesis statements and paragraph structure', conceptoClave: 'A thesis guides the essay and each paragraph develops one idea.', aplicacion: 'Write a thesis and a topic sentence for three paragraphs.' },
    { titulo: 'Argumentative essay', conceptoClave: 'Arguments require claims, evidence, warrants and acknowledgment of counterarguments.', aplicacion: 'Draft a five-paragraph argumentative essay.' },
    { titulo: 'Rhetorical analysis', conceptoClave: 'Texts persuade through appeals to credibility, emotion and logic.', aplicacion: 'Analyze a speech and classify its appeals.' },
    { titulo: 'Short story: character, conflict and theme', conceptoClave: 'Narrative elements work together to produce meaning.', aplicacion: 'Analyze a short story with a story map.' },
    { titulo: 'Poetry and figurative language', conceptoClave: 'Imagery, metaphor and sound patterns shape interpretation.', aplicacion: 'Interpret a poem and explain two figures.' },
    { titulo: 'Research and citation', conceptoClave: 'Reliable research evaluates sources and documents them accurately.', aplicacion: 'Build an APA reference list with five sources.' },
    { titulo: 'Oral presentations', conceptoClave: 'Clear structure, delivery and visual support improve communication.', aplicacion: 'Present a three-minute argument with slides.' },
    { titulo: 'Listening and note-taking', conceptoClave: 'Active listening and structured notes capture key ideas.', aplicacion: 'Take Cornell notes from a short lecture.' },
    { titulo: 'Academic vocabulary', conceptoClave: 'Academic word families support precise expression across disciplines.', aplicacion: 'Use ten academic words in original sentences.' },
    { titulo: 'Writing portfolio and reflection', conceptoClave: 'Revision and self-assessment improve written performance.', aplicacion: 'Select three drafts and write a reflection on growth.' },
  ],
};

const SOFTWARE: AsignaturaCurricular = {
  codigo: '06_Software_y_Programacion',
  nombre: 'Software y Programación Python',
  nombreCorto: 'Programación 8.°',
  area: 'TECNOLOGIA',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '06_Software_y_Programacion',
  driveFolderId: '13VOUQWxg8BAh38kenLQpnkoW1dqTIZVx',
  textoPrincipal: 'think-python-es.pdf • 2012_curso_python-para-principiantes.pdf',
  bibliografia: [
    { titulo: 'Think Python 3e (Downey)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Python Crash Course (Matthes)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Automate the Boring Stuff with Python (Sweigart)', tipo: 'RECURSO_DIGITAL' },
    { titulo: 'Documentación oficial de Python 3', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La programación es una disciplina formal para expresar algoritmos y automatizar procesos. En octavo de básica se consolidan tipos de datos, control de flujo, funciones, estructuras de datos, archivos, programación orientada a objetos y pruebas. El código debe ser legible, correcto, eficiente y ético. La depuración y el control de versiones son prácticas profesionales desde el inicio.',
  analisisModelo:
    'Un programa transforma entradas en salidas mediante una secuencia de estados. Las funciones encapsulan lógica y favorecen la reutilización. Las listas y diccionarios organizan colecciones de datos. Los errores pueden ser sintácticos, semánticos o de ejecución. Las pruebas automatizadas comparan resultados esperados con resultados obtenidos. La complejidad algorítmica describe el costo de una solución.',
  aplicacionVida:
    'Programar permite analizar datos, crear herramientas educativas, automatizar tareas y construir prototipos. La lógica computacional mejora la resolución de problemas en cualquier disciplina. La ética profesional exige privacidad, seguridad, accesibilidad y honestidad.',
  sintesis:
    'Un buen programa se comprende antes de ejecutarse. La modularidad, los nombres claros y las pruebas reducen errores. Optimizar sin medir es una mala práctica; primero se corrige, luego se mide y finalmente se mejora.',
  preguntaDisparadora: '¿Cómo puede un programa tomar decisiones sin intervención humana?',
  objetivos: [
    'Diseñar algoritmos y traducirlos a Python legible.',
    'Usar funciones, listas y diccionarios para organizar datos.',
    'Probar, depurar y documentar programas.',
  ],
  metodo: [
    'Definir entradas, procesos y salidas esperadas.',
    'Dividir el problema en funciones pequeñas.',
    'Escribir el código y probar cada función por separado.',
    'Integrar, documentar y ejecutar pruebas finales.',
  ],
  conceptosFundamentales: [
    { termino: 'Función', definicion: 'Bloque de código con nombre que recibe datos y devuelve un resultado.' },
    { termino: 'Estructura de datos', definicion: 'Forma organizada de almacenar y acceder a colecciones de datos.' },
    { termino: 'Prueba unitaria', definicion: 'Verificación automatizada del resultado de una unidad de código.' },
  ],
  lema: {
    referencia: 'Edsger Dijkstra',
    texto: 'La simplicidad es un requisito previo para la fiabilidad.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Diagrama de flujo y estructura de un programa',
  simulacion: {
    tipo: 'PYTHON_SANDBOX',
    titulo: 'Laboratorio Python: funciones y listas',
    instrucciones:
      'Escribe una función que reciba una lista de calificaciones y devuelva el promedio, la nota máxima y la nota mínima. Prueba con tres listas distintas.',
    codigoOTextoInicial:
      'def resumen(notas):\n    return sum(notas)/len(notas), max(notas), min(notas)\n\nprint(resumen([8, 9, 10, 7]))',
    demostracionInteractiva:
      'La función devuelve (8.5, 10, 7). Al separar la lógica en una función, el programa es reutilizable y fácil de probar.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué estructura permite almacenar pares clave-valor?',
      opciones: ['El diccionario', 'La función', 'El bucle'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los diccionarios asocian claves únicas con valores.',
    },
    {
      enunciado: '¿Qué hace una prueba unitaria?',
      opciones: ['Verifica una unidad de código con un resultado esperado', 'Reemplaza la documentación', 'Cambia el lenguaje'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Las pruebas unitarias detectan regresiones y validan comportamientos.',
    },
    {
      enunciado: '¿Qué principio mejora la legibilidad del código?',
      opciones: ['Usar nombres descriptivos y funciones pequeñas', 'Escribir todo en una línea', 'Evitar comentarios siempre'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La claridad reduce errores y facilita el mantenimiento.',
    },
  ],
  retoPbl: {
    titulo: 'Sistema de gestión de una biblioteca escolar',
    descripcion:
      'Desarrolla un programa en Python que registre libros, permita búsquedas y genere un reporte de préstamos. Incluye funciones, diccionarios y pruebas.',
    criteriosMineduc: [
      'Diseño modular y legible.',
      'Uso adecuado de estructuras de datos.',
      'Pruebas y manejo de errores.',
      'Documentación y ética de datos.',
    ],
    entregableEsperado: 'Repositorio con código, pruebas y manual de uso.',
  },
  unidades: [
    { titulo: 'Algoritmos, pseudocódigo y complejidad', conceptoClave: 'Un algoritmo correcto debe ser finito, claro y eficiente.', aplicacion: 'Escribe y compara dos algoritmos de búsqueda.' },
    { titulo: 'Python: tipos, variables y expresiones', conceptoClave: 'Los tipos determinan las operaciones válidas sobre los datos.', aplicacion: 'Realiza operaciones con enteros, flotantes y cadenas.' },
    { titulo: 'Control de flujo: condicionales y bucles', conceptoClave: 'Las decisiones y repeticiones controlan el orden de ejecución.', aplicacion: 'Resuelve problemas con if, for y while.' },
    { titulo: 'Funciones y modularidad', conceptoClave: 'Las funciones encapsulan lógica y reducen la duplicación.', aplicacion: 'Refactoriza un programa en tres funciones.' },
    { titulo: 'Listas, tuplas y diccionarios', conceptoClave: 'Cada estructura de datos ofrece operaciones y costos distintos.', aplicacion: 'Organiza datos de estudiantes en un diccionario.' },
    { titulo: 'Archivos y persistencia', conceptoClave: 'Los archivos permiten conservar datos entre ejecuciones.', aplicacion: 'Lee y escribe un archivo CSV de calificaciones.' },
    { titulo: 'Programación orientada a objetos', conceptoClave: 'Las clases modelan entidades con estado y comportamiento.', aplicacion: 'Crea una clase Libro con atributos y métodos.' },
    { titulo: 'Errores, excepciones y pruebas', conceptoClave: 'El manejo de errores y las pruebas mejoran la robustez.', aplicacion: 'Agrega validaciones y pruebas a una función.' },
    { titulo: 'Librerías y APIs', conceptoClave: 'Las librerías y APIs amplían las capacidades del programa.', aplicacion: 'Consume una API pública y muestra datos.' },
    { titulo: 'Datos y visualización', conceptoClave: 'La visualización revela patrones y facilita la interpretación.', aplicacion: 'Grafica un conjunto de datos con una librería.' },
    { titulo: 'Git y trabajo colaborativo', conceptoClave: 'El control de versiones registra cambios y facilita la colaboración.', aplicacion: 'Crea un repositorio con commits descriptivos.' },
    { titulo: 'Proyecto integrador y documentación', conceptoClave: 'Un proyecto profesional incluye código, pruebas, documentación y licencia.', aplicacion: 'Publica un proyecto con README y pruebas.' },
  ],
};

const POLITICAS: AsignaturaCurricular = {
  codigo: '07_Ciencias_Politicas_y_RRII',
  nombre: 'Ciencias Políticas y Relaciones Internacionales',
  nombreCorto: 'Ciencias Políticas 8.°',
  area: 'CIENCIAS_POLITICAS',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '07_Ciencias_Politicas_y_RRII',
  driveFolderId: '1GTkgAHWdqUP4BgBlvkurqgU_niGr-um8',
  textoPrincipal: 'Introducción a las Relaciones Internacionales (Legler et al.) • Fundamentos de RRII (Mingst)',
  bibliografia: [
    { titulo: 'Introducción a las Relaciones Internacionales (Legler, Santa Cruz y Zamudio)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Fundamentos de las Relaciones Internacionales (Mingst)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Actores internacionales contemporáneos (Rocha Herrera et al.)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Carta de las Naciones Unidas', tipo: 'FUENTE_PRIMARIA' },
  ],
  enfoqueAcademico:
    'La ciencia política estudia el poder, las instituciones, los actores y los procesos de decisión colectiva. Las relaciones internacionales analizan la interacción entre Estados, organizaciones, empresas y sociedades en un sistema global. En octavo de básica se introducen el Estado, la soberanía, las formas de gobierno, el constitucionalismo, las teorías de las relaciones internacionales, la diplomacia, los derechos humanos y los organismos multilaterales.',
  analisisModelo:
    'El sistema internacional es anárquico en el sentido de que no existe un gobierno mundial, pero está regulado por normas, instituciones y equilibrios de poder. Las teorías realista, liberal y constructivista explican de manera distinta la cooperación y el conflicto. La política exterior combina intereses nacionales, valores e instituciones. Los organismos internacionales facilitan cooperación, pero su eficacia depende de la voluntad de los Estados.',
  aplicacionVida:
    'Comprender la política permite participar informadamente, evaluar propuestas y defender derechos. Las relaciones internacionales explican migración, comercio, cambio climático y conflictos. La negociación y la diplomacia son habilidades útiles en la familia, la escuela y la comunidad.',
  sintesis:
    'La política es una actividad humana orientada a decidir sobre asuntos comunes. Todo análisis político debe identificar actores, intereses, instituciones y normas. La cooperación internacional es posible cuando existen incentivos, confianza y marcos institucionales.',
  preguntaDisparadora: '¿Por qué los Estados cooperan si no existe un gobierno mundial?',
  objetivos: [
    'Explicar el Estado, la soberanía y la división de poderes.',
    'Comparar teorías básicas de las relaciones internacionales.',
    'Analizar el papel de la ONU y los derechos humanos.',
  ],
  metodo: [
    'Identificar actores, intereses y contexto del caso.',
    'Seleccionar una teoría o marco de análisis.',
    'Contrastar fuentes y evaluar argumentos.',
    'Formular una conclusión y una propuesta de acción.',
  ],
  conceptosFundamentales: [
    { termino: 'Soberanía', definicion: 'Capacidad del Estado para decidir sobre su territorio y población sin subordinación externa.' },
    { termino: 'Anarquía internacional', definicion: 'Ausencia de un gobierno mundial con autoridad superior a los Estados.' },
    { termino: 'Multilateralismo', definicion: 'Cooperación entre varios Estados y organismos para resolver problemas comunes.' },
  ],
  lema: {
    referencia: 'Max Weber (adaptado)',
    texto: 'La política es la búsqueda de influir en la dirección de una comunidad.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Mapa de actores internacionales y organismos multilaterales',
  simulacion: {
    tipo: 'HISTORY_TIMELINE',
    titulo: 'Simulación de una cumbre internacional',
    instrucciones:
      'Representa a tres Estados con intereses distintos sobre un problema ambiental. Negocia una declaración común y registra concesiones y acuerdos.',
    codigoOTextoInicial:
      'actores: Estado A (industrial), Estado B (afectado por sequía), Estado C (isla)\nobjetivo: acuerdo de reducción de emisiones\nregla: toda decisión requiere consenso',
    demostracionInteractiva:
      'El acuerdo requiere concesiones: financiamiento, plazos diferenciados y verificación. La cooperación depende de intereses convergentes y reglas creíbles.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué caracteriza al sistema internacional?',
      opciones: ['La ausencia de un gobierno mundial', 'La existencia de un solo Estado', 'La desaparición de las fronteras'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El sistema internacional se describe como anárquico por la ausencia de autoridad central.',
    },
    {
      enunciado: '¿Qué organismo coordina la cooperación política global?',
      opciones: ['La ONU', 'Una empresa privada', 'Un club deportivo'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La ONU es el principal foro multilateral de cooperación política.',
    },
    {
      enunciado: '¿Qué busca el multilateralismo?',
      opciones: ['Resolver problemas comunes mediante cooperación entre varios actores', 'Imponer decisiones unilaterales', 'Eliminar el derecho internacional'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El multilateralismo articula intereses y reglas compartidas.',
    },
  ],
  retoPbl: {
    titulo: 'Modelo de Naciones Unidas: cumbre escolar',
    descripcion:
      'Investiga la posición de un país sobre un tema global, redacta un discurso de apertura y participa en una negociación para aprobar una resolución.',
    criteriosMineduc: [
      'Investigación rigurosa de la posición del país.',
      'Argumentación clara y basada en evidencia.',
      'Capacidad de negociación y escucha.',
      'Redacción formal de la resolución.',
    ],
    entregableEsperado: 'Discurso, hoja de posición y resolución final.',
  },
  unidades: [
    { titulo: 'Ciencia política: objeto, métodos y conceptos', conceptoClave: 'La política estudia el poder y las decisiones colectivas con métodos propios.', aplicacion: 'Define poder, autoridad y legitimidad con ejemplos.' },
    { titulo: 'Estado, nación y soberanía', conceptoClave: 'El Estado combina territorio, población, gobierno y soberanía.', aplicacion: 'Analiza un caso de disputa territorial con criterios.' },
    { titulo: 'Formas de gobierno y regímenes', conceptoClave: 'Las formas de gobierno distribuyen el poder de manera distinta.', aplicacion: 'Compara democracia, autoritarismo y monarquía.' },
    { titulo: 'Constitucionalismo y división de poderes', conceptoClave: 'La Constitución limita el poder y garantiza derechos.', aplicacion: 'Explica los frenos y contrapesos en Ecuador.' },
    { titulo: 'Sistema político ecuatoriano', conceptoClave: 'El sistema político ecuatoriano articula instituciones, partidos y participación.', aplicacion: 'Elabora un organigrama del Estado ecuatoriano.' },
    { titulo: 'Partidos, movimientos y opinión pública', conceptoClave: 'Los actores políticos agregan intereses y compiten por representación.', aplicacion: 'Analiza un programa electoral con criterios.' },
    { titulo: 'Política exterior y diplomacia', conceptoClave: 'La política exterior define intereses y estrategias de un Estado en el mundo.', aplicacion: 'Diseña una estrategia diplomática para un tema regional.' },
    { titulo: 'Teorías de las relaciones internacionales', conceptoClave: 'Realismo, liberalismo y constructivismo explican de forma distinta la cooperación.', aplicacion: 'Aplica dos teorías a un mismo conflicto.' },
    { titulo: 'ONU y organismos multilaterales', conceptoClave: 'Los organismos multilaterales facilitan cooperación y establecen normas.', aplicacion: 'Investiga una agencia de la ONU y su mandato.' },
    { titulo: 'Derechos humanos y derecho internacional', conceptoClave: 'Los derechos humanos establecen límites al poder estatal.', aplicacion: 'Analiza un caso con la Declaración Universal.' },
    { titulo: 'Conflictos, mediación y paz', conceptoClave: 'La negociación y la mediación transforman conflictos sin recurrir a la violencia.', aplicacion: 'Simula una mediación con intereses contrapuestos.' },
    { titulo: 'Globalización y Agenda 2030', conceptoClave: 'La globalización genera oportunidades y desigualdades que requieren gobernanza.', aplicacion: 'Relaciona un ODS con una política local.' },
  ],
};

const ADMINISTRACION: AsignaturaCurricular = {
  codigo: '08_Administracion_y_Marketing',
  nombre: 'Administración y Marketing Digital',
  nombreCorto: 'Administración 8.°',
  area: 'ADMINISTRACION',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '08_Administracion_y_Marketing',
  driveFolderId: '1_EKR1r_KAXzaHyzKRZuf7ffm8JtF3OS-',
  textoPrincipal: 'Fundamentos del Marketing (Kotler) • Claves del nuevo marketing (Burgos y Cerezo)',
  bibliografia: [
    { titulo: 'Fundamentos del Marketing (Kotler y Armstrong)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Claves del nuevo marketing (Burgos y Cerezo)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Administración (Robbins y Coulter)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Marketing de contenidos (Divisadero)', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'La administración estudia cómo las organizaciones planifican, organizan, dirigen y controlan recursos para alcanzar objetivos. El marketing analiza necesidades, mercados, valor y relaciones con clientes. En octavo de básica se introducen la planificación estratégica, la estructura organizacional, el liderazgo, la segmentación, el posicionamiento, la mezcla de marketing, el marketing digital, las métricas y la ética empresarial.',
  analisisModelo:
    'Una organización transforma recursos en valor mediante procesos coordinados. La estrategia define a qué clientes servir y cómo diferenciarse. El marketing mix integra producto, precio, plaza y promoción. El entorno digital modifica el alcance, la medición y la relación con el cliente. Los indicadores convierten objetivos en resultados verificables. La ética y la responsabilidad social condicionan la sostenibilidad de la organización.',
  aplicacionVida:
    'La administración y el marketing permiten comprender cómo funcionan las empresas, cooperativas y proyectos sociales. Planificar, presupuestar y medir mejora cualquier iniciativa. La comunicación responsable evita manipulación y construye confianza.',
  sintesis:
    'Gestionar es decidir con información y asumir responsabilidad por los resultados. Una estrategia debe ser coherente con el propósito, los recursos y el entorno. La medición sin ética puede destruir valor a largo plazo.',
  preguntaDisparadora: '¿Qué hace que una persona prefiera un producto aunque existan alternativas más baratas?',
  objetivos: [
    'Explicar las funciones administrativas y la planificación estratégica.',
    'Diseñar una propuesta de valor y un plan de marketing básico.',
    'Evaluar resultados con métricas y criterios éticos.',
  ],
  metodo: [
    'Analizar el contexto y las necesidades del cliente.',
    'Definir objetivos medibles y una propuesta de valor.',
    'Diseñar el plan de acción y el presupuesto.',
    'Medir resultados y ajustar la estrategia.',
  ],
  conceptosFundamentales: [
    { termino: 'Propuesta de valor', definicion: 'Beneficio diferencial que una organización ofrece a un segmento de clientes.' },
    { termino: 'Segmentación', definicion: 'División del mercado en grupos con características y necesidades similares.' },
    { termino: 'Indicador clave', definicion: 'Métrica cuantificable que evalúa el avance hacia un objetivo.' },
  ],
  lema: {
    referencia: 'Philip Kotler',
    texto: 'El marketing es la ciencia y el arte de explorar, crear y entregar valor para satisfacer necesidades.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Lienzo de modelo de negocio y embudo de marketing',
  simulacion: {
    tipo: 'HISTORY_TIMELINE',
    titulo: 'Simulador de plan de marketing y punto de equilibrio',
    instrucciones:
      'Define un producto, un segmento y un precio. Calcula costos, ingreso esperado y punto de equilibrio. Propone tres acciones digitales medibles.',
    codigoOTextoInicial:
      'producto: cuaderno ecológico\nsegmento: estudiantes de 8.° a 10.°\nprecio: $4\ncostos fijos: $200\ncosto variable: $2\npunto de equilibrio: 100 unidades',
    demostracionInteractiva:
      'Con precio de $4 y costo variable de $2, cada unidad aporta $2. Se necesitan 100 unidades para cubrir $200 de costos fijos.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué es una propuesta de valor?',
      opciones: ['El beneficio diferencial que se ofrece al cliente', 'El precio más alto', 'El logo de la empresa'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La propuesta de valor explica por qué el cliente elegiría el producto.',
    },
    {
      enunciado: '¿Qué es segmentar un mercado?',
      opciones: ['Dividirlo en grupos con necesidades similares', 'Vender a todos sin distinción', 'Eliminar clientes'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La segmentación permite adaptar la oferta y el mensaje.',
    },
    {
      enunciado: '¿Para qué sirve un indicador clave?',
      opciones: ['Para medir el avance hacia un objetivo', 'Para decorar el informe', 'Para ocultar resultados'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los indicadores permiten evaluar y corregir la estrategia.',
    },
  ],
  retoPbl: {
    titulo: 'Plan de negocio social para la comunidad',
    descripcion:
      'Diseña un emprendimiento con impacto social. Incluye problema, propuesta de valor, segmento, costos, precio, plan digital y métricas de éxito.',
    criteriosMineduc: [
      'Coherencia entre problema y solución.',
      'Viabilidad financiera básica.',
      'Plan de marketing medible.',
      'Ética y responsabilidad social.',
    ],
    entregableEsperado: 'Lienzo de modelo de negocio y plan de marketing de tres páginas.',
  },
  unidades: [
    { titulo: 'Administración: funciones y roles', conceptoClave: 'Planificar, organizar, dirigir y controlar son funciones interdependientes.', aplicacion: 'Aplica las cuatro funciones a un proyecto escolar.' },
    { titulo: 'Planificación estratégica', conceptoClave: 'La estrategia define objetivos, recursos y ventajas competitivas.', aplicacion: 'Elabora un FODA de un emprendimiento.' },
    { titulo: 'Estructura organizacional', conceptoClave: 'La estructura asigna roles, autoridad y responsabilidades.', aplicacion: 'Diseña un organigrama para una empresa pequeña.' },
    { titulo: 'Liderazgo y trabajo en equipo', conceptoClave: 'El liderazgo eficaz combina dirección, escucha y responsabilidad.', aplicacion: 'Evalúa tres estilos de liderazgo en casos.' },
    { titulo: 'Marketing: necesidades, valor y cliente', conceptoClave: 'El marketing crea valor a partir de necesidades reales del cliente.', aplicacion: 'Entrevista a cinco clientes potenciales.' },
    { titulo: 'Segmentación y posicionamiento', conceptoClave: 'Segmentar y posicionar permite diferenciar la oferta.', aplicacion: 'Define dos segmentos y una posición para cada uno.' },
    { titulo: 'Mezcla de marketing: producto, precio, plaza y promoción', conceptoClave: 'Las cuatro variables deben ser coherentes entre sí.', aplicacion: 'Diseña el marketing mix de un producto.' },
    { titulo: 'Marketing digital y canales', conceptoClave: 'Los canales digitales permiten segmentar, medir y relacionarse con el cliente.', aplicacion: 'Elabora un calendario de contenidos para dos semanas.' },
    { titulo: 'Contenidos, redes y reputación', conceptoClave: 'La reputación se construye con consistencia y comunicación responsable.', aplicacion: 'Analiza la reputación de una marca local.' },
    { titulo: 'Métricas y analítica', conceptoClave: 'Las métricas convierten objetivos en evidencia de desempeño.', aplicacion: 'Define tres KPI y su forma de medición.' },
    { titulo: 'Ética, responsabilidad social y sostenibilidad', conceptoClave: 'La sostenibilidad exige equilibrar resultados económicos, sociales y ambientales.', aplicacion: 'Evalúa un caso de publicidad engañosa.' },
    { titulo: 'Plan de negocio y presentación ejecutiva', conceptoClave: 'Un plan integra mercado, operaciones, finanzas y estrategia.', aplicacion: 'Presenta un pitch de tres minutos con evidencia.' },
  ],
};

const ARTE: AsignaturaCurricular = {
  codigo: '09_Arte_ECA',
  nombre: 'Educación Cultural y Artística (ECA)',
  nombreCorto: 'Arte 8.°',
  area: 'ARTE',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '09_Arte_ECA',
  driveFolderId: '1nQS0q_UPmqPLkwz0_zlitHzfdVz7nAkt',
  textoPrincipal: 'ECA_artistica 8.pdf • Macro y Micro Currículo ECA',
  bibliografia: [
    { titulo: 'Educación Cultural y Artística 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'La historia del arte (Gombrich)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Elementos de la composición visual (Wong)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Museos virtuales: Metropolitan, Prado y MUNA', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La educación artística integra producción, apreciación e historia del arte. En octavo de básica se profundiza en dibujo, color, composición, pintura, escultura, fotografía, audiovisual, música, teatro y danza. Cada lenguaje tiene elementos, técnicas y códigos propios. La obra se interpreta en relación con su contexto, su intención y sus materiales.',
  analisisModelo:
    'La composición organiza el espacio mediante equilibrio, jerarquía, contraste y ritmo. La perspectiva construye profundidad. El color comunica sensaciones y simbolismos. La fotografía y el cine combinan encuadre, luz y montaje. La música organiza sonido y silencio en el tiempo. El teatro y la danza usan el cuerpo y el espacio para crear significado.',
  aplicacionVida:
    'El arte desarrolla pensamiento creativo, sensibilidad y comunicación. Diseñar, fotografiar, actuar o componer requiere planificación y ensayo. La apreciación artística enriquece la experiencia cultural y el respeto por el patrimonio.',
  sintesis:
    'Toda obra responde a decisiones técnicas y conceptuales. El proceso creativo incluye investigación, bocetos, producción y reflexión. La crítica artística describe, analiza, interpreta y evalúa con argumentos.',
  preguntaDisparadora: '¿Cómo decide un artista qué mostrar y qué dejar fuera del encuadre?',
  objetivos: [
    'Aplicar técnicas de composición y color en producciones propias.',
    'Analizar obras con categorías históricas y formales.',
    'Integrar lenguajes artísticos en un proyecto original.',
  ],
  metodo: [
    'Investigar referentes y contexto de la propuesta.',
    'Realizar bocetos y explorar materiales.',
    'Producir la obra con técnica y intención.',
    'Presentar y reflexionar sobre el resultado.',
  ],
  conceptosFundamentales: [
    { termino: 'Composición', definicion: 'Organización intencionada de elementos en un espacio visual.' },
    { termino: 'Encuadre', definicion: 'Selección del espacio y los elementos que aparecen en una imagen.' },
    { termino: 'Curaduría', definicion: 'Selección, organización y presentación de obras para comunicar un concepto.' },
  ],
  lema: {
    referencia: 'Paul Klee',
    texto: 'El arte no reproduce lo visible; hace visible.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Composición, perspectiva y círculo cromático',
  simulacion: {
    tipo: 'ART_CANVAS',
    titulo: 'Estudio de composición y lenguaje audiovisual',
    instrucciones:
      'Crea tres bocetos de un mismo tema con encuadres distintos. Elige uno, define la paleta y explica cómo cambia la emoción.',
    codigoOTextoInicial: 'tema: la ciudad\nencuadres: general, medio, detalle\npaleta: cálida / fría\nintención: contraste entre ruido y calma',
    demostracionInteractiva:
      'Un plano general muestra contexto; un primer plano enfatiza emoción. La paleta cálida intensifica la energía y la fría sugiere distancia.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué es el encuadre en una imagen?',
      opciones: ['La selección del espacio y elementos visibles', 'El precio de la obra', 'El nombre del autor'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El encuadre decide qué se muestra y qué queda fuera.',
    },
    {
      enunciado: '¿Qué principio organiza el peso visual?',
      opciones: ['El equilibrio', 'La firma', 'El marco'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El equilibrio distribuye el peso visual en la composición.',
    },
    {
      enunciado: '¿Qué hace la curaduría?',
      opciones: ['Selecciona y organiza obras para comunicar un concepto', 'Pinta las obras', 'Vende entradas'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La curaduría construye un relato expositivo con las obras.',
    },
  ],
  retoPbl: {
    titulo: 'Exposición audiovisual sobre identidad y territorio',
    descripcion:
      'Crea una serie de tres imágenes o un video breve sobre tu entorno. Presenta la obra con una ficha curatorial que explique concepto, técnica y decisiones.',
    criteriosMineduc: [
      'Coherencia conceptual de la serie.',
      'Dominio técnico del lenguaje elegido.',
      'Originalidad y reflexión.',
      'Ficha curatorial y presentación oral.',
    ],
    entregableEsperado: 'Serie de tres obras o video de 60 segundos con ficha curatorial.',
  },
  unidades: [
    { titulo: 'Lenguajes artísticos y experiencia estética', conceptoClave: 'Cada lenguaje artístico tiene códigos y posibilidades expresivas propias.', aplicacion: 'Compara una obra visual y una musical con criterios.' },
    { titulo: 'Dibujo, proporción y perspectiva', conceptoClave: 'La proporción y la perspectiva construyen representación espacial.', aplicacion: 'Dibuja un espacio con punto de fuga.' },
    { titulo: 'Color y composición', conceptoClave: 'El color y la composición orientan la lectura visual.', aplicacion: 'Crea dos composiciones con paletas opuestas.' },
    { titulo: 'Pintura: técnica y material', conceptoClave: 'Cada técnica pictórica produce texturas y efectos distintos.', aplicacion: 'Experimenta con acuarela y acrílico.' },
    { titulo: 'Escultura y volumen', conceptoClave: 'El volumen se construye por adición, sustracción o modelado.', aplicacion: 'Crea una escultura con material reciclado.' },
    { titulo: 'Fotografía: luz, encuadre y narrativa', conceptoClave: 'La luz y el encuadre construyen el sentido de la imagen.', aplicacion: 'Realiza una serie fotográfica de cinco imágenes.' },
    { titulo: 'Cine y narrativa audiovisual', conceptoClave: 'El montaje organiza el tiempo y el significado del relato.', aplicacion: 'Edita un video de 60 segundos con tres planos.' },
    { titulo: 'Música y apreciación sonora', conceptoClave: 'La música organiza altura, duración, intensidad y timbre.', aplicacion: 'Analiza una pieza y describe sus elementos.' },
    { titulo: 'Teatro: personaje, conflicto y puesta en escena', conceptoClave: 'El teatro construye sentido mediante acción, voz y espacio.', aplicacion: 'Monta una escena breve con conflicto claro.' },
    { titulo: 'Danza y composición coreográfica', conceptoClave: 'La coreografía organiza movimiento, espacio y tiempo.', aplicacion: 'Crea una secuencia de ocho tiempos.' },
    { titulo: 'Arte ecuatoriano y latinoamericano', conceptoClave: 'El arte regional dialoga con identidades, historias y resistencias.', aplicacion: 'Investiga una obra y su contexto.' },
    { titulo: 'Curaduría y montaje expositivo', conceptoClave: 'La exposición comunica un relato mediante selección y espacio.', aplicacion: 'Diseña una sala con tres obras y rótulos.' },
  ],
};

const EDUCACION_FISICA: AsignaturaCurricular = {
  codigo: '10_Educacion_Fisica',
  nombre: 'Educación Física y Salud',
  nombreCorto: 'Ed. Física 8.°',
  area: 'EDUCACION_FISICA',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '10_Educacion_Fisica',
  driveFolderId: '1IpAFm-QH-FprnIp_7oFlzO3JMpTSxSbI',
  textoPrincipal: 'Macro y Micro Currículo Educación Física - Avril',
  bibliografia: [
    { titulo: 'Educación Física 8.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Fisiología del ejercicio (McArdle, Katch y Katch)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Manual de primeros auxilios y prevención de lesiones', tipo: 'UNIVERSITARIO' },
    { titulo: 'OMS: recomendaciones de actividad física para adolescentes', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La educación física estudia el movimiento humano, la condición física y los hábitos saludables desde la fisiología, la biomecánica y la pedagogía. En octavo de básica se desarrollan resistencia, fuerza, flexibilidad, velocidad y coordinación mediante entrenamiento planificado. Se analizan nutrición, hidratación, descanso, prevención de lesiones y primeros auxilios.',
  analisisModelo:
    'El rendimiento físico depende de los sistemas cardiovascular, respiratorio y muscular. La energía se obtiene por vías aeróbicas y anaeróbicas. La carga de entrenamiento debe progresar y alternar con recuperación. La técnica correcta distribuye fuerzas y reduce el riesgo. La frecuencia cardiaca y la percepción de esfuerzo permiten regular la intensidad.',
  aplicacionVida:
    'La actividad física regular mejora la salud física y mental, el rendimiento académico y la calidad del sueño. El deporte enseña disciplina, cooperación y manejo de la frustración. Los primeros auxilios y la prevención salvan vidas y reducen lesiones.',
  sintesis:
    'Un plan de entrenamiento seguro es progresivo, individualizado y equilibrado. Calentar, hidratarse y dormir son parte del entrenamiento. La salud es un proceso sostenido, no un resultado inmediato.',
  preguntaDisparadora: '¿Por qué dos personas con el mismo entrenamiento obtienen resultados distintos?',
  objetivos: [
    'Diseñar un plan de entrenamiento seguro y progresivo.',
    'Explicar las respuestas fisiológicas al ejercicio.',
    'Aplicar normas de prevención y primeros auxilios.',
  ],
  metodo: [
    'Evaluar la condición física inicial con pruebas simples.',
    'Definir objetivos medibles y una progresión semanal.',
    'Registrar frecuencia cardiaca, esfuerzo y recuperación.',
    'Ajustar el plan según los resultados y el descanso.',
  ],
  conceptosFundamentales: [
    { termino: 'Resistencia aeróbica', definicion: 'Capacidad de mantener un esfuerzo moderado durante un tiempo prolongado.' },
    { termino: 'Sobrecarga progresiva', definicion: 'Aumento gradual y controlado del estímulo de entrenamiento.' },
    { termino: 'Recuperación', definicion: 'Proceso de descanso y adaptación que permite mejorar el rendimiento.' },
  ],
  lema: {
    referencia: 'Thomas Denison Wood (adaptado)',
    texto: 'La educación física es la educación del movimiento para la salud y la vida.',
  },
  tipoGrafico: 'CELULA_VIVA',
  insigniaGrafico: 'Sistemas cardiovascular y muscular en el ejercicio',
  simulacion: {
    tipo: 'SCIENCE_LAB',
    titulo: 'Laboratorio de condición física y recuperación',
    instrucciones:
      'Registra tu frecuencia cardiaca antes, durante y después de una prueba de resistencia. Calcula tu recuperación en dos minutos y propone una progresión.',
    codigoOTextoInicial: 'reposo: ___ lpm\nesfuerzo: ___ lpm\nrecuperación 2 min: ___ lpm\nobjetivo semanal: ___',
    demostracionInteractiva:
      'Una recuperación más rápida indica mejor adaptación cardiovascular. La progresión debe aumentar la carga en pequeñas dosis.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué principio aumenta gradualmente el estímulo de entrenamiento?',
      opciones: ['La sobrecarga progresiva', 'El azar', 'La deshidratación'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La sobrecarga progresiva permite adaptaciones sin lesiones.',
    },
    {
      enunciado: '¿Qué sistema transporta oxígeno a los músculos?',
      opciones: ['El cardiovascular', 'El digestivo únicamente', 'El esquelético únicamente'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El sistema cardiovascular transporta oxígeno y nutrientes.',
    },
    {
      enunciado: '¿Qué debe hacerse ante una lesión deportiva?',
      opciones: ['Detener la actividad y aplicar primeros auxilios', 'Continuar con dolor', 'Ignorar la lesión'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Detener la actividad y aplicar el protocolo de primeros auxilios evita complicaciones.',
    },
  ],
  retoPbl: {
    titulo: 'Programa personal de entrenamiento y salud',
    descripcion:
      'Diseña y ejecuta un programa de cuatro semanas con objetivos, sesiones, registros de esfuerzo y una evaluación final. Incluye nutrición, hidratación y descanso.',
    criteriosMineduc: [
      'Planificación progresiva y segura.',
      'Registro riguroso de datos.',
      'Explicación fisiológica de los cambios.',
      'Reflexión sobre hábitos y bienestar.',
    ],
    entregableEsperado: 'Bitácora de cuatro semanas con plan, registros y evaluación.',
  },
  unidades: [
    { titulo: 'Condición física y evaluación inicial', conceptoClave: 'La evaluación inicial permite individualizar el entrenamiento.', aplicacion: 'Mide resistencia, fuerza y flexibilidad iniciales.' },
    { titulo: 'Resistencia aeróbica', conceptoClave: 'La resistencia mejora la eficiencia cardiovascular y respiratoria.', aplicacion: 'Realiza una progresión de carrera continua.' },
    { titulo: 'Fuerza y flexibilidad', conceptoClave: 'La fuerza y la flexibilidad equilibran el movimiento y previenen lesiones.', aplicacion: 'Ejecuta una rutina de fuerza con peso corporal.' },
    { titulo: 'Velocidad y agilidad', conceptoClave: 'La velocidad y la agilidad dependen de coordinación y potencia neuromuscular.', aplicacion: 'Mide una prueba de agilidad y repite tras práctica.' },
    { titulo: 'Biomecánica del movimiento', conceptoClave: 'Las palancas y fuerzas explican la eficiencia del movimiento humano.', aplicacion: 'Analiza la técnica de un salto y propone mejoras.' },
    { titulo: 'Nutrición e hidratación', conceptoClave: 'La energía y los micronutrientes sostienen el rendimiento y la recuperación.', aplicacion: 'Diseña un menú diario para un adolescente activo.' },
    { titulo: 'Salud, sueño y prevención', conceptoClave: 'El descanso y los hábitos saludables condicionan la adaptación física.', aplicacion: 'Registra tu sueño durante una semana y analiza patrones.' },
    { titulo: 'Deportes de equipo y reglas', conceptoClave: 'Los deportes de equipo combinan técnica, táctica y cooperación.', aplicacion: 'Organiza un torneo con reglas y roles.' },
    { titulo: 'Deportes individuales y técnica', conceptoClave: 'La técnica individual se perfecciona con práctica deliberada.', aplicacion: 'Analiza y mejora un gesto técnico.' },
    { titulo: 'Planificación del entrenamiento', conceptoClave: 'La periodización organiza cargas y recuperación en el tiempo.', aplicacion: 'Diseña un microciclo semanal.' },
    { titulo: 'Primeros auxilios y prevención de lesiones', conceptoClave: 'La respuesta oportuna reduce el daño y facilita la recuperación.', aplicacion: 'Practica el protocolo ante un esguince.' },
    { titulo: 'Proyecto de vida activa', conceptoClave: 'La actividad física sostenida requiere hábitos y propósito personal.', aplicacion: 'Elabora un plan de vida activa a un año.' },
  ],
};

const RELACION_CON_DIOS: AsignaturaCurricular = {
  codigo: '11_Relacion_con_Dios',
  nombre: 'Relación con Dios (Teología y Cosmovisión)',
  nombreCorto: 'Teología 8.°',
  area: 'TEOLOGIA',
  profesorIA: 'Dra. Sofía de Valenzuela',
  carpetaDrive: '11_Relacion_con_Dios',
  driveFolderId: '1bHWAxjYIcfxHEDIIPzJiYnAsOQ-id_X-',
  textoPrincipal: 'Macro y Micro Currículo Relación con Dios - Avril',
  bibliografia: [
    { titulo: 'Biblia Reina-Valera (edición de estudio)', tipo: 'FUENTE_PRIMARIA' },
    { titulo: 'Teología Sistemática (Wayne Grudem)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Institución de la religión cristiana (Juan Calvino)', tipo: 'FUENTE_PRIMARIA' },
    { titulo: 'Mero cristianismo (C. S. Lewis)', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'La teología cristiana estudia la revelación de Dios, su carácter, sus obras y la respuesta humana. En octavo de básica se profundiza en la doctrina de la revelación, la Trinidad, la creación, la antropología bíblica, la cristología, la soteriología, la pneumatología, la eclesiología y la escatología. El estudio exige lectura exegética, contexto histórico, formulación doctrinal y aplicación pastoral.',
  analisisModelo:
    'La teología bíblica describe el desarrollo del pacto y la redención a lo largo de la Escritura. La teología sistemática articula las doctrinas en coherencia con el texto bíblico y la tradición histórica. La interpretación responsable distingue el sentido original del pasaje, su lugar en la historia redentora y su aplicación contemporánea. La razón, la tradición y la experiencia se subordinan a la autoridad de la Escritura.',
  aplicacionVida:
    'La doctrina cristiana forma el carácter, la conciencia y la conducta. La gracia de Dios produce arrepentimiento, fe, gratitud y amor al prójimo. La vida congregacional, la oración y el servicio son medios de crecimiento espiritual. La cosmovisión bíblica orienta decisiones sobre trabajo, familia, dinero, justicia y cuidado de la creación.',
  sintesis:
    'La fe cristiana se centra en la persona y obra de Jesucristo. La salvación es por gracia mediante la fe y se expresa en una vida renovada. La esperanza cristiana se fundamenta en la resurrección y en la restauración final de todas las cosas.',
  preguntaDisparadora: '¿Cómo se relacionan la razón, la tradición y la Escritura en la teología cristiana?',
  objetivos: [
    'Explicar las doctrinas centrales de la fe cristiana con rigor bíblico.',
    'Interpretar pasajes bíblicos en su contexto literario e histórico.',
    'Aplicar la doctrina a la vida personal, familiar y comunitaria.',
  ],
  metodo: [
    'Leer el pasaje en su contexto literario e histórico.',
    'Identificar la estructura, los términos clave y el género.',
    'Relacionar el texto con la historia de la redención.',
    'Formular una aplicación pastoral y una oración.',
  ],
  conceptosFundamentales: [
    { termino: 'Revelación especial', definicion: 'Autocomunicación de Dios mediante la Escritura y, de forma culminante, en Cristo.' },
    { termino: 'Soteriología', definicion: 'Doctrina de la salvación: su necesidad, provisión y aplicación.' },
    { termino: 'Cosmovisión bíblica', definicion: 'Marco de interpretación de la realidad centrado en Dios, la creación, la caída, la redención y la restauración.' },
  ],
  lema: {
    referencia: 'Colosenses 2:3',
    texto: 'En quien están escondidos todos los tesoros de la sabiduría y del conocimiento.',
  },
  tipoGrafico: 'BALANZA_ALGEBRAICA',
  insigniaGrafico: 'Historia de la redención: creación, caída, redención y restauración',
  simulacion: {
    tipo: 'BIBLE_THEOLOGY',
    titulo: 'Seminario de exégesis y teología sistemática',
    instrucciones:
      'Lee Romanos 3:21-26. Identifica el problema, la provisión divina y el resultado. Relaciona el pasaje con las doctrinas de la justificación y la redención.',
    codigoOTextoInicial:
      'Pasaje: Romanos 3:21-26\nObservar: problema, provisión, resultado\nDoctrinas: justificación, redención, propiciación\nAplicación: fe, gratitud, humildad',
    demostracionInteractiva:
      'El pasaje presenta la justicia de Dios, la justificación por gracia mediante la fe y la redención en Cristo. La aplicación conduce a humildad y gratitud.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué significa justificación por gracia?',
      opciones: ['Que Dios declara justo al pecador por medio de Cristo, sin méritos humanos', 'Que el ser humano gana su salvación', 'Que la fe es innecesaria'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La justificación es un acto gratuito de Dios basado en la obra de Cristo.',
    },
    {
      enunciado: '¿Cuál es el centro de la historia bíblica?',
      opciones: ['La persona y obra de Jesucristo', 'La política contemporánea', 'La filosofía griega'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La Escritura se cumple y se interpreta a la luz de Cristo.',
    },
    {
      enunciado: '¿Qué produce la doctrina de la gracia en la vida cristiana?',
      opciones: ['Humildad, gratitud y obediencia agradecida', 'Orgullo y autosuficiencia', 'Indiferencia moral'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La gracia transforma el corazón y motiva una vida santa.',
    },
  ],
  retoPbl: {
    titulo: 'Ensayo de teología aplicada',
    descripcion:
      'Escribe un ensayo de 1.200 palabras sobre una doctrina central, con al menos cinco citas bíblicas, dos fuentes teológicas y una aplicación concreta a la vida familiar o escolar.',
    criteriosMineduc: [
      'Fidelidad bíblica y contextual.',
      'Uso de fuentes teológicas confiables.',
      'Estructura argumentativa clara.',
      'Aplicación pastoral pertinente.',
    ],
    entregableEsperado: 'Ensayo de 1.200 palabras con bibliografía.',
  },
  unidades: [
    { titulo: 'Introducción a la teología: fe, razón y método', conceptoClave: 'La teología busca comprender la fe de forma ordenada y fiel al texto bíblico.', aplicacion: 'Distingue teología bíblica, histórica y sistemática.' },
    { titulo: 'Doctrina de la revelación', conceptoClave: 'Dios se revela en la creación y de forma especial en la Escritura y en Cristo.', aplicacion: 'Explica la diferencia entre revelación general y especial.' },
    { titulo: 'Inspiración, canon y autoridad', conceptoClave: 'La Escritura es inspirada, canónica y normativa para la fe y la conducta.', aplicacion: 'Justifica el canon con criterios históricos.' },
    { titulo: 'Teología propia: atributos de Dios', conceptoClave: 'Dios es santo, justo, amoroso, soberano e inmutable.', aplicacion: 'Relaciona tres atributos con la oración.' },
    { titulo: 'La Trinidad', conceptoClave: 'Un solo Dios existe en tres personas: Padre, Hijo y Espíritu Santo.', aplicacion: 'Explica la Trinidad sin caer en modalismo ni triteísmo.' },
    { titulo: 'Creación y providencia', conceptoClave: 'Dios creó el mundo bueno y sostiene todas las cosas.', aplicacion: 'Analiza las implicaciones éticas del cuidado de la creación.' },
    { titulo: 'Antropología bíblica', conceptoClave: 'El ser humano fue creado a imagen de Dios y está llamado a comunión y mayordomía.', aplicacion: 'Define la dignidad humana desde Génesis.' },
    { titulo: 'Hamartiología: pecado y consecuencias', conceptoClave: 'El pecado es rebelión contra Dios y corrupción de la naturaleza humana.', aplicacion: 'Distingue pecado, tentación y debilidad.' },
    { titulo: 'Cristología', conceptoClave: 'Jesucristo es verdadero Dios y verdadero hombre, mediador y Salvador.', aplicacion: 'Explica la unión hipostática con lenguaje claro.' },
    { titulo: 'Soteriología: cruz y resurrección', conceptoClave: 'La salvación se consuma en la muerte y resurrección de Cristo.', aplicacion: 'Relaciona justificación, santificación y glorificación.' },
    { titulo: 'Pneumatología', conceptoClave: 'El Espíritu Santo convence, regenera, habita y capacita a la iglesia.', aplicacion: 'Identifica los frutos y dones del Espíritu.' },
    { titulo: 'Eclesiología', conceptoClave: 'La iglesia es el pueblo de Dios, cuerpo de Cristo y templo del Espíritu.', aplicacion: 'Evalúa la importancia de la comunión local.' },
    { titulo: 'Ordenanzas y vida sacramental', conceptoClave: 'El bautismo y la Cena del Señor expresan y fortalecen la fe.', aplicacion: 'Explica el significado de cada ordenanza.' },
    { titulo: 'Escatología', conceptoClave: 'La esperanza cristiana se funda en la segunda venida y la restauración final.', aplicacion: 'Distingue esperanza bíblica de especulación.' },
    { titulo: 'Ética cristiana y vida pública', conceptoClave: 'La fe se expresa en justicia, honestidad y amor al prójimo.', aplicacion: 'Analiza un dilema ético con principios bíblicos.' },
    { titulo: 'Cosmovisión, misión y discipulado', conceptoClave: 'Todo creyente está llamado a vivir y comunicar el evangelio con integridad.', aplicacion: 'Diseña un plan personal de discipulado.' },
  ],
};

export const ASIGNATURAS_AVRIL_8VO: AsignaturaCurricular[] = [
  MATEMATICAS,
  LENGUA,
  CIENCIAS,
  SOCIALES,
  INGLES,
  SOFTWARE,
  POLITICAS,
  ADMINISTRACION,
  ARTE,
  EDUCACION_FISICA,
  RELACION_CON_DIOS,
];

/**
 * Horario semanal oficial de Avril (08:00-12:00, recreo 09:30-10:00).
 */
export const HORARIO_AVRIL_8VO: PerfilCurricular['horarioSemanal'] = {
  Lunes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Relación con Dios (Teología y Cosmovisión)', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
  ],
  Martes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Academic English & Literature', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Academic English & Literature', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales e Historia del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Administración y Marketing Digital', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Cultural y Artística (ECA)', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Miercoles: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Software y Programación Python', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Física y Salud', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Jueves: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Ciencias Naturales Integradas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Políticas y Relaciones Internacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Administración y Marketing Digital', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Viernes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas y Pre-Álgebra', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Software y Programación Python', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Políticas y Relaciones Internacionales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Estudios Sociales e Historia del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Academic English & Literature', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
  ],
};

export const PERFIL_AVRIL_8VO: PerfilCurricular = {
  estudiante: 'Avril',
  grado: '8.° de EGB (Básica Superior)',
  subnivelMineduc: 'Básica Superior',
  edad: 12,
  codigoCarpetaAnioDrive: '08_Octavo_EGB_Avril',
  anoLectivo: '2026-2027',
  asignaturas: ASIGNATURAS_AVRIL_8VO,
  horarioSemanal: HORARIO_AVRIL_8VO,
};
