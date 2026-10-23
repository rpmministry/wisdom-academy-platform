# Contribuir · Wisdom Academy

Gracias por contribuir. Este repositorio contiene datos educativos, accesos y pagos; los cambios deben ser pequeños, revisables y verificables.

## Flujo de trabajo

1. Crea una rama desde `main`:

```bash
git switch -c feature/mi-cambio
```

2. Implementa el cambio con pruebas.
3. Ejecuta las verificaciones.
4. Abre un pull request describiendo el problema, la solución y la evidencia.
5. No hagas merge sin revisión del propietario.

## Convenciones

- Commits en formato Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- TypeScript estricto; evitar `any` sin justificación.
- Mantener el estilo de componentes, CSS y nombres existentes.
- Textos de interfaz en español, salvo claves técnicas.
- No añadir dependencias sin justificar tamaño, mantenimiento y seguridad.

## Verificaciones obligatorias

```bash
npm run typecheck
npm test
npm run build
npm run check:secrets
```

Para cambios de pagos, ejecutar además:

```bash
npm run test:payments
```

Para cambios de interfaz relevantes:

```bash
npm run test:e2e
```

## Reglas de seguridad

- No subir `.env`, `.env.local`, `.data`, backups, tokens ni cookies.
- No usar datos reales de estudiantes en pruebas o capturas.
- No exponer el Client Secret de PayPal en el cliente ni en `NEXT_PUBLIC_*`.
- No modificar la verificación de firma de webhooks sin pruebas específicas.
- No otorgar accesos desde el navegador; solo desde una captura o webhook verificado.
- Reportar vulnerabilidades según [SECURITY.md](SECURITY.md).

## Cambios en pagos

Un pull request que toque `src/server/payments`, `src/server/domain/checkout.ts`, webhooks o reembolsos debe incluir:

- Pruebas de importe, moneda, usuario, producto e idempotencia.
- Pruebas de captura fallida y reintento.
- Pruebas de webhook inválido y duplicado.
- Evidencia de que no se duplican derechos ni matrículas.
- Actualización de `docs/PAYPAL_*.md` si cambia el comportamiento.

## Cambios en base de datos

- Añadir una migración versionada e idempotente en `src/server/db/sqlite.ts`.
- No editar migraciones ya aplicadas.
- Probar en una base nueva y en una existente.
- Documentar el impacto y el procedimiento de reversa.
- No borrar órdenes, pagos o derechos para “limpiar” datos.

## Pull requests

Incluye:

- Contexto y motivación.
- Archivos principales modificados.
- Comandos ejecutados y resultados.
- Riesgos, limitaciones y pasos pendientes.
- Capturas solo si no contienen datos personales ni secretos.

## Licencia

Al contribuir aceptas que el código se incorpora al proyecto propietario de Wisdom Academy, sin cambiar la licencia del repositorio.
