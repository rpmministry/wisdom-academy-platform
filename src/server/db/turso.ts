/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Adaptador Turso (libSQL)
 * ARCHIVO: src/server/db/turso.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Provee conectividad hacia Turso (libSQL en la nube) con compatibilidad dual:
 * 1. API Asíncrona nativa (@libsql/client) para scripts de migración, cron jobs,
 *    respaldos y nuevas operaciones de alto rendimiento.
 * 2. Adaptador Síncrono transparente (Worker Thread + Atomics) que permite que
 *    todo el código existente de repositorios, Route Handlers y Server Components
 *    basado en `prepare(sql).all() / get() / run()` y `withTransaction()` funcione
 *    sobre Turso en Vercel Serverless sin requerir reescribir cientos de llamadas.
 * ==============================================================================
 */

import { createClient, type Client, type InStatement, type ResultSet } from '@libsql/client';
import { Worker, MessageChannel, receiveMessageOnPort } from 'node:worker_threads';
import type { SqliteDatabase, SqliteStatement, SqliteRunResult, SqlValue } from './sqlite';
import { nowIso } from './sqlite';
import { MIGRATIONS, type Migration } from './migrations';

export interface TursoConfig {
  url: string;
  authToken?: string;
}

let cachedClient: Client | null = null;
let activeWorker: Worker | null = null;

export function isTursoConfigured(): boolean {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  return Boolean(url && (url.startsWith('libsql://') || url.startsWith('https://') || url.startsWith('http://')));
}

export function getTursoConfig(): TursoConfig | null {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url) return null;
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
  return { url, authToken };
}

/**
 * Devuelve el cliente asíncrono nativo de Turso (@libsql/client).
 */
export function getTursoClient(): Client {
  if (cachedClient) return cachedClient;
  const config = getTursoConfig();
  if (!config) {
    throw new Error('TURSO_DATABASE_URL no está configurada en las variables de entorno.');
  }
  cachedClient = createClient({
    url: config.url,
    authToken: config.authToken,
  });
  return cachedClient;
}

/**
 * Ejecuta una consulta asíncrona directamente con @libsql/client.
 */
export async function executeAsync(stmt: InStatement): Promise<ResultSet> {
  const client = getTursoClient();
  return client.execute(stmt);
}

/**
 * Ejecuta un bloque de múltiples sentencias SQL asíncronamente en Turso.
 */
export async function executeMultipleAsync(sql: string): Promise<void> {
  const client = getTursoClient();
  await client.executeMultiple(sql);
}

/**
 * Código ejecutable en el worker para atender llamadas síncronas de la capa SQLite.
 */
const WORKER_SCRIPT = `
  const { parentPort } = require('node:worker_threads');
  const { createClient } = require('@libsql/client');

  let client = null;
  let currentTx = null;

  parentPort.on('message', async ({ port, sab, type, payload }) => {
    const int32 = new Int32Array(sab);
    try {
      if (type === 'init') {
        client = createClient({ url: payload.url, authToken: payload.authToken });
        port.postMessage({ success: true });
      } else if (type === 'exec') {
        const trimmed = (payload.sql || '').trim().toUpperCase().replace(/;$/, '');
        if (trimmed === 'BEGIN' || trimmed === 'BEGIN IMMEDIATE' || trimmed === 'BEGIN TRANSACTION') {
          if (!currentTx) currentTx = await client.transaction('write');
          port.postMessage({ success: true });
        } else if (trimmed === 'COMMIT' || trimmed === 'END' || trimmed === 'END TRANSACTION') {
          if (currentTx) {
            await currentTx.commit();
            currentTx = null;
          }
          port.postMessage({ success: true });
        } else if (trimmed === 'ROLLBACK' || trimmed === 'ROLLBACK TRANSACTION') {
          if (currentTx) {
            try { await currentTx.rollback(); } catch {}
            currentTx = null;
          }
          port.postMessage({ success: true });
        } else {
          if (currentTx) {
            await currentTx.execute(payload.sql);
          } else {
            await client.executeMultiple(payload.sql);
          }
          port.postMessage({ success: true });
        }
      } else if (type === 'query') {
        const executor = currentTx || client;
        const res = await executor.execute({ sql: payload.sql, args: payload.args || [] });
        port.postMessage({
          success: true,
          rows: res.rows,
          rowsAffected: res.rowsAffected,
          lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : 0,
        });
      } else if (type === 'begin') {
        currentTx = await client.transaction('write');
        port.postMessage({ success: true });
      } else if (type === 'commit') {
        if (currentTx) {
          await currentTx.commit();
          currentTx = null;
        }
        port.postMessage({ success: true });
      } else if (type === 'rollback') {
        if (currentTx) {
          try { await currentTx.rollback(); } catch {}
          currentTx = null;
        }
        port.postMessage({ success: true });
      } else if (type === 'close') {
        if (currentTx) {
          try { await currentTx.rollback(); } catch {}
          currentTx = null;
        }
        if (client) {
          try { client.close(); } catch {}
          client = null;
        }
        port.postMessage({ success: true });
      } else {
        throw new Error('Comando desconocido en Turso Worker: ' + type);
      }
    } catch (err) {
      port.postMessage({ success: false, error: err.message || String(err) });
    } finally {
      Atomics.store(int32, 0, 1);
      Atomics.notify(int32, 0);
    }
  });
`;

function getWorker(config: TursoConfig): Worker {
  if (activeWorker) return activeWorker;
  const worker = new Worker(WORKER_SCRIPT, { eval: true });
  activeWorker = worker;

  // Inicializa el cliente dentro del worker
  const { port1, port2 } = new MessageChannel();
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);
  worker.postMessage({ port: port2, sab, type: 'init', payload: config }, [port2]);
  Atomics.wait(int32, 0, 0, 15000);
  const msg = receiveMessageOnPort(port1);
  port1.close();
  if (!msg || !msg.message?.success) {
    throw new Error('No se pudo inicializar la conexión con Turso en el Worker: ' + (msg?.message?.error || 'Timeout'));
  }

  return worker;
}

function callTursoWorker(
  config: TursoConfig,
  type: string,
  payload: Record<string, unknown>,
  timeoutMs = 30000
): any {
  const worker = getWorker(config);
  const { port1, port2 } = new MessageChannel();
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);

  worker.postMessage({ port: port2, sab, type, payload }, [port2]);
  const waitResult = Atomics.wait(int32, 0, 0, timeoutMs);
  if (waitResult === 'timed-out') {
    port1.close();
    throw new Error(`La operación en Turso (${type}) superó el tiempo límite de ${timeoutMs}ms.`);
  }

  const msg = receiveMessageOnPort(port1);
  port1.close();
  if (!msg || !msg.message) {
    throw new Error(`Respuesta vacía del Worker de Turso (${type}).`);
  }
  if (!msg.message.success) {
    throw new Error(msg.message.error || `Error desconocido en Turso (${type}).`);
  }
  return msg.message;
}

/**
 * Adaptador que implementa SqliteDatabase sobre Turso mediante el Worker síncrono.
 */
export class TursoSqliteDatabase implements SqliteDatabase {
  private config: TursoConfig;
  private statementCache = new Map<string, SqliteStatement>();
  private txDepth = 0;
  private savepointIndex = 0;

  constructor(config: TursoConfig) {
    this.config = config;
  }

  exec(sql: string): void {
    callTursoWorker(this.config, 'exec', { sql });
  }

  prepare(sql: string): SqliteStatement {
    const cached = this.statementCache.get(sql);
    if (cached) return cached;

    const statement: SqliteStatement = {
      all: (...params: SqlValue[]) => {
        const res = callTursoWorker(this.config, 'query', { sql, args: params });
        return res.rows || [];
      },
      get: (...params: SqlValue[]) => {
        const res = callTursoWorker(this.config, 'query', { sql, args: params });
        const rows = res.rows || [];
        return rows[0] !== undefined ? rows[0] : undefined;
      },
      run: (...params: SqlValue[]): SqliteRunResult => {
        const res = callTursoWorker(this.config, 'query', { sql, args: params });
        return {
          changes: res.rowsAffected || 0,
          lastInsertRowid: res.lastInsertRowid || 0,
        };
      },
    };

    this.statementCache.set(sql, statement);
    return statement;
  }

  close(): void {
    if (activeWorker) {
      try {
        callTursoWorker(this.config, 'close', {}, 5000);
      } catch {
        // Ignorar si el worker ya cerró
      }
      activeWorker.terminate();
      activeWorker = null;
    }
    if (cachedClient) {
      try { cachedClient.close(); } catch {}
      cachedClient = null;
    }
  }

  withTransaction<T>(fn: () => T): T {
    if (this.txDepth === 0) {
      callTursoWorker(this.config, 'begin', {});
      this.txDepth = 1;
      try {
        const result = fn();
        callTursoWorker(this.config, 'commit', {});
        this.txDepth = 0;
        return result;
      } catch (error) {
        callTursoWorker(this.config, 'rollback', {});
        this.txDepth = 0;
        throw error;
      }
    }

    // Transacción anidada mediante SAVEPOINT
    const sp = `sp_${this.savepointIndex + 1}`;
    this.savepointIndex += 1;
    this.txDepth += 1;
    this.exec(`SAVEPOINT ${sp}`);
    try {
      const result = fn();
      this.exec(`RELEASE ${sp}`);
      this.txDepth -= 1;
      return result;
    } catch (error) {
      this.exec(`ROLLBACK TO ${sp}`);
      this.exec(`RELEASE ${sp}`);
      this.txDepth -= 1;
      throw error;
    }
  }
}

/**
 * Aplica las migraciones idempotentemente en Turso.
 */
export async function applyTursoMigrations(client?: Client): Promise<number[]> {
  const cli = client || getTursoClient();

  await cli.executeMultiple(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedResult = await cli.execute('SELECT version FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((row) => Number(row.version)));
  const newlyApplied: number[] = [];

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    console.log(`[turso] Aplicando migración v${migration.version}: ${migration.name}...`);
    await cli.executeMultiple(migration.sql);
    await cli.execute({
      sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
      args: [migration.version, migration.name, nowIso()],
    });
    newlyApplied.push(migration.version);
    console.log(`[turso] Migración v${migration.version} aplicada con éxito.`);
  }

  return newlyApplied;
}
