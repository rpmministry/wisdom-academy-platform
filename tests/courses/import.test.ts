import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { createUser, actor } from '../platform/helpers';
import {
  addModule,
  createProgram,
  getProgramDetail,
  getProgramRowById,
} from '../../src/server/domain/coursePrograms';
import {
  confirmManifestImport,
  importDocument,
  previewManifestImport,
} from '../../src/server/domain/courseImport';

function createProgramWithSemesters(semesters = 2): { programId: string; adminId: string } {
  const adminId = createUser({ email: `admin-import-${Date.now()}-${Math.random()}@test.local`, roles: ['principal_admin'] });
  const program = createProgram({
    kind: 'course',
    title: `Curso de importación ${Math.random()}`,
    description: 'Programa de prueba de importación',
    status: 'draft',
  });
  for (let semester = 1; semester <= semesters; semester += 1) {
    const module = addModule(program.id, {
      title: `Semestre ${String(semester).padStart(2, '0')}`,
      kind: 'semester',
      position: semester,
    });
    prepare('UPDATE course_modules SET metadata_json = ? WHERE id = ?').run(
      JSON.stringify({ semesterNumber: semester }),
      module.id
    );
  }
  return { programId: program.id, adminId };
}

const MANIFEST = `Programa: Curso teológico — Universidad Cristiana N2N
Semestre: 1
Clase: 1
Título de la clase: Clase válida uno
URL de YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Páginas del texto: 1-10

Semestre: 2
Clase: 1
Título de la clase: Clase válida dos
URL de YouTube: https://youtu.be/aaaaaaaaaaa
Páginas del texto: 11-20

Semestre: 9
Clase: 1
Título de la clase: Semestre inexistente
URL de YouTube: https://youtu.be/bbbbbbbbbbb
`;

test('previsualiza y confirma sin perder las filas válidas', () => {
  const { programId, adminId } = createProgramWithSemesters(2);
  const admin = actor(adminId);
  const preview = previewManifestImport(programId, 'manifest.md', MANIFEST);
  assert.equal(preview.stats.create, 2);
  assert.equal(preview.stats.errors >= 1, true);
  assert.ok(preview.errors.some((error) => error.includes('no existe el semestre 9')));

  const result = confirmManifestImport(programId, 'manifest.md', MANIFEST, admin);
  assert.equal(result.imported, 2);
  assert.equal(result.skipped, 1);
  assert.equal(result.lessons.length, 2);

  const count = prepare('SELECT COUNT(*) AS total FROM course_lessons WHERE program_id = ?').get(programId) as {
    total: number;
  };
  assert.equal(Number(count.total), 2);
});

test('reimportar el mismo manifiesto actualiza y no duplica clases', () => {
  const { programId, adminId } = createProgramWithSemesters(2);
  const admin = actor(adminId);
  confirmManifestImport(programId, 'manifest.md', MANIFEST, admin);
  const second = confirmManifestImport(programId, 'manifest.md', MANIFEST, admin);
  assert.equal(second.imported, 0);
  assert.equal(second.updated, 2);
  const count = prepare('SELECT COUNT(*) AS total FROM course_lessons WHERE program_id = ?').get(programId) as {
    total: number;
  };
  assert.equal(Number(count.total), 2);
});

test('importa un documento de texto como material trazable', async () => {
  const { programId, adminId } = createProgramWithSemesters(1);
  const admin = actor(adminId);
  const result = await importDocument({
    programId,
    filename: 'programa-oficial.txt',
    buffer: Buffer.from('Programa oficial de estudio. Contenido de prueba para la extracción de texto.'),
    mimeType: 'text/plain',
    actor: admin,
  });
  assert.ok(result.materialId);
  assert.equal(result.textLength > 20, true);
  assert.equal(result.driveStatus, 'not_configured');

  const detail = getProgramDetail(getProgramRowById(programId)!);
  assert.ok(detail.materials.some((material) => material.id === result.materialId));
});

test('un documento oficial de examen se registra como privado', async () => {
  const { programId, adminId } = createProgramWithSemesters(1);
  const admin = actor(adminId);
  const result = await importDocument({
    programId,
    filename: 'parcial-oficial.txt',
    buffer: Buffer.from('Examen oficial con preguntas. Documento de prueba privado.'),
    mimeType: 'text/plain',
    visibility: 'staff',
    actor: admin,
  });
  assert.equal(result.visibility, 'staff');
  const studentView = getProgramDetail(getProgramRowById(programId)!);
  assert.equal(studentView.materials.some((material) => material.id === result.materialId), false);
  const staffView = getProgramDetail(getProgramRowById(programId)!, { includeStaffMaterials: true });
  assert.equal(staffView.materials.some((material) => material.id === result.materialId), true);
  assert.equal(staffView.materials.find((material) => material.id === result.materialId)?.visibility, 'staff');
});

test('un documento vacío o ilegible no se importa silenciosamente', async () => {
  const { programId, adminId } = createProgramWithSemesters(1);
  const admin = actor(adminId);
  await assert.rejects(
    importDocument({
      programId,
      filename: 'escaneado.pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF'),
      mimeType: 'application/pdf',
      actor: admin,
    }),
    /OCR|extraer texto/i
  );
});
