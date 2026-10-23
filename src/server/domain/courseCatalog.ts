import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { randomToken } from '../security/random';

/**
 * Vincula cada curso/taller con un producto del catálogo.
 *
 * El catálogo público lista productos publicados. Sin este puente, un curso
 * recién creado existe como `resource`/`course_program` pero nunca aparece en
 * la tienda. La sincronización es idempotente y respeta el estado del programa:
 *
 *   draft     -> producto draft
 *   published -> producto published
 *   archived  -> producto archived
 *
 * Si el programa tiene un producto manual vinculado, no se crea otro. Si el
 * producto automático se elimina, se vuelve a crear en la siguiente
 * sincronización o en la lectura del catálogo.
 */

interface ProgramCatalogRow {
  id: string;
  resource_id: string;
  status: 'draft' | 'published' | 'archived';
  title: string;
  description: string | null;
  catalog_product_id: string | null;
  slug: string;
}

function loadProgram(programId: string): ProgramCatalogRow | null {
  const row = prepare(`
    SELECT cp.id, cp.resource_id, cp.status, cp.title, cp.description,
           cp.catalog_product_id, r.slug
    FROM course_programs cp
    JOIN resources r ON r.id = cp.resource_id
    WHERE cp.id = ?
  `).get(programId) as ProgramCatalogRow | undefined;
  return row ?? null;
}

function linkedProductForResource(resourceId: string): string | null {
  const row = prepare(`
    SELECT p.id FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ? AND p.status <> 'archived'
    ORDER BY p.created_at ASC
    LIMIT 1
  `).get(resourceId) as { id: string } | undefined;
  return row?.id ?? null;
}

function uniqueProductSlug(base: string): string {
  const normalized =
    base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'programa';
  let slug = `wa-programa-${normalized}`.slice(0, 100);
  let suffix = 2;
  while (prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
    slug = `wa-programa-${normalized}-${suffix}`.slice(0, 100);
    suffix += 1;
  }
  return slug;
}

export function ensureProgramProduct(programId: string): string | null {
  const program = loadProgram(programId);
  if (!program) return null;

  if (program.catalog_product_id) {
    const existing = prepare('SELECT id FROM products WHERE id = ?').get(
      program.catalog_product_id
    ) as { id: string } | undefined;
    if (existing) return existing.id;
  }

  const manual = linkedProductForResource(program.resource_id);
  if (manual) {
    prepare('UPDATE course_programs SET catalog_product_id = ? WHERE id = ?').run(manual, program.id);
    return manual;
  }

  const now = nowIso();
  const productId = `prod_${randomToken(16)}`;
  const slug = uniqueProductSlug(program.slug || program.title);
  withTransaction(() => {
    prepare(`
      INSERT INTO products
        (id, slug, name, description, status, price_cents, currency, price_status,
         metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, 'USD', 'pending', '{}', ?, ?)
    `).run(
      productId,
      slug,
      program.title.slice(0, 180),
      program.description?.slice(0, 2000) || null,
      program.status,
      now,
      now
    );
    prepare(
      'INSERT OR IGNORE INTO product_resources (product_id, resource_id) VALUES (?, ?)'
    ).run(productId, program.resource_id);
    prepare('UPDATE course_programs SET catalog_product_id = ? WHERE id = ?').run(
      productId,
      program.id
    );
  });
  return productId;
}

export function syncProgramProduct(programId: string): void {
  const program = loadProgram(programId);
  if (!program) return;
  const productId = ensureProgramProduct(programId);
  if (!productId) return;

  // Solo se sincronizan name/description/status. El precio se administra
  // explícitamente desde el CRM para no convertir por accidente un curso en
  // gratuito al publicarlo.
  prepare(`
    UPDATE products
    SET name = ?, description = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    program.title.slice(0, 180),
    program.description?.slice(0, 2000) || null,
    program.status,
    nowIso(),
    productId
  );
}

/**
 * Repara bases de datos existentes: todo curso/taller publicado debe tener su
 * producto publicado antes de listar el catálogo.
 */
export function backfillPublishedCourseProducts(): number {
  const rows = prepare(`
    SELECT cp.id FROM course_programs cp
    JOIN resources r ON r.id = cp.resource_id
    LEFT JOIN products p ON p.id = cp.catalog_product_id
    WHERE cp.status = 'published'
      AND r.status = 'published'
      AND (p.id IS NULL OR p.status <> 'published')
  `).all() as Array<{ id: string }>;
  for (const row of rows) {
    syncProgramProduct(row.id);
  }
  return rows.length;
}

/**
 * Mantiene sincronizado el estado del producto con el estado real del curso,
 * incluso si el curso se modificó fuera de la capa de dominio.
 */
export function syncAllCourseProductStates(): number {
  const rows = prepare(`
    SELECT cp.id, cp.status AS program_status, p.id AS product_id, p.status AS product_status
    FROM course_programs cp
    JOIN products p ON p.id = cp.catalog_product_id
    WHERE p.status <> cp.status
  `).all() as Array<{
    id: string;
    program_status: 'draft' | 'published' | 'archived';
    product_id: string;
    product_status: string;
  }>;

  for (const row of rows) {
    prepare('UPDATE products SET status = ?, updated_at = ? WHERE id = ?').run(
      row.program_status,
      nowIso(),
      row.product_id
    );
  }
  return rows.length;
}
