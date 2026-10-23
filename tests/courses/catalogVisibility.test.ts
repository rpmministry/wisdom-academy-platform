import test from 'node:test';
import assert from 'node:assert/strict';
import { prepare } from '../../src/server/db';
import { createProgram, updateProgram } from '../../src/server/domain/coursePrograms';
import { backfillPublishedCourseProducts } from '../../src/server/domain/courseCatalog';
import { createUser, actor } from '../platform/helpers';

function productForResource(resourceId: string) {
  return prepare(`
    SELECT p.* FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ?
    ORDER BY p.created_at DESC LIMIT 1
  `).get(resourceId) as
    | { id: string; status: string; name: string; price_cents: number; catalog_link: string }
    | undefined;
}

test('un curso recién creado obtiene producto y aparece al publicarse', () => {
  const admin = actor(createUser({ email: `admin-catalog-${Date.now()}@test.local`, roles: ['principal_admin'] }));
  const program = createProgram({
    kind: 'course',
    title: 'Curso nuevo visible en catálogo',
    description: 'Descripción del curso nuevo',
    status: 'draft',
  });
  const draft = productForResource(program.resourceId);
  assert.ok(draft);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.price_cents, 0);

  updateProgram(program.id, { status: 'published' }, admin);
  const published = productForResource(program.resourceId);
  assert.ok(published);
  assert.equal(published.status, 'published');
  assert.equal(published.name, 'Curso nuevo visible en catálogo');

  const resource = prepare('SELECT status FROM resources WHERE id = ?').get(program.resourceId) as {
    status: string;
  };
  assert.equal(resource.status, 'published');
});

test('archivar el curso retira su producto del catálogo y republicarlo lo restaura', () => {
  const admin = actor(createUser({ email: `admin-catalog-${Date.now()}-2@test.local`, roles: ['principal_admin'] }));
  const program = createProgram({
    kind: 'course',
    title: 'Curso archivable',
    status: 'published',
  });
  updateProgram(program.id, { status: 'archived' }, admin);
  assert.equal(productForResource(program.resourceId)?.status, 'archived');
  updateProgram(program.id, { status: 'published' }, admin);
  assert.equal(productForResource(program.resourceId)?.status, 'published');
});

test('la reparación de catálogo crea productos para cursos publicados sin producto', () => {
  const program = createProgram({
    kind: 'course',
    title: 'Curso publicado sin producto',
    status: 'published',
  });
  prepare('DELETE FROM product_resources WHERE resource_id = ?').run(program.resourceId);
  prepare('DELETE FROM products WHERE id = ?').run(
    (prepare('SELECT catalog_product_id AS id FROM course_programs WHERE id = ?').get(program.id) as {
      id: string;
    }).id
  );
  prepare('UPDATE course_programs SET catalog_product_id = NULL WHERE id = ?').run(program.id);
  backfillPublishedCourseProducts();
  const repaired = productForResource(program.resourceId);
  assert.ok(repaired);
  assert.equal(repaired.status, 'published');
});
