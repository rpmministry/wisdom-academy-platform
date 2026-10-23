import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/server/db';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { findResourceById, userCanAccessResource } from '@/server/domain/access';
import { backfillPublishedCourseProducts, syncAllCourseProductStates } from '@/server/domain/courseCatalog';
import { handleRouteError } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COURSE_COVERS: Record<string, string> = {
  'curso-python-ia-jovenes': '/images/courses/python-ia.svg',
  'taller-liderazgo-cristiano': '/images/courses/liderazgo.svg',
  'taller-mayordomia-financiera': '/images/courses/mayordomia.svg',
  'taller-musica-adoracion': '/images/courses/musica.svg',
  'taller-escuela-padres-homeschoolers': '/images/courses/padres.svg',
  'grado-8-egb': '/images/courses/grado-8.svg',
  'programa-homeschool-4-egb': '/images/courses/homeschool-4.svg',
  'programa-homeschool-8-egb': '/images/courses/homeschool-8.svg',
  'guia-bienvenida-homeschool': '/images/courses/guia-bienvenida.svg',
};

function safeMetadata(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      accessDays: parsed.accessDays,
      accessMonths: parsed.accessMonths,
      hours: parsed.hours,
      modality: parsed.modality,
      homeschoolAnnualOffer: parsed.homeschoolAnnualOffer === true,
      billingPeriod: parsed.billingPeriod,
      annualPriceCents: parsed.annualPriceCents,
      offerLabel: parsed.offerLabel,
      offerPeriod: parsed.offerPeriod,
      offerDescription: parsed.offerDescription,
      guideUrl: parsed.guideUrl,
    };
  } catch {
    return {};
  }
}

function safeGuideUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function resourceMetadata(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function categoryFor(resourceTypes: string[]): string {
  if (resourceTypes.some((type) => type === 'homeschool_program' || type === 'grade')) {
    return 'Programas y grados';
  }
  if (resourceTypes.some((type) => type === 'workshop')) return 'Talleres';
  if (resourceTypes.some((type) => type === 'material')) return 'Recursos gratuitos';
  return 'Cursos';
}

export async function GET(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    backfillPublishedCourseProducts();
    syncAllCourseProductStates();
    const products = prepare(`
      SELECT p.* FROM products p
      WHERE p.status = 'published'
        AND EXISTS (
          SELECT 1 FROM product_resources pr
          JOIN resources r ON r.id = pr.resource_id
          WHERE pr.product_id = p.id AND r.status = 'published'
        )
      ORDER BY CASE WHEN p.price_status = 'pending' THEN 1 ELSE 0 END,
               p.price_cents ASC, p.name ASC
    `).all() as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      price_cents: number;
      currency: string;
      price_status: 'defined' | 'pending';
      metadata_json: string;
    }>;

    const result = products.map((product) => {
      const resources = prepare(`
        SELECT r.* FROM product_resources pr
        JOIN resources r ON r.id = pr.resource_id
        WHERE pr.product_id = ? AND r.status = 'published'
        ORDER BY r.title
      `).all(product.id) as Array<{
        id: string;
        slug: string;
        type: string;
        title: string;
        description: string | null;
        status: 'draft' | 'published' | 'archived';
        metadata_json: string;
        created_at: string;
        updated_at: string;
      }>;
      const resourceList = resources.map((resource) => ({
        id: resource.id,
        slug: resource.slug,
        type: resource.type,
        title: resource.title,
        description: resource.description,
      }));
      const accessible =
        Boolean(session) &&
        resources.length > 0 &&
        resources.every((resource) => {
          const full = findResourceById(resource.id);
          return full ? userCanAccessResource(session!.user, full) : false;
        });
      const metadata = safeMetadata(product.metadata_json);
      const program = prepare(`
        SELECT cp.id, cp.cover_image_url, cp.kind, cp.status
        FROM course_programs cp
        JOIN product_resources pr ON pr.resource_id = cp.resource_id
        WHERE pr.product_id = ?
        LIMIT 1
      `).get(product.id) as
        | {
            id: string;
            cover_image_url: string | null;
            kind: string;
            status: 'draft' | 'published' | 'archived';
          }
        | undefined;
      const resourceTypes = resources.map((resource) => resource.type);
      const firstResourceMetadata = resourceMetadata(resources[0]?.metadata_json || '{}');
      const guideUrl =
        safeGuideUrl(metadata.guideUrl) ||
        safeGuideUrl(firstResourceMetadata.guideUrl);
      const annualOffer =
        resourceTypes.some(
          (type) => type === 'homeschool_program' || type === 'grade'
        ) || metadata.homeschoolAnnualOffer === true;

      let contentStatus: 'available' | 'upcoming' = 'available';
      if (program) {
        const content = prepare(`
          SELECT
            (SELECT COUNT(*) FROM course_lessons WHERE program_id = ?) AS lessons,
            (SELECT COUNT(*) FROM course_materials
             WHERE program_id = ? AND visibility = 'student') AS materials
        `).get(program.id, program.id) as { lessons: number; materials: number };
        const hasContent = Number(content.lessons) > 0 || Number(content.materials) > 0;
        contentStatus =
          program.status === 'published' && hasContent ? 'available' : 'upcoming';
      } else if (
        !annualOffer &&
        !guideUrl &&
        resourceTypes.some((type) => type === 'course' || type === 'workshop')
      ) {
        // Un curso/taller sin programa pedagógico vinculado todavía no tiene
        // materiales publicados; es distinto de un error de carga.
        contentStatus = 'upcoming';
      }

      let grade: string | null = null;
      try {
        const parsed = JSON.parse(resources[0]?.metadata_json || '{}') as { grade?: string };
        grade = typeof parsed.grade === 'string' ? parsed.grade : null;
      } catch {
        grade = null;
      }

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCents: Number(product.price_cents),
        currency: product.currency,
        pricePending: product.price_status === 'pending',
        metadata,
        coverImage:
          program?.cover_image_url ||
          COURSE_COVERS[product.slug] ||
          '/images/courses/default.svg',
        category: program
          ? program.kind === 'workshop'
            ? 'Talleres'
            : 'Cursos'
          : categoryFor(resourceTypes),
        resourceCount: resources.length,
        grade,
        resources: resourceList,
        accessible,
        annualOffer,
        guideUrl,
        contentStatus,
      };
    });

    return NextResponse.json(
      { ok: true, productos: result },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
