/**
 * Comprobación previa al despliegue de Wisdom Academy.
 *
 * No imprime valores de secretos. Devuelve código 1 si existe un bloqueo
 * crítico y código 0 si solo hay advertencias o todo está correcto.
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openRawDatabase } from '../src/server/db';

dotenv.config({ path: '.env.local' });
dotenv.config();

type Level = 'OK' | 'WARN' | 'FAIL';

interface Check {
  level: Level;
  name: string;
  detail: string;
}

const checks: Check[] = [];
const env = process.env;
const projectRoot = process.cwd();
const production = env.NODE_ENV === 'production';

function add(level: Level, name: string, detail: string): void {
  checks.push({ level, name, detail });
}

function hasSecret(name: string, minLength = 16): boolean {
  const value = env[name]?.trim() || '';
  return value.length >= minLength && !/^(CAMBIAR|CHANGE|your_|replace|xxx|TODO)/i.test(value);
}

function isInsideProject(target: string): boolean {
  const relative = path.relative(path.resolve(projectRoot), path.resolve(target));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function checkWritableDirectory(target: string, label: string): void {
  try {
    fs.mkdirSync(target, { recursive: true });
    const probe = path.join(target, `.wisdom-write-test-${process.pid}`);
    fs.writeFileSync(probe, 'ok', { mode: 0o600 });
    fs.rmSync(probe, { force: true });
    add('OK', label, `Directorio escribible: ${target}`);
  } catch (error) {
    add(
      'FAIL',
      label,
      `No se puede escribir en ${target}: ${error instanceof Error ? error.message : 'error desconocido'}`
    );
  }
}

// 1. Runtime compatible con Node 22+ y Turso / node:sqlite.
const nodeMajor = Number(process.versions.node.split('.')[0]);
add(
  nodeMajor >= 22 ? 'OK' : 'FAIL',
  'Runtime Node.js',
  `Node ${process.versions.node}${nodeMajor >= 22 ? '' : ' (se requiere Node 22 o superior)'}`
);

// 2. Ubicación y persistencia (Turso Cloud libSQL o SQLite local).
const tursoUrl = env.TURSO_DATABASE_URL?.trim() || '';
const tursoToken = env.TURSO_AUTH_TOKEN?.trim() || '';
const isTurso = Boolean(tursoUrl && (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://') || tursoUrl.startsWith('http://')));

if (isTurso) {
  add('OK', 'Persistencia Serverless (Turso)', `Conectado a ${tursoUrl.replace(/:[^:@]+@/, ':***@')}`);
  if (!tursoToken) {
    add('WARN', 'TURSO_AUTH_TOKEN', 'No se ha configurado token de autenticación para Turso.');
  } else {
    add('OK', 'TURSO_AUTH_TOKEN', 'Token de autenticación configurado.');
  }
} else if (env.VERCEL === '1' && env.VERCEL_ENV === 'production') {
  add(
    'FAIL',
    'Persistencia en Vercel',
    'Vercel Production requiere TURSO_DATABASE_URL y TURSO_AUTH_TOKEN para persistencia serverless.'
  );
} else {
  const dbPath = env.WISDOM_DB_PATH?.trim() || path.join(projectRoot, '.data', 'wisdom.db');
  if (dbPath === ':memory:') {
    add('FAIL', 'Ruta de SQLite', 'WISDOM_DB_PATH no puede ser :memory: en un despliegue real.');
  } else {
    const absoluteDb = path.resolve(projectRoot, dbPath);
    if (production && /(^|[\\/])(tmp|temp)([\\/]|$)/i.test(absoluteDb)) {
      add('FAIL', 'Ruta de SQLite', 'La base está en una carpeta temporal: los datos se perderán.');
    } else {
      add(
        'OK',
        'Ruta de SQLite',
        `${absoluteDb}${isInsideProject(absoluteDb) ? ' (dentro del proyecto; modo local/desarrollo)' : ''}`
      );
    }
    checkWritableDirectory(path.dirname(absoluteDb), 'Directorio de SQLite');
  }
}

// 2b. Bóveda Google Drive y Vercel Cron
const cronSecret = env.CRON_SECRET?.trim() || '';
if (production) {
  add(cronSecret ? 'OK' : 'WARN', 'CRON_SECRET', cronSecret ? 'Configurado para Vercel Cron Jobs' : 'No definido: el cron de respaldo no estará autenticado.');
}

const driveRoot = env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || '';
const driveEmail = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || '';
const driveKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
if (driveRoot && driveEmail && driveKey.includes('BEGIN PRIVATE KEY')) {
  add('OK', 'Bóveda Google Drive', `Configurada (Raíz: ${driveRoot})`);
} else {
  add('WARN', 'Bóveda Google Drive', 'Faltan credenciales de Google Drive; la bóveda documental operará en modo local.');
}

// 3. URL pública y cookies.
const appUrl = env.APP_URL?.trim() || '';
if (!appUrl) {
  add('FAIL', 'APP_URL', 'Define la URL pública para cookies, CORS y enlaces de pago.');
} else if (production && !appUrl.startsWith('https://')) {
  add('FAIL', 'APP_URL', 'En producción APP_URL debe usar HTTPS para que la cookie Secure funcione.');
} else {
  add('OK', 'APP_URL', appUrl);
}

// 4. Secretos de aplicación.
if (!hasSecret('CODE_HASH_PEPPER', 32)) {
  add(
    'FAIL',
    'CODE_HASH_PEPPER',
    'Falta un pepper estable de al menos 32 caracteres para códigos de regalo, descuentos e invitaciones.'
  );
} else {
  add('OK', 'CODE_HASH_PEPPER', 'Definido (valor no mostrado).');
}

if (!hasSecret('WISDOM_RATE_LIMIT_SALT', 16) && !hasSecret('EDUCATIONAL_RESOURCE_RATE_LIMIT_SALT', 16)) {
  add(
    'FAIL',
    'Sal de límites de frecuencia',
    'Define WISDOM_RATE_LIMIT_SALT para anonimizar identificadores de rate limit.'
  );
} else {
  add('OK', 'Sal de límites de frecuencia', 'Definida (valor no mostrado).');
}

if (env.WISDOM_E2E === '1' && production) {
  add('FAIL', 'Modo E2E', 'WISDOM_E2E=1 no puede estar activo en producción.');
} else {
  add('OK', 'Modo E2E', env.WISDOM_E2E === '1' ? 'Activo (solo válido en desarrollo/pruebas).' : 'Desactivado.');
}

// 5. Cuenta creadora.
const ownerEmail = env.PLATFORM_OWNER_EMAIL?.trim();
if (!ownerEmail) {
  add(
    'WARN',
    'PLATFORM_OWNER_EMAIL',
    'No está definido; se usará el valor por defecto del código. Defínelo explícitamente en producción.'
  );
} else {
  const [local, domain] = ownerEmail.split('@');
  add(
    'OK',
    'PLATFORM_OWNER_EMAIL',
    `${local.slice(0, 2)}***@${domain || 'dominio-desconocido'}`
  );
}

// 6. Integraciones opcionales.
const publicSecretName = ['NEXT', 'PUBLIC', 'PAYPAL', 'CLIENT', 'SECRET'].join('_');
if (env[publicSecretName]) {
  add(
    'FAIL',
    'Secreto PayPal público',
    'Una variable NEXT_PUBLIC_* de PayPal expone el secreto al navegador. Elimínala y rota la credencial.'
  );
}
const paypalCurrency = (env.PAYPAL_CURRENCY || 'USD').trim().toUpperCase();
if (!/^[A-Z]{3}$/.test(paypalCurrency)) {
  add('FAIL', 'PAYPAL_CURRENCY', 'Debe ser un código ISO de tres letras, por ejemplo USD.');
} else if (paypalCurrency !== 'USD') {
  add(
    'WARN',
    'PAYPAL_CURRENCY',
    `La plataforma usa ${paypalCurrency}; verifica que todos los productos tengan esa misma moneda antes de cobrar.`
  );
} else {
  add('OK', 'PAYPAL_CURRENCY', 'USD');
}
if (!env.RESEND_API_KEY?.trim() || !env.EMAIL_FROM?.trim()) {
  add(
    'WARN',
    'Correo transaccional',
    'RESEND_API_KEY o EMAIL_FROM no están definidos: el registro funciona, pero no se envían bienvenida, verificación ni recuperación de contraseña.'
  );
} else if (!env.EMAIL_FROM.includes('@')) {
  add('FAIL', 'EMAIL_FROM', 'El remitente debe ser un correo válido y estar verificado en el proveedor.');
} else {
  add('OK', 'Correo transaccional', 'Remitente configurado (valor no mostrado).');
}

if (env.PAYPAL_MODE === 'live') {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_WEBHOOK_ID) {
    add(
      'FAIL',
      'PayPal Live',
      'Faltan PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET o PAYPAL_WEBHOOK_ID para cobros reales.'
    );
  } else {
    add('OK', 'PayPal Live', 'Credenciales y webhook definidos (valores no mostrados).');
  }
} else {
  add('WARN', 'PayPal', `Modo ${env.PAYPAL_MODE || 'sandbox'}: no procesa cobros reales.`);
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    add('WARN', 'PayPal Sandbox', 'Sin credenciales: el checkout real devolverá PAYPAL_NOT_CONFIGURED.');
  }
  if (!env.PAYPAL_WEBHOOK_ID) {
    add('WARN', 'Webhook PayPal', 'PAYPAL_WEBHOOK_ID no está definido: los eventos serán rechazados.');
  }
}

if (!env.GOOGLE_CLIENT_ID && !env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  add('WARN', 'Google Sign-In', 'No configurado; solo estará disponible el acceso con contraseña.');
} else {
  add('OK', 'Google Sign-In', 'Client ID configurado.');
}

if (
  production &&
  env.NEXT_PUBLIC_MOODLE_URL &&
  /localhost|127\.0\.0\.1/i.test(env.NEXT_PUBLIC_MOODLE_URL)
) {
  add(
    'FAIL',
    'Moodle público',
    'NEXT_PUBLIC_MOODLE_URL apunta a localhost; los estudiantes no podrán acceder desde Internet.'
  );
} else {
  add('OK', 'Moodle público', env.NEXT_PUBLIC_MOODLE_URL ? 'URL configurada.' : 'No configurado.');
}

if (!env.WISDOM_BACKUP_DIR) {
  add(
    'WARN',
    'Respaldos',
    'WISDOM_BACKUP_DIR no está definido; se usará .data/backups dentro del proyecto.'
  );
} else {
  checkWritableDirectory(path.resolve(projectRoot, env.WISDOM_BACKUP_DIR), 'Directorio de respaldos');
}

// 7. El archivo .env nunca debe estar versionado.
try {
  const tracked = execFileSync('git', ['ls-files', '--error-unmatch', '.env'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
  }).trim();
  if (tracked) {
    add('FAIL', '.env versionado', 'El archivo .env está rastreado por Git. Retíralo y rota sus secretos.');
  }
} catch {
  add('OK', '.env fuera de Git', 'No está rastreado por Git.');
}

// 8. Estado real de la base de datos, sin modificar el esquema.
const dbPathResolved = env.WISDOM_DB_PATH?.trim() || path.join(projectRoot, '.data', 'wisdom.db');
const dbLocation = isTurso ? 'turso' : path.resolve(projectRoot, dbPathResolved);

if (isTurso || (dbPathResolved !== ':memory:' && fs.existsSync(dbLocation))) {
  try {
    const database = openRawDatabase(dbLocation);
    try {
      const integrity = database.prepare('PRAGMA integrity_check').get() as {
        integrity_check?: string;
      };
      add(
        integrity.integrity_check === 'ok' ? 'OK' : 'FAIL',
        'Integridad de SQLite',
        integrity.integrity_check === 'ok' ? 'ok' : String(integrity.integrity_check || 'sin resultado')
      );
      const owners = database
        .prepare(
          "SELECT COUNT(*) AS total FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role_code = 'platform_owner' AND r.revoked_at IS NULL"
        )
        .get() as { total?: number };
      add(
        Number(owners.total) > 0 ? 'OK' : 'FAIL',
        'Cuenta creadora',
        `${Number(owners.total || 0)} cuenta(s) con rol platform_owner.`
      );
      const fixtures = database
        .prepare("SELECT COUNT(*) AS total FROM users WHERE email LIKE '%@wisdomacademy.test'")
        .get() as { total?: number };
      add(
        Number(fixtures.total) === 0 || !production ? 'OK' : 'FAIL',
        'Cuentas de prueba',
        `${Number(fixtures.total || 0)} cuenta(s) de fixtures en la base.`
      );
      const migrations = database
        .prepare('SELECT COUNT(*) AS total FROM schema_migrations')
        .get() as { total?: number };
      add('OK', 'Migraciones aplicadas', `${Number(migrations.total || 0)} migraciones registradas.`);

      const priceColumn = database
        .prepare("SELECT COUNT(*) AS total FROM pragma_table_info('products') WHERE name = 'price_status'")
        .get() as { total?: number };
      if (Number(priceColumn.total || 0) > 0) {
        const pending = database
          .prepare(
            "SELECT COUNT(*) AS total FROM products WHERE status = 'published' AND price_status = 'pending'"
          )
          .get() as { total?: number };
        add(
          Number(pending.total || 0) === 0 ? 'OK' : 'WARN',
          'Precios pendientes',
          `${Number(pending.total || 0)} producto(s) publicado(s) sin precio; no son comprables.`
        );
        const wrongCurrency = database
          .prepare("SELECT COUNT(*) AS total FROM products WHERE currency <> ?")
          .get(paypalCurrency) as { total?: number };
        add(
          Number(wrongCurrency.total || 0) === 0 ? 'OK' : 'FAIL',
          'Moneda de productos',
          `${Number(wrongCurrency.total || 0)} producto(s) con moneda distinta de ${paypalCurrency}.`
        );
      } else {
        add(
          'WARN',
          'Migración de precios',
          'La columna price_status no existe todavía; arranca la aplicación para aplicar la migración 9.'
        );
      }
    } finally {
      database.close();
    }
  } catch (error) {
    add(
      'FAIL',
      'Acceso a base de datos',
      `Error al abrir la base: ${error instanceof Error ? error.message : 'desconocido'}`
    );
  }
} else {
  add(
    'WARN',
    'Base de datos',
    `No existe el archivo ${dbLocation}; se creará en el primer arranque con migraciones automáticas.`
  );
}

// Resultado.
const failures = checks.filter((check) => check.level === 'FAIL');
const warnings = checks.filter((check) => check.level === 'WARN');
console.log('WISDOM ACADEMY · COMPROBACIÓN DE DESPLIEGUE\n');
for (const check of checks) {
  console.log(`[${check.level}] ${check.name}: ${check.detail}`);
}
console.log(
  `\nResultado: ${failures.length === 0 ? 'SIN BLOQUEOS CRÍTICOS' : 'BLOQUEADO'} · ${failures.length} fallo(s), ${warnings.length} advertencia(s).`
);
if (failures.length > 0) process.exit(1);
