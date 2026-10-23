# Auditoría curricular, mapeo de Google Drive y nueva malla personalizada

**Proyecto:** Wisdom Academy Platform  
**Año lectivo:** 2026–2027 · Régimen Sierra-Amazonía  
**Estudiantes auditados:** Gael (4.° EGB, 8 años) y Avril (8.° EGB, 12 años)  
**Alcance:** capa de datos y contenido. No se modificaron rutas, componentes de interfaz, estado global ni contratos públicos de los servicios.

---

## 1. Resumen ejecutivo

La plataforma consumía un catálogo fijo de cinco materias por estudiante y arrastraba referencias confesionales insertadas en Matemáticas, Ciencias, Lengua, Estudios Sociales, Inglés, Programación, Arte y Educación Física. La auditoría del espejo local de Google Drive confirma que la malla real es mayor:

| Estudiante | Carpetas de asignatura | Materias de la malla | Bloques diarios | Días lectivos |
|---|---:|---:|---:|---:|
| Gael (4.° EGB) | 9 (+1 administrativa) | **9** | 5 | 200 |
| Avril (8.° EGB) | 11 (+1 administrativa) | **11** | 5 | 200 |

La intervención deja **20 asignaturas personalizadas**, **248 unidades curriculares** y **200/200 días cubiertos**. Las áreas académicas quedaron neutrales y basadas en evidencia; la formación bíblica se concentra exclusivamente en **Relación con Dios**.

Resultado de la prueba automatizada:

```text
✓ PRUEBA CURRICULAR APROBADA
  Días completos: 200/200
  Materias: 20
  Unidades: 248
  Separación epistemológica: académicas neutrales • teología confesional exclusiva
```

---

## 2. Hallazgos de la auditoría

### 2.1. Hallazgos curriculares

1. **Límite artificial de cinco materias.** El motor de guías (`curriculumAuditorAndFiller`) y los prompts de IA solo conocían cinco asignaturas por estudiante. La malla de Drive contiene nueve para Gael y once para Avril.
2. **Forzamiento religioso transversal.** El motor de contenido insertaba versículos y exhortaciones en Matemáticas, Ciencias, Lengua, Inglés, Programación, Ciencias Políticas, Administración, Arte y Educación Física.
3. **Lecciones faltantes.** No existían lecciones específicas para Estudios Sociales, Arte y Educación Física de Gael, ni para Arte y Educación Física de Avril.
4. **Horarios inconsistentes.** El sincronizador usaba 08:30, cuatro bloques de 35 minutos y recreos de 15 minutos para Gael. El manifiesto real de Drive establece jornada intensiva de 08:00 a 12:00, cinco bloques y recreo central de 09:30 a 10:00.
5. **Catálogos de matrícula incompletos.** Las semillas de autenticación, Moodle y el aula solo registraban cinco cursos por estudiante.

### 2.2. Hallazgos de Google Drive

No se detectaron carpetas vacías en el espejo local. Sí se detectaron duplicados, materiales administrativos mezclados con asignaturas y recursos de otro nivel.

#### Gael — `04_Cuarto_EGB_Gael`

| Carpeta | Estado | Hallazgo principal | Acción canónica |
|---|---|---|---|
| `01_Lengua_y_Literatura` | Completa | Texto, plan y cuaderno de ortografía | Conservar; cuaderno de ortografía pasa a compendio transversal |
| `02_Matematicas` | Completa | Texto, plan y AC_4_M | Conservar; renombrar el plan con código M.2.1 |
| `03_Ciencias_Naturales` | Parcial | Plan y AC_4_CN; sin texto base completo | Añadir CK-12 Life Science y OpenStax Biology (selección) |
| `04_Estudios_Sociales` | Completa | Texto, plan y AC_4_ES | Conservar; añadir atlas del Ecuador |
| `05_Ingles` | Completa | Texto y plan | Conservar; añadir Oxford Phonics World 4 |
| `06_Software_y_Programacion` | Duplicada | Dos textos introductorios de Python con solapamiento | Compendiar en ruta Scratch → Python básico → proyecto |
| `07_Arte_ECA` | Completa | Libro de actividades y plan | Conservar; añadir referencias de arte ecuatoriano |
| `08_Educacion_Fisica` | Parcial | Solo plan | Añadir manual de juegos cooperativos y guía OMS |
| `09_Relacion_con_Dios` | Parcial | Plan y listado web; sin texto estructurado | Añadir Biblia de estudio infantil y catecismo comentado |
| `10_Plan_y_Curriculo_Oficial` | Administrativa | Plan escolar, AC_4, bases y normativa | Mover a `00_Administrativo`; excluir del catálogo |

#### Avril — `08_Octavo_EGB_Avril`

| Carpeta | Estado | Hallazgo principal | Acción canónica |
|---|---|---|---|
| `01_Matematicas` | Completa | Texto, macro y microcurrículo | Conservar; añadir OpenStax Prealgebra y AoPS |
| `02_Lengua_y_Literatura` | Duplicada | Cuaderno de ortografía con sufijo `(1)` | Unificar en compendio transversal; eliminar copia |
| `03_Ciencias_Naturales` | Completa | Texto y documento combinado macro/micro | Separar macro y micro en dos archivos |
| `04_Estudios_Sociales` | Completa | Texto, macro, micro y módulo de etnoeducación | Mover el módulo docente a `00_Recursos_Docentes` |
| `05_Ingles` | Completa | Texto, macro y microcurrículo | Conservar; añadir Strunk & White y Purdue OWL |
| `06_Software_y_Programacion` | Duplicada | `think-python-es (1)` duplica el texto de Gael | Ruta única: Think Python + Python Crash Course |
| `07_Ciencias_Politicas_y_RRII` | Completa | Tres textos universitarios y currículo | Conservar; priorizar Legler y Mingst |
| `08_Administracion_y_Marketing` | Completa | Cuatro textos y currículo | Conservar; Kotler como base, Burgos/Cerezo para digital |
| `09_Arte_ECA` | Completa | Texto ECA, macro y microcurrículo | Conservar; añadir Gombrich y Wong |
| `10_Educacion_Fisica` | Parcial | Solo macro y microcurrículo | Añadir fisiología del ejercicio y primeros auxilios |
| `11_Relacion_con_Dios` | Parcial | Macro y microcurrículo; sin bibliografía teológica | Añadir Grudem, Calvino y C. S. Lewis |
| `12_Plan_y_Curriculo_Oficial` | Administrativa | Plan PDF + HTML duplicado; tomos BGU de otro nivel | Mover BGU a `99_Referencia_BGU`; conservar un solo plan |

### 2.3. Árbol canónico propuesto

```text
Wisdom_Academy_Curriculo_Global/
├── 00_Administrativo/
│   ├── Plan_Escolar_2026-2027/
│   └── Normativa_MINEDUC/
├── 04_Cuarto_EGB_Gael/
│   ├── 00_Plan_y_Normativa/
│   └── 01_Asignaturas/
│       ├── 01_Lengua_y_Literatura/
│       │   ├── 01_Texto_Base/
│       │   ├── 02_Curriculo/
│       │   ├── 03_Recursos/
│       │   └── 04_Evidencias/
│       ├── 02_Matematicas/
│       ├── 03_Ciencias_Naturales/
│       ├── 04_Estudios_Sociales/
│       ├── 05_Ingles/
│       ├── 06_Software_y_Programacion/
│       ├── 07_Arte_ECA/
│       ├── 08_Educacion_Fisica/
│       └── 09_Relacion_con_Dios/
├── 08_Octavo_EGB_Avril/
│   ├── 00_Plan_y_Normativa/
│   └── 01_Asignaturas/
│       ├── 01_Matematicas/
│       ├── 02_Lengua_y_Literatura/
│       ├── 03_Ciencias_Naturales/
│       ├── 04_Estudios_Sociales/
│       ├── 05_Ingles/
│       ├── 06_Software_y_Programacion/
│       ├── 07_Ciencias_Politicas_y_RRII/
│       ├── 08_Administracion_y_Marketing/
│       ├── 09_Arte_ECA/
│       ├── 10_Educacion_Fisica/
│       └── 11_Relacion_con_Dios/
├── 90_Compendio_Transversal/
│   ├── Ortografia/
│   ├── Python/
│   └── Recursos_Docentes/
└── 99_Referencia_BGU/
    ├── BGU-tomo-1.pdf
    └── BGU-tomo-2.pdf
```

**Nota de ejecución:** la API de Drive del proyecto está configurada en modo lectura (`drive.readonly`). El espejo local y la capa de datos ya adoptan el árbol y los nombres canónicos. La reorganización física de archivos requiere permisos de escritura y una confirmación explícita para mover o eliminar duplicados.

---

## 3. Nueva malla curricular definitiva

### 3.1. Gael — 4.° EGB (9 asignaturas)

| # | Asignatura | Área | Bloques/semana | Docente IA | Texto base | Bibliografía complementaria añadida |
|---|---|---|---:|---|---|---|
| 1 | Lengua y Literatura | Lengua | 5 | Prof. Mateo | Texto Lengua 4 + cuaderno de ortografía | Cómo escribir bien en español; Biblioteca Digital Infantil |
| 2 | Matemáticas | Matemáticas | 5 | Prof. Mateo | Matemática 4 MINEDUC | Khan Academy 4.°; OpenStax Prealgebra; Gardner |
| 3 | Ciencias Naturales | Ciencias | 4 | Prof. Mateo | Ciencias Naturales 4 + AC_4_CN | CK-12 Life Science; OpenStax Biology 2e |
| 4 | Estudios Sociales del Ecuador | Sociales | 3 | Prof. Mateo | Estudios Sociales 4 MINEDUC | Atlas del Ecuador; Historia del Ecuador (Ayala Mora, adaptación) |
| 5 | English Phonics & Reading | Lengua extranjera | 3 | Prof. Mateo | English 4 MINEDUC | Oxford Phonics World 4; Cambridge Primary English 4 |
| 6 | Software y Programación | Tecnología | 2 | Prof. Mateo | Think Python + curso Python | ScratchEd; documentación Python |
| 7 | Educación Cultural y Artística (ECA) | Arte | 1 | Prof. Mateo | Libro de Actividades 4.° + plan | Arte para niños (Taschen); museos virtuales |
| 8 | Educación Física y Salud | Educación física | 1 | Prof. Mateo | Plan Curricular EF 4.° | OMS actividad física infantil; juegos cooperativos |
| 9 | Relación con Dios | Teología | 1 | Prof. Mateo | Plan Curricular + Biblia | Biblia de estudio infantil; Catecismo de Heidelberg comentado |

**Total:** 25 bloques semanales · 5 bloques diarios · 3,5 horas pedagógicas efectivas.

### 3.2. Avril — 8.° EGB (11 asignaturas)

| # | Asignatura | Área | Bloques/semana | Docente IA | Texto base | Bibliografía complementaria añadida |
|---|---|---|---:|---|---|---|
| 1 | Matemáticas y Pre-Álgebra | Matemáticas | 4 | Dra. Sofía | Matemática 8 MINEDUC | OpenStax Prealgebra 2e; AoPS Prealgebra; Khan Academy |
| 2 | Lengua y Literatura | Lengua | 4 | Dra. Sofía | Lengua y Literatura 8 MINEDUC | Cassany; Serafini; Biblioteca Cervantes |
| 3 | Ciencias Naturales Integradas | Ciencias | 3 | Dra. Sofía | Ciencias Naturales 8 MINEDUC | OpenStax Biology 2e; CK-12; PhET |
| 4 | Estudios Sociales e Historia del Ecuador | Sociales | 2 | Dra. Sofía | Estudios Sociales 8 MINEDUC | Ayala Mora; Constitución 2008; INEC |
| 5 | Academic English & Literature | Lengua extranjera | 3 | Dra. Sofía | English 8 MINEDUC | Strunk & White; Purdue OWL; Oxford Academic English |
| 6 | Software y Programación Python | Tecnología | 2 | Dra. Sofía | Think Python + curso Python | Python Crash Course; Automate the Boring Stuff; docs Python |
| 7 | Ciencias Políticas y Relaciones Internacionales | Ciencias políticas | 2 | Dra. Sofía | Legler et al.; Mingst | Rocha Herrera et al.; Carta de la ONU |
| 8 | Administración y Marketing Digital | Administración | 2 | Dra. Sofía | Kotler; Burgos y Cerezo | Robbins y Coulter; Divisadero |
| 9 | Educación Cultural y Artística (ECA) | Arte | 1 | Dra. Sofía | ECA 8 MINEDUC | Gombrich; Wong; museos virtuales |
| 10 | Educación Física y Salud | Educación física | 1 | Dra. Sofía | Macro/micro EF 8.° | McArdle (fisiología del ejercicio); primeros auxilios; OMS |
| 11 | Relación con Dios (Teología y Cosmovisión) | Teología | 1 | Dra. Sofía | Macro/micro Relación con Dios | Grudem; Calvino; C. S. Lewis; Biblia de estudio |

**Total:** 25 bloques semanales · 5 bloques diarios · 3,5 horas pedagógicas efectivas.

### 3.3. Criterio de adición de textos

No se inventaron materias ni se duplicaron nombres. Cuando la carpeta de Drive no contenía un texto base suficiente, se añadieron referencias de reconocido prestigio internacional, priorizando acceso abierto o alta disponibilidad:

- **Ciencias:** OpenStax, CK-12 y PhET.
- **Matemáticas:** OpenStax, Art of Problem Solving y Khan Academy.
- **Lengua:** Cassany, Serafini y bibliotecas digitales públicas.
- **English:** Oxford, Cambridge, Purdue OWL y Strunk & White.
- **Programación:** Think Python, Python Crash Course y Automate the Boring Stuff.
- **Ciencias políticas:** Legler, Mingst y Rocha Herrera.
- **Administración:** Kotler, Robbins/Coulter y Burgos/Cerezo.
- **Arte:** Gombrich y Wong.
- **Educación física:** McArdle, OMS y manuales de primeros auxilios.
- **Teología:** Grudem, Calvino, C. S. Lewis y Biblia de estudio.

---

## 4. Separación epistemológica aplicada

### 4.1. Áreas académicas

Matemáticas, Ciencias Naturales, Lengua y Literatura, Estudios Sociales, Lengua Extranjera, Tecnología, Arte, Educación Física, Ciencias Políticas y Administración se rigen por:

- método científico y razonamiento basado en evidencia;
- lineamientos curriculares del MINEDUC;
- fuentes verificables y bibliografía disciplinar;
- lenguaje neutral, sin versículos, exhortaciones ni confesionalidad forzada;
- mención ética o filosófica solo cuando el tema lo exige por contexto histórico o curricular.

### 4.2. Relación con Dios

Es el único espacio confesional. Su contenido incluye:

- doctrina de la revelación, canon e inspiración;
- teología propia, Trinidad, creación y providencia;
- antropología bíblica, hamartiología y cristología;
- soteriología, pneumatología, eclesiología y escatología;
- ética cristiana, cosmovisión, misión y discipulado;
- exégesis, contexto histórico-literario y aplicación pastoral.

Gael recibe 16 unidades con lenguaje adaptado a 8 años. Avril recibe 16 unidades con rigor de Básica Superior y bibliografía teológica universitaria.

---

## 5. Actualización programática

### 5.1. Archivos nuevos

| Archivo | Función |
|---|---|
| `src/data/curriculum/tipos.ts` | Contrato de datos de la malla personalizada |
| `src/data/curriculum/gael-4to.ts` | 9 asignaturas, 12–16 unidades por materia, bibliografía y horario |
| `src/data/curriculum/avril-8vo.ts` | 11 asignaturas, 12–16 unidades por materia, bibliografía y horario |
| `src/data/curriculum/index.ts` | Resolución de alias, horarios, lemas académicos y auditoría de Drive |
| `scripts/test-curriculum.ts` | Prueba de integridad de 200 días y separación epistemológica |
| `docs/AUDITORIA_CURRICULAR_WISDOM_ACADEMY.md` | Este reporte |

### 5.2. Archivos refactorizados

| Archivo | Cambio |
|---|---|
| `src/services/curriculumContentEngine.ts` | Reescrito sobre la capa de datos; conserva interfaces y API pública; 20 asignaturas; contenido académico neutral; teología profunda |
| `src/services/curriculumAuditorAndFiller.ts` | Jornada construida desde el horario real de Drive; 200 días; 5 bloques; 248 unidades; lema académico vs. bíblico |
| `src/services/googleDriveCurriculumSync.ts` | Niveles 4.° y 8.° con 9 y 11 materias; horario 08:00–12:00; despacho a OpenMAIC sin versículo forzado |
| `src/lib/pdf/daily-guide-compiler.ts` | Etiqueta condicional “Principio Académico” / “Lema Bíblico”; checklist y metas neutrales |
| `src/services/printableGuideGenerator.ts` | Portada y lema condicionales según área epistemológica |
| `src/components/openmaic/OpenMAICClassroomViewer.tsx` | Cierre “Síntesis” o “Aplicación” según materia; gráficos sin referencias religiosas forzadas |
| `src/lib/ai/orchestrator.ts` | Prompts y respaldos separados por área; prohibición explícita de confesionalidad en materias académicas |
| `src/lib/pdf/study-guide-prompts.ts` | Instrucción epistemológica condicional |
| `src/services/ecuadorSchoolCalendar.ts` | Secuencia lectiva inicial de Matemáticas y Ciencias neutralizada; sin versículos en temas académicos |
| `config/openmaic.yml` | Perfiles de Gael, Avril y K-12 con separación académica/teológica |
| `src/lib/lms-moodle/moodleDomain.ts` | Lecciones del aula generadas desde las unidades de cada asignatura; lema académico o bíblico según área |
| `src/components/lms/PlatziClassroomRightPanel.tsx` | Etiqueta condicional del lema y respaldo neutral del chat |
| `src/components/lms/LessonResourceTabs.tsx` | Principio académico o lema bíblico según la materia |
| `src/components/openmaic/OpenMAICChatModal.tsx` | Respuestas de contingencia neutrales en áreas académicas |
| `src/lib/auth/authContext.tsx` | Cohortes completas de 9 y 11 materias + migración de datos persistidos |
| `src/components/admin/MoodleEnrolmentsManager.tsx` | Matrícula de cohorte completa desde las constantes de la malla |
| `src/services/moodleBridge.ts` | Cursos Moodle generados desde los perfiles curriculares |
| `src/components/admin/WorkshopsAndGradesCatalog.tsx` y duplicado | Nombres canónicos de las materias |
| `src/app/(student)/dashboard/page.tsx` | Horario del lunes alineado con Drive y mensaje académico neutral |

### 5.3. Contratos preservados

- Se mantuvieron las interfaces `DiapositivaLeccion`, `PasoExplicacionLeccion`, `PreguntaQuizMateria`, `SimulacionMateria`, `RetoPblMateria`, `LeccionMateriaCompleta` e `IntervencionOpenMAIC`.
- Se mantuvieron los métodos públicos `obtenerLeccion`, `obtenerPasosExplicacion` y `obtenerIntervencionProfesor`.
- Se conservaron las rutas `/api/curriculum/daily-guide`, `/api/curriculum/guide-pdf`, `/api/curriculum/sync-daily`, `/aula`, `/dashboard`, `/admin` y sus componentes.
- No se añadieron dependencias ni se modificó la arquitectura de estado.

### 5.4. Verificación

```bash
npx tsc --noEmit
npm run build
npm run test:curriculum
```

Resultados obtenidos:

- TypeScript: sin errores.
- Next.js build: compilación, lint y generación de 20 rutas correctamente.
- Prueba curricular: 200/200 días, 20 materias, 248 unidades, separación epistemológica aprobada.

---

## 6. Acciones pendientes en Google Drive

Para ejecutar la reorganización física se requiere una cuenta de servicio con permisos de escritura y confirmación de borrado/movimiento:

1. Crear `00_Administrativo`, `01_Asignaturas`, `90_Compendio_Transversal` y `99_Referencia_BGU`.
2. Mover los planes escolares y normativa a `00_Administrativo`.
3. Mover los tomos BGU a `99_Referencia_BGU`.
4. Consolidar los cuadernos de ortografía y los textos de Python en `90_Compendio_Transversal`.
5. Conservar una sola copia canónica del plan escolar en PDF y retirar el HTML duplicado.
6. Añadir los textos base faltantes de Ciencias, Educación Física y Relación con Dios.
7. Verificar que cada asignatura tenga `01_Texto_Base`, `02_Curriculo`, `03_Recursos` y `04_Evidencias`.

La plataforma ya resuelve los nombres antiguos y nuevos mediante alias, por lo que el movimiento físico de carpetas no rompe la sincronización.
