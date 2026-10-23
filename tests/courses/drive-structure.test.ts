import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCoursesWorkshopsStructure,
  buildFlatCoursesWorkshopsStructure,
  buildN2NProgramStructure,
  flattenStructure,
  semesterFolderName,
} from '../../src/lib/courses/drive-structure';
import {
  ensureFolderStructure,
  type DriveFolderGateway,
  type DriveFolderInfo,
  type DriveFolderRegistry,
  type DriveFolderRegistryRecord,
} from '../../src/lib/courses/googleDrive';

class MemoryGateway implements DriveFolderGateway {
  folders = new Map<string, { id: string; name: string; parentId: string; link: string }>();
  counter = 0;

  constructor(rootId = 'root') {
    this.folders.set(rootId, { id: rootId, name: 'Raíz', parentId: '', link: '' });
  }

  async findFolder(parentId: string, name: string): Promise<DriveFolderInfo | null> {
    for (const folder of this.folders.values()) {
      if (folder.parentId === parentId && folder.name === name) {
        return { id: folder.id, name: folder.name, webViewLink: folder.link };
      }
    }
    return null;
  }

  async createFolder(parentId: string, name: string): Promise<DriveFolderInfo> {
    this.counter += 1;
    const id = `folder_${this.counter}`;
    this.folders.set(id, {
      id,
      name,
      parentId,
      link: `https://drive.google.com/drive/folders/${id}`,
    });
    return { id, name, webViewLink: `https://drive.google.com/drive/folders/${id}` };
  }

  async getFolder(id: string): Promise<DriveFolderInfo | null> {
    const folder = this.folders.get(id);
    return folder ? { id: folder.id, name: folder.name, webViewLink: folder.link } : null;
  }
}

class MemoryRegistry implements DriveFolderRegistry {
  records = new Map<string, DriveFolderRegistryRecord>();
  getByPath(path: string) {
    return this.records.get(path) || null;
  }
  upsert(record: DriveFolderRegistryRecord) {
    this.records.set(record.path, record);
  }
}

test('la estructura N2N contiene los diez semestres y las carpetas obligatorias', () => {
  const flat = buildFlatCoursesWorkshopsStructure(10);
  const paths = flat.map((folder) => folder.path);
  assert.equal(paths[0], 'Cursos');
  assert.ok(paths.includes('Talleres'));
  for (let semester = 1; semester <= 10; semester += 1) {
    const name = semesterFolderName(semester);
    assert.ok(paths.some((path) => path.startsWith(`Cursos/Curso teológico — Universidad Cristiana N2N/${name}/`)));
  }
  const semester1 = flat.filter((folder) => folder.path.includes('01_SEMESTRE_01'));
  assert.ok(semester1.some((folder) => folder.name === '05_REPASOS_SEMANALES'));
  assert.ok(semester1.some((folder) => folder.name === '06_PARCIALES_Y_FINALES'));
  assert.ok(semester1.some((folder) => folder.path.endsWith('02_CLAVE_PRIVADA_DOCENTE')));
  assert.ok(semester1.some((folder) => folder.name === '03_INFORMES_AGREGADOS_SIN_DATOS_IDENTIFICABLES'));
});

test('los prefijos numéricos se ajustan al semestre', () => {
  assert.equal(semesterFolderName(1), '01_SEMESTRE_01');
  assert.equal(semesterFolderName(9), '09_SEMESTRE_09');
  assert.equal(semesterFolderName(10), '10_SEMESTRE_10');
  assert.throws(() => semesterFolderName(0));
});

test('la creación de carpetas es idempotente y conserva IDs', async () => {
  const gateway = new MemoryGateway();
  const registry = new MemoryRegistry();
  const nodes = buildCoursesWorkshopsStructure(3);
  const first = await ensureFolderStructure({
    gateway,
    rootFolderId: 'root',
    nodes,
    registry,
  });
  assert.ok(first.created > 0);
  const firstIds = [...registry.records.entries()].map(([path, record]) => [path, record.id]);
  const second = await ensureFolderStructure({
    gateway,
    rootFolderId: 'root',
    nodes,
    registry,
  });
  assert.equal(second.created, 0);
  assert.equal(second.reused, first.created);
  assert.deepEqual(
    [...registry.records.entries()].map(([path, record]) => [path, record.id]),
    firstIds
  );
});

test('pathPrefix mantiene rutas canónicas bajo Cursos sin duplicar IDs', async () => {
  const gateway = new MemoryGateway();
  const registry = new MemoryRegistry();
  const root = await ensureFolderStructure({
    gateway,
    rootFolderId: 'root',
    nodes: [{ name: 'Cursos', purpose: 'Cursos' }],
    registry,
  });
  const coursesId = root.folders[0].id;
  const programNode = buildN2NProgramStructure(2);
  const first = await ensureFolderStructure({
    gateway,
    rootFolderId: coursesId,
    nodes: [programNode],
    registry,
    pathPrefix: 'Cursos',
  });
  assert.ok(first.folders.every((folder) => folder.path.startsWith('Cursos/')));
  const before = registry.records.size;
  const second = await ensureFolderStructure({
    gateway,
    rootFolderId: coursesId,
    nodes: [programNode],
    registry,
    pathPrefix: 'Cursos',
  });
  assert.equal(second.created, 0);
  assert.equal(registry.records.size, before);
  assert.equal(flattenStructure([programNode]).length, first.folders.length);
});
