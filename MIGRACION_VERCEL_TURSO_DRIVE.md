# Guía Maestra de Migración: Vercel + Turso + Google Drive Data Vault
**Wisdom Academy Platform — Arquitectura Serverless de Alta Disponibilidad**

---

## 1. Resumen Ejecutivo de la Migración

La plataforma `wisdom-academy-platform` ha sido desacoplada y transformada exitosamente desde un contenedor monolítico en Northflank con SQLite local en `/data/wisdom.db` hacia una arquitectura Cloud-Native y Serverless de clase mundial:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ARQUITECTURA SERVERLESS                          │
├───────────────────────┬──────────────────────────┬──────────────────────────┤
│    VERCEL SERVERLESS  │    TURSO CLOUD (libSQL)  │   GOOGLE DRIVE DATA VAULT│
│   (Frontend & APIs)   │  (Motor Transaccional)   │    (Bóveda Inmutable)    │
├───────────────────────┼──────────────────────────┼──────────────────────────┤
│ • Next.js 15 AppRouter│ • SQLite Cloud Edge      │ • 01_Matriculas_Admision │
│ • Node 22/24 LTS      │ • Latencia sub-5ms       │ • 02_Expedientes_Alumno  │
│ • Vercel Cron Diario  │ • Replicación global     │ • 03_Calificaciones_Actas│
│ • Cero archivos vivos │ • Respaldo transaccional │ • 04_Certificados_Emitidos│
│   en disco local      │ • 9 migraciones activas  │ • 05_Estadisticas_Reporte│
│ • Autenticación Segura│ • Adaptador dual Sync /  │ • 06_Database_Backups    │
│                       │   Async (@libsql/client) │ • Backoff exponencial    │
└───────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## 2. Archivos Creados y Modificados

### Archivos Creados
1. **`src/server/db/turso.ts`**: Conector nativo asíncrono `@libsql/client` y adaptador síncrono transparente con Worker Thread + Atomics.
2. **`src/server/db/migrations.ts`**: Catálogo modular y versionado de las 9 migraciones del esquema.
3. **`src/lib/drive/wisdomDriveVault.ts`**: Bóveda Documental en Google Drive con reintentos exponenciales y patrón Write-Through.
4. **`scripts/db-migrate-and-seed.ts`**: Script maestro de aprovisionamiento remoto (`npm run db:migrate-and-seed`).
5. **`scripts/import-local-sqlite-to-turso.ts`**: Migrador directo de SQLite a Turso Cloud (`npm run db:push-to-turso`) sin dependencias CLI.
6. **`src/app/api/cron/drive-sync-backup/route.ts`**: Vercel Cron Job diario protegido con `CRON_SECRET`.
7. **`vercel.json`**: Configuración de región `iad1`, duraciones y Cron Jobs.
8. **`MIGRACION_VERCEL_TURSO_DRIVE.md`**: Este manual operativo.

---

## 3. Configuración de Turso (Motor Cloud SQLite)

Tienes **dos formas** de configurar Turso. **Te recomendamos la Opción 1 (100% Visual desde el navegador)** porque no requiere instalar ningún programa ni lidiar con scripts de PowerShell.

---

### OPCIÓN 1 (RECOMENDADA): Desde el Navegador Web (Sin Instalar Nada)

1. **Crear cuenta en Turso:**
   - Entra a **[https://turso.tech](https://turso.tech)** o directamente a **[https://app.turso.tech](https://app.turso.tech)**.
   - Inicia sesión con tu cuenta de **GitHub** o **Google** (el plan Starter es 100% gratuito: incluye hasta 500 bases de datos y 9 GB de almacenamiento).

2. **Crear tu Base de Datos:**
   - En el panel principal, haz clic en el botón azul **"Create Database"**.
   - **Database Name:** Escribe `wisdom-db`.
   - **Location / Region:** Selecciona **Washington, D.C. (US) - `iad`** (es la misma región de Vercel para latencia sub-5ms).
   - Haz clic en **"Create Database"**.

3. **Obtener la URL (`TURSO_DATABASE_URL`):**
   - Una vez creada, en la pantalla de la base verás un campo llamado **URL**.
   - Cópialo. Tiene un formato similar a:
     `libsql://wisdom-db-tu-usuario.turso.io`

4. **Obtener el Token (`TURSO_AUTH_TOKEN`):**
   - En esa misma pantalla, ve a la pestaña **"Tokens"** o haz clic en **"Generate Token"**.
   - Haz clic en **Create Token** (puedes nombrarlo `prod-vercel-token` y dejar la expiración en *Never* o la máxima duración).
   - Copia la clave larga que empieza con `eyJhbGciOi...`.

---

### OPCIÓN 2 (POR TERMINAL): Usando PowerShell en Windows

Si prefieres usar la terminal, el enlace oficial y actualizado de Turso en GitHub Releases es:

```powershell
powershell -ExecutionPolicy Bypass -c "irm https://github.com/tursodatabase/turso/releases/latest/download/turso_cli-installer.ps1 | iex"
```

Una vez instalado, abre una nueva ventana de PowerShell y ejecuta:

```powershell
turso auth signup      # Inicia sesión en Turso
turso db create wisdom-db --location iad
turso db show wisdom-db --url
turso db tokens create wisdom-db
```

---

## 4. ¿Dónde Colocar las Credenciales y Códigos?

### A. En tu Computadora Local (para ejecutar migraciones y pruebas)
Abre (o crea si no existe) el archivo `.env` en la raíz de `c:\wisdom-academy-platform\.env`:

```env
# PERSISTENCIA EN TURSO CLOUD
TURSO_DATABASE_URL=libsql://wisdom-db-tu-usuario.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...tu_token_aqui...

# URL CANÓNICA LOCAL
APP_URL=http://localhost:3000

# SECRETOS DE SEGURIDAD (Obligatorios)
CRON_SECRET=clave_secreta_para_proteger_el_cron_de_respaldos_32_caracteres
CODE_HASH_PEPPER=un_pepper_estable_y_secreto_de_mas_de_32_caracteres_aqui
WISDOM_RATE_LIMIT_SALT=sal_aleatoria_para_rate_limiting

# CUENTA CREADORA
PLATFORM_OWNER_EMAIL=tu-correo@ejemplo.com
```

### B. En el Panel de Vercel (para producción en la nube)
1. Entra a tu proyecto en **[https://vercel.com](https://vercel.com)**.
2. Ve a **Settings > Environment Variables**.
3. Añade cada una de las siguientes variables para los entornos **Production**, **Preview** y **Development**:

| Variable | Valor a pegar |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `APP_URL` | `https://tu-dominio.com` (o el dominio `.vercel.app`) |
| `TURSO_DATABASE_URL` | Tu URL de Turso (`libsql://wisdom-db-tu-usuario.turso.io`) |
| `TURSO_AUTH_TOKEN` | Tu Token JWT de Turso |
| `CRON_SECRET` | La misma clave de 32+ caracteres generada |
| `CODE_HASH_PEPPER` | Tu pepper de seguridad |
| `WISDOM_RATE_LIMIT_SALT` | Tu sal aleatoria |
| `PLATFORM_OWNER_EMAIL` | Tu correo de administrador principal |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | El ID de la carpeta compartida en Drive |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | El email de la Service Account de Google |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | La clave privada de Google (`"-----BEGIN PRIVATE KEY-----\n..."`) |

---

## 5. ¿Cómo Migrar los Datos a Turso?

Tienes dos comandos listos en `package.json` para ejecutar desde tu terminal en `c:\wisdom-academy-platform`:

### Escenario A: Si ya tienes un archivo SQLite local (`.data/wisdom.db` o de Northflank) y quieres subir todos sus usuarios y cursos a Turso:
```bash
npm run db:push-to-turso
```
*(Si tu archivo tiene otra ruta o nombre, ejecuta: `npm run db:push-to-turso -- --from ruta/a/tu/archivo.db`)*

### Escenario B: Inicializar Turso desde cero con el catálogo, año lectivo 2026-2027 y currículo teológico N2N:
```bash
npm run db:migrate-and-seed
```

---

## 6. Configuración de Google Drive (Bóveda Documental y Recursos Unificados)

### 6.1. Cero Fragmentación: Misma Cuenta, Misma API y Misma Carpeta Raíz
El repositorio **ya está diseñado para unificar todos los recursos en una sola cuenta y ubicación de Google Drive**. 
Tanto el módulo de Cursos y Talleres (`src/lib/courses/`), como el sincronizador curricular de Gael y Avril (`src/services/googleDriveCurriculumSync.ts`), como la nueva Bóveda Documental Serverless (`src/lib/drive/wisdomDriveVault.ts`) utilizan **exactamente las mismas 3 variables de entorno**:

1. `GOOGLE_DRIVE_ROOT_FOLDER_ID`: El ID de tu carpeta raíz maestra en Google Drive.
2. `GOOGLE_SERVICE_ACCOUNT_EMAIL`: El email de la Cuenta de Servicio de Google Cloud que ya utilizas.
3. `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: La clave privada RSA descargada de Google Cloud.

#### Estructura Canónica Unificada en Google Drive:
Al configurar la carpeta raíz, todo queda ordenado bajo un único techo:
```text
📁 [TU CARPETA RAÍZ EN GOOGLE DRIVE]  <-- GOOGLE_DRIVE_ROOT_FOLDER_ID
│
├── 📁 Cursos/                             <-- Cursos y Universidad Cristiana N2N
│   └── Curso teológico — Universidad Cristiana N2N/
│       ├── 00_GESTION_E_INDICE_DE_MATERIALES/
│       ├── 01_SEMESTRE_01/ ... 10_SEMESTRE_10/
│
├── 📁 Talleres/                           <-- Talleres prácticos y extracurriculares
│
├── 📁 01_Primero_EGB/ ... 14_Talleres/    <-- Años escolares MINEDUC K-12
│   ├── 04_Cuarto_EGB_Gael/ (curriculo_anual.json y 5 materias)
│   └── 08_Octavo_EGB_Avril/ (curriculo_anual.json y 5 materias)
│
└── 📁 Bóveda Documental y Académica (Wisdom Vault):
    ├── 📁 01_Matriculas_y_Admisiones/     (Fichas de inscripción, comprobantes, contratos)
    ├── 📁 02_Expedientes_Estudiantes/     (Documentos y reportes por alumno)
    ├── 📁 03_Calificaciones_y_Actas/      (Actas de notas oficiales y calificaciones)
    ├── 📁 04_Certificados_y_Diplomas/     (Certificados generados y descargables)
    ├── 📁 05_Estadisticas_y_Reportes/     (Snapshots de progreso y métricas)
    └── 📁 06_Database_Backups/            (Copias de seguridad automáticas en la nube)
```

---

### 6.2. ¿Dónde encontrar las credenciales de la API que ya habías configurado?

Tienes **dos lugares directos** para recuperarlas sin tener que crear nada nuevo:

1. **Desde tu panel de Northflank (donde estaba alojada la plataforma):**
   - Entra a tu proyecto en Northflank.
   - Ve a tu servicio o a **Secrets / Environment Variables**.
   - Allí encontrarás los valores ya cargados de:
     - `GOOGLE_DRIVE_ROOT_FOLDER_ID`
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
     - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

2. **Desde el archivo `.json` de Google Cloud o la consola de Google Cloud:**
   - Si descargaste el archivo `.json` de tu Cuenta de Servicio (usualmente guardado en tu carpeta de Descargas o proyectos):
     - Abre el `.json` con el Bloc de notas.
     - `client_email` es tu `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
     - `private_key` es tu `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (copia desde `-----BEGIN PRIVATE KEY...` hasta `...END PRIVATE KEY-----\n`).
   - El `GOOGLE_DRIVE_ROOT_FOLDER_ID` es simplemente el ID de la carpeta principal de tu Google Drive donde tienes subidos los cursos (lo copias de la URL: `drive.google.com/drive/folders/<ESTE_ID_LARGO>`).

---

### 6.3. ¿Cómo pegarlas en tu archivo `.env` local?

Abre tu archivo `c:\wisdom-academy-platform\.env` y en la sección 4 pega los datos:

```env
# ------------------------------------------------------------------------------
# 4. GOOGLE DRIVE DATA VAULT & ACADEMIC ENGINE
# ------------------------------------------------------------------------------
GOOGLE_DRIVE_ROOT_FOLDER_ID=1abcXYZ...tu_id_de_carpeta_raiz...
GOOGLE_SERVICE_ACCOUNT_EMAIL=wisdom-service-account@tu-proyecto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> **IMPORTANTE:** En Google Drive, haz clic derecho sobre tu carpeta raíz > **Compartir**, y asegúrate de que el correo de la cuenta de servicio (`GOOGLE_SERVICE_ACCOUNT_EMAIL`) tenga permiso de **Editor / Organizador**. Con eso tendrá acceso automático a todas las subcarpetas.

---

### 6.4. Inicialización Idempotente (Sin duplicar carpetas existentes)

Una vez colocadas las variables en el `.env`, ejecuta en tu terminal:

```bash
# 1. Verifica y crea la Bóveda Documental y Años Escolares en esa misma carpeta:
npm run init:drive

# 2. Verifica y asegura las carpetas de Cursos y Talleres (reutiliza las existentes):
npm run init:courses-drive
```

Ambos scripts son **100% idempotentes**: revisan si la carpeta ya existe por su nombre o ID registrado en la base de datos y la reutilizan, garantizando que **nada se duplique ni se fragmente**.

---

## 7. Despliegue en Vercel y Dominio

1. Sube tu código a GitHub:
   ```bash
   git add .
   git commit -m "feat: serverless migration complete"
   git push origin main
   ```
2. En **Vercel**, haz clic en **Import Project** y selecciona tu repositorio.
3. Verifica que las variables de entorno del punto 4.B estén configuradas y haz clic en **Deploy**.
4. En **Settings > Domains**, agrega tu dominio propio (ej. `plataforma.wisdomacademy.edu.ec` o `wisdomacademy.edu.ec`) y apunta los DNS indicados por Vercel (`cname.vercel-dns.com` o IP `76.76.21.21`).
