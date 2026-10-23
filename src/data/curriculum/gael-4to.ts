/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Malla Curricular de Gael (4.° EGB)
 * ARCHIVO: src/data/curriculum/gael-4to.ts
 *
 * PROPÓSITO:
 * Reemplaza el catálogo genérico de cinco materias por la malla real de nueve
 * asignaturas identificadas en la carpeta de Google Drive
 * "04_Cuarto_EGB_Gael". Todo el contenido científico, lingüístico, social,
 * artístico y corporal es académico y neutral. La formación confesional se
 * concentra exclusivamente en "Relación con Dios".
 * ==============================================================================
 */

import type { AsignaturaCurricular, PerfilCurricular } from './tipos';

const LENGUA: AsignaturaCurricular = {
  codigo: '01_Lengua_y_Literatura',
  nombre: 'Lengua y Literatura',
  nombreCorto: 'Lengua 4.°',
  area: 'LENGUA_Y_LITERATURA',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '01_Lengua_y_Literatura',
  driveFolderId: '1pZw_kVlOw_nzEvHQivhJC4CdhimN2dAS',
  textoPrincipal: 'Texto Lengua 4.pdf • Super-cuaderno de reglas de ortografía',
  bibliografia: [
    { titulo: 'Lengua y Literatura 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Super-cuaderno de reglas de ortografía: 100 ejercicios', tipo: 'UNIVERSITARIO' },
    { titulo: 'Cómo escribir bien en español (Reyes, 2019)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Biblioteca Digital Infantil del Ministerio de Educación', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La lengua es un sistema convencional de signos que permite representar ideas, emociones y conocimiento. En cuarto de básica se consolidan la decodificación fluida, la comprensión literal e inferencial y la producción de textos breves con estructura clara. El estudio del lenguaje parte de la observación de textos reales: noticias, cuentos, instructivos y poemas, para identificar cómo funcionan la ortografía, la puntuación, el vocabulario y la organización de las ideas.',
  analisisModelo:
    'Un texto se comprende cuando el lector reconstruye su sentido global, identifica la idea principal, distingue hechos de opiniones y relaciona la información con sus conocimientos previos. La estructura narrativa (inicio, nudo y desenlace), la estructura informativa (título, entrada, cuerpo y cierre) y los conectores permiten organizar el pensamiento. La revisión ortográfica y la puntuación no son adornos: son condiciones para que el mensaje llegue con precisión al destinatario.',
  aplicacionVida:
    'Escribir con claridad sirve para exponer una idea en clase, redactar una carta, resumir una lectura o comunicar un descubrimiento. Leer con atención permite comprender instrucciones, evaluar noticias y disfrutar de la literatura. El vocabulario preciso y la escucha activa fortalecen la convivencia y la participación ciudadana.',
  sintesis:
    'La competencia comunicativa integra leer, escribir, escuchar y hablar con propósito. Un texto bien construido tiene unidad, coherencia y adecuación al destinatario. La revisión en tres pasos —contenido, organización y forma— convierte un borrador en un texto confiable.',
  preguntaDisparadora: '¿Cómo puede una palabra cambiar por completo el sentido de una historia?',
  objetivos: [
    'Identificar la idea principal y las ideas secundarias de un texto breve.',
    'Aplicar las reglas de mayúscula, punto y coma en producciones propias.',
    'Escribir un relato breve con inicio, nudo y desenlace.',
  ],
  metodo: [
    'Leer el texto completo una primera vez para captar el sentido global.',
    'Subrayar la idea principal y separar los detalles que la explican.',
    'Planificar el escrito con un esquema de inicio, desarrollo y cierre.',
    'Revisar ortografía, puntuación y coherencia antes de publicar.',
  ],
  conceptosFundamentales: [
    { termino: 'Idea principal', definicion: 'Enunciado que resume de qué trata el texto y sostiene el resto de la información.' },
    { termino: 'Coherencia', definicion: 'Relación lógica entre las ideas para que el texto se comprenda como una unidad.' },
    { termino: 'Puntuación', definicion: 'Sistema de signos que organiza pausas, oraciones y énfasis en la escritura.' },
  ],
  lema: {
    referencia: 'Vygotsky, Pensamiento y lenguaje',
    texto: 'El lenguaje es el instrumento con el que construimos y compartimos el conocimiento.',
  },
  tipoGrafico: 'ARBOL_GRAMATICAL',
  insigniaGrafico: 'Árbol de la oración: sujeto, verbo y complemento',
  simulacion: {
    tipo: 'LANGUAGE_STUDIO',
    titulo: 'Taller de escritura y análisis de oraciones',
    instrucciones:
      'Escribe una oración sobre tu animal favorito. Identifica el sujeto y el predicado. Luego corrige mayúsculas y puntuación.',
    codigoOTextoInicial:
      'oración: el oso de anteojos vive en los páramos andinos\ntarea: identificar sujeto y predicado; corregir mayúscula y punto final',
    demostracionInteractiva:
      'Sujeto: el oso de anteojos. Predicado: vive en los páramos andinos. Versión corregida: El oso de anteojos vive en los páramos andinos.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué elemento del texto expresa la idea más importante?',
      opciones: ['La idea principal', 'El título decorativo', 'La cantidad de párrafos'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La idea principal resume el contenido y organiza las ideas secundarias.',
    },
    {
      enunciado: '¿Cuál oración está correctamente puntuada?',
      opciones: ['el colibrí vuela alto y visita las flores', 'El colibrí vuela alto y visita las flores.', 'El colibrí vuela alto, y visita las flores'],
      indiceCorrecto: 1,
      explicacionPedagogica: 'La oración inicia con mayúscula y termina con punto.',
    },
    {
      enunciado: '¿Qué parte de la narración presenta el conflicto?',
      opciones: ['El nudo', 'El título', 'La dedicatoria'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'En el nudo aparece el conflicto que los personajes deben resolver.',
    },
  ],
  retoPbl: {
    titulo: 'Antología ilustrada de animales del Ecuador',
    descripcion:
      'Investiga un animal nativo, redacta una ficha informativa y un cuento breve, e ilustra ambos textos. Integra descripción, narración y ortografía revisada.',
    criteriosMineduc: [
      'Claridad de la idea principal y coherencia del relato.',
      'Uso correcto de mayúsculas, punto y coma.',
      'Vocabulario preciso y adecuado al tema.',
      'Revisión y corrección del borrador.',
    ],
    entregableEsperado: 'Ficha informativa y cuento ilustrado de una página cada uno.',
  },
  unidades: [
    { titulo: 'Comprensión lectora: idea principal e ideas secundarias', conceptoClave: 'La idea principal sintetiza el tema; las secundarias la explican o amplían.', aplicacion: 'Subraya la idea principal de una noticia local y anota dos detalles que la apoyen.' },
    { titulo: 'El sustantivo: propio, común y colectivo', conceptoClave: 'El sustantivo nombra personas, animales, lugares, cosas e ideas.', aplicacion: 'Clasifica diez sustantivos de un texto y explica por qué son propios o comunes.' },
    { titulo: 'El adjetivo y la descripción precisa', conceptoClave: 'El adjetivo precisa cualidades del sustantivo y enriquece la descripción.', aplicacion: 'Describe un paisaje con cinco adjetivos sensoriales sin repetirlos.' },
    { titulo: 'Mayúsculas, punto y coma', conceptoClave: 'Las mayúsculas y los signos de puntuación organizan el texto y evitan ambigüedades.', aplicacion: 'Corrige un párrafo sin puntuación y explica cada cambio.' },
    { titulo: 'La oración: sujeto, predicado y concordancia', conceptoClave: 'La oración tiene un sujeto y un predicado que concuerdan en número y persona.', aplicacion: 'Separa sujeto y predicado en cinco oraciones y verifica la concordancia.' },
    { titulo: 'Familias léxicas y ortografía c, s, z', conceptoClave: 'Las palabras de una misma familia comparten raíz y suelen compartir reglas ortográficas.', aplicacion: 'Forma familias de palabras y aplica la regla ortográfica correspondiente.' },
    { titulo: 'El verbo: tiempo, persona y número', conceptoClave: 'El verbo expresa acción o estado y se conjuga en tiempo, persona y número.', aplicacion: 'Conjuga tres verbos en pasado, presente y futuro dentro de oraciones.' },
    { titulo: 'La narración: inicio, nudo y desenlace', conceptoClave: 'La estructura narrativa organiza los hechos y da sentido al conflicto.', aplicacion: 'Escribe un cuento de tres párrafos con un conflicto y una solución verosímil.' },
    { titulo: 'Textos informativos: noticia y ficha', conceptoClave: 'La noticia responde qué, quién, cuándo, dónde y por qué; la ficha organiza datos.', aplicacion: 'Redacta una ficha informativa sobre un lugar de tu provincia.' },
    { titulo: 'Poema, rima y lenguaje figurado', conceptoClave: 'La poesía usa ritmo, rima y comparaciones para crear imágenes y emoción.', aplicacion: 'Escribe un poema de cuatro versos con una comparación y una rima.' },
    { titulo: 'Vocabulario: diccionario y contexto', conceptoClave: 'El contexto y el diccionario permiten precisar el significado de una palabra.', aplicacion: 'Selecciona cinco palabras desconocidas y deduce su significado antes de consultar.' },
    { titulo: 'Producción escrita: planificar, redactar y revisar', conceptoClave: 'El proceso de escritura mejora el texto mediante planificación, borrador y revisión.', aplicacion: 'Transforma un borrador en una versión final con lista de verificación.' },
  ],
};

const MATEMATICAS: AsignaturaCurricular = {
  codigo: '02_Matematicas',
  nombre: 'Matemáticas',
  nombreCorto: 'Matemáticas 4.°',
  area: 'MATEMATICAS',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '02_Matematicas',
  driveFolderId: '1ttWjoBeEvxBo0Yxa16Ck4XnhTHws9TMZ',
  textoPrincipal: 'texto Matematica 4.pdf • Plan Curricular Matemáticas 4to EGB',
  bibliografia: [
    { titulo: 'Matemática 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Khan Academy: Aritmética y geometría de 4.° grado', tipo: 'RECURSO_DIGITAL' },
    { titulo: 'OpenStax Prealgebra 2e (capítulos iniciales)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Matemática recreativa (Gardner, selección)', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'La matemática estudia patrones, cantidades, formas y relaciones mediante definiciones y procedimientos verificables. En cuarto de básica se afianza el sistema decimal de base diez, las cuatro operaciones con números naturales, las fracciones simples, la medición y la lectura de datos. Cada procedimiento se justifica con propiedades matemáticas y se comprueba con una operación inversa o una estimación.',
  analisisModelo:
    'El valor posicional explica por qué un mismo dígito representa cantidades distintas según su lugar. La suma y la resta son operaciones inversas; la multiplicación es una suma repetida y la división reparte en partes iguales. Las fracciones representan partes de un todo o de un conjunto. La geometría describe figuras y cuerpos mediante lados, vértices, ángulos y medidas. Los gráficos de barras traducen datos en información visual.',
  aplicacionVida:
    'Calcular con exactitud ayuda a administrar una mesada, medir ingredientes, comparar precios, leer el horario del transporte y comprender estadísticas sencillas. La geometría permite diseñar objetos y espacios. La resolución de problemas desarrolla paciencia, orden y pensamiento crítico.',
  sintesis:
    'Resolver un problema matemático exige comprender los datos, elegir una estrategia, ejecutarla y comprobar el resultado. La estimación y el cálculo mental permiten anticipar si una respuesta es razonable. La precisión se construye con práctica deliberada y revisión.',
  preguntaDisparadora: '¿Por qué el mismo número puede valer diez, cien o mil según su posición?',
  objetivos: [
    'Leer, escribir y descomponer números naturales hasta 9.999.',
    'Resolver sumas, restas, multiplicaciones y divisiones con verificación.',
    'Interpretar fracciones simples y gráficos de barras.',
  ],
  metodo: [
    'Identificar los datos y la pregunta del problema.',
    'Representar la situación con material concreto, dibujo o esquema.',
    'Aplicar la operación y justificar cada paso.',
    'Comprobar con la operación inversa o una estimación.',
  ],
  conceptosFundamentales: [
    { termino: 'Valor posicional', definicion: 'Valor que toma un dígito según la posición que ocupa en el número.' },
    { termino: 'Operación inversa', definicion: 'Operación que deshace el efecto de otra y permite comprobar el resultado.' },
    { termino: 'Fracción', definicion: 'Representación de una o varias partes iguales de un todo.' },
  ],
  lema: {
    referencia: 'Galileo Galilei (atribuida)',
    texto: 'La matemática es el alfabeto con el que se ha escrito el universo.',
  },
  tipoGrafico: 'PIZZA_FRACCIONES',
  insigniaGrafico: 'Pizza de fracciones y recta numérica',
  simulacion: {
    tipo: 'MATH_EXPLORER',
    titulo: 'Laboratorio de valor posicional y fracciones',
    instrucciones:
      'Descompón el número 4.738 en unidades de mil, centenas, decenas y unidades. Luego representa 3/4 en una pizza dividida en cuatro partes iguales.',
    codigoOTextoInicial: '4.738 = 4.000 + 700 + 30 + 8\n3/4 = tres partes de un todo dividido en cuatro partes iguales',
    demostracionInteractiva:
      '4.738 tiene 4 unidades de mil, 7 centenas, 3 decenas y 8 unidades. 3/4 equivale a 0,75 del total.',
  },
  preguntasQuiz: [
    {
      enunciado: 'En el número 5.206, ¿qué valor tiene el dígito 2?',
      opciones: ['2 centenas', '2 decenas', '2 unidades de mil'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El 2 ocupa la posición de las centenas, por eso representa 200.',
    },
    {
      enunciado: '¿Qué operación comprueba una resta?',
      opciones: ['La suma del resultado con el sustraendo', 'La multiplicación de los datos', 'El redondeo al millar'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La suma es la operación inversa de la resta: diferencia + sustraendo = minuendo.',
    },
    {
      enunciado: '¿Qué fracción representa la mitad de una pizza?',
      opciones: ['1/2', '1/4', '2/3'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La mitad se obtiene al dividir el todo en dos partes iguales y tomar una.',
    },
  ],
  retoPbl: {
    titulo: 'Presupuesto familiar y mercado saludable',
    descripcion:
      'Elabora una lista de compras con precios, calcula totales, compara ofertas y presenta un gráfico de barras con los gastos por grupo de alimentos.',
    criteriosMineduc: [
      'Exactitud de los cálculos y comprobación.',
      'Uso correcto de unidades monetarias.',
      'Representación clara de datos en un gráfico.',
      'Justificación de decisiones de compra.',
    ],
    entregableEsperado: 'Presupuesto ilustrado con operaciones y gráfico de barras.',
  },
  unidades: [
    { titulo: 'Valor posicional hasta 9.999', conceptoClave: 'Cada posición vale diez veces más que la posición situada a su derecha.', aplicacion: 'Descompone y compara cinco números de cuatro cifras.' },
    { titulo: 'Suma con reagrupación', conceptoClave: 'Cuando una columna supera nueve unidades se reagrupa en la columna siguiente.', aplicacion: 'Resuelve sumas de tres cifras y verifica con la resta.' },
    { titulo: 'Resta con reagrupación y comprobación', conceptoClave: 'La resta encuentra la diferencia y se comprueba sumando el resultado al sustraendo.', aplicacion: 'Calcula diferencias de precios y comprueba cada resultado.' },
    { titulo: 'Multiplicación como suma repetida', conceptoClave: 'Multiplicar es sumar varias veces la misma cantidad.', aplicacion: 'Representa multiplicaciones con grupos iguales y arreglos rectangulares.' },
    { titulo: 'Tablas y patrones numéricos', conceptoClave: 'Los patrones permiten predecir el siguiente término de una secuencia.', aplicacion: 'Completa secuencias y explica la regla que las genera.' },
    { titulo: 'División exacta e inexacta', conceptoClave: 'Dividir reparte en partes iguales y puede dejar un residuo menor que el divisor.', aplicacion: 'Reparte objetos entre grupos y distingue cociente y residuo.' },
    { titulo: 'Fracciones: medios, cuartos y octavos', conceptoClave: 'Una fracción expresa partes iguales de un todo y se puede representar gráficamente.', aplicacion: 'Compara fracciones con material concreto y dibujos.' },
    { titulo: 'Geometría: polígonos y cuerpos geométricos', conceptoClave: 'Las figuras se clasifican por lados y ángulos; los cuerpos por caras, aristas y vértices.', aplicacion: 'Clasifica figuras del entorno y construye un cuerpo con cartulina.' },
    { titulo: 'Perímetro y área', conceptoClave: 'El perímetro mide el contorno y el área la superficie ocupada.', aplicacion: 'Mide el perímetro del aula y calcula áreas con cuadrícula.' },
    { titulo: 'Medidas de longitud, masa y capacidad', conceptoClave: 'Las unidades de medida permiten comparar magnitudes y convertir entre escalas.', aplicacion: 'Mide objetos con regla, balanza y recipientes graduados.' },
    { titulo: 'Tiempo y dinero', conceptoClave: 'El tiempo y el dinero se calculan con unidades compuestas y operaciones de conversión.', aplicacion: 'Calcula duraciones y resuelve problemas de compra y cambio.' },
    { titulo: 'Estadística: tablas y gráficos de barras', conceptoClave: 'Los datos se organizan en tablas y se visualizan en gráficos para comparar frecuencias.', aplicacion: 'Registra datos del aula y elabora un gráfico de barras con título y escala.' },
  ],
};

const CIENCIAS: AsignaturaCurricular = {
  codigo: '03_Ciencias_Naturales',
  nombre: 'Ciencias Naturales',
  nombreCorto: 'Ciencias 4.°',
  area: 'CIENCIAS_NATURALES',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '03_Ciencias_Naturales',
  driveFolderId: '1F_0dQY1uBHu0UW2ID0JatN8Y49DrSePJ',
  textoPrincipal: 'AC_4_CN.pdf • Plan Curricular Ciencias Naturales 4to EGB',
  bibliografia: [
    { titulo: 'Ciencias Naturales 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'CK-12 Life Science for Middle School (selección)', tipo: 'RECURSO_DIGITAL' },
    { titulo: 'OpenStax Biology 2e (capítulos introductorios)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Enciclopedia de los ecosistemas del Ecuador', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'Las ciencias naturales explican los fenómenos del mundo vivo y no vivo mediante observación, formulación de preguntas, experimentación y evidencia. En cuarto de básica se estudian los seres vivos, sus funciones, los ecosistemas, la materia, la energía y el cuerpo humano. Toda afirmación científica debe apoyarse en datos observables y en fuentes confiables, no en opiniones aisladas.',
  analisisModelo:
    'Los seres vivos comparten organización celular, metabolismo, crecimiento, respuesta a estímulos y reproducción. La fotosíntesis transforma energía luminosa en energía química y sostiene las cadenas alimenticias. Los ecosistemas funcionan como redes de interdependencia entre factores bióticos y abióticos. La materia cambia de estado por transferencia de energía. El cuerpo humano integra sistemas que trabajan coordinadamente para mantener la homeostasis.',
  aplicacionVida:
    'Comprender la naturaleza permite cuidar la salud, prevenir enfermedades, conservar el agua y proteger la biodiversidad. La observación rigurosa ayuda a distinguir evidencia de rumor. Las decisiones sobre alimentación, higiene y uso de recursos mejoran la calidad de vida individual y comunitaria.',
  sintesis:
    'El método científico es un ciclo: observar, preguntar, hipotetizar, experimentar, analizar y comunicar. Una explicación científica es provisional y se corrige con nueva evidencia. La curiosidad disciplinada y la honestidad intelectual son actitudes centrales del quehacer científico.',
  preguntaDisparadora: '¿Qué diferencia a un ser vivo de un objeto inanimado?',
  objetivos: [
    'Describir funciones vitales y clasificar seres vivos con criterios observables.',
    'Explicar la fotosíntesis y el flujo de energía en un ecosistema.',
    'Aplicar hábitos de salud y conservación basados en evidencia.',
  ],
  metodo: [
    'Observar el fenómeno y registrar lo que se ve sin suponer.',
    'Formular una pregunta investigable y una hipótesis comprobable.',
    'Realizar una observación o experimento controlado y registrar datos.',
    'Comparar resultados, extraer conclusiones y comunicarlas.',
  ],
  conceptosFundamentales: [
    { termino: 'Célula', definicion: 'Unidad estructural y funcional básica de los seres vivos.' },
    { termino: 'Fotosíntesis', definicion: 'Proceso por el cual las plantas producen materia orgánica usando luz, agua y dióxido de carbono.' },
    { termino: 'Ecosistema', definicion: 'Conjunto de organismos y factores físicos que interactúan en un espacio determinado.' },
  ],
  lema: {
    referencia: 'Richard Feynman',
    texto: 'El primer principio es que no debes engañarte a ti mismo, y tú eres la persona más fácil de engañar.',
  },
  tipoGrafico: 'CELULA_VIVA',
  insigniaGrafico: 'Célula vegetal y animal: organelos esenciales',
  simulacion: {
    tipo: 'SCIENCE_LAB',
    titulo: 'Laboratorio de observación celular y ecosistemas',
    instrucciones:
      'Selecciona un organelo y describe su función. Luego construye una cadena alimenticia con tres organismos de un ecosistema andino.',
    codigoOTextoInicial:
      'organelos: núcleo, membrana, citoplasma, mitocondria, cloroplasto\ncadena: planta → herbívoro → depredador',
    demostracionInteractiva:
      'El núcleo contiene el material genético; la mitocondria produce energía; el cloroplasto realiza fotosíntesis. La energía fluye del productor al consumidor.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué organelo realiza la fotosíntesis en las plantas?',
      opciones: ['El cloroplasto', 'La mitocondria', 'El núcleo'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El cloroplasto contiene clorofila y capta la energía luminosa.',
    },
    {
      enunciado: '¿Cuál es una característica común de todos los seres vivos?',
      opciones: ['Están formados por células', 'Tienen ruedas', 'No necesitan energía'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La organización celular es una característica fundamental de la vida.',
    },
    {
      enunciado: '¿Qué pasa con la energía en una cadena alimenticia?',
      opciones: ['Se transfiere y se pierde parcialmente como calor', 'Se crea de la nada', 'Permanece intacta en cada nivel'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La energía fluye entre niveles tróficos y parte se disipa como calor.',
    },
  ],
  retoPbl: {
    titulo: 'Inventario de biodiversidad del entorno',
    descripcion:
      'Observa durante una semana plantas y animales de tu barrio, registra sus características y elabora una ficha con nombre común, hábitat y una acción de conservación.',
    criteriosMineduc: [
      'Registro ordenado de observaciones.',
      'Uso de criterios de clasificación.',
      'Relación entre organismo y hábitat.',
      'Propuesta de conservación viable.',
    ],
    entregableEsperado: 'Fichas de campo ilustradas y conclusión escrita.',
  },
  unidades: [
    { titulo: 'Los seres vivos y la célula', conceptoClave: 'Todos los seres vivos están formados por células que realizan funciones vitales.', aplicacion: 'Compara célula animal y vegetal con un dibujo rotulado.' },
    { titulo: 'Clasificación de animales vertebrados e invertebrados', conceptoClave: 'Los animales se clasifican por presencia de columna vertebral, hábitat y alimentación.', aplicacion: 'Clasifica diez animales locales con una tabla de criterios.' },
    { titulo: 'Las plantas y la fotosíntesis', conceptoClave: 'Las plantas producen su alimento a partir de luz, agua y dióxido de carbono.', aplicacion: 'Diseña un experimento para observar la necesidad de luz en una planta.' },
    { titulo: 'Ecosistemas del Ecuador', conceptoClave: 'Cada ecosistema tiene factores bióticos y abióticos que condicionan la vida.', aplicacion: 'Elabora una red alimenticia de un ecosistema andino o costero.' },
    { titulo: 'El ciclo del agua', conceptoClave: 'El agua circula por evaporación, condensación, precipitación e infiltración.', aplicacion: 'Dibuja el ciclo y explica una acción para cuidar el agua.' },
    { titulo: 'Materia, estados y cambios', conceptoClave: 'La materia ocupa espacio, tiene masa y cambia de estado con la energía.', aplicacion: 'Observa hielo, agua y vapor y registra los cambios.' },
    { titulo: 'Mezclas y transformaciones', conceptoClave: 'Las mezclas conservan sus componentes; algunas transformaciones forman sustancias nuevas.', aplicacion: 'Separa una mezcla con filtro e imán y explica el método.' },
    { titulo: 'Fuerza, movimiento y energía', conceptoClave: 'Las fuerzas cambian el movimiento y la energía se transfiere entre cuerpos.', aplicacion: 'Mide distancias y explica el efecto de una fuerza en un objeto.' },
    { titulo: 'El sistema solar', conceptoClave: 'Los planetas orbitan el Sol y comparten características medibles.', aplicacion: 'Construye una maqueta a escala relativa y presenta tres datos.' },
    { titulo: 'Sistema digestivo y nutrición', conceptoClave: 'La digestión transforma los alimentos en nutrientes utilizables por el cuerpo.', aplicacion: 'Analiza un menú diario y propone mejoras nutricionales.' },
    { titulo: 'Sistemas respiratorio y circulatorio', conceptoClave: 'El intercambio de gases y la circulación transportan oxígeno y nutrientes.', aplicacion: 'Mide tu pulso antes y después de actividad física y explica el cambio.' },
    { titulo: 'Salud, higiene y prevención', conceptoClave: 'Los hábitos de higiene y la vacunación previenen enfermedades.', aplicacion: 'Diseña una campaña de higiene para tu familia con evidencias.' },
  ],
};

const SOCIALES: AsignaturaCurricular = {
  codigo: '04_Estudios_Sociales',
  nombre: 'Estudios Sociales del Ecuador',
  nombreCorto: 'Sociales 4.°',
  area: 'ESTUDIOS_SOCIALES',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '04_Estudios_Sociales',
  driveFolderId: '1V4bkUcFyGPVATJk0vxLFpnKdOgzHeato',
  textoPrincipal: '4to_EGB_ESTUDIOS_SOCIALES Librosdetextoecuador.org.pdf • Plan Curricular',
  bibliografia: [
    { titulo: 'Estudios Sociales 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Atlas geográfico del Ecuador (IGM)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Historia del Ecuador para jóvenes (Ayala Mora, adaptación)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Instituto Nacional de Estadística y Censos (INEC): datos abiertos', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'Los estudios sociales investigan cómo las sociedades se organizan en el espacio y en el tiempo, cómo producen bienes, cómo ejercen derechos y cómo transforman su entorno. En cuarto de básica se estudia la geografía del Ecuador, su diversidad cultural, sus símbolos, su historia republicana inicial y el funcionamiento básico del Estado. El análisis usa mapas, fuentes históricas, datos y testimonios.',
  analisisModelo:
    'El territorio ecuatoriano se organiza en regiones naturales con climas, relieves y ecosistemas distintos. La población se distribuye de forma desigual y comparte una gran diversidad cultural. Los símbolos patrios representan la identidad colectiva. La historia republicana se comprende a partir de causas y consecuencias. Los derechos y deberes ciudadanos se ejercen en un marco constitucional.',
  aplicacionVida:
    'Conocer el territorio ayuda a cuidar los recursos y prevenir riesgos. Comprender la diversidad cultural fortalece el respeto y la convivencia. Conocer los derechos y deberes permite participar en la escuela y la comunidad con responsabilidad.',
  sintesis:
    'La sociedad ecuatoriana es diversa y dinámica; su estudio exige comparar fuentes, ubicar fenómenos en mapas y distinguir hechos de interpretaciones. La ciudadanía responsable combina conocimiento, participación y respeto por el bien común.',
  preguntaDisparadora: '¿Cómo influye el relieve de Ecuador en la forma de vida de sus habitantes?',
  objetivos: [
    'Ubicar regiones, provincias y capitales en el mapa del Ecuador.',
    'Explicar la diversidad cultural y los símbolos patrios.',
    'Relacionar derechos, deberes y participación ciudadana.',
  ],
  metodo: [
    'Localizar el fenómeno en un mapa y describir sus límites.',
    'Consultar al menos dos fuentes y comparar la información.',
    'Identificar causas, consecuencias y actores sociales.',
    'Comunicar conclusiones con un lenguaje respetuoso y preciso.',
  ],
  conceptosFundamentales: [
    { termino: 'Región natural', definicion: 'Área con características de relieve, clima y vegetación relativamente homogéneas.' },
    { termino: 'Diversidad cultural', definicion: 'Coexistencia de pueblos, lenguas, tradiciones y formas de vida distintas.' },
    { termino: 'Ciudadanía', definicion: 'Condición que vincula a una persona con un Estado y con derechos y deberes.' },
  ],
  lema: {
    referencia: 'Marc Bloch',
    texto: 'La historia es la ciencia de los hombres en el tiempo.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Mapa del Ecuador: regiones, provincias y capitales',
  simulacion: {
    tipo: 'HISTORY_TIMELINE',
    titulo: 'Mapa interactivo y línea de tiempo del Ecuador',
    instrucciones:
      'Ubica tres provincias en el mapa, identifica su región natural y ordena tres hechos de la historia republicana en una línea de tiempo.',
    codigoOTextoInicial:
      'provincias: Pichincha, Guayas, Napo\nhechos: independencia (1822), nacimiento del Ecuador (1830), constitución actual (2008)',
    demostracionInteractiva:
      'Pichincha está en la Sierra, Guayas en la Costa y Napo en la Amazonía. La independencia de Quito ocurrió en 1822 y la separación de la Gran Colombia en 1830.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Cuál provincia pertenece a la región Amazónica?',
      opciones: ['Napo', 'Manabí', 'Galápagos'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Napo se ubica en la Amazonía ecuatoriana.',
    },
    {
      enunciado: '¿Qué representa la bandera del Ecuador?',
      opciones: ['La identidad y la historia colectiva del país', 'Un partido político', 'Una empresa privada'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los símbolos patrios representan la identidad nacional.',
    },
    {
      enunciado: '¿Qué corresponde a un deber ciudadano?',
      opciones: ['Respetar los derechos de los demás', 'Ignorar las normas', 'No participar en la escuela'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los deberes y derechos son complementarios en una sociedad democrática.',
    },
  ],
  retoPbl: {
    titulo: 'Guía turística de mi provincia',
    descripcion:
      'Investiga un destino de tu provincia, elabora un mapa, describe su patrimonio natural y cultural, y presenta recomendaciones para un turismo responsable.',
    criteriosMineduc: [
      'Precisión geográfica del mapa.',
      'Uso de fuentes confiables.',
      'Claridad y organización del texto.',
      'Propuestas de cuidado del patrimonio.',
    ],
    entregableEsperado: 'Guía turística de dos páginas con mapa y recomendaciones.',
  },
  unidades: [
    { titulo: 'Ecuador en el mundo: ubicación y límites', conceptoClave: 'La posición geográfica de Ecuador determina su clima, comercio y relaciones internacionales.', aplicacion: 'Dibuja el mapa de Ecuador y rotula límites y océano.' },
    { titulo: 'Regiones naturales: Costa, Sierra, Amazonía y Galápagos', conceptoClave: 'Cada región tiene relieve, clima y biodiversidad característicos.', aplicacion: 'Compara dos regiones con una tabla de clima, relieve y actividades.' },
    { titulo: 'Provincias y capitales', conceptoClave: 'La división política organiza la administración del territorio.', aplicacion: 'Completa un mapa político y ubica diez provincias.' },
    { titulo: 'Población y diversidad cultural', conceptoClave: 'La población ecuatoriana es diversa y se distribuye de manera desigual.', aplicacion: 'Interpreta datos de población y elabora conclusiones.' },
    { titulo: 'Pueblos y nacionalidades indígenas', conceptoClave: 'Los pueblos y nacionalidades conservan lenguas, territorios y saberes propios.', aplicacion: 'Investiga una nacionalidad y presenta su lengua y territorio.' },
    { titulo: 'Símbolos patrios', conceptoClave: 'La bandera, el escudo y el himno representan la identidad nacional.', aplicacion: 'Explica el significado de cada símbolo con una ficha.' },
    { titulo: 'Primeros pobladores del territorio ecuatoriano', conceptoClave: 'Las sociedades prehispánicas desarrollaron agricultura, comercio y organización social.', aplicacion: 'Ordena en una línea de tiempo tres culturas prehispánicas.' },
    { titulo: 'Colonia e independencia', conceptoClave: 'La colonia transformó la organización del territorio y la independencia abrió el periodo republicano.', aplicacion: 'Explica una causa y una consecuencia de la independencia.' },
    { titulo: 'Quito y Cuenca: patrimonio cultural', conceptoClave: 'El patrimonio material e inmaterial expresa la memoria colectiva.', aplicacion: 'Elabora un folleto de cuidado del centro histórico.' },
    { titulo: 'Gobierno, derechos y deberes', conceptoClave: 'El Estado garantiza derechos y exige deberes mediante normas constitucionales.', aplicacion: 'Clasifica situaciones cotidianas en derechos o deberes.' },
    { titulo: 'Trabajo y economía familiar', conceptoClave: 'Las actividades económicas satisfacen necesidades y generan ingresos.', aplicacion: 'Entrevista a un trabajador y describe su actividad económica.' },
    { titulo: 'Cuidado del ambiente y riesgos naturales', conceptoClave: 'La prevención y el uso responsable de recursos reducen riesgos y protegen el ambiente.', aplicacion: 'Diseña un plan familiar de emergencia ante sismos.' },
  ],
};

const INGLES: AsignaturaCurricular = {
  codigo: '05_Ingles',
  nombre: 'English Phonics & Reading',
  nombreCorto: 'English 4.°',
  area: 'LENGUA_EXTRANJERA',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '05_Ingles',
  driveFolderId: '1Hp8bm-RM5SiPZIYB2smsXTRBmFR3Z2O5',
  textoPrincipal: '4th_EGB_ENGLISH Librosdetextoecuador.org.pdf • Plan Curricular Inglés 4to EGB',
  bibliografia: [
    { titulo: 'English 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Oxford Phonics World 4 (Oxford University Press)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Cambridge Primary English Stage 4 (selección)', tipo: 'UNIVERSITARIO' },
    { titulo: 'British Council LearnEnglish Kids', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'English in fourth grade develops phonological awareness, decoding, vocabulary, listening comprehension and simple written production. Phonics connects letters and sounds; reading builds meaning from words and images; speaking practices clear pronunciation and functional language. The approach is communicative: language is learned through meaningful use, not isolated memorization.',
  analisisModelo:
    'English orthography combines regular sound-letter patterns with exceptions that must be learned explicitly. High-frequency words support fluency. Sentences follow a basic subject-verb-object order. Context, illustrations and prior knowledge help infer meaning. Short texts use repetitive structures that consolidate vocabulary and grammar.',
  aplicacionVida:
    'English opens access to science, technology, music, travel and international communication. Reading simple texts in English expands vocabulary and confidence. Listening and speaking practice prepares students to interact respectfully in multilingual settings.',
  sintesis:
    'Language learning integrates sounds, words, sentences and meaning. Daily short practice is more effective than occasional long sessions. Errors are part of learning and should be corrected with clear, supportive feedback.',
  preguntaDisparadora: 'How can knowing letter sounds help you read a new word in English?',
  objetivos: [
    'Decode common English letter-sound patterns and high-frequency words.',
    'Understand short oral and written texts about familiar topics.',
    'Produce simple sentences and short descriptions in English.',
  ],
  metodo: [
    'Listen to the model and identify the target sound.',
    'Blend sounds to read the word aloud.',
    'Use the word in a short oral sentence.',
    'Write the sentence and check spelling and punctuation.',
  ],
  conceptosFundamentales: [
    { termino: 'Phonics', definicion: 'Relationship between letters and the sounds they represent.' },
    { termino: 'High-frequency word', definicion: 'Common word recognized quickly to support reading fluency.' },
    { termino: 'Sentence', definicion: 'Group of words with a subject and a verb that expresses a complete idea.' },
  ],
  lema: {
    referencia: 'Ludwig Wittgenstein',
    texto: 'Los límites de mi lenguaje significan los límites de mi mundo.',
  },
  tipoGrafico: 'ARBOL_GRAMATICAL',
  insigniaGrafico: 'Sentence tree: subject, verb and object',
  simulacion: {
    tipo: 'LANGUAGE_STUDIO',
    titulo: 'Phonics and sentence builder',
    instrucciones:
      'Read the word "sheep", identify the digraph "sh", and build a sentence with the word. Then record your sentence aloud.',
    codigoOTextoInicial: 'word: sheep\nsound: /ʃ/ (sh)\nsentence frame: The sheep ___ in the field.',
    demostracionInteractiva:
      'sh + ee + p = sheep. Example sentence: The sheep lives in the field.',
  },
  preguntasQuiz: [
    {
      enunciado: 'Which word begins with the /ʃ/ sound?',
      opciones: ['Ship', 'Cat', 'Dog'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'The letters "sh" in ship represent the /ʃ/ sound.',
    },
    {
      enunciado: 'Choose the correct sentence.',
      opciones: ['The cat is sleeping.', 'cat the sleeping is', 'The cat sleeping is'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'English sentences normally follow subject + verb + complement order.',
    },
    {
      enunciado: 'What helps you understand a new word in a story?',
      opciones: ['The context and illustrations', 'Only the number of letters', 'Ignoring the sentence'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Context and images provide clues to infer meaning.',
    },
  ],
  retoPbl: {
    titulo: 'My bilingual animal album',
    descripcion:
      'Create a short album with three animals. For each animal, write its English name, a simple description and one sentence about its habitat. Add an illustration and read it aloud.',
    criteriosMineduc: [
      'Correct use of target vocabulary.',
      'Simple sentences with subject and verb.',
      'Clear pronunciation during the oral presentation.',
      'Neat and meaningful illustrations.',
    ],
    entregableEsperado: 'Three-page illustrated album with oral presentation.',
  },
  unidades: [
    { titulo: 'Greetings, classroom language and routines', conceptoClave: 'Functional phrases allow participation in daily classroom interactions.', aplicacion: 'Practica un diálogo de saludo y peticiones básicas.' },
    { titulo: 'Alphabet, sounds and phonics', conceptoClave: 'Letter-sound correspondences support decoding and spelling.', aplicacion: 'Clasifica palabras según su sonido inicial.' },
    { titulo: 'Numbers 1 to 100', conceptoClave: 'Number words follow predictable patterns in English.', aplicacion: 'Cuenta objetos y escribe los números en inglés.' },
    { titulo: 'Colors, shapes and family members', conceptoClave: 'Descriptive vocabulary allows identification and classification.', aplicacion: 'Describe a family picture with colors and shapes.' },
    { titulo: 'The verb to be: am, is, are', conceptoClave: 'The verb to be links the subject with an identity or description.', aplicacion: 'Escribe cinco oraciones con am, is y are.' },
    { titulo: 'School objects and daily routine', conceptoClave: 'Present simple verbs describe routines and habits.', aplicacion: 'Describe tu rutina escolar en cuatro oraciones.' },
    { titulo: 'Food, likes and dislikes', conceptoClave: 'Like and don\'t like express preferences about food.', aplicacion: 'Entrevista a un compañero sobre sus comidas favoritas.' },
    { titulo: 'Animals and habitats', conceptoClave: 'Descriptive sentences connect animals with their habitats.', aplicacion: 'Empareja animales con hábitats y escribe una oración.' },
    { titulo: 'Weather and seasons', conceptoClave: 'Weather vocabulary describes conditions and supports small talk.', aplicacion: 'Registra el clima de la semana y preséntalo oralmente.' },
    { titulo: 'Reading short stories', conceptoClave: 'Story elements and sequence support comprehension.', aplicacion: 'Lee un cuento corto e identifica personajes y acciones.' },
    { titulo: 'Writing simple sentences', conceptoClave: 'A sentence needs a subject, a verb and a complete idea.', aplicacion: 'Corrige oraciones incompletas y escribe tres propias.' },
    { titulo: 'Listening and speaking practice', conceptoClave: 'Active listening and clear pronunciation build communicative confidence.', aplicacion: 'Escucha un audio corto y responde preguntas simples.' },
  ],
};

const SOFTWARE: AsignaturaCurricular = {
  codigo: '06_Software_y_Programacion',
  nombre: 'Software y Programación',
  nombreCorto: 'Programación 4.°',
  area: 'TECNOLOGIA',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '06_Software_y_Programacion',
  driveFolderId: '1JmwwbMtyAupot9gmWRAJ9kpREz2H9GWU',
  textoPrincipal: 'think-python-es.pdf • 2012_curso_python-para-principiantes (2).pdf',
  bibliografia: [
    { titulo: 'Software y Programación 4.° de básica (Wisdom School)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Think Python: How to Think Like a Computer Scientist (Downey)', tipo: 'UNIVERSITARIO' },
    { titulo: 'ScratchEd: guías de creación y depuración', tipo: 'RECURSO_DIGITAL' },
    { titulo: 'Python para principiantes (curso introductorio)', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La programación es la práctica de expresar algoritmos en un lenguaje que una computadora pueda ejecutar. Un algoritmo es una secuencia finita y ordenada de instrucciones no ambiguas. En cuarto de básica se introducen la secuenciación, los eventos, las variables, las condiciones y los bucles mediante entornos visuales y Python básico. El objetivo es resolver problemas pequeños con precisión y depurar errores con método.',
  analisisModelo:
    'Una computadora ejecuta instrucciones literalmente; por eso la claridad y el orden son esenciales. Las variables almacenan datos con un nombre y un tipo. Las condiciones permiten tomar decisiones y los bucles repiten acciones. Un error puede ser de sintaxis, de lógica o de ejecución. La depuración consiste en observar la salida, localizar la causa y corregir una sola cosa a la vez.',
  aplicacionVida:
    'Programar desarrolla pensamiento lógico, creatividad y autonomía. Permite automatizar tareas, crear juegos, analizar datos y comprender cómo funcionan las tecnologías cotidianas. La programación también exige ética: respetar la privacidad, citar fuentes y no dañar sistemas ajenos.',
  sintesis:
    'Todo programa se construye con tres bloques: entrada, proceso y salida. Un algoritmo debe ser claro, finito y verificable. Probar con casos normales y extremos revela errores antes de que afecten al usuario.',
  preguntaDisparadora: '¿Qué instrucciones exactas necesitaría una computadora para dibujar un cuadrado?',
  objetivos: [
    'Descomponer una tarea cotidiana en una secuencia de instrucciones.',
    'Crear un programa sencillo con variables, condiciones y bucles.',
    'Detectar y corregir errores con pruebas simples.',
  ],
  metodo: [
    'Definir el problema y la salida esperada.',
    'Escribir el algoritmo en lenguaje natural.',
    'Traducirlo al lenguaje de programación paso a paso.',
    'Probar con varios casos y depurar los errores.',
  ],
  conceptosFundamentales: [
    { termino: 'Algoritmo', definicion: 'Secuencia finita y ordenada de instrucciones para resolver un problema.' },
    { termino: 'Variable', definicion: 'Espacio con nombre que almacena un dato que puede cambiar durante la ejecución.' },
    { termino: 'Depuración', definicion: 'Proceso de localizar y corregir errores en un programa.' },
  ],
  lema: {
    referencia: 'Edsger Dijkstra',
    texto: 'La simplicidad es un requisito previo para la fiabilidad.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Diagrama de flujo: secuencia, decisión y repetición',
  simulacion: {
    tipo: 'PYTHON_SANDBOX',
    titulo: 'Laboratorio Python: variables y decisiones',
    instrucciones:
      'Escribe un programa que pregunte la edad y muestre si el usuario puede participar en un juego para mayores de 8 años.',
    codigoOTextoInicial:
      'edad = int(input("¿Cuántos años tienes? "))\nif edad >= 8:\n    print("Puedes participar")\nelse:\n    print("Aún no puedes participar")',
    demostracionInteractiva:
      'Entrada: 9. Salida: Puedes participar. El programa usa una variable, una condición y dos salidas posibles.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué es un algoritmo?',
      opciones: ['Una secuencia ordenada de pasos para resolver un problema', 'Un tipo de pantalla', 'Un error del computador'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Un algoritmo describe pasos finitos y claros para alcanzar un resultado.',
    },
    {
      enunciado: '¿Qué estructura permite repetir una acción varias veces?',
      opciones: ['Un bucle', 'Una variable', 'Un comentario'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los bucles repiten instrucciones mientras se cumpla una condición.',
    },
    {
      enunciado: '¿Qué hace print() en Python?',
      opciones: ['Muestra un resultado en pantalla', 'Borra el programa', 'Apaga la computadora'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'print() envía un valor a la salida estándar.',
    },
  ],
  retoPbl: {
    titulo: 'Calculadora de ahorro para la escuela',
    descripcion:
      'Crea un programa en Python que reciba el ahorro semanal y calcule cuánto se ahorrará en cuatro semanas. Incluye una condición para felicitar al usuario si supera una meta.',
    criteriosMineduc: [
      'Algoritmo claro y ordenado.',
      'Uso correcto de variables y operaciones.',
      'Pruebas con al menos tres entradas.',
      'Comentarios breves que expliquen el código.',
    ],
    entregableEsperado: 'Archivo .py funcional y captura de las pruebas.',
  },
  unidades: [
    { titulo: '¿Qué es un algoritmo?', conceptoClave: 'Un algoritmo es una secuencia finita y ordenada de instrucciones no ambiguas.', aplicacion: 'Escribe el algoritmo para preparar un sándwich y pruébalo con un compañero.' },
    { titulo: 'Secuencias e instrucciones', conceptoClave: 'El orden de las instrucciones cambia el resultado de un programa.', aplicacion: 'Reordena instrucciones desordenadas y explica el efecto.' },
    { titulo: 'Scratch: eventos y movimiento', conceptoClave: 'Los eventos activan bloques y el movimiento se controla con coordenadas.', aplicacion: 'Crea un personaje que se mueva con las flechas.' },
    { titulo: 'Variables y datos', conceptoClave: 'Las variables almacenan datos que el programa puede leer y modificar.', aplicacion: 'Crea un contador de puntos en Scratch o Python.' },
    { titulo: 'Condicionales', conceptoClave: 'Las condiciones permiten que el programa elija entre caminos alternativos.', aplicacion: 'Programa una decisión basada en una edad o un puntaje.' },
    { titulo: 'Bucles', conceptoClave: 'Los bucles repiten instrucciones y reducen la duplicación de código.', aplicacion: 'Dibuja un cuadrado con un bucle de cuatro repeticiones.' },
    { titulo: 'Python: print e input', conceptoClave: 'print muestra datos y input recibe información del usuario.', aplicacion: 'Escribe un saludo personalizado con input y print.' },
    { titulo: 'Variables y operaciones en Python', conceptoClave: 'Los operadores aritméticos permiten calcular con datos numéricos.', aplicacion: 'Calcula el promedio de tres notas.' },
    { titulo: 'Decisiones con if, elif y else', conceptoClave: 'Las estructuras condicionales evalúan expresiones booleanas.', aplicacion: 'Clasifica una nota como aprobada o reprobada.' },
    { titulo: 'Bucles for y while', conceptoClave: 'for recorre secuencias y while repite mientras la condición sea verdadera.', aplicacion: 'Muestra la tabla de multiplicar de un número.' },
    { titulo: 'Depuración y pruebas', conceptoClave: 'Probar casos normales y extremos revela errores de lógica.', aplicacion: 'Encuentra y corrige tres errores en un programa dado.' },
    { titulo: 'Proyecto: calculadora y juego', conceptoClave: 'Un proyecto integra entrada, proceso, salida y validación.', aplicacion: 'Construye una calculadora o un juego de preguntas.' },
  ],
};

const ARTE: AsignaturaCurricular = {
  codigo: '07_Arte_ECA',
  nombre: 'Educación Cultural y Artística (ECA)',
  nombreCorto: 'Arte 4.°',
  area: 'ARTE',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '07_Arte_ECA',
  driveFolderId: '1aUsQ5TUImWpkbWTu8agJlfrXNzAprmQC',
  textoPrincipal: 'Libro_de_Actividades_4to._Grado.pdf • Plan Curricular Arte 4to EGB',
  bibliografia: [
    { titulo: 'Educación Cultural y Artística 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Arte para niños (Taschen, selección)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Elementos del arte: línea, color, forma y textura', tipo: 'UNIVERSITARIO' },
    { titulo: 'Museo Virtual: colecciones ecuatorianas', tipo: 'RECURSO_DIGITAL' },
  ],
  enfoqueAcademico:
    'La educación artística desarrolla la percepción, la expresión y la apreciación estética mediante lenguajes visuales, musicales, corporales y teatrales. En cuarto de básica se exploran punto, línea, forma, color, textura, ritmo y movimiento. La producción artística se planifica, se experimenta y se revisa. La apreciación compara obras de distintos contextos y reconoce el patrimonio cultural.',
  analisisModelo:
    'Una imagen se compone mediante elementos visuales y principios como equilibrio, contraste, ritmo y proporción. El color tiene valor, saturación y temperatura. En música, el pulso organiza el tiempo y el ritmo combina duraciones. En teatro, el cuerpo y la voz construyen personajes. La obra artística comunica ideas y emociones dentro de un contexto histórico y cultural.',
  aplicacionVida:
    'El arte mejora la observación, la creatividad y la sensibilidad. Diseñar un afiche, decorar un espacio o interpretar una canción requiere planificación y ensayo. La apreciación artística enriquece el tiempo libre y el respeto por el patrimonio.',
  sintesis:
    'Crear es un proceso: imaginar, planificar, producir y reflexionar. Toda obra tiene intención y contexto. La práctica constante y la retroalimentación mejoran la técnica y la expresividad.',
  preguntaDisparadora: '¿Cómo puede una línea convertirse en una emoción?',
  objetivos: [
    'Aplicar elementos visuales en composiciones propias.',
    'Explorar ritmo, pulso y expresión corporal.',
    'Apreciar obras y patrimonio artístico del Ecuador.',
  ],
  metodo: [
    'Observar la obra o el fenómeno y describir sus elementos.',
    'Planificar la composición o interpretación.',
    'Producir con materiales y técnicas adecuadas.',
    'Reflexionar sobre el resultado y mejorarlo.',
  ],
  conceptosFundamentales: [
    { termino: 'Composición', definicion: 'Organización de elementos visuales en un espacio determinado.' },
    { termino: 'Ritmo', definicion: 'Repetición organizada de elementos visuales o sonoros en el tiempo o el espacio.' },
    { termino: 'Patrimonio', definicion: 'Bienes materiales e inmateriales que una comunidad hereda y valora.' },
  ],
  lema: {
    referencia: 'Paul Klee',
    texto: 'El arte no reproduce lo visible; hace visible.',
  },
  tipoGrafico: 'COSMOS_CREACION',
  insigniaGrafico: 'Círculo cromático y elementos de la composición',
  simulacion: {
    tipo: 'ART_CANVAS',
    titulo: 'Taller de composición visual y color',
    instrucciones:
      'Crea una composición con tres líneas, dos formas y una paleta de tres colores. Explica qué emoción busca transmitir.',
    codigoOTextoInicial: 'lienzo: 400 x 300\npaleta: azul, amarillo, blanco\ncomposición: equilibrio asimétrico',
    demostracionInteractiva:
      'Una composición con líneas diagonales y colores cálidos transmite movimiento y energía; los colores fríos sugieren calma.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué elemento organiza la repetición visual o sonora?',
      opciones: ['El ritmo', 'La masa', 'El volumen'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El ritmo se produce por la repetición organizada de elementos.',
    },
    {
      enunciado: '¿Qué son los colores complementarios?',
      opciones: ['Los que se encuentran opuestos en el círculo cromático', 'Los que son iguales', 'Los que no existen'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'Los complementarios generan contraste y equilibrio visual.',
    },
    {
      enunciado: '¿Qué es el patrimonio cultural?',
      opciones: ['Bienes y saberes que una comunidad valora y hereda', 'Solo los edificios nuevos', 'Un objeto sin historia'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El patrimonio incluye manifestaciones materiales e inmateriales.',
    },
  ],
  retoPbl: {
    titulo: 'Mural de la biodiversidad ecuatoriana',
    descripcion:
      'Diseña un mural colectivo o individual con especies nativas, aplicando color, textura y composición. Presenta una explicación de las decisiones artísticas y del mensaje ecológico.',
    criteriosMineduc: [
      'Uso intencionado de elementos visuales.',
      'Creatividad y originalidad.',
      'Coherencia entre mensaje e imagen.',
      'Presentación oral de la obra.',
    ],
    entregableEsperado: 'Mural o composición de 40 x 60 cm con ficha explicativa.',
  },
  unidades: [
    { titulo: 'Punto, línea, forma y textura', conceptoClave: 'Los elementos visuales se combinan para construir imágenes y sensaciones.', aplicacion: 'Experimenta con líneas y texturas en una composición abstracta.' },
    { titulo: 'Color: mezcla y círculo cromático', conceptoClave: 'Las mezclas de color permiten crear paletas y contrastes.', aplicacion: 'Pinta un círculo cromático con primarios y secundarios.' },
    { titulo: 'Dibujo de observación', conceptoClave: 'Dibujar del natural desarrolla proporción y atención al detalle.', aplicacion: 'Dibuja una planta o un objeto con tres niveles de detalle.' },
    { titulo: 'Collage y textura', conceptoClave: 'El collage combina materiales para crear significado y textura.', aplicacion: 'Construye un collage con materiales reciclados.' },
    { titulo: 'Arte ecuatoriano: identidad y diversidad', conceptoClave: 'El arte ecuatoriano refleja la diversidad cultural y la historia del país.', aplicacion: 'Investiga un artista ecuatoriano y presenta una obra.' },
    { titulo: 'Música: pulso, ritmo y compás', conceptoClave: 'El pulso organiza el tiempo musical y el ritmo combina duraciones.', aplicacion: 'Marca el pulso de una canción y crea un ritmo de cuatro tiempos.' },
    { titulo: 'Canto y percusión corporal', conceptoClave: 'La voz y el cuerpo son instrumentos expresivos que requieren técnica básica.', aplicacion: 'Interpreta una canción con percusión corporal.' },
    { titulo: 'Teatro: expresión corporal y voz', conceptoClave: 'El teatro comunica mediante el cuerpo, la voz y el espacio.', aplicacion: 'Representa una escena breve sin palabras.' },
    { titulo: 'Danza y movimiento', conceptoClave: 'La danza organiza el movimiento en el espacio y el tiempo.', aplicacion: 'Crea una secuencia de cuatro movimientos con inicio y cierre.' },
    { titulo: 'Patrimonio artístico y cultural', conceptoClave: 'La conservación del patrimonio requiere conocimiento y respeto.', aplicacion: 'Elabora una ficha de un bien patrimonial de tu ciudad.' },
    { titulo: 'Diseño de afiche', conceptoClave: 'El diseño gráfico jerarquiza información y usa tipografía e imagen con intención.', aplicacion: 'Diseña un afiche con mensaje, imagen y datos claros.' },
    { titulo: 'Proyecto expositivo: montaje y curaduría', conceptoClave: 'Una exposición organiza obras y textos para comunicar un tema.', aplicacion: 'Monta una mini exposición con tres obras y sus rótulos.' },
  ],
};

const EDUCACION_FISICA: AsignaturaCurricular = {
  codigo: '08_Educacion_Fisica',
  nombre: 'Educación Física y Salud',
  nombreCorto: 'Ed. Física 4.°',
  area: 'EDUCACION_FISICA',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '08_Educacion_Fisica',
  driveFolderId: '1fwZd-MhQ-rfgAmzsfkUci3Wlv0cw6Uud',
  textoPrincipal: 'Plan Curricular Educación Física 4to EGB.pdf',
  bibliografia: [
    { titulo: 'Educación Física 4.° EGB (MINEDUC Ecuador)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Actividad física y salud en la infancia (OMS)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Manual de juegos cooperativos y educación física de base', tipo: 'UNIVERSITARIO' },
    { titulo: 'Fundamentos de anatomía y movimiento humano (selección)', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'La educación física desarrolla capacidades motrices, condición física, hábitos saludables y valores de convivencia. El movimiento se estudia desde la biomecánica, la fisiología del ejercicio y la pedagogía del juego. En cuarto de básica se trabajan coordinación, equilibrio, lateralidad, resistencia, flexibilidad y juegos cooperativos, siempre con calentamiento, ejecución segura y vuelta a la calma.',
  analisisModelo:
    'El cuerpo se mueve gracias a la interacción de huesos, músculos y articulaciones, coordinados por el sistema nervioso. La frecuencia cardiaca y la respiración aumentan con el esfuerzo. La energía proviene de los alimentos y del oxígeno. El calentamiento prepara el organismo y la recuperación favorece la adaptación. La técnica correcta reduce el riesgo de lesiones.',
  aplicacionVida:
    'La actividad física regular mejora la salud cardiovascular, la fuerza, el equilibrio y el estado de ánimo. Los juegos cooperativos enseñan a respetar reglas, resolver conflictos y trabajar en equipo. La higiene, la hidratación y el descanso son parte del cuidado del cuerpo.',
  sintesis:
    'Un programa seguro incluye calentamiento, actividad principal y vuelta a la calma. La intensidad debe ajustarse a la edad y a la condición física. La constancia y el disfrute son más importantes que la competencia.',
  preguntaDisparadora: '¿Por qué el corazón late más rápido cuando corres?',
  objetivos: [
    'Ejecutar movimientos básicos con coordinación y seguridad.',
    'Reconocer los efectos del ejercicio en el cuerpo.',
    'Aplicar hábitos de higiene, hidratación y juego limpio.',
  ],
  metodo: [
    'Realizar un calentamiento de cinco a ocho minutos.',
    'Ejecutar la actividad con técnica y control postural.',
    'Registrar esfuerzo, pulso y sensaciones.',
    'Finalizar con estiramientos y reflexión.',
  ],
  conceptosFundamentales: [
    { termino: 'Coordinación', definicion: 'Capacidad de combinar movimientos de forma eficiente y controlada.' },
    { termino: 'Frecuencia cardiaca', definicion: 'Número de latidos del corazón por minuto.' },
    { termino: 'Calentamiento', definicion: 'Conjunto de ejercicios que preparan el cuerpo para la actividad física.' },
  ],
  lema: {
    referencia: 'Thomas Denison Wood (adaptado)',
    texto: 'La educación física es la educación del movimiento para la salud y la vida.',
  },
  tipoGrafico: 'CELULA_VIVA',
  insigniaGrafico: 'Cuerpo en movimiento: músculos, articulaciones y pulso',
  simulacion: {
    tipo: 'SCIENCE_LAB',
    titulo: 'Laboratorio de movimiento y frecuencia cardiaca',
    instrucciones:
      'Mide tu pulso en reposo, después de un minuto de saltos y después de dos minutos de descanso. Registra los datos y explica el cambio.',
    codigoOTextoInicial: 'pulso en reposo: ___ lpm\npulso después de saltar: ___ lpm\npulso después de descansar: ___ lpm',
    demostracionInteractiva:
      'El pulso aumenta durante el esfuerzo porque el cuerpo necesita más oxígeno y vuelve gradualmente al reposo.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Qué debe hacerse antes de una actividad física intensa?',
      opciones: ['Calentar', 'Comer abundantemente', 'Correr sin preparación'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'El calentamiento prepara músculos y articulaciones y reduce el riesgo de lesiones.',
    },
    {
      enunciado: '¿Qué indica la frecuencia cardiaca?',
      opciones: ['Los latidos del corazón por minuto', 'La estatura', 'El color de la piel'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La frecuencia cardiaca refleja la intensidad del esfuerzo.',
    },
    {
      enunciado: '¿Qué hábito favorece la recuperación después del ejercicio?',
      opciones: ['Hidratarse y descansar', 'No respirar', 'Continuar sin pausa'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La hidratación y el descanso permiten recuperar el equilibrio del organismo.',
    },
  ],
  retoPbl: {
    titulo: 'Mi plan semanal de vida activa',
    descripcion:
      'Diseña un plan de actividad física para una semana con calentamiento, juego y recuperación. Registra tu pulso y tu nivel de esfuerzo cada día.',
    criteriosMineduc: [
      'Planificación equilibrada y segura.',
      'Registro ordenado de datos.',
      'Explicación de los efectos del ejercicio.',
      'Cumplimiento y reflexión personal.',
    ],
    entregableEsperado: 'Bitácora semanal con plan, registros y conclusión.',
  },
  unidades: [
    { titulo: 'Esquema corporal y conciencia del movimiento', conceptoClave: 'Reconocer el cuerpo y sus segmentos mejora el control motor.', aplicacion: 'Señala segmentos corporales y ejecuta movimientos aislados.' },
    { titulo: 'Lateralidad y coordinación', conceptoClave: 'La lateralidad organiza el movimiento y la coordinación lo hace eficiente.', aplicacion: 'Realiza circuitos con mano y pie dominantes y no dominantes.' },
    { titulo: 'Calentamiento y estiramiento', conceptoClave: 'El calentamiento prepara el cuerpo y el estiramiento favorece la recuperación.', aplicacion: 'Diseña una rutina de calentamiento de seis minutos.' },
    { titulo: 'Carreras y saltos', conceptoClave: 'La técnica de carrera y salto mejora el rendimiento y reduce lesiones.', aplicacion: 'Practica saltos con dos pies y carrera con postura correcta.' },
    { titulo: 'Lanzamientos y recepción', conceptoClave: 'La coordinación visomotora permite lanzar y recibir con precisión.', aplicacion: 'Realiza lanzamientos a un blanco con progresión de distancia.' },
    { titulo: 'Juegos cooperativos', conceptoClave: 'La cooperación y las reglas compartidas permiten alcanzar objetivos comunes.', aplicacion: 'Participa en un juego donde todos deben colaborar para ganar.' },
    { titulo: 'Higiene, nutrición e hidratación', conceptoClave: 'La alimentación y la higiene sostienen el rendimiento y la salud.', aplicacion: 'Analiza tu refrigerio y propone una versión más saludable.' },
    { titulo: 'Frecuencia cardiaca y esfuerzo', conceptoClave: 'La frecuencia cardiaca permite regular la intensidad del ejercicio.', aplicacion: 'Mide el pulso antes, durante y después de una actividad.' },
    { titulo: 'Equilibrio y flexibilidad', conceptoClave: 'El equilibrio y la flexibilidad amplían el control y previenen lesiones.', aplicacion: 'Practica posturas de equilibrio y estiramientos guiados.' },
    { titulo: 'Deportes básicos y reglas', conceptoClave: 'Los deportes combinan técnica, táctica y respeto por las reglas.', aplicacion: 'Juega una versión adaptada de un deporte y explica sus reglas.' },
    { titulo: 'Prevención de lesiones y primeros auxilios', conceptoClave: 'La prevención y la respuesta oportuna reducen el impacto de las lesiones.', aplicacion: 'Simula la atención básica de un golpe leve.' },
    { titulo: 'Vida activa y descanso', conceptoClave: 'La actividad regular y el descanso adecuado mejoran la salud integral.', aplicacion: 'Elabora un horario semanal con movimiento y sueño suficiente.' },
  ],
};

const RELACION_CON_DIOS: AsignaturaCurricular = {
  codigo: '09_Relacion_con_Dios',
  nombre: 'Relación con Dios',
  nombreCorto: 'Relación con Dios 4.°',
  area: 'TEOLOGIA',
  profesorIA: 'Prof. Mateo',
  carpetaDrive: '09_Relacion_con_Dios',
  driveFolderId: '1U_G_760AB4qAMyEH04x2LiKf7J5Zaj5v',
  textoPrincipal: 'Plan Curricular Relación con Dios 4to EGB.pdf • Biblia Reina-Valera',
  bibliografia: [
    { titulo: 'Biblia Reina-Valera (edición de estudio para niños)', tipo: 'FUENTE_PRIMARIA' },
    { titulo: 'Plan Curricular Relación con Dios 4.° EGB (Wisdom Academy)', tipo: 'TEXTO_OFICIAL' },
    { titulo: 'Catecismo de Heidelberg (versión comentada para familias)', tipo: 'UNIVERSITARIO' },
    { titulo: 'Historias bíblicas ilustradas y atlas bíblico infantil', tipo: 'UNIVERSITARIO' },
  ],
  enfoqueAcademico:
    'La asignatura Relación con Dios es el espacio confesional de la formación espiritual. Su objeto de estudio es la revelación bíblica: el carácter de Dios, la historia de la redención, la persona y obra de Jesucristo, la acción del Espíritu Santo y la vida cristiana. El método integra lectura exegética, contexto histórico-literario, doctrina sistemática y aplicación pastoral. La fe se comprende como confianza fundamentada en la revelación, no como oposición a la razón.',
  analisisModelo:
    'La Biblia se lee como un relato unificado: creación, caída, promesa, redención y restauración. Cada libro tiene género, autor, contexto y propósito. La teología bíblica organiza el mensaje progresivo de la Escritura; la teología sistemática lo articula en doctrinas coherentes. La interpretación responsable evita alegorías arbitrarias y aplica el texto según su sentido original y su cumplimiento en Cristo.',
  aplicacionVida:
    'La doctrina se vive en la oración, el arrepentimiento, el perdón, el servicio y la formación de hábitos. El amor a Dios se expresa en el amor al prójimo, la honestidad, la mayordomía de los recursos y la búsqueda de justicia. La familia y la iglesia son comunidades de discipulado donde la fe se transmite y se practica.',
  sintesis:
    'La vida cristiana se sostiene en la gracia de Dios y se expresa en obediencia agradecida. La lectura constante de la Escritura, la oración y la comunión con otros creyentes fortalecen la madurez espiritual. La esperanza cristiana se fundamenta en la resurrección de Cristo y en la promesa de la restauración final.',
  preguntaDisparadora: '¿Por qué la Biblia se lee como una historia completa y no como una colección de frases aisladas?',
  objetivos: [
    'Comprender la estructura y el mensaje central de la Biblia.',
    'Explicar las doctrinas básicas de la fe cristiana con lenguaje claro.',
    'Aplicar los principios bíblicos a la vida familiar y escolar.',
  ],
  metodo: [
    'Leer el pasaje y observar quién habla, a quién y en qué contexto.',
    'Identificar el género literario y las palabras clave.',
    'Relacionar el pasaje con la historia de la redención.',
    'Aplicar el principio bíblico con una acción concreta y oración.',
  ],
  conceptosFundamentales: [
    { termino: 'Revelación', definicion: 'Acción por la cual Dios se da a conocer mediante la creación, la historia y la Escritura.' },
    { termino: 'Pacto', definicion: 'Relación de compromiso que Dios establece con su pueblo y que culmina en Cristo.' },
    { termino: 'Gracia', definicion: 'Favor inmerecido de Dios que perdona y transforma al ser humano.' },
  ],
  lema: {
    referencia: 'Salmos 119:105',
    texto: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.',
  },
  tipoGrafico: 'BALANZA_ALGEBRAICA',
  insigniaGrafico: 'Línea de la historia bíblica: creación, caída, redención y restauración',
  simulacion: {
    tipo: 'BIBLE_THEOLOGY',
    titulo: 'Taller de observación bíblica y aplicación',
    instrucciones:
      'Lee Salmos 23. Anota quién habla, qué imágenes usa y qué atributo de Dios destaca. Escribe una oración de confianza y una acción de servicio.',
    codigoOTextoInicial:
      'Pasaje: Salmos 23:1-6\nObservar: autor, imágenes, atributos de Dios\nAplicar: confianza, descanso, servicio',
    demostracionInteractiva:
      'El salmo presenta a Dios como pastor que guía, protege y provee. La aplicación cristiana conduce a confiar en su cuidado y a extender ese cuidado a otros.',
  },
  preguntasQuiz: [
    {
      enunciado: '¿Cuál es el mensaje central de la Biblia?',
      opciones: ['La historia de la redención de Dios en Cristo', 'Un manual de ciencia experimental', 'Una colección de refranes sin unidad'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La Escritura se organiza en torno a la creación, la caída, la redención y la restauración.',
    },
    {
      enunciado: '¿Qué significa que la gracia es un favor inmerecido?',
      opciones: ['Que Dios perdona y transforma sin que lo merezcamos', 'Que ganamos el favor divino con esfuerzo', 'Que la gracia depende del dinero'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La gracia es un don de Dios, no una recompensa por méritos humanos.',
    },
    {
      enunciado: '¿Cómo se aplica el amor a Dios?',
      opciones: ['Amando al prójimo y viviendo con integridad', 'Solo con palabras', 'Ignorando al necesitado'],
      indiceCorrecto: 0,
      explicacionPedagogica: 'La fe se expresa en obras concretas de amor y justicia.',
    },
  ],
  retoPbl: {
    titulo: 'Cuaderno de discipulado familiar',
    descripcion:
      'Durante dos semanas, registra una lectura bíblica diaria, una oración y una acción de servicio. Presenta el cuaderno con una reflexión final sobre lo aprendido.',
    criteriosMineduc: [
      'Lectura bíblica constante y contextualizada.',
      'Oración y reflexión personal.',
      'Acciones concretas de servicio.',
      'Presentación ordenada y honesta.',
    ],
    entregableEsperado: 'Cuaderno de discipulado con catorce registros y reflexión final.',
  },
  unidades: [
    { titulo: 'La Biblia: inspiración, canon y géneros literarios', conceptoClave: 'La Escritura es inspirada por Dios y se interpreta según su género y contexto.', aplicacion: 'Clasifica cinco libros bíblicos según su género literario.' },
    { titulo: 'Creación e Imago Dei', conceptoClave: 'El ser humano fue creado a imagen de Dios y posee dignidad inviolable.', aplicacion: 'Escribe tres implicaciones prácticas del valor de toda persona.' },
    { titulo: 'La caída y la promesa de redención', conceptoClave: 'El pecado rompe la comunión, pero Dios anuncia un Redentor.', aplicacion: 'Explica la diferencia entre arrepentimiento y excusa.' },
    { titulo: 'Abraham y el pacto', conceptoClave: 'Dios llama a Abraham y promete bendecir a todas las naciones.', aplicacion: 'Identifica la promesa y la respuesta de fe de Abraham.' },
    { titulo: 'Éxodo, ley y liberación', conceptoClave: 'Dios libera a su pueblo y le da una ley para una vida santa y justa.', aplicacion: 'Relaciona los Diez Mandamientos con la vida comunitaria.' },
    { titulo: 'Reyes, profetas y justicia', conceptoClave: 'Los profetas llaman al arrepentimiento y a la justicia social.', aplicacion: 'Analiza una denuncia profética y su vigencia actual.' },
    { titulo: 'Salmos y oración', conceptoClave: 'Los salmos enseñan a orar con alabanza, lamento, gratitud y confianza.', aplicacion: 'Compón un salmo personal con una petición y una alabanza.' },
    { titulo: 'Sabiduría y Proverbios', conceptoClave: 'El temor del Señor es el principio de la sabiduría práctica.', aplicacion: 'Aplica un proverbio a una decisión escolar.' },
    { titulo: 'Evangelios y la persona de Jesús', conceptoClave: 'Jesús es el Hijo de Dios, Salvador y Rey anunciado por los profetas.', aplicacion: 'Compara dos escenas de los Evangelios y sus enseñanzas.' },
    { titulo: 'El Reino de Dios y las parábolas', conceptoClave: 'Las parábolas revelan el Reino y exigen una respuesta de fe.', aplicacion: 'Interpreta una parábola y explica su aplicación.' },
    { titulo: 'Cruz y resurrección', conceptoClave: 'La muerte y resurrección de Cristo son el centro de la salvación.', aplicacion: 'Explica por qué la resurrección es histórica y transformadora.' },
    { titulo: 'Hechos y el Espíritu Santo', conceptoClave: 'El Espíritu capacita a la iglesia para testificar y servir.', aplicacion: 'Identifica un fruto del Espíritu y una acción para cultivarlo.' },
    { titulo: 'Cartas paulinas: gracia y santidad', conceptoClave: 'La justificación por fe produce una vida renovada por el Espíritu.', aplicacion: 'Distingue gracia y legalismo con un ejemplo cotidiano.' },
    { titulo: 'Ética del Sermón del Monte', conceptoClave: 'El discipulado transforma el carácter y las relaciones.', aplicacion: 'Escribe una acción concreta para cada bienaventuranza.' },
    { titulo: 'Historia de la Iglesia y misiones', conceptoClave: 'La iglesia se extiende mediante el testimonio, la misión y la fidelidad doctrinal.', aplicacion: 'Investiga un misionero y presenta su legado.' },
    { titulo: 'Cosmovisión bíblica y vida diaria', conceptoClave: 'Toda área de la vida se ordena bajo el señorío de Cristo.', aplicacion: 'Relaciona un principio bíblico con tu estudio y tus relaciones.' },
  ],
};

export const ASIGNATURAS_GAEL_4TO: AsignaturaCurricular[] = [
  LENGUA,
  MATEMATICAS,
  CIENCIAS,
  SOCIALES,
  INGLES,
  SOFTWARE,
  ARTE,
  EDUCACION_FISICA,
  RELACION_CON_DIOS,
];

/**
 * Horario semanal oficial tomado del manifiesto de Drive.
 * Se conservan los cinco bloques diarios y la jornada intensiva 08:00-12:00.
 */
export const HORARIO_GAEL_4TO: PerfilCurricular['horarioSemanal'] = {
  Lunes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Matemáticas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Relación con Dios', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
  ],
  Martes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Matemáticas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'English Phonics & Reading', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Cultural y Artística (ECA)', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Miercoles: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Matemáticas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Educación Física y Salud', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Jueves: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Ciencias Naturales', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'English Phonics & Reading', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Software y Programación', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'Lengua y Literatura', modalidad: 'AGENTE_IA_OPENMAIC' },
  ],
  Viernes: [
    { bloque: 1, hora: '08:00 - 08:45', materia: 'Matemáticas', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 2, hora: '08:45 - 09:30', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 3, hora: '10:00 - 10:45', materia: 'Estudios Sociales del Ecuador', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 4, hora: '10:45 - 11:30', materia: 'Software y Programación', modalidad: 'AGENTE_IA_OPENMAIC' },
    { bloque: 5, hora: '11:30 - 12:00', materia: 'English Phonics & Reading', modalidad: 'TUTORIA_PROFESOR_REAL', plataforma: 'jitsi' },
  ],
};

export const PERFIL_GAEL_4TO: PerfilCurricular = {
  estudiante: 'Gael',
  grado: '4.° de EGB (Básica Elemental)',
  subnivelMineduc: 'Básica Elemental',
  edad: 8,
  codigoCarpetaAnioDrive: '04_Cuarto_EGB_Gael',
  anoLectivo: '2026-2027',
  asignaturas: ASIGNATURAS_GAEL_4TO,
  horarioSemanal: HORARIO_GAEL_4TO,
};
