<p align="center">
  <img src="./public/brand/social/og-image-blue-dark.png" alt="Wisdom Academy Platform" width="100%" />
</p>

<h1 align="center">Wisdom Academy Platform</h1>

<p align="center">
  <b>Plataforma Educativa Integral, Bilingüe y Ministerial de Clase Mundial</b><br />
  Educación Básica Ecuatoriana (MINEDUC K-12) · Apoyo Homeschool · Instituto Ministerial N2N · Cursos & Talleres
</p>

<p align="center">
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15.5-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 15" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://turso.tech/"><img src="https://img.shields.io/badge/Turso-libSQL_Cloud-00E599?style=for-the-badge&logo=sqlite&logoColor=black" alt="Turso libSQL" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-Serverless_Edge-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Serverless" /></a>
  <a href="https://developers.google.com/drive"><img src="https://img.shields.io/badge/Google_Drive-Data_Vault-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive Vault" /></a>
  <a href="https://developer.paypal.com/"><img src="https://img.shields.io/badge/PayPal-Checkout_v2-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="PayPal" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tests-186%20Passing%20(100%25)-2ea44f?style=flat-square&logo=githubactions&logoColor=white" alt="186 tests passing" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%200%20Errors-3178c6?style=flat-square" alt="0 Type Errors" />
  <img src="https://img.shields.io/badge/Database_Schema-9%20Migrations-blueviolet?style=flat-square" alt="9 Migrations" />
  <img src="https://img.shields.io/badge/Security-Audit%20Passed-success?style=flat-square" alt="Security Passed" />
  <img src="https://img.shields.io/badge/License-Proprietary-6e7781?style=flat-square" alt="Licencia Privada" />
</p>

---

## 🏛️ Resumen Ejecutivo y Arquitectura

**Wisdom Academy Platform** es un ecosistema educativo cloud-native de alta disponibilidad construido sobre una **arquitectura Serverless desacoplada de tres capas**:

```mermaid
graph TD
    subgraph Capa 1: Frontend & Edge API
        Vercel["▲ Vercel Edge & Serverless Functions<br/>Next.js 15 App Router · Node 22/24 LTS"]
        Cron["⏰ Vercel Daily Cron<br/>/api/cron/drive-sync-backup"]
    end

    subgraph Capa 2: Motor Transaccional en la Nube
        Turso[("⚡ Turso Cloud SQLite (libSQL)<br/>Latencia sub-5ms · 9 Migraciones")]
    end

    subgraph Capa 3: Bóveda Documental e Inmutable
        Drive[("📁 Google Drive Data Vault<br/>WisdomDriveVault · Service Account")]
    end

    subgraph Servicios Externos Integrados
        PayPal["💳 PayPal Checkout v2"]
        Resend["✉️ Resend Transaccional"]
        GoogleAuth["🔑 Google OAuth Sign-In"]
        OpenMAIC["🤖 OpenMAIC Pedagogical AI"]
    end

    Vercel -->|Lectura/Escritura instantánea| Turso
    Cron -->|Snapshot y Backup nocturno| Turso
    Cron -->|Subida documental y actas| Drive
    Vercel -->|Replicación documental asíncrona| Drive
    Vercel --> PayPal
    Vercel --> Resend
    Vercel --> GoogleAuth
    Vercel --> OpenMAIC
```

1. **Capa de Aplicación y API Serverless (`Vercel Functions`)**: Aplicación Next.js 15 100% *stateless* (sin almacenamiento en disco local efímero), optimizada para despliegues instantáneos globales con tiempo de arranque de milisegundos.
2. **Capa Transaccional de Datos (`Turso Cloud / libSQL`)**: Base de datos SQLite distribuida globalmente con latencia sub-5ms, transacciones ACID completas y adaptador síncrono/asíncrono compatible con el estándar libSQL.
3. **Capa de Bóveda Documental y Académica (`Google Drive API v3`)**: Almacén inmutable para actas de notas, expedientes estudiantiles, fichas de admisión, certificados emitidos y respaldos de base de datos cifrados con tolerancia a fallos y reintentos exponenciales.

---

## 🌟 Pilares y Módulos de la Plataforma

### 1. 🎓 Educación Básica Ecuatoriana (MINEDUC K-12) & Homeschool
- **14 Años Escolares Oficiales**: Desde 1° de Básica (Preparatoria) hasta 3° de Bachillerato General Unificado (BGU), totalmente articulados al currículo nacional de Ecuador.
- **Perfiles Personalizados para Homeschool**:
  - **Gael (4° de EGB - Nivel Elemental)**: Bloques de 35 min con recreo activo, 5 materias troncales (*Biblia y Carácter, Matemáticas Creacionales, Ciencias Naturales, English Phonics, Estudios Sociales*).
  - **Avril (8° de EGB - Nivel Básica Superior)**: Bloques de 45 min, 5 materias troncales (*Teología y Cosmovisión, Pre-Álgebra y Geometría, Ciencias Integradas, Academic English, Historia y Civismo*).
- **Calendario Escolar Oficial de 200 Días**: Inicio el 26 de octubre de 2026, validado por algoritmo sin colisiones de feriados ni fines de semana.

### 2. 📖 Instituto Teológico y Ministerial N2N
- **10 Semestres Académicos Completos**: Programa ministerial de la Universidad Cristiana N2N con 189 carpetas canónicas en Google Drive para gestión de sílabos, clases, lecturas oficiales y enlaces audiovisuales.
- **Exámenes y Actas Seguras**: Separación criptográfica estricta entre versiones de estudiante y claves privadas docentes, auditoría de intentos y cálculo de calificaciones en el servidor.

### 3. 🛡️ Bóveda Documental y Académica (Google Drive Data Vault)
Estructura jerárquica unificada en Google Drive sin fragmentación:
- `01_Matriculas_y_Admisiones/`: Contratos de matrícula, fichas de inscripción en JSON/PDF y comprobantes.
- `02_Expedientes_Estudiantes/`: Historial acumulativo e informes de progreso por alumno.
- `03_Calificaciones_y_Actas/`: Actas oficiales de notas consolidadas por curso, taller y nivel.
- `04_Certificados_y_Diplomas/`: Diplomas generados con ID registrado en base de datos para descarga ultrarrápida.
- `05_Estadisticas_y_Reportes/`: Snapshots periódicos de métricas en JSON/CSV.
- `06_Database_Backups/`: Exportaciones completas y respaldos programados de la base de datos.

### 4. 💳 Pasarela de Pagos PayPal & Checkout Seguro
- **Integración Nativa Orders v2**: Cálculo de precios, promociones y monedas exclusivamente en el servidor.
- **Compra Invitada y Matrícula Posterior**: Los padres pueden pagar sin registro previo y completar el formulario de matrícula y consentimientos posteriormente.
- **Webhooks con Verificación Criptográfica**: Deduplicación por `(provider, event_id)` y conciliación idempotente contra fraudes.
- **Soporte Dual**: Sandbox certificado para pruebas y Live para transacciones comerciales en producción.

### 5. 🤖 Motor Pedagógico OpenMAIC & Aulas Interactivas
- Generación dinámica de horarios escolares y escenas interactivas de aprendizaje (diapositivas, pizarra activa, cuestionarios y proyectos por retos PBL).
- Validación de videos educativos en YouTube (control de idioma, pertinencia pedagógica, inserción segura y sin publicidad).
- Salas de videoconferencia integradas con Google Meet y Jitsi embebido.

---

## 📸 Vista del Producto

| Catálogo Público de Cursos | Panel de Administración y CRM |
|:---:|:---:|
| <img src="./docs/evidencias/catalogo-homeschool-100.png" alt="Catálogo de Wisdom Academy" width="100%" /> | <img src="./docs/evidencias/admin-revision.png" alt="Panel administrativo de Wisdom Academy" width="100%" /> |

| Guía de Bienvenida Descargable | Aula de Recursos Educativos |
|:---:|:---:|
| <img src="./docs/evidencias/guia-bienvenida-escritorio.png" alt="Guía de bienvenida" width="100%" /> | <img src="./docs/evidencias/recursos-escritorio.png" alt="Recursos educativos" width="100%" /> |

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Propósito |
|---|---|---|
| **Framework Web** | Next.js 15.5 (App Router, Turbopack) | Arquitectura Serverless, SSR y Server Components |
| **Biblioteca UI** | React 19 + Radix UI + Carbon Grid | Interfaces bilingües, accesibles y responsive |
| **Lenguaje** | TypeScript 5.7 (Modo Estricto) | Robustez tipográfica y prevención de errores en compilación |
| **Base de Datos Cloud** | Turso (libSQL Cloud) | SQLite transaccional edge de alto rendimiento |
| **Almacén Documental** | Google Drive API v3 | Bóveda inmutable de documentos, actas y respaldos |
| **Pagos** | PayPal REST SDK v2 | Procesamiento seguro de cobros y webhooks |
| **Emails** | Resend API | Correos transaccionales (bienvenida, contraseñas, avisos) |
| **Autenticación** | Sesiones HttpOnly + Google OAuth + scrypt | Seguridad de acceso sin contraseñas en texto plano |
| **Testing** | Node.js Test Runner nativo + Playwright | 186 pruebas automatizadas sin dependencias pesadas |

---

## 🚀 Guía de Instalación y Comandos

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/rpmministry/wisdom-academy-platform.git
cd wisdom-academy-platform
npm install
```

### 2. Configurar Variables de Entorno

Copia el archivo de plantilla y completa tus credenciales:

```bash
cp .env.example .env
```

Variables mínimas requeridas:

```env
# URL y Entorno
APP_URL=http://localhost:3000
NODE_ENV=development

# Turso Cloud (o SQLite local para pruebas offline)
TURSO_DATABASE_URL=libsql://wisdom-db-tu-usuario.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOi...

# Bóveda Google Drive
GOOGLE_DRIVE_ROOT_FOLDER_ID=1s_VcSUhdehggzmUsXmsxiGT7M-hNnz9a
GOOGLE_SERVICE_ACCOUNT_EMAIL=wisdom-drive-sync@tu-proyecto.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Seguridad y Cron
PLATFORM_OWNER_EMAIL=wisdomschoolec@gmail.com
CRON_SECRET=clave_secreta_para_proteger_el_cron_de_respaldos_32_caracteres
CODE_HASH_PEPPER=un_pepper_estable_y_secreto_de_mas_de_32_caracteres_aqui
WISDOM_RATE_LIMIT_SALT=sal_aleatoria_para_rate_limiting
```

### 3. Comandos de la Plataforma

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo en `http://localhost:3000`. |
| `npm run build` | Compila la aplicación Next.js 15 para producción en Vercel. |
| `npm run test` | Ejecuta las **186 pruebas automatizadas** de recursos, plataforma y cursos. |
| `npm run typecheck` | Valida el tipado estricto con TypeScript (`tsc --noEmit`). |
| `npm run check:secrets` | Escanea el código compilado para prevenir fugas accidentales de secretos. |
| `npm run check:deploy` | Valida la conectividad a Turso, Google Drive, variables de entorno y base de datos. |
| `npm run db:migrate-and-seed` | Script maestro que aplica las 9 migraciones y siembra el catálogo y roles. |
| `npm run db:push-to-turso` | Migra datos desde un archivo SQLite local directo a Turso Cloud. |
| `npm run init:drive` | Aprovisiona las 14 carpetas escolares y la Bóveda Documental en Google Drive. |
| `npm run init:courses-drive` | Sincroniza e indexa las 189 carpetas de Cursos y Talleres en Drive. |

---

## 🔒 Seguridad y Privacidad

- **Defensa en Profundidad**: Control de acceso basado en roles jerárquicos (RBAC: `platform_owner`, `admin`, `teacher`, `guardian`, `student`).
- **Cookies de Sesión Inmunes**: Flags `HttpOnly`, `SameSite=Lax` y `Secure` en producción; tokens con rotación y hash SHA-256.
- **Contraseñas Seguras**: Hasheadas mediante el algoritmo criptográfico moderno `scrypt` con parámetros de memoria y costo recomendados.
- **Rate Limiting y Prevención DDoS**: Limitación de frecuencia en endpoints sensibles (autenticación, checkout, reportes) con sal aleatoria.
- **Protección de Menores**: Cumplimiento de privacidad educativa; expedientes de menores aislados bajo el permiso `minors.read`.

---

## 📚 Documentación Técnica Detallada

- [📖 Manual de Migración a Vercel + Turso + Google Drive](MIGRACION_VERCEL_TURSO_DRIVE.md)
- [🏗️ Arquitectura y Principios de Diseño](docs/ARCHITECTURE.md)
- [💳 Integración y Flujo de Cobros con PayPal](docs/CHECKOUT_Y_CRM_FINANCIERO.md)
- [📁 Estructura Canónica de Google Drive](docs/drive-structure-courses-workshops.md)
- [🤖 Protocolo de Recursos Educativos OpenMAIC](docs/RECURSOS_EDUCATIVOS_OPENMAIC.md)

---

<p align="center">
  <b>Wisdom Academy Platform</b> · Transformando la educación con excelencia, tecnología y valores.<br />
  © 2026 Wisdom Academy. Todos los derechos reservados.
</p>
