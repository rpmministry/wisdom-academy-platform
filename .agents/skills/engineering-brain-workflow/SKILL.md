---
name: engineering-brain-workflow
description: Procedimiento operativo unificado y obligatorio para ejecutar tareas de desarrollo en este proyecto conectado al AlsizTech Engineering Brain.
---

# Flujo de Trabajo Diario — Wisdom Academy

<!-- managed-by: alsiztech-engineering-brain -->

Este procedimiento es el estándar operativo obligatorio para trabajar con Google Antigravity en **Wisdom Academy** (`rpmministry-wisdom-academy`).

Garantiza calidad técnica, trazabilidad y aprovechamiento del conocimiento transversal sin burocracia innecesaria. La documentación siempre debe ser proporcional a la envergadura del cambio.

---

## 1. Al comenzar una tarea

Antes de modificar cualquier archivo de código o configuración:

1. **Identificar el proyecto:** Este repositorio corresponde a **Wisdom Academy** (`project: "rpmministry-wisdom-academy"` en workspace `alsiztech`).
2. **Identificar workspace y project de AI-Memory:** Consulta `.ai-memory.toml` o `.engineering-brain.json`.
3. **Consultar el briefing del proyecto mediante MCP:** Ejecuta la herramienta MCP `memory_briefing` o `memory_query` con `workspace: "alsiztech"` y `project: "rpmministry-wisdom-academy"` para conocer estado, arquitectura y decisiones previas.
4. **Consultar la biblioteca global cuando la tarea lo requiera:** Si la tarea involucra un problema transversal (integración de IA, fallback de proveedores, generación de PDF/DOCX en cliente, resiliencia, etc.), consulta `workspace: "alsiztech"`, `project: "engineering-patterns"`.
5. **Consultar los patrones pertinentes:** Desde la raíz del Engineering Brain (`ALSIZ_ENGINEERING_BRAIN_ROOT`), revisa `registry/patterns.json` o ejecuta `npm run brain:patterns -- --problem=<termino>`. Respeta las limitaciones documentadas.
6. **Inspeccionar las instrucciones del proyecto:** Lee `AGENTS.md` en la raíz de este proyecto para conocer convenciones locales y límites vigentes.
7. **Revisar los archivos de código relevantes:** Inspecciona los archivos existentes antes de introducir cambios para entender el flujo.
8. **Identificar las decisiones y limitaciones existentes:** No contradigas decisiones arquitectónicas previas ni violes dependencias establecidas.

---

## 2. Al ejecutar una tarea

Durante el desarrollo de la solución:

1. **Definir brevemente el resultado esperado:** Ten claro qué debe cambiar y qué debe permanecer inalterado.
2. **Identificar los archivos que deben modificarse:** Delimita los archivos exactos a intervenir.
3. **Respetar la arquitectura y el diseño actuales:** No rediseñes componentes ajenos a la tarea ni añadas dependencias innecesarias.
4. **Implementar el cambio:** Realiza modificaciones limpias, conservando comentarios y tipado.
5. **Ejecutar únicamente las pruebas relacionadas con la modificación:** Aplica la política de reducción de pruebas. No ejecutes suites completas pesadas si el cambio fue puntual. Ejecuta solo las pruebas unitarias o dirigidas al componente modificado.
6. **Corregir los errores introducidos:** Resuelve fallos o regresiones derivados del cambio antes de dar por buena la solución.
7. **Documentar las decisiones importantes:** Si tomaste una decisión de diseño relevante, regístrala brevemente.

---

## 3. Al concluir una tarea

Al finalizar el trabajo:

1. **Resumir los archivos modificados:** Desglose claro de archivos tocados y su naturaleza.
2. **Informar las pruebas efectivamente ejecutadas:** Comandos exactos ejecutados y su resultado.
3. **Documentar cualquier limitación:** Casos pendientes o supuestos asumidos.
4. **Preparar el aprendizaje reutilizable:** Si la tarea resolvió un problema técnico nuevo o descubrió una limitación valiosa, sintetízalo en una regla o nota concisa.
5. **Actualizar la memoria del proyecto cuando sea apropiado y esté autorizado:** Registra hallazgos duraderos mediante herramientas oficiales de AI-Memory con autorización del usuario.
6. **Preparar el handoff cuando la tarea deba continuar en otra sesión:** Si el trabajo queda pendiente, prepara un handoff estructurado (`memory_handoff_begin`).

---

## Proporcionalidad y Límites

- **Proporcionalidad:** Para cambios menores o fixes rápidos (1-2 archivos), un resumen directo de 3 líneas es suficiente.
- **Sin commits ni pushes automáticos:** Nunca hagas commit ni push sin autorización expresa.
- **No destructivo:** Queda prohibido usar `git reset --hard`, `git clean -fd` o sobrescribir trabajo local sin respaldo.
- **Preservación:** No modifiques proyectos ni checkouts fuera del alcance autorizado de la tarea.
