# Informe de pruebas

**Fecha:** 22 de octubre de 2026  
**Entorno:** Windows, Node.js 24.19.0, npm, Next.js 15.5.28, Microsoft Edge para Playwright.  
**Regla:** solo se marca como aprobado lo que se ejecutó y produjo evidencia.

## 1. Estado inicial (antes de las correcciones)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto |
| `npm test` | 50 + 47 + 44 pruebas aprobadas (141) |
| `npm run test:e2e` (suite previa) | 21 pruebas aprobadas |
| `npm run db:backup` | Respaldo e integridad correctos |
| Login del creador con la credencial inicial | **Fallido (401)** |

La credencial inicial estaba obsoleta. El acceso se recuperó con el procedimiento descrito en el informe de auditoría.

## 2. Validación final

| Comando / prueba | Resultado |
|---|---|
| `npm run typecheck` | **Correcto**, sin errores |
| `npm run build` | **Correcto**; 18 páginas generadas; primera carga compartida 103 kB |
| `npm test` | **141 pruebas aprobadas**, 0 fallos (50 recursos + 47 plataforma + 44 cursos) |
| Playwright E2E contra build de producción | **25 pruebas aprobadas**, 0 fallos |
| `npm run check:deploy` | **0 fallos críticos**; 2 advertencias (PayPal sandbox y Google no configurado) |
| `npm audit --omit=dev` | 4 moderadas, 0 altas, 0 críticas |
| `npm run db:backup` | Correcto; integridad `ok` |
| Login real del creador | 200; rol ADMIN; 31 permisos; `/admin` 200; resumen 200 |
| Logout y cookie revocada | `/admin` 307 a `/login`; API administrativa 401 |
| Credenciales incorrectas | 401 sin enumeración de cuenta |
| Payload malformado | 400 |
| Mutación administrativa sin CSRF | 403 (prueba E2E) |

## 3. Detalle de las pruebas E2E

Las 25 pruebas se ejecutaron contra `next start` con una base SQLite temporal aislada y fixtures E2E, no contra la base del propietario.

Cobertura:

- Cursos y talleres: ruta de aprendizaje y recurso inexistente.
- Recursos educativos: apertura/cierre del panel, reproducción de video, reporte, estado vacío, error y reintento, cambio de contexto, tableta, móvil y teclado.
- RBAC: visitante anónimo, estudiante fuera de administración, catálogo sin accesos administrativos y administrador autorizado.
- UI: persistencia del tema oscuro, error de credenciales con recuperación del formulario, rechazo de mutación sin CSRF y menú administrativo móvil.

La ejecución en modo desarrollo produjo fallos intermitentes por la compilación bajo demanda de Next.js y por la hidratación lenta. Esos fallos no se reprodujeron contra el build de producción. Se corrigieron las pruebas para enviar la cabecera `Origin` que el login exige en producción y para esperar la hidratación.

## 4. Pruebas manuales de autenticación

| Caso | Resultado |
|---|---|
| Login con credencial válida del creador | 200; cookie de sesión; CSRF presente |
| Sesión tras navegar a `/admin` | 200 |
| API administrativa autenticada | 200 |
| Login con contraseña incorrecta | 401 |
| Login con JSON malformado | 400 |
| Ruta protegida sin sesión | 307 a `/login` |
| Ruta protegida con cookie revocada | 307 a `/login` |
| API protegida con cookie revocada | 401 |
| Logout | `ok:true`; sesión revocada en SQLite |
| `/api/auth/session` tras logout | 200 con `usuario:null` (contrato del cliente), sin acceso a recursos |

Tiempos de login en caliente: **300–373 ms**. La primera petición en desarrollo tardó ~10 s por compilación bajo demanda; el build de producción elimina esa compilación.

## 5. Pruebas visuales y responsivas

Se capturaron pantallas en:

- 320 × 700, 375 × 812, 768 × 1024, 1024 × 768 y 1440 × 900.
- Portada, catálogo, login, panel administrativo, dashboard y cursos.
- Modo claro y modo oscuro.

Resultados:

- Sin desbordamiento horizontal de página en las pantallas revisadas.
- El sidebar administrativo se abre con el botón de menú en móvil y usa un cajón superpuesto.
- La barra de pestañas del dashboard usa desplazamiento horizontal contenido; no rompe el layout.
- La portada muestra esqueletos mientras carga el catálogo y luego los productos reales.
- El tema oscuro persiste tras recargar y no produce destellos ilegibles.
- Los formularios de acceso mantienen etiquetas, foco y mensajes de error visibles.

Evidencias generadas por la suite en `docs/evidencias/`:

- `recursos-escritorio.png`
- `recursos-tablet.png`
- `recursos-movil.png`
- `recursos-pendiente.png`
- `admin-revision.png`

## 6. Pruebas de seguridad ejecutadas

- Análisis de rutas mutables: todas las rutas administrativas con `requireSession` exigen `mutation:true` y token CSRF.
- Revisión de cabeceras `Cache-Control` en contenido personalizado.
- Revisión de descargas y MIME activo.
- Revisión de simulación Moodle y paquetes offline.
- Revisión de efectos secundarios en GET: `sync-daily` ahora responde 405 y la escritura exige POST + CSRF.
- Búsqueda de patrones de secretos en archivos rastreados: sin hallazgos.
- `git ls-files` de `.env`: sin archivos de entorno rastreados.
- `npm audit` y `npm audit --omit=dev`.
- Prueba E2E de rechazo de mutación sin CSRF.

No se ejecutaron pruebas de penetración destructivas ni ataques contra producción.

## 7. Fallos encontrados durante la auditoría y su tratamiento

| Fallo | Causa | Tratamiento |
|---|---|---|
| Login con credencial inicial 401 | Archivo de credencial obsoleto | Rotación segura y verificación |
| E2E de login fallaba en producción | Playwright no enviaba `Origin` y el login lo exige en producción | Se añadió `Origin` a los ayudantes E2E |
| E2E de tema intermitente en desarrollo | Hidratación/compilación lenta | Se espera `networkidle` + `window.next`; se validó contra producción |
| `typecheck` falló por `window.next` | Tipo no declarado en el test | Cast explícito en el test |
| `npm audit` reporta 4 moderadas | Cadena transitiva de `googleapis`/`uuid` | Documentado; actualización mayor pendiente con regresión |
| Primer arranque en frío lento | Compilación de Next en desarrollo | Build de producción y timeout/reintento en el cliente |

## 8. Pruebas no ejecutadas

- Cobro real con PayPal Live.
- Envío real de correo transaccional (no hay proveedor configurado).
- Prueba de carga con usuarios concurrentes.
- Auditoría manual con lectores de pantalla (NVDA/JAWS/VoiceOver).
- Certificación WCAG 2.2 AA.
- Migración y pruebas contra PostgreSQL/Turso.
- Despliegue en Vercel o en un host productivo.
- Restauración completa de un backup en un host limpio.

Estas pruebas quedan pendientes y no deben declararse aprobadas.

## 9. Conclusión

La compilación, los tipos, las 141 pruebas de unidad/integración y las 25 pruebas E2E contra producción pasan. El acceso del creador está recuperado y verificado. La aplicación está lista para validación en staging con persistencia; no está lista para producción en Vercel con SQLite.
