import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { prepare, withTransaction } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { writeAudit } from '@/server/audit';
import { HOMESCHOOL_ANNUAL_PRICE_CENTS } from '@/lib/catalog/homeschoolOffer';

const HOMESCHOOL_RESOURCE_TYPES = new Set(['homeschool_program', 'grade']);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'products.manage' });
    const product = prepare('SELECT * FROM products WHERE id = ?').get((await context.params).id) as
      | {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          status: string;
          price_cents: number;
          metadata_json: string;
        }
      | undefined;
    if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'El producto no existe.');

    const body = await readJsonBody<{
      name?: string;
      description?: string | null;
      priceCents?: number;
      status?: 'draft' | 'published' | 'archived';
      resourceIds?: unknown;
      metadata?: Record<string, unknown>;
    }>(request);

    const name = body.name !== undefined ? body.name.trim() : product.name;
    if (name.length < 2 || name.length > 180) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El nombre del producto no es válido.');
    }
    const priceCents = body.priceCents !== undefined ? Number(body.priceCents) : Number(product.price_cents);
    if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 10_000_000) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El precio debe ser un entero en centavos.');
    }
    // Un precio enviado por administración es una decisión comercial explícita,
    // incluso si es 0 (producto gratuito). Los productos creados automáticamente
    // por un curso nacen en 'pending' y solo se habilitan al fijar su precio.
    const priceStatus = body.priceCents !== undefined ? 'defined' : undefined;
    const status = body.status || product.status;
    if (!['draft', 'published', 'archived'].includes(status)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El estado del producto no es válido.');
    }

    let metadata = product.metadata_json;
    if (body.metadata && typeof body.metadata === 'object') {
      const allowedKeys = [
        'accessDays',
        'accessMonths',
        'accessEndsAt',
        'unlimited',
        'hours',
        'modality',
        'notes',
      ];
      let existing: Record<string, unknown> = {};
      try {
        existing = JSON.parse(product.metadata_json) as Record<string, unknown>;
      } catch {
        existing = {};
      }
      const clean: Record<string, unknown> = { ...existing };
      for (const key of allowedKeys) {
        if (body.metadata[key] !== undefined) clean[key] = body.metadata[key];
      }
      metadata = JSON.stringify(clean);
    }

    let resourceIds: string[] | null = null;
    if (body.resourceIds !== undefined) {
      if (!Array.isArray(body.resourceIds)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Los recursos deben ser una lista.');
      }
      resourceIds = body.resourceIds.filter(
        (id): id is string => typeof id === 'string' && id.length > 0
      );
      if (resourceIds.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El producto debe incluir al menos un recurso.');
      }
      const placeholders = resourceIds.map(() => '?').join(',');
      const found = prepare(
        `SELECT COUNT(*) AS total FROM resources WHERE id IN (${placeholders})`
      ).get(...resourceIds) as { total: number };
      if (Number(found.total) !== new Set(resourceIds).size) {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Uno de los recursos no existe.');
      }
      resourceIds = [...new Set(resourceIds)];
    }

    const effectiveResourceIds =
      resourceIds ??
      (prepare('SELECT resource_id FROM product_resources WHERE product_id = ?').all(
        product.id
      ) as Array<{ resource_id: string }>).map((row) => row.resource_id);
    const linkedTypes =
      effectiveResourceIds.length > 0
        ? (prepare(`
            SELECT type FROM resources
            WHERE id IN (${effectiveResourceIds.map(() => '?').join(',')})
          `).all(...effectiveResourceIds) as Array<{ type: string }>)
        : [];
    const isHomeschoolProduct = linkedTypes.some((resource) =>
      HOMESCHOOL_RESOURCE_TYPES.has(resource.type)
    );
    if (isHomeschoolProduct && priceCents !== HOMESCHOOL_ANNUAL_PRICE_CENTS) {
      throw new ApiError(
        400,
        'HOMESCHOOL_ANNUAL_PRICE_FIXED',
        `Los programas Homeschool tienen un precio anual fijo de USD ${HOMESCHOOL_ANNUAL_PRICE_CENTS / 100} por todo el año lectivo.`
      );
    }
    if (product.slug === 'grado-8-egb' && status === 'published') {
      throw new ApiError(
        409,
        'DUPLICATE_HOMESCHOOL_PROGRAM',
        'Este registro fue consolidado en el Programa Homeschool 8.° EGB y no debe volver a publicarse como programa independiente.'
      );
    }

    withTransaction(() => {
      prepare(`
        UPDATE products
        SET name = ?, description = ?, price_cents = ?, price_status = COALESCE(?, price_status),
            status = ?, metadata_json = ?, updated_at = ?
        WHERE id = ?
      `).run(
        name,
        body.description === undefined ? product.description : body.description?.slice(0, 2000) || null,
        priceCents,
        priceStatus ?? null,
        status,
        metadata,
        nowIso(),
        product.id
      );
      if (resourceIds) {
        prepare('DELETE FROM product_resources WHERE product_id = ?').run(product.id);
        for (const resourceId of resourceIds) {
          prepare(
            'INSERT INTO product_resources (product_id, resource_id) VALUES (?, ?)'
          ).run(product.id, resourceId);
        }
      }
    });

    writeAudit({
      actor: user,
      action: 'product.updated',
      entityType: 'product',
      entityId: product.id,
      before: product,
      after: { name, priceCents, status, resourceIds },
    });
    return jsonOk({ mensaje: 'Producto actualizado.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
