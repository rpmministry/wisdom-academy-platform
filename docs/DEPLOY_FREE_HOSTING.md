# Despliegue gratuito temporal · Wisdom Academy

**Fecha:** 23 de octubre de 2026  
**Objetivo:** publicar la plataforma con SQLite persistente, sin pagar hosting, hasta trasladarla a un servidor y dominio propios.  
**Estado:** guía preparada y código subido a GitHub. No se creó ninguna cuenta ni se desplegó nada desde este entorno.

- Repositorio nuevo: <https://github.com/rpmministry/wisdom-academy-platform>
- Rama de despliegue: `main`
- Visibilidad: **privado**.
- El repositorio anterior `rpmministry/wisdom-academy` queda como legado y no debe conectarse a este despliegue.
- El Client Secret de PayPal no está en el repositorio; `.env` está ignorado. La contraseña E2E y los documentos internos tampoco deben publicarse fuera del repositorio privado.

## 1. Veredicto sobre Vercel

La plataforma **no se puede desplegar correctamente en Vercel tal como está** por dos razones independientes:

### 1.1 SQLite no persiste en Vercel

Vercel Functions tienen un sistema de archivos **de solo lectura**, excepto `/tmp`, que es temporal y no se comparte entre invocaciones. La documentación oficial lo confirma:

- <https://vercel.com/docs/functions/runtimes>
- <https://vercel.com/docs/functions/limitations>

La aplicación usa `node:sqlite` con un archivo local. En Vercel:

- Cada función puede ver un `/tmp` distinto.
- Los datos desaparecen al reiniciar o cambiar de instancia.
- Usuarios, órdenes, pagos y derechos dejarían de ser fiables.

El código bloquea Production en Vercel con `assertPersistentDatabaseLocation`. **No se debe desactivar.**

### 1.2 El plan Hobby es solo para uso personal/no comercial

La documentación de Vercel indica que Hobby está restringido a uso **no comercial y personal**:

- <https://vercel.com/docs/accounts/plans/hobby>

Wisdom Academy cobra productos educativos; por tanto, el plan gratuito no es una opción válida desde el punto de vista contractual. El plan Pro cuesta actualmente **20 USD/mes** y aun así seguiría faltando una base de datos externa.

### 1.3 Qué haría falta para usar Vercel

1. Migrar SQLite a Turso/libSQL, Neon o Supabase.
2. Convertir toda la capa síncrona (`prepare().get/all/run`, `withTransaction`) a asíncrona.
3. Reescribir migraciones, semillas, transacciones y pruebas.
4. Contratar Vercel Pro si el uso es comercial.

Es un proyecto de migración, no un cambio de configuración. **No se implementó** porque el objetivo actual es publicar sin reescribir la base.

## 2. Opción recomendada: Northflank Sandbox

Northflank tiene un plan **Sandbox** gratuito, sin tarjeta, con:

- Hasta **2 servicios**, 2 jobs y 1 base de datos.
- Hasta **20 USD/mes de recursos** incluidos.
- Servicios **always-on** (sin suspensión por inactividad).
- **Volúmenes persistentes** incluidos.
- Dominio generado `*.code.run` y posibilidad de dominio propio con TLS.

Precios y condiciones: <https://northflank.com/pricing>  
Volúmenes: <https://northflank.com/docs/v1/application/databases-and-persistence/add-a-volume>  
Dominios: <https://northflank.com/docs/v1/application/domains/domains-on-northflank>

Un servicio de **0.5 vCPU / 1 GB RAM** cuesta unos 12 USD/mes y un volumen pequeño unos centavos; cabe dentro del crédito de 20 USD/mes. Es la opción gratuita más cercana a “subir y listo” para esta app.

### 2.1 Archivos ya preparados

- `Dockerfile` — imagen Node 24, build de Next.js, volumen `/data`.
- `.dockerignore` — excluye `.env`, `.data`, `.next`, `node_modules`, tests y artefactos.
- `src/app/api/health/route.ts` — healthcheck `GET /api/health`.

### 2.2 Requisito previo: código en GitHub

Northflank construye desde un repositorio Git. El código actual está en el repositorio privado `rpmministry/wisdom-academy-platform`, rama `main`, con un commit inicial de migración. Antes de desplegar:

1. Revisar los cambios.
2. Hacer commit en la rama.
3. Subir la rama al repositorio de GitHub del propietario.
4. No subir `.env`, `.data`, `.next` ni credenciales.

No se debe hacer `push` sin autorización expresa del propietario.

Si no se quiere usar GitHub, la alternativa es una VM gratuita (sección 4) y subir un ZIP por SFTP.

### 2.3 Crear el servicio

1. Crear cuenta en <https://app.northflank.com/signup>.
2. Verificar el correo.
3. Crear un proyecto, por ejemplo `wisdom-academy`.
4. Conectar GitHub y autorizar el repositorio.
5. Crear un **Service** → **Deployment**.
6. Elegir la rama `main`.
7. Build type: **Dockerfile**.
8. Dockerfile path: `Dockerfile`.
9. Puerto público: `3000`.
10. Health check: HTTP `GET /api/health`, puerto 3000.
11. Recursos: `0.5 vCPU`, `1 GB RAM` (ajustar si el plan lo permite).
12. Región: la más cercana a Ecuador/Estados Unidos, por latencia.
13. Crear un **persistent volume** de 5 GB y montarlo en:

```text
/data
```

14. Configurar las variables de entorno (sección 2.4).
15. Desplegar.
16. Esperar el build y abrir la URL `https://...code.run`.

### 2.4 Variables de entorno del servicio

```dotenv
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
APP_URL=https://TU-SERVICIO.code.run
WISDOM_DB_PATH=/data/wisdom.db
WISDOM_BACKUP_DIR=/data/backups
WISDOM_ALLOW_EPHEMERAL_DB=0
PLATFORM_OWNER_EMAIL=correo-del-propietario@dominio.com
CODE_HASH_PEPPER=GENERAR_UN_SECRETO_LARGO
WISDOM_RATE_LIMIT_SALT=GENERAR_OTRO_SECRETO_LARGO
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_CURRENCY=USD
```

Si se usa Google:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

Reglas:

- No guardar secretos en GitHub.
- No usar `NEXT_PUBLIC_` para `PAYPAL_CLIENT_SECRET`.
- `PAYPAL_MODE=sandbox` hasta completar la autorización Live.
- `PAYPAL_API_BASE_URL` debe quedar vacío en producción.
- Generar `CODE_HASH_PEPPER` y `WISDOM_RATE_LIMIT_SALT` con valores nuevos, por ejemplo:

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })
```

### 2.5 Primera puesta en marcha

1. Abrir `https://TU-SERVICIO.code.run/api/health`. Debe devolver `{ "ok": true, "database": "ok" }`.
2. Abrir `/login`.
3. Provisionar la cuenta del propietario. Abrir una consola/SSH del servicio en Northflank y ejecutar:

```bash
npm run provision:owner
```

El comando usa `PLATFORM_OWNER_EMAIL` y escribe la contraseña inicial en:

```text
/home/node/.wisdom-academy/owner-initial-credential.txt
```

Leer el archivo inmediatamente con `cat`, guardar la contraseña en un gestor y cambiarla al entrar. Si el archivo se pierde:

```bash
npm run provision:owner -- --rotate
```

4. Revisar el catálogo y los precios.
5. Configurar PayPal Sandbox y el webhook con la nueva URL:

```text
https://TU-SERVICIO.code.run/api/paypal/webhook
```

6. Actualizar la URL del webhook en PayPal Developer. El **Webhook ID no cambia**; solo cambia la URL.
7. Asegurar que `APP_URL` sea exactamente la URL pública del servicio y redesplegar si se cambió.
8. Ejecutar una compra Sandbox de prueba.
9. Verificar orden, captura, derecho y webhook.

### 2.6 Dominio propio

Cuando el propietario compre un dominio:

1. Añadir el dominio en Northflank (Domains).
2. Crear el registro DNS que indique Northflank.
3. Verificar el dominio y enlazarlo al puerto 3000.
4. Esperar el certificado TLS de Let's Encrypt.
5. Cambiar `APP_URL` al dominio definitivo.
6. Actualizar la URL del webhook en PayPal.
7. Redesplegar para que `APP_URL` surta efecto.
8. Probar login, catálogo, compra Sandbox y webhook.

### 2.7 Verificación realizada

- `dockerfilelint Dockerfile`: sin problemas.
- Build limpio en una copia con el mismo contexto que `.dockerignore` (sin `.env`, `.data`, `.next`, `node_modules` originales ni tests): **correcto, 18 páginas**.
- Arranque de producción en esa copia con SQLite temporal: `npm start` → **Ready**, `GET /api/health` → `{ ok: true, database: "ok" }`, `GET /login` → **200**.
- `npm test`: **168/168**.
- `npm run check:secrets`: correcto con el Client Secret real definido.
- **No se construyó una imagen Docker local** porque Docker no está instalado en este equipo; Northflank realizará ese build. La sintaxis del Dockerfile fue validada.

### 2.8 Datos y migración

Para una primera publicación se puede empezar con la base nueva (la app crea el esquema y la semilla).

Si se quiere conservar la base local:

1. En local, con la app detenida:

```powershell
npm run db:backup
```

2. Subir el archivo `.db` al volumen `/data` del servicio. Northflank permite transferir datos a contenedores; revisar:
   <https://northflank.com/docs/v1/application/run/transfer-data-to-and-from-containers>
3. Renombrar el archivo a `/data/wisdom.db`.
4. Reiniciar el servicio.
5. Ejecutar `npm run check:deploy` dentro del contenedor si se dispone de shell, o abrir `/api/health` y revisar el catálogo.

Para trasladar a otro hosting después:

1. Copiar `/data/wisdom.db` y `/data/backups`.
2. Copiar las variables de entorno.
3. Restaurar en el nuevo host.
4. Cambiar DNS y `APP_URL`.
5. Actualizar el webhook de PayPal.
6. Verificar con una compra Sandbox antes de Live.

## 3. Advertencias del plan gratuito

- Northflank Sandbox es un entorno de pruebas, no un SLA de producción.
- El crédito de 20 USD/mes puede cambiar; revisar la página de precios antes de confiar en él.
- Un volumen no sustituye backups externos. Programar copias de `/data/backups` fuera del proveedor.
- No activar Live ni cobrar dinero real en un plan gratuito sin completar la lista de producción.
- La URL `*.code.run` es válida para Sandbox, pero para producción se recomienda dominio propio.
- Si el proveedor suspende el servicio por inactividad o cambios de plan, la web y el webhook dejan de funcionar.

## 4. Plan B: Oracle Cloud Always Free (VM propia)

Oracle ofrece recursos **Always Free** con tarjeta de verificación:

- 2 VM AMD micro (1/8 OCPU, 1 GB RAM cada una) o instancias Arm Ampere A1.
- Hasta 200 GB de block storage.
- IP pública y transferencia incluida dentro de límites.
- Requiere tarjeta y verificación; las cuentas inactivas pueden ser reclamadas.
- Documentación: <https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm>

Ventajas:

- Control total del servidor.
- SQLite persistente sin cambios de código.
- Dominio propio y TLS con Caddy.
- Migración posterior sencilla a cualquier VPS.

Desventajas:

- Configuración manual: Ubuntu, Node 24, Caddy/Nginx, systemd, firewall, backups.
- Capacidad Arm puede no estar disponible en la región.
- No es “un clic”.

Resumen de instalación:

```bash
# Ubuntu 24.04
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs caddy sqlite3
sudo useradd -m -s /bin/bash wisdom
sudo mkdir -p /srv/wisdom/data /srv/wisdom/backups
sudo chown -R wisdom:wisdom /srv/wisdom
# subir el código por SFTP/SSH, npm ci, npm run build
# systemd: npm start en /srv/wisdom, Environment=WISDOM_DB_PATH=/srv/wisdom/data/wisdom.db
# Caddy: reverse_proxy 127.0.0.1:3000
```

No se ejecutó este procedimiento porque requiere la cuenta y la tarjeta del propietario.

## 5. Plan C: Alwaysdata Free (solo demo pequeña)

Alwaysdata Free ofrece:

- 1 GB de disco.
- 256 MB de RAM.
- Node.js 24, SSH/SFTP y dominios propios.
- Precio: <https://www.alwaysdata.com/en/pricing/>

Es persistente y gratuito, pero **256 MB de RAM es muy poco** para Next.js y el build puede quedarse sin memoria. Solo se recomienda si se construye localmente y se sube un artefacto standalone, y para tráfico muy bajo. No es la primera opción.

## 6. Opciones descartadas

| Proveedor | Por qué no |
|---|---|
| Vercel Hobby | Sin disco persistente y restringido a uso no comercial. |
| Vercel Pro | 20 USD/mes y aun requiere migrar la base. |
| Render Free | Disco efímero, suspensión por inactividad; PostgreSQL gratuito caduca. |
| Fly.io | Sin capa gratuita real; coste mínimo mensual. |
| Koyeb | Sin plan gratuito; Pro desde 29 USD/mes. |
| Railway | Crédito de prueba, no gratuito permanente. |
| Netlify / Cloudflare Workers | Serverless; requieren migrar la base a D1/Postgres. |
| Glitch / Replit | Persistencia y disponibilidad no aptas para pagos. |
| DNS gratuitos tipo Freenom | Servicio históricamente inestable; no recomendable para producción. |

## 7. Recomendación final

1. **Ahora:** publicar en **Northflank Sandbox** con el `Dockerfile` y volumen `/data`, en modo Sandbox.
2. **Cuando haya dominio:** enlazarlo a Northflank y actualizar `APP_URL` y el webhook.
3. **Cuando haya presupuesto:** mover el mismo SQLite y las variables a un VPS propio (Oracle, Hetzner, DigitalOcean, etc.) o a un PaaS de pago; el código no necesita cambios.
4. **Vercel:** solo después de migrar la base a Turso/Neon y con plan Pro si el uso es comercial.

## 8. Qué falta para ejecutar el despliegue

El agente no puede crear cuentas ni aceptar términos por el propietario. Para continuar se necesita:

- Autorización para hacer commit/push de la rama al GitHub del propietario.
- Cuenta de Northflank (o del proveedor elegido).
- Credenciales Sandbox y secretos de aplicación generados.
- Decisión sobre migrar la base local o empezar con una base nueva.
- Confirmación de que se usará Sandbox, no Live.
