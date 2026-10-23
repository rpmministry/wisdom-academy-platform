import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { prepare, withTransaction } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { randomToken } from '@/server/security/random';
import { writeAudit } from '@/server/audit';
import { HOMESCHOOL_ANNUAL_PRICE_CENTS } from '@/lib/catalog/homeschoolOffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const allowed = [
    'accessDays',
    'accessMonths',
    'accessEndsAt',
    'unlimited',
    'hours',
    'modality',
    'notes',
  ];
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    if (source[key] !== undefined) output[key] = source[key];
  }
  return output;
}

function normalizeResourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Los recursos deben ser una lista.');
  }
  const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length !== value.length || ids.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona al menos un recurso válido.');
  }
  const placeholders = ids.map(() => '?').join(',');
  const found = prepare(
    `SELECT COUNT(*) AS total FROM resources WHERE id IN (${placeholders})`
  ).get(...ids) as { total: number };
  if (Number(found.total) !== new Set(ids).size) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Uno de los recursos no existe.');
  }
  return [...new Set(ids)];
}

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'products.read' });
    const products = prepare('SELECT * FROM products ORDER BY created_at DESC').all() as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      status: string;
      price_cents: number;
      currency: string;
      price_status: 'defined' | 'pending';
      metadata_json: string;
      created_at: string;
      updated_at: string;
    }>;
    return NextResponse.json(
      {
        ok: true,
        productos: products.map((product) => {
          const resources = prepare(`
            SELECT r.id, r.slug, r.title, r.type FROM product_resources pr
            JOIN resources r ON r.id = pr.resource_id WHERE pr.product_id = ?
          `).all(product.id) as Array<{ id: string; slug: string; title: string; type: string }>;
          let metadata: Record<string, unknown> = {};
          try {
            metadata = JSON.parse(product.metadata_json) as Record<string, unknown>;
          } catch {
            metadata = {};
          }
          return {
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            status: product.status,
            priceCents: Number(product.price_cents),
            currency: product.currency,
            priceStatus: product.price_status,
            metadata,
            resources,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
          };
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'products.manage' });
    const body = await readJsonBody<{
      slug?: string;
      name?: string;
      description?: string;
      priceCents?: number;
      status?: 'draft' | 'published' | 'archived';
      resourceIds?: unknown;
      metadata?: Record<string, unknown>;
    }>(request);
    const slug = requireJsonString(body.slug, 'slug', 100).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El slug solo admite minúsculas, números y guiones.');
    }
    const name = requireJsonString(body.name, 'name', 180);
    const priceCents = Number(body.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 10_000_000) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El precio debe ser un entero en centavos.');
    }
    const status = body.status || 'draft';
    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El estado del producto no es válido.');
    }
    if (prepare('SELECT id FROM products WHERE slug = ?').get(slug)) {
      throw new ApiError(409, 'PRODUCT_EXISTS', 'Ya existe un producto con ese slug.');
    }
    const resourceIds = normalizeResourceIds(body.resourceIds);
    const selectedResources = prepare(
      `SELECT slug, type FROM resources WHERE id IN (${resourceIds.map(() => '?').join(',')})`
    ).all(...resourceIds) as Array<{ slug: string; type: string }>;
    if (selectedResources.some((resource) => resource.slug === 'grado-8-egb')) {
      throw new ApiError(
        409,
        'DUPLICATE_HOMESCHOOL_PROGRAM',
        'El registro Grado 8.° EGB fue consolidado en el Programa Homeschool 8.° EGB. Usa el programa canónico.'
      );
    }
    if (
      selectedResources.some(
        (resource) => resource.type === 'homeschool_program' || resource.type === 'grade'
      ) &&
      priceCents !== HOMESCHOOL_ANNUAL_PRICE_CENTS
    ) {
      throw new ApiError(
        400,
        'HOMESCHOOL_ANNUAL_PRICE_FIXED',
        `Los programas Homeschool tienen un precio anual fijo de USD ${HOMESCHOOL_ANNUAL_PRICE_CENTS / 100} por todo el año lectivo.`
      );
    }
    const id = `prod_${randomToken(16)}`;
    const now = nowIso();

    withTransaction(() => {
      prepare(`
        INSERT INTO products
          (id, slug, name, description, status, price_cents, currency, price_status,
           metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'USD', 'defined', ?, ?, ?)
      `).run(
        id,
        slug,
        name,
        body.description?.slice(0, 2000) || null,
        status,
        priceCents,
        JSON.stringify(parseMetadata(body.metadata)),
        now,
        now
      );
      for (const resourceId of resourceIds) {
        prepare(
          'INSERT INTO product_resources (product_id, resource_id) VALUES (?, ?)'
        ).run(id, resourceId);
      }
    });

    writeAudit({
      actor: user,
      action: 'product.created',
      entityType: 'product',
      entityId: id,
      after: { slug, name, priceCents, status, resourceIds },
    });
    return jsonOk({ id });
  } catch (error) {
    return handleRouteError(error);
  }
}
