# Wisdom Academy — instrucciones de agentes

<!-- BEGIN:alsiztech-engineering-brain -->
## AlsizTech Engineering Brain

Este proyecto está conectado al Engineering Brain central de AlsizTech. El conocimiento reutilizable vive en el repositorio central y en la biblioteca `alsiztech / engineering-patterns` de AI-Memory.

### Identidad

- Workspace AI-Memory: `alsiztech`
- Proyecto AI-Memory: `rpmministry-wisdom-academy`
- Nombre de producto: `Wisdom Academy`
- Raíz central: variable `ALSIZ_ENGINEERING_BRAIN_ROOT` o `.local/project-paths.json` del Engineering Brain.
- Configuración local: `.engineering-brain.json`.
- Skills locales administradas:
  - `.agents/skills/engineering-brain-workflow/SKILL.md` (Flujo de trabajo diario obligatorio)
  - `.agents/skills/engineering-brain/SKILL.md` (Consulta general del Engineering Brain)
  - `.agents/skills/engineering-brain-consumption/SKILL.md` (Consumo y adaptación de patrones)
  - `.agents/skills/engineering-evidence-capture/SKILL.md` (Captura de evidencias y aprendizajes)
  - `.kilo/skills/engineering-brain/SKILL.md` (Compatibilidad Kilo Code)

### Procedimiento obligatorio al trabajar en este proyecto

1. **Al comenzar una tarea:** Identifica este proyecto (`rpmministry-wisdom-academy`) y consulta su memoria mediante MCP (`memory_briefing` o `memory_query`). Si la tarea aborda un problema transversal (IA, PDF, resiliencia), consulta `alsiztech / engineering-patterns` y `registry/patterns.json`. Revisa `AGENTS.md` local y el código relevante antes de modificar.
2. **Al ejecutar la tarea:** Define el resultado esperado y los archivos específicos a intervenir. Respeta la arquitectura existente. Ejecuta únicamente las pruebas relacionadas con la modificación (política de reducción de pruebas).
3. **Al concluir la tarea:** Resume los cambios realizados, las pruebas efectivamente ejecutadas y cualquier limitación observada. Prepara aprendizajes o handoffs (`memory_handoff_begin`) cuando corresponda.

### Comandos principales del Engineering Brain

Desde la raíz central (`ALSIZ_ENGINEERING_BRAIN_ROOT`):

```powershell
npm run brain:status
npm run brain:ready
npm run brain:projects
npm run brain:patterns
npm run brain:patterns -- --category=AI
npm run brain:evidence:validate -- <ruta-del-paquete>
```

### Reglas

- Los patrones globales son conocimiento reutilizable, no instrucciones obligatorias.
- Las instrucciones y decisiones vigentes de este proyecto prevalecen.
- No promociones ni degradues patrones automáticamente.
- No modifiques código funcional fuera del alcance de la tarea autorizada.
- La evidencia sintética (`test_only: true`) no promueve patrones reales.
- Un PASS exige comando ejecutado, `exit_code` 0, artefacto y SHA-256.
- No uses SQLite directamente ni crees otra base de datos de memoria.
- No hagas commit ni push sin autorización explícita.

<!-- managed-by: alsiztech-engineering-brain -->
<!-- END:alsiztech-engineering-brain -->
