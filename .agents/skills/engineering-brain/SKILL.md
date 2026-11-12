---
name: engineering-brain
description: Consulta, adapta y evidencia patrones del AlsizTech Engineering Brain desde cualquier proyecto activo. Úsala antes de implementar arquitectura, integraciones, resiliencia, PDF/DOCX o flujos de IA.
---

# Engineering Brain

<!-- managed-by: alsiztech-engineering-brain -->

## Cuándo usarla

Antes de implementar una funcionalidad no trivial, resolver un fallo de integración, diseñar resiliencia, generar documentos PDF/DOCX o registrar un aprendizaje.

## Flujo obligatorio

1. Identifica el proyecto actual y lee su memoria específica.
2. Consulta AI-Memory con alcance explícito:
   - Proyecto actual: `workspace: "alsiztech"`, `project: "rpmministry-wisdom-academy"`.
   - Biblioteca global: `workspace: "alsiztech"`, `project: "engineering-patterns"`.
3. Localiza el Engineering Brain con `ALSIZ_ENGINEERING_BRAIN_ROOT` o `.local/project-paths.json`.
4. Consulta `registry/patterns.json` y el catálogo generado.
5. Revisa estado, limitaciones, evidencia y proyectos validados del patrón.
6. Adapta la solución a la arquitectura y reglas locales; no copies código sin comparar.
7. Implementa pruebas deterministas y, cuando sea posible, una prueba de integración.
8. Genera un paquete de evidencia con comando, salida, artefacto y SHA-256.
9. Valida la evidencia con `npm run brain:evidence:validate -- <ruta>`.
10. Registra la decisión o el aprendizaje específico del proyecto mediante las herramientas oficiales de AI-Memory, solo cuando corresponda.

## Comandos

```powershell
npm run brain:status
npm run brain:patterns
npm run brain:patterns -- --category=AI
npm run brain:patterns -- --technology=Next.js
npm run brain:patterns -- --problem=fallback
npm run brain:patterns -- --status=IMPLEMENTED_IN_SOURCE
npm run brain:validate
npm run brain:catalog
npm run brain:evidence:validate -- <ruta-del-paquete>
```

Todos los comandos se ejecutan desde la raíz del Engineering Brain, no desde este proyecto.

## Límites

- No promociones patrones automáticamente.
- No presentes evidencia `HISTORICAL`, `REPORTED` o `INFERRED` como ejecución nueva.
- No uses evidencia sintética para promover patrones reales.
- No inventes commits, rutas, resultados ni identificadores de proyecto.
- No modifiques la memoria de otro proyecto sin autorización.
