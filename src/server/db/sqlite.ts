/**
 * Capa de acceso a SQLite usando el módulo incorporado `node:sqlite` de Node 24
 * o Turso (libSQL) en la nube para Vercel Serverless.
 *
 * La base es la fuente de verdad de identidades, productos, órdenes, códigos y
 * derechos de acceso. En producción con Vercel se conecta a Turso vía libSQL;
 * en desarrollo y pruebas locales se utiliza SQLite local con WAL.
 */

import fs from 'node:fs';
import path from 'node:path';

export type SqlValue = string | number | null;

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface SqliteStatement {
  all(...params: SqlValue[]): any[];
  get(...params: SqlValue[]): any;
  run(...params: SqlValue[]): SqliteRunResult;
}

export interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface DatabaseSyncConstructor {
  new (location: string): SqliteDatabase;
}

interface NodeSqliteModule {
  DatabaseSync: DatabaseSyncConstructor;
}

export { MIGRATIONS, type Migration } from './migrations';
import { MIGRATIONS } from './migrations';
import { isTursoConfigured, getTursoConfig, TursoSqliteDatabase } from './turso';

let database: SqliteDatabase | null = null;
let databasePath: string | null = null;
let databaseInitializer: ((db: SqliteDatabase) => void) | null = null;
const statementCache = new WeakMap<SqliteDatabase, Map<string, SqliteStatement>>();
const transactionState = new WeakMap<SqliteDatabase, { depth: number; savepoint: number }>();

function loadSqliteModule(): NodeSqliteModule | null {
  try {
    const getBuiltinModule = (
      process as unknown as { getBuiltinModule?: (id: string) => unknown }
    ).getBuiltinModule;

    const sqlite = getBuiltinModule?.('node:sqlite') as NodeSqliteModule | undefined;
    if (sqlite?.DatabaseSync) {
      return sqlite;
    }
  } catch {}
  return null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function resolveDatabasePath(): string {
  if (isTursoConfigured()) {
    const config = getTursoConfig()!;
    return config.url;
  }
  const configured = process.env.WISDOM_DB_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), '.data', 'wisdom.db');
}

/**
 * Vercel ejecuta funciones sin un sistema de archivos persistente: el archivo
 * SQLite se perdería en cada despliegue o instancia.
 * Si Turso está configurado, la persistencia se gestiona en la nube de Turso (libSQL).
 */
function assertPersistentDatabaseLocation(location: string): void {
  if (isTursoConfigured()) return;
  const onVercelProduction =
    process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production';
  if (!onVercelProduction || process.env.WISDOM_ALLOW_EPHEMERAL_DB === '1') return;
  throw new Error(
    [
      'WISDOM_DB_PATH no es persistente en Vercel Production.',
      `Ruta configurada: ${location}.`,
      'Vercel no ofrece volúmenes persistentes para funciones serverless.',
      'Configura TURSO_DATABASE_URL y TURSO_AUTH_TOKEN para conectar con Turso Cloud SQLite,',
      'o despliega la aplicación completa en un host con disco persistente (Render, Railway, Fly.io o VPS).',
      'Consulta MIGRACION_VERCEL_TURSO_DRIVE.md.',
    ].join(' ')
  );
}

/**
 * Antes de aplicar migraciones pendientes sobre una base existente se crea un
 * respaldo consistente con VACUUM INTO. Si el respaldo falla, el arranque se
 * detiene para no modificar datos de producción sin una copia recuperable.
 */
function backupBeforePendingMigrations(db: SqliteDatabase, location: string): void {
  if (isTursoConfigured() || location === ':memory:' || location.startsWith('libsql://') || location.startsWith('https://')) return;
  const table = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'")
    .get() as { name: string } | undefined;
  if (!table) return;
  const current = Number(
    (db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations').get() as {
      version: number;
    }).version
  );
  const latest = Math.max(...MIGRATIONS.map((migration) => migration.version));
  if (current >= latest) return;

  const directory =
    process.env.WISDOM_BACKUP_DIR || path.join(path.dirname(location), 'backups');
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(
    directory,
    `pre-migration-v${current}-to-v${latest}-${stamp}.db`
  );
  db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  const verification = openRawDatabase(target);
  try {
    const integrity = verification.prepare('PRAGMA integrity_check').get() as {
      integrity_check: string;
    };
    if (integrity.integrity_check !== 'ok') {
      throw new Error(`El respaldo previo a migración no pasó integrity_check.`);
    }
  } finally {
    verification.close();
  }
  try {
    fs.chmodSync(target, 0o600);
  } catch {
    // En Windows puede no estar disponible; el archivo sigue en el volumen.
  }
  console.log(
    `[db] Respaldo previo a migración verificado: ${path.basename(target)} (v${current} → v${latest})`
  );
}

function applyMigrations(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const applied = new Set(appliedRows.map((row) => Number(row.version)));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      ).run(migration.version, migration.name, nowIso());
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

/**
 * Registra la siembra idempotente que debe ejecutarse al abrir una conexión.
 * La conexión la invoca antes de cualquier transacción de la aplicación.
 */
export function setDatabaseInitializer(initializer: (db: SqliteDatabase) => void): void {
  databaseInitializer = initializer;
}

/** Abre una base en una ruta concreta sin ejecutar migraciones ni siembra. */
export function openRawDatabase(location: string): SqliteDatabase {
  if (
    location === 'turso' ||
    location.startsWith('libsql://') ||
    location.startsWith('https://') ||
    (isTursoConfigured() && location === resolveDatabasePath())
  ) {
    const config = getTursoConfig();
    if (!config) throw new Error('TURSO_DATABASE_URL no está configurada.');
    return new TursoSqliteDatabase(config);
  }

  const sqlite = loadSqliteModule();
  if (sqlite) {
    return new sqlite.DatabaseSync(location);
  }

  // Fallback para Node 22 sin experimental-sqlite usando @libsql/client
  const resolved = location === ':memory:' ? 'file::memory:' : `file:${path.resolve(location)}`;
  return new TursoSqliteDatabase({ url: resolved });
}

export function getDb(): SqliteDatabase {
  if (database) return database;

  if (isTursoConfigured()) {
    const config = getTursoConfig()!;
    const db = new TursoSqliteDatabase(config);
    applyMigrations(db);
    databaseInitializer?.(db);
    database = db;
    databasePath = config.url;
    return db;
  }

  const sqlite = loadSqliteModule();
  const location = resolveDatabasePath();
  assertPersistentDatabaseLocation(location);
  if (location !== ':memory:') {
    fs.mkdirSync(path.dirname(location), { recursive: true });
  }

  const db: SqliteDatabase = sqlite
    ? new sqlite.DatabaseSync(location)
    : new TursoSqliteDatabase({ url: location === ':memory:' ? 'file::memory:' : `file:${path.resolve(location)}` });

  if (sqlite) {
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');
    if (location !== ':memory:') {
      db.exec('PRAGMA journal_mode = WAL');
      db.exec('PRAGMA synchronous = NORMAL');
    }
  }
  backupBeforePendingMigrations(db, location);
  applyMigrations(db);
  databaseInitializer?.(db);

  database = db;
  databasePath = location;
  return db;
}

export function prepare(sql: string): SqliteStatement {
  const db = getDb();
  let cache = statementCache.get(db);
  if (!cache) {
    cache = new Map();
    statementCache.set(db, cache);
  }
  const cached = cache.get(sql);
  if (cached) return cached;
  const statement = db.prepare(sql);
  cache.set(sql, statement);
  return statement;
}

/**
 * Ejecuta una operación en una transacción inmediata. Las llamadas anidadas
 * utilizan SAVEPOINT para conservar la atomicidad sin abortar la transacción
 * externa.
 */
export function withTransaction<T>(fn: () => T): T {
  const db = getDb();
  if ('withTransaction' in db && typeof (db as any).withTransaction === 'function') {
    return (db as any).withTransaction(fn);
  }

  const state = transactionState.get(db) ?? { depth: 0, savepoint: 0 };
  transactionState.set(db, state);

  if (state.depth === 0) {
    db.exec('BEGIN IMMEDIATE');
    state.depth = 1;
    try {
      const result = fn();
      db.exec('COMMIT');
      state.depth = 0;
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      state.depth = 0;
      throw error;
    }
  }

  const savepoint = `sp_${state.savepoint + 1}`;
  state.savepoint += 1;
  state.depth += 1;
  db.exec(`SAVEPOINT ${savepoint}`);
  try {
    const result = fn();
    db.exec(`RELEASE ${savepoint}`);
    state.depth -= 1;
    return result;
  } catch (error) {
    db.exec(`ROLLBACK TO ${savepoint}`);
    db.exec(`RELEASE ${savepoint}`);
    state.depth -= 1;
    throw error;
  }
}

export function closeDb(): void {
  if (!database) return;
  database.close();
  database = null;
  databasePath = null;
}

/** Solo para pruebas: elimina la conexión y el archivo temporal indicado. */
export function resetDbForTests(): void {
  const location = databasePath;
  closeDb();
  if (location && location !== ':memory:' && !isTursoConfigured()) {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.rmSync(`${location}${suffix}`, { force: true });
      } catch {
        // El archivo puede seguir bloqueado por otro proceso de prueba.
      }
    }
  }
}

export function getDatabasePath(): string | null {
  return databasePath;
}
