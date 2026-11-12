---
name: engineering-brain-consumption
description: Consulta y consumo guiado de patrones y estándares del AlsizTech Engineering Brain. Úsala antes de implementar soluciones técnicas en este proyecto.
---

# Consumo del AlsizTech Engineering Brain

<!-- managed-by: alsiztech-engineering-brain -->

Esta skill guía a los agentes en el consumo estructurado y trazable de patrones de ingeniería desde el repositorio central del Engineering Brain y la memoria transversal de AlsizTech.

## Cuándo usar esta skill

- Antes de diseñar o codificar una nueva funcionalidad técnica.
- Al resolver problemas de integración con APIs externas o IA.
- Al implementar generación de documentos (PDF, DOCX).
- Al diseñar límites de seguridad, resiliencia y reintentos.

## Procedimiento de consumo

1. **Identificar proyecto**: Verifica que este proyecto corresponde a `workspace: "alsiztech"` y `project: "rpmministry-wisdom-academy"`.
2. **Consultar AI-Memory local**: Revisa las decisiones y arquitectura previas del proyecto.
3. **Consultar biblioteca global**: Busca en `workspace: "alsiztech"`, `project: "engineering-patterns"` patrones afines al problema.
4. **Inspeccionar registro del Engineering Brain**:
   Consulta `registry/patterns.json` en la raíz del Engineering Brain (`ALSIZ_ENGINEERING_BRAIN_ROOT`):
   ```powershell
   npm run brain:status
   npm run brain:patterns -- --problem=<termino>
   ```
5. **Comprobar compatibilidad**: Revisa el estado del patrón (`IMPLEMENTED_IN_SOURCE`), sus limitaciones y proyectos validados.
6. **Adaptar la solución**: No copies código indiscriminadamente; adáptalo a la arquitectura y convenciones de este proyecto.
7. **Verificar**: Ejecuta las suites de prueba locales y genera evidencia.
