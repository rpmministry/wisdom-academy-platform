import { google } from 'googleapis';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { flattenStructure, type DriveFolderNode, type FlatDriveFolder } from './drive-structure';

/**
 * Capa de Google Drive para el módulo de Cursos y Talleres.
 *
 * - Autentica con la cuenta de servicio ya usada por el proyecto.
 * - Nunca concede permisos públicos.
 * - Es idempotente: reutiliza carpetas por ID registrado y, si no existe el
 *   registro, busca por nombre dentro del padre antes de crear.
 * - Registra cada carpeta en SQLite (`drive_folders`) para no depender del nombre.
 */

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink?: string | null;
}

export interface DriveFolderGateway {
  findFolder(parentId: string, name: string): Promise<DriveFolderInfo | null>;
  createFolder(parentId: string, name: string, description?: string): Promise<DriveFolderInfo>;
  getFolder(id: string): Promise<DriveFolderInfo | null>;
}

export interface DriveFolderRegistryRecord {
  id: string;
  parentId: string | null;
  name: string;
  path: string;
  purpose: string;
  webViewLink: string | null;
}

export interface DriveFolderRegistry {
  getByPath(path: string): DriveFolderRegistryRecord | null;
  upsert(record: DriveFolderRegistryRecord): void;
}

export function driveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY')
  );
}

export function getDriveRootFolderId(): string | null {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim() || null;
}

export class GoogleDriveGateway implements DriveFolderGateway {
  private drive: ReturnType<typeof google.drive>;

  constructor() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!email || !key?.includes('BEGIN PRIVATE KEY')) {
      throw new Error('La cuenta de servicio de Google Drive no está configurada.');
    }
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth });
  }

  async findFolder(parentId: string, name: string): Promise<DriveFolderInfo | null> {
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const response = await this.drive.files.list({
      q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 10,
    });
    const found = response.data.files?.[0];
    if (!found?.id) return null;
    return { id: found.id, name: found.name || name, webViewLink: found.webViewLink || null };
  }

  async createFolder(parentId: string, name: string, description?: string): Promise<DriveFolderInfo> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
        description,
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    if (!response.data.id) {
      throw new Error(`Google Drive no devolvió el ID de la carpeta "${name}".`);
    }
    return {
      id: response.data.id,
      name: response.data.name || name,
      webViewLink: response.data.webViewLink || null,
    };
  }

  async getFolder(id: string): Promise<DriveFolderInfo | null> {
    try {
      const response = await this.drive.files.get({
        fileId: id,
        fields: 'id, name, webViewLink, mimeType, trashed',
        supportsAllDrives: true,
      });
      if (!response.data.id || response.data.trashed) return null;
      return {
        id: response.data.id,
        name: response.data.name || '',
        webViewLink: response.data.webViewLink || null,
      };
    } catch {
      return null;
    }
  }

  async downloadFile(fileId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    name: string;
    size: number | null;
  }> {
    const metadata = await this.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, trashed',
      supportsAllDrives: true,
    });
    if (!metadata.data.id || metadata.data.trashed) {
      throw new Error('El archivo no existe o está en la papelera.');
    }
    const media = await this.drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    const buffer = Buffer.from(media.data as ArrayBuffer);
    return {
      buffer,
      mimeType: metadata.data.mimeType || 'application/octet-stream',
      name: metadata.data.name || 'archivo',
      size: metadata.data.size ? Number(metadata.data.size) : buffer.length,
    };
  }

  async uploadFile(input: {
    parentId: string;
    name: string;
    mimeType: string;
    content: Buffer | string;
  }): Promise<{ id: string; webViewLink: string | null; created: boolean }> {
    const existing = await this.findFile(input.parentId, input.name);
    if (existing) return { ...existing, created: false };
    const response = await this.drive.files.create({
      requestBody: { name: input.name, parents: [input.parentId] },
      media: { mimeType: input.mimeType, body: input.content },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });
    if (!response.data.id) throw new Error('Google Drive no devolvió el ID del archivo.');
    return { id: response.data.id, webViewLink: response.data.webViewLink || null, created: true };
  }

  private async findFile(
    parentId: string,
    name: string
  ): Promise<{ id: string; webViewLink: string | null } | null> {
    const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const response = await this.drive.files.list({
      q: `'${parentId}' in parents and name = '${escaped}' and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, webViewLink)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageSize: 10,
    });
    const found = response.data.files?.[0];
    return found?.id ? { id: found.id, webViewLink: found.webViewLink || null } : null;
  }
}

export const sqliteDriveRegistry: DriveFolderRegistry = {
  getByPath(path: string) {
    const row = prepare('SELECT * FROM drive_folders WHERE path = ?').get(path) as
      | {
          id: string;
          parent_id: string | null;
          name: string;
          path: string;
          purpose: string;
          web_view_link: string | null;
        }
      | undefined;
    if (!row) return null;
    return {
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      path: row.path,
      purpose: row.purpose,
      webViewLink: row.web_view_link,
    };
  },
  upsert(record: DriveFolderRegistryRecord) {
    const timestamp = nowIso();
    prepare(`
      INSERT INTO drive_folders (id, parent_id, name, path, purpose, web_view_link, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        id = excluded.id,
        parent_id = excluded.parent_id,
        name = excluded.name,
        purpose = excluded.purpose,
        web_view_link = excluded.web_view_link,
        updated_at = excluded.updated_at
    `).run(
      record.id,
      record.parentId,
      record.name,
      record.path,
      record.purpose,
      record.webViewLink,
      timestamp,
      timestamp
    );
  },
};

export interface EnsureStructureResult {
  folders: DriveFolderRegistryRecord[];
  created: number;
  reused: number;
}

/**
 * Crea (o reutiliza) un árbol de carpetas completo bajo la raíz indicada.
 * La ruta relativa es la clave idempotente.
 */
export async function ensureFolderStructure(options: {
  gateway: DriveFolderGateway;
  rootFolderId: string;
  nodes: DriveFolderNode[];
  registry?: DriveFolderRegistry;
  pathPrefix?: string;
  onProgress?: (message: string) => void;
}): Promise<EnsureStructureResult> {
  const prefix = options.pathPrefix?.replace(/^\/+|\/+$/g, '') || '';
  const flat: FlatDriveFolder[] = flattenStructure(options.nodes).map((folder) => ({
    ...folder,
    path: prefix ? `${prefix}/${folder.path}` : folder.path,
    parentPath: folder.parentPath
      ? prefix
        ? `${prefix}/${folder.parentPath}`
        : folder.parentPath
      : null,
  }));
  const registry = options.registry;
  const byPath = new Map<string, DriveFolderRegistryRecord>();
  const folders: DriveFolderRegistryRecord[] = [];
  let created = 0;
  let reused = 0;

  for (const folder of flat) {
    const parentId = folder.parentPath
      ? byPath.get(folder.parentPath)?.id ?? null
      : options.rootFolderId;
    if (!parentId) {
      throw new Error(`No se pudo resolver la carpeta padre de "${folder.path}".`);
    }

    let resolved: DriveFolderInfo | null = null;
    let fromRegistry = false;

    if (registry) {
      const registered = registry.getByPath(folder.path);
      if (registered) {
        const verified = await options.gateway.getFolder(registered.id);
        if (verified) {
          resolved = verified;
          fromRegistry = true;
        }
      }
    }

    if (!resolved) {
      resolved = await options.gateway.findFolder(parentId, folder.name);
    }

    if (resolved) {
      reused += 1;
      options.onProgress?.(`= Reutilizada: ${folder.path} [${resolved.id}]`);
    } else {
      resolved = await options.gateway.createFolder(parentId, folder.name, folder.purpose);
      const verified = await options.gateway.getFolder(resolved.id);
      if (!verified) {
        throw new Error(`La carpeta "${folder.path}" no pudo verificarse después de crearla.`);
      }
      resolved = verified;
      created += 1;
      options.onProgress?.(`+ Creada: ${folder.path} [${resolved.id}]`);
    }

    const record: DriveFolderRegistryRecord = {
      id: resolved.id,
      parentId,
      name: folder.name,
      path: folder.path,
      purpose: folder.purpose,
      webViewLink: resolved.webViewLink || null,
    };
    byPath.set(folder.path, record);
    folders.push(record);
    registry?.upsert(record);
    void fromRegistry;
  }

  return { folders, created, reused };
}

export function createDriveGateway(): GoogleDriveGateway {
  return new GoogleDriveGateway();
}
