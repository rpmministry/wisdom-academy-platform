import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { GET } from '../../src/app/api/catalog/route';
import { prepare } from '../../src/server/db';
import {
  addLesson,
  addModule,
  createProgram,
} from '../../src/server/domain/coursePrograms';
import { HOMESCHOOL_ANNUAL_PRICE_CENTS } from '../../src/lib/catalog/homeschoolOffer';

interface CatalogProduct {
  slug: string;
  name: string;
  priceCents: number;
  annualOffer: boolean;
  guideUrl: string | null;
  contentStatus: 'available' | 'upcoming';
  resources: Array<{ type: string }>;
}

async function catalog(): Promise<CatalogProduct[]> {
  const response = await GET(new NextRequest('http://127.0.0.1:3100/api/catalog'));
  assert.equal(response.status, 200);
  const body = (await response.json()) as { productos: CatalogProduct[] };
  return body.productos;
}

test('el catálogo publica un solo programa por grado Homeschool y el precio anual uniforme', async () => {
  const productos = await catalog();
  const homeschool = productos.filter((product) =>
    product.resources.some((resource) => resource.type === 'homeschool_program')
  );

  assert.deepEqual(
    homeschool.map((product) => product.slug).sort(),
    ['programa-homeschool-4-egb', 'programa-homeschool-8-egb']
  );
  assert.equal(
    productos.some((product) => product.slug === 'grado-8-egb'),
    false,
    'El registro histórico duplicado no debe aparecer en el catálogo'
  );
  for (const programa of homeschool) {
    assert.equal(programa.priceCents, HOMESCHOOL_ANNUAL_PRICE_CENTS);
    assert.equal(programa.annualOffer, true);
    assert.equal(programa.contentStatus, 'available');
  }
});

test('el duplicado histórico se conserva archivado y no puede reaparecer en el catálogo', () => {
  const legacyProduct = prepare(
    "SELECT status, price_cents FROM products WHERE slug = 'grado-8-egb'"
  ).get() as { status: string; price_cents: number } | undefined;

  if (legacyProduct) {
    assert.equal(legacyProduct.status, 'archived');
    assert.equal(legacyProduct.price_cents, HOMESCHOOL_ANNUAL_PRICE_CENTS);
  }

  const published = prepare(`
    SELECT COUNT(*) AS total
    FROM products
    WHERE slug = 'grado-8-egb' AND status = 'published'
  `).get() as { total: number };
  assert.equal(Number(published.total), 0);
});

test('la guía de bienvenida se publica con su ruta interna y sin precio', async () => {
  const productos = await catalog();
  const guia = productos.find((product) => product.slug === 'guia-bienvenida-homeschool');
  assert.ok(guia);
  assert.equal(guia.priceCents, 0);
  assert.equal(guia.guideUrl, '/guia-bienvenida-homeschool');
  assert.equal(guia.contentStatus, 'available');
});

test('un curso publicado con clases se considera disponible', async () => {
  const titulo = `Curso disponible ${Math.random()}`;
  const program = createProgram({
    kind: 'course',
    title: titulo,
    description: 'Curso de prueba con contenido publicado.',
    status: 'published',
  });
  const module = addModule(program.id, { title: 'Unidad 01', kind: 'semester' });
  addLesson(program.id, module.id, { title: 'Clase disponible' });

  const productos = await catalog();
  const curso = productos.find((product) => product.name === titulo);
  assert.ok(curso);
  assert.equal(curso.contentStatus, 'available');
});

test('los cursos y talleres sin materiales se marcan como próximos, no como error', async () => {
  const productos = await catalog();

  for (const slug of [
    'curso-python-ia-jovenes',
    'taller-mayordomia-financiera',
    'taller-escuela-padres-homeschoolers',
    'taller-liderazgo-cristiano',
    'taller-musica-adoracion',
  ]) {
    const taller = productos.find((product) => product.slug === slug);
    assert.ok(taller, `Falta ${slug}`);
    assert.equal(taller.contentStatus, 'upcoming');
  }
});
