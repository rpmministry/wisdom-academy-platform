/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Google Drive Data Vault & Academic Engine
 * ARCHIVO: src/lib/drive/wisdomDriveVault.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Provee almacenamiento cloud desacoplado e inmutable sobre Google Drive API v3:
 * 1. Organización jerárquica canónica (Bóveda Documental y Académica):
 *    - /01_Matriculas_y_Admisiones/ (Fichas de inscripción, comprobantes, contratos)
 *    - /02_Expedientes_Estudiantes/ (Historial por estudiante, tareas y documentos)
 *    - /03_Calificaciones_y_Actas/ (Actas y reportes consolidados por curso y ciclo)
 *    - /04_Certificados_y_Diplomas/ (Certificados generados listos para descarga)
 *    - /05_Estadisticas_y_Reportes/ (Snapshots periódicos de métricas en JSON/CSV)
 *    - /06_Database_Backups/ (Respaldos completos de la base de datos)
 * 2. Manejo de cuotas, reintentos exponenciales con jitter y caché multinivel.
 * 3. Patrón Write-Through / Async Sync para persistencia local/Turso instantánea
 *    y replicación documental asíncrona hacia Google Drive.
 * ==============================================================================
 */

import { google } from 'googleapis';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { Readable } from 'node:stream';

export const VAULT_FOLDERS = {
  ADMISSIONS: '01_Matriculas_y_Admisiones',
  STUDENT_RECORDS: '02_Expedientes_Estudiantes',
  GRADES_AND_ACTS: '03_Calificaciones_y_Actas',
  CERTIFICATES: '04_Certificados_y_Diplomas',
  STATS_AND_REPORTS: '05_Estadisticas_y_Reportes',
  BACKUPS: '06_Database_Backups',
} as const;

export type VaultFolderKey = keyof typeof VAULT_FOLDERS;

export interface VaultFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size?: number | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  createdTime?: string | null;
}

export interface VaultSyncSummary {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string | null;
  error?: string;
}

const memoryFolderCache = new Map<string, string>(); // path -> folderId

export function isVaultConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')
  );
}

export function getVaultRootFolderId(): string | null {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || null;
}

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !rawKey?.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Google Drive Service Account no está configurada.');
  }

  const auth = new google.auth.JWT({
    email,
    key: rawKey,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Ejecuta una operación de Google Drive con reintentos exponenciales y jitter.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt += 1;
      const status = error?.status || error?.code || error?.response?.status;
      const isRateLimit = status === 429 || status === 403;
      const isServerError = status >= 500 && status < 600;
      const isNetworkError = error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT';

      if (attempt > maxRetries || (!isRateLimit && !isServerError && !isNetworkError)) {
        throw error;
      }

      const baseDelay = Math.min(1000 * Math.pow(2, attempt), 8000);
      const jitter = Math.floor(Math.random() * 500);
      const delay = baseDelay + jitter;
      console.warn(`[WisdomDriveVault] Error transitorio (${status || error?.message}). Reintento ${attempt}/${maxRetries} en ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Servicio Central de la Bóveda de Google Drive.
 */
export class WisdomDriveVault {
  private drive: ReturnType<typeof google.drive>;
  private rootFolderId: string;

  constructor() {
    this.drive = getDriveClient();
    const root = getVaultRootFolderId();
    if (!root) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID no está configurada.');
    this.rootFolderId = root;
  }

  /**
   * Obtiene o crea una carpeta de forma idempotente dada una ruta relativa.
   */
  async ensureFolder(relativePath: string, description?: string): Promise<string> {
    const cleanPath = relativePath.replace(/^\/+|\/+$/g, '');
    if (!cleanPath) return this.rootFolderId;

    if (memoryFolderCache.has(cleanPath)) {
      return memoryFolderCache.get(cleanPath)!;
    }

    // Verificar en la base de datos (tabla drive_folders)
    try {
      const dbRow = prepare('SELECT id FROM drive_folders WHERE path = ?').get(cleanPath) as { id: string } | undefined;
      if (dbRow?.id) {
        memoryFolderCache.set(cleanPath, dbRow.id);
        return dbRow.id;
      }
    } catch {
      // Ignorar si la tabla no está lista aún
    }

    const segments = cleanPath.split('/');
    let currentParentId = this.rootFolderId;
    let accumulatedPath = '';

    for (const segment of segments) {
      accumulatedPath = accumulatedPath ? `${accumulatedPath}/${segment}` : segment;

      if (memoryFolderCache.has(accumulatedPath)) {
        currentParentId = memoryFolderCache.get(accumulatedPath)!;
        continue;
      }

      let folderId: string | null = null;
      try {
        const row = prepare('SELECT id FROM drive_folders WHERE path = ?').get(accumulatedPath) as { id: string } | undefined;
        if (row?.id) folderId = row.id;
      } catch {}

      if (!folderId) {
        // Buscar en Google Drive
        const escaped = segment.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const listRes = await withRetry(() =>
          this.drive.files.list({
            q: `'${currentParentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, webViewLink)',
            spaces: 'drive',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            pageSize: 5,
          })
        );

        const found = listRes.data.files?.[0];
        if (found?.id) {
          folderId = found.id;
        } else {
          // Crear la carpeta
          const createRes = await withRetry(() =>
            this.drive.files.create({
              requestBody: {
                name: segment,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [currentParentId],
                description: description || `Wisdom Vault Folder: ${accumulatedPath}`,
              },
              fields: 'id, name, webViewLink',
              supportsAllDrives: true,
            })
          );

          if (!createRes.data.id) {
            throw new Error(`Google Drive no devolvió ID para la carpeta: ${segment}`);
          }
          folderId = createRes.data.id;

          // Registrar en drive_folders
          try {
            const now = nowIso();
            prepare(`
              INSERT INTO drive_folders
                (id, parent_id, name, path, purpose, web_view_link, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(path) DO UPDATE SET
                id = excluded.id,
                parent_id = excluded.parent_id,
                name = excluded.name,
                purpose = excluded.purpose,
                web_view_link = excluded.web_view_link,
                updated_at = excluded.updated_at
            `).run(
              folderId,
              currentParentId,
              segment,
              accumulatedPath,
              description || 'Wisdom Vault Folder',
              createRes.data.webViewLink || null,
              now,
              now
            );
          } catch {}
        }
      }

      memoryFolderCache.set(accumulatedPath, folderId);
      currentParentId = folderId;
    }

    return currentParentId;
  }

  /**
   * Garantiza la creación de las 6 carpetas maestras de la Bóveda en Google Drive.
   */
  async ensureVaultStructure(): Promise<Record<VaultFolderKey, string>> {
    const results = {} as Record<VaultFolderKey, string>;
    for (const [key, folderName] of Object.entries(VAULT_FOLDERS)) {
      const id = await this.ensureFolder(folderName, `Bóveda Documental: ${folderName}`);
      results[key as VaultFolderKey] = id;
    }
    return results;
  }

  /**
   * Sube un archivo a Google Drive dentro de una carpeta específica de forma idempotente.
   */
  async uploadFile(input: {
    folderPath: string;
    fileName: string;
    content: Buffer | string;
    mimeType: string;
    description?: string;
  }): Promise<VaultFileInfo> {
    const parentFolderId = await this.ensureFolder(input.folderPath);
    const escaped = input.fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    // Buscar si ya existe para actualizar o crear
    const listRes = await withRetry(() =>
      this.drive.files.list({
        q: `'${parentFolderId}' in parents and name = '${escaped}' and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: 5,
      })
    );

    const existing = listRes.data.files?.[0];
    const stream = new Readable();
    stream.push(typeof input.content === 'string' ? Buffer.from(input.content, 'utf-8') : input.content);
    stream.push(null);

    if (existing?.id) {
      // Actualizar contenido existente
      const updateRes = await withRetry(() =>
        this.drive.files.update({
          fileId: existing.id!,
          media: {
            mimeType: input.mimeType,
            body: stream,
          },
          fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime',
          supportsAllDrives: true,
        })
      );
      return {
        id: updateRes.data.id!,
        name: updateRes.data.name || input.fileName,
        mimeType: updateRes.data.mimeType || input.mimeType,
        size: updateRes.data.size ? Number(updateRes.data.size) : undefined,
        webViewLink: updateRes.data.webViewLink,
        webContentLink: updateRes.data.webContentLink,
        createdTime: updateRes.data.createdTime,
      };
    }

    // Crear nuevo archivo
    const createRes = await withRetry(() =>
      this.drive.files.create({
        requestBody: {
          name: input.fileName,
          parents: [parentFolderId],
          description: input.description,
        },
        media: {
          mimeType: input.mimeType,
          body: stream,
        },
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime',
        supportsAllDrives: true,
      })
    );

    if (!createRes.data.id) {
      throw new Error(`Google Drive no devolvió ID para el archivo: ${input.fileName}`);
    }

    return {
      id: createRes.data.id,
      name: createRes.data.name || input.fileName,
      mimeType: createRes.data.mimeType || input.mimeType,
      size: createRes.data.size ? Number(createRes.data.size) : undefined,
      webViewLink: createRes.data.webViewLink,
      webContentLink: createRes.data.webContentLink,
      createdTime: createRes.data.createdTime,
    };
  }

  /**
   * Descarga el contenido binario de un archivo por su fileId.
   */
  async downloadFile(fileId: string): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
    const meta = await withRetry(() =>
      this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, trashed',
        supportsAllDrives: true,
      })
    );

    if (!meta.data.id || meta.data.trashed) {
      throw new Error(`El archivo de Drive (${fileId}) no existe o está en la papelera.`);
    }

    const res = await withRetry(() =>
      this.drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
      )
    );

    return {
      buffer: Buffer.from(res.data as ArrayBuffer),
      mimeType: meta.data.mimeType || 'application/octet-stream',
      name: meta.data.name || 'archivo',
    };
  }

  /**
   * Guarda una ficha de admisión o contrato en /01_Matriculas_y_Admisiones/
   */
  async uploadAdmissionFile(
    studentId: string,
    cycle: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'application/json'
  ): Promise<VaultFileInfo> {
    const folderPath = `${VAULT_FOLDERS.ADMISSIONS}/${cycle}/${studentId}`;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: `Ficha de Admisión / Matrícula (${cycle}) del estudiante ${studentId}`,
    });
  }

  /**
   * Guarda un documento del estudiante en /02_Expedientes_Estudiantes/
   */
  async uploadStudentDocument(
    studentId: string,
    category: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'application/pdf'
  ): Promise<VaultFileInfo> {
    const folderPath = `${VAULT_FOLDERS.STUDENT_RECORDS}/${studentId}/${category}`;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: `Expediente Estudiantil: ${studentId} - ${category}`,
    });
  }

  /**
   * Guarda un informe de notas o acta en /03_Calificaciones_y_Actas/
   */
  async uploadGradeReport(
    courseSlug: string,
    period: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'text/html'
  ): Promise<VaultFileInfo> {
    const folderPath = `${VAULT_FOLDERS.GRADES_AND_ACTS}/${courseSlug}/${period}`;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: `Acta de Calificaciones: ${courseSlug} (${period})`,
    });
  }

  /**
   * Guarda un certificado emitido en /04_Certificados_y_Diplomas/
   */
  async uploadCertificate(
    courseSlug: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'text/html'
  ): Promise<VaultFileInfo> {
    const folderPath = `${VAULT_FOLDERS.CERTIFICATES}/${courseSlug}`;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: `Certificado Ministerial / Diploma emitido: ${courseSlug}`,
    });
  }

  /**
   * Guarda un reporte estadístico en /05_Estadisticas_y_Reportes/
   */
  async uploadStatisticsReport(
    reportType: string,
    period: string,
    fileName: string,
    content: Buffer | string,
    mimeType = 'application/json'
  ): Promise<VaultFileInfo> {
    const folderPath = `${VAULT_FOLDERS.STATS_AND_REPORTS}/${reportType}/${period}`;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: `Snapshot Estadístico: ${reportType} (${period})`,
    });
  }

  /**
   * Guarda un respaldo de la base de datos en /06_Database_Backups/
   */
  async uploadDatabaseBackup(
    fileName: string,
    content: Buffer | string,
    mimeType = 'application/octet-stream'
  ): Promise<VaultFileInfo> {
    const folderPath = VAULT_FOLDERS.BACKUPS;
    return this.uploadFile({
      folderPath,
      fileName,
      content,
      mimeType,
      description: 'Snapshot de Respaldo de Base de Datos Wisdom Academy',
    });
  }

  /**
   * Lista los respaldos disponibles en /06_Database_Backups/
   */
  async listDatabaseBackups(maxResults = 20): Promise<VaultFileInfo[]> {
    const folderId = await this.ensureFolder(VAULT_FOLDERS.BACKUPS);
    const listRes = await withRetry(() =>
      this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)',
        orderBy: 'createdTime desc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageSize: maxResults,
      })
    );

    return (listRes.data.files || []).map((f) => ({
      id: f.id!,
      name: f.name || 'backup',
      mimeType: f.mimeType || 'application/octet-stream',
      size: f.size ? Number(f.size) : undefined,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      createdTime: f.createdTime,
    }));
  }
}

/**
 * Instancia singleton perezosa de la Bóveda de Google Drive.
 */
let vaultInstance: WisdomDriveVault | null = null;

export function getWisdomDriveVault(): WisdomDriveVault | null {
  if (!isVaultConfigured()) return null;
  if (!vaultInstance) {
    vaultInstance = new WisdomDriveVault();
  }
  return vaultInstance;
}

/**
 * Helper Write-Through / Async Sync:
 * Ejecuta una tarea de sincronización documental en segundo plano sin bloquear
 * la respuesta HTTP ni la transacción en Turso.
 */
export function scheduleVaultSync(taskName: string, task: () => Promise<void>): void {
  if (!isVaultConfigured()) return;
  // Disparar en segundo plano sin esperar el resultado
  Promise.resolve()
    .then(async () => {
      try {
        await task();
      } catch (err: any) {
        console.error(`[WisdomDriveVault] Error asíncrono en sincronización (${taskName}):`, err.message || err);
      }
    })
    .catch(() => {});
}

