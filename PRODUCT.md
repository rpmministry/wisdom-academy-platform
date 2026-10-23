# PRODUCTO: Wisdom Academy Platform
<!--
==============================================================================
PROYECTO: Wisdom Academy Platform - Documento de Especificación de Producto
PROPÓSITO ARQUITECTÓNICO:
Define la visión del producto, la cosmovisión pedagógica cristiana evangélica,
los perfiles de los estudiantes de Homeschooling K-12 en Ecuador y el modelo
de interacción híbrido entre Profesores IA y Profesores Reales.
==============================================================================
-->

## 1. Declaración de Misión y Cosmovisión
Wisdom Academy es una plataforma educativa integral, bilingüe (Español/Inglés) y cloud-native, fundamentada en una **cosmovisión cristiana evangélica bíblica**. Su visión es acompañar la educación básica y el bachillerato con excelencia académica y profundidad espiritual, además de una escuela de talleres libres y cursos continuos.

**Estado real de la oferta (octubre de 2026):** el catálogo publicado incluye 4.° EGB, 8.° EGB, el programa N2N de formación teológica y talleres de formación complementaria. Otros niveles y programas son líneas de desarrollo y no deben anunciarse como disponibles hasta que existan productos publicados, docentes asignados y recursos verificados. La cobertura completa del sistema ecuatoriano es una meta institucional, no una prestación operativa actual.

> "Porque Jehová da la sabiduría, y de su boca viene el conocimiento y la inteligencia."  
> — **Proverbios 2:6**

---

## 2. Audiencia y Perfiles de Estudiantes Activos

### A. Gael (8 años, 4° de EGB - Subnivel Elemental MINEDUC)
- **Etapa de Desarrollo**: Infancia media.
- **Enfoque Pedagógico**: Asombro por la creación divina, aprendizaje visual, kinestésico y lúdico.
- **Balance Lingüístico**: 70% Español / 30% Inglés (fonética natural, vocabulario activo).
- **Régimen Horario**: 4 bloques diarios de 35 minutos con 15 minutos de recreo/pausa activa.
- **Gobernanza del Portafolio**: Supervisión y captura estructurada por el **Padre-Mentor** según la normativa legal MINEDUC del Ecuador.
- **Ponderación de Escenas OpenMAIC**: Slides 35%, Interactivo 35%, Quiz 20%, PBL 10%.

### B. Avril (12 años, 8° de EGB - Subnivel Básica Superior MINEDUC)
- **Etapa de Desarrollo**: Adolescencia temprana.
- **Enfoque Pedagógico**: Rigor académico internacional, apologética bíblica, pensamiento socrático y método científico.
- **Balance Lingüístico**: 50% Español / 50% Inglés Académico (lectura crítica, redacción y debate).
- **Régimen Horario**: 5 bloques diarios de 45 minutos con 15 minutos de recreo/pausa activa.
- **Gobernanza del Portafolio**: **Autogestión por la estudiante** con acompañamiento de mentores para evaluación ministerial periódica.
- **Ponderación de Escenas OpenMAIC**: Slides 30%, Interactivo 25%, Quiz 20%, PBL 25% (Aprendizaje Basado en Proyectos).

### C. Comunidad Extendida (1° EGB a 3° BGU y Talleres Libres)
- Hermanos, nuevos estudiantes homeschoolers y adultos en talleres libres (*Programación con IA*, *Cosmovisión Bíblica*, *Mayordomía Financiera*, *Artes de Adoración*).

---

## 3. Pilares de Contexto de Diseño (Impeccable Style)

1. **Audiencia**: Niños y jóvenes en modalidad Homeschool K-12 (iniciando con Gael de 8 años y Avril de 12 años), padres mentores y estudiantes de talleres.
2. **Identidad y Cosmovisión**: Cristiana evangélica bíblica, bilingüe (Español/Inglés) de rigor internacional.
3. **Dirección Estética**: *Arctic Slate & Accents*: base slate de alto contraste, azul para acción, verde para selección, amarillo para atención y rojo para progreso, con tipografía sans serif sobre el 2x Grid de IBM Carbon. Ver `DESIGN.md`.
4. **Restricciones**: Cumplimiento estricto de las 59 reglas anti-slop de Impeccable Style (cero fuentes genéricas, cero negro/blanco puro, cero anidamiento card-in-card, animaciones exclusivas por GPU).

---

## 4. Modalidad de Enseñanza Híbrida
- **Aula IA Inteligente**: Dictado diario desatendido mediante OpenMAIC (MinerU + LangGraph 1.1 + Gemini 3.8 Flash/Pro) consumiendo materiales desde Google Drive.
- **Hub Multicanal con Docentes Humanos**: Videollamadas integradas (Jitsi Meet in-app, BigBlueButton con pizarra sobre PDF, Google Meet, Zoom y Microsoft Teams).
- **Filosofía Offline-First**: Cada lección permite descargar la guía imprimible en PDF y el paquete de aula interactiva autónoma en HTML para estudio sin conexión a internet.

