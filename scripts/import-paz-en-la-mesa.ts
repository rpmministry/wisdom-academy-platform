/**
 * Aprovisiona el taller «Paz en la mesa, Orden en el bolsillo y fuego en el corazón».
 *
 * Uso: npm run import:paz-en-la-mesa
 *
 * - Idempotente: actualiza programa, módulos, clases y materiales existentes por
 *   claves `pazKey` / `pazClassNumber` / `pazAssetKey`.
 * - No inventa videos ni PDF: deja espacios y materiales marcados como
 *   `coming_soon` hasta que se carguen los archivos definitivos.
 * - Publica el programa y su producto para que la landing y el catálogo lo
 *   muestren; el contenido queda bloqueado por `release_at` hasta el estreno.
 */

import 'dotenv/config';
import { prepare } from '../src/server/db';
import { nowIso } from '../src/server/db/sqlite';
import {
  addLesson,
  addMaterial,
  addModule,
  createProgram,
  getProgramRowBySlug,
  updateLesson,
  updateModule,
  updateProgram,
} from '../src/server/domain/coursePrograms';
import { ensureProgramProduct } from '../src/server/domain/courseCatalog';
import {
  PAZ_BRAND,
  PAZ_CLASSES,
  PAZ_DATES,
  PAZ_OBJECTIVES,
  PAZ_PRICING,
  PAZ_PROGRAM_METADATA,
  PAZ_PROGRAM_SLUG,
  PAZ_PRODUCT_METADATA,
  PAZ_REQUIREMENTS,
} from '../src/lib/paz-en-la-mesa/content';

const RELEASE_AT = new Date(PAZ_DATES.launch).toISOString();

function parseMetadata(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function ensureProgram(): string {
  let program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  if (!program) {
    const created = createProgram({
      kind: 'workshop',
      title: PAZ_BRAND.title,
      slug: PAZ_PROGRAM_SLUG,
      subtitle: PAZ_BRAND.subtitle,
      description: PAZ_BRAND.description,
      institution: PAZ_BRAND.institution,
      level: 'Taller de fin de año · Formación familiar',
      audience:
        'Matrimonios, familias, padres, líderes de hogar y personas que desean cerrar el año con paz, orden y dirección.',
      durationLabel: '4 clases · 2 h 30 min · Sesión en vivo · Reto de 7 días',
      objectives: PAZ_OBJECTIVES,
      requirements: PAZ_REQUIREMENTS,
      coverImageUrl: PAZ_BRAND.coverImage,
      status: 'draft',
      releaseAt: RELEASE_AT,
      metadata: PAZ_PROGRAM_METADATA,
    });
    program = getProgramRowBySlug(created.slug);
    if (!program) throw new Error('No se pudo crear el programa Paz en la mesa.');
    console.log(`+ Programa creado: ${PAZ_BRAND.title}`);
  }

  updateProgram(
    program.id,
    {
      title: PAZ_BRAND.title,
      subtitle: PAZ_BRAND.subtitle,
      description: PAZ_BRAND.description,
      institution: PAZ_BRAND.institution,
      level: 'Taller de fin de año · Formación familiar',
      audience:
        'Matrimonios, familias, padres, líderes de hogar y personas que desean cerrar el año con paz, orden y dirección.',
      durationLabel: '4 clases · 2 h 30 min · Sesión en vivo · Reto de 7 días',
      objectives: PAZ_OBJECTIVES,
      requirements: PAZ_REQUIREMENTS,
      coverImageUrl: PAZ_BRAND.coverImage,
      releaseAt: RELEASE_AT,
      status: 'published',
      metadata: PAZ_PROGRAM_METADATA,
    },
    null
  );
  console.log(`= Programa actualizado: ${PAZ_BRAND.title}`);
  return program.id;
}

function ensureModules(programId: string): Map<number, string> {
  const existing = prepare('SELECT * FROM course_modules WHERE program_id = ? ORDER BY position').all(
    programId
  ) as Array<{ id: string; metadata_json: string }>;
  const byClass = new Map<number, string>();
  for (const module of existing) {
    const metadata = parseMetadata(module.metadata_json);
    const classNumber = Number(metadata.pazClassNumber);
    if (Number.isInteger(classNumber)) byClass.set(classNumber, module.id);
  }

  for (const item of PAZ_CLASSES) {
    const title = `Clase ${String(item.number).padStart(2, '0')} · ${item.title}`;
    const description = `${item.headline}. ${item.summary}`;
    let moduleId = byClass.get(item.number);
    if (!moduleId) {
      const created = addModule(programId, {
        title,
        kind: 'unit',
        position: item.number,
        description,
      });
      moduleId = created.id;
      console.log(`+ Módulo creado: ${title}`);
    } else {
      updateModule(moduleId, {
        title,
        kind: 'unit',
        position: item.number,
        description,
      });
    }
    prepare('UPDATE course_modules SET metadata_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify({
        source: 'paz-en-la-mesa',
        pazClassNumber: item.number,
        classKey: item.key,
        title: item.title,
        headline: item.headline,
        summary: item.summary,
        leader: item.leader,
        leaderDetail: item.leaderDetail,
        durationMinutes: item.durationMinutes,
        durationLabel: item.durationLabel,
        pages: item.pages,
        tool: item.tool,
        toolPages: item.toolPages,
        scriptures: item.scriptures,
        outcomes: item.outcomes,
        accent: item.accent,
        soft: item.soft,
        contentStatus: 'coming_soon',
        releaseAt: RELEASE_AT,
      }),
      nowIso(),
      moduleId
    );
    byClass.set(item.number, moduleId);
  }
  return byClass;
}

function ensureLessons(programId: string, modules: Map<number, string>): number {
  let createdCount = 0;
  for (const item of PAZ_CLASSES) {
    const moduleId = modules.get(item.number);
    if (!moduleId) throw new Error(`Módulo no encontrado para la clase ${item.number}.`);
    const existing = prepare(
      'SELECT * FROM course_lessons WHERE program_id = ? AND module_id = ? ORDER BY position'
    ).all(programId, moduleId) as Array<{ id: string; metadata_json: string }>;
    const byKey = new Map<string, string>();
    for (const lesson of existing) {
      const metadata = parseMetadata(lesson.metadata_json);
      if (typeof metadata.pazKey === 'string') byKey.set(metadata.pazKey, lesson.id);
    }

    for (const block of item.blocks) {
      const key = `${item.key}-bloque-${block.number}`;
      const title = `Bloque ${block.number} · ${block.title}`;
      const description = `${block.summary} · Clase ${item.number}: ${item.title} · ${block.timeRange}`;
      const base = {
        title,
        description,
        position: block.number,
        videoIds: [] as string[],
        pagesLabel: `${item.pages} · ${block.timeRange}`,
        durationLabel: block.timeRange,
        releaseAt: RELEASE_AT,
      };
      let lessonId = byKey.get(key) || null;
      if (lessonId) {
        updateLesson(lessonId, base);
      } else {
        const created = addLesson(programId, moduleId, base);
        lessonId = created.id;
        byKey.set(key, lessonId);
        createdCount += 1;
      }
      prepare('UPDATE course_lessons SET metadata_json = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify({
          source: 'paz-en-la-mesa',
          pazKey: key,
          pazClassNumber: item.number,
          classKey: item.key,
          classTitle: `${item.number}. ${item.title}`,
          blockNumber: block.number,
          blockTitle: block.title,
          timeRange: block.timeRange,
          start: block.start,
          end: block.end,
          summary: block.summary,
          points: block.points,
          scriptures: block.scriptures,
          leader: item.leader,
          leaderDetail: item.leaderDetail,
          tool: item.tool,
          toolPages: item.toolPages,
          subject: item.title,
          subjectCode: `PAZ-${String(item.number).padStart(2, '0')}`,
          sessionNumber: block.number,
          week: item.number,
          releaseAt: RELEASE_AT,
          videoStatus: 'coming_soon',
        }),
        nowIso(),
        lessonId
      );

    }

    const materialKey = `paz-cuaderno-${item.key}`;
    prepare(
      'DELETE FROM course_materials WHERE program_id = ? AND metadata_json LIKE ?'
    ).run(programId, `%${materialKey}%`);
    const toolLessonId = byKey.get(`${item.key}-bloque-3`) || byKey.get(`${item.key}-bloque-1`);
    if (toolLessonId) {
      addMaterial(
        programId,
        {
          kind: 'external_link',
          title: `Cuaderno · ${item.tool} (${item.pages})`,
          url: process.env.NEXT_PUBLIC_PAZ_NOTEBOOK_URL || '/paz-en-la-mesa#clases',
          lessonId: toolLessonId,
          moduleId,
          visibility: 'student',
          metadata: {
            source: 'paz-en-la-mesa',
            pazAssetKey: materialKey,
            status: 'coming_soon',
            pages: item.pages,
            tool: item.tool,
          },
        },
        null
      );
    }
  }
  console.log(`= Clases y bloques verificados: ${PAZ_CLASSES.length * 4} (nuevos: ${createdCount})`);
  return createdCount;
}

function ensureProgramMaterials(programId: string): void {
  const definitions = [
    {
      key: 'bienvenida',
      title: 'Video de bienvenida y tráiler comercial (3 min)',
      url: process.env.NEXT_PUBLIC_PAZ_WELCOME_VIDEO_URL || '/paz-en-la-mesa',
      description: 'Pieza de apertura grabada en La Mesa Real.',
    },
    {
      key: 'cuaderno',
      title: 'Cuaderno de Trabajo PDF de 24 páginas',
      url: process.env.NEXT_PUBLIC_PAZ_NOTEBOOK_URL || '/paz-en-la-mesa#reto',
      description: 'Cuaderno interactivo e imprimible con las cuatro herramientas y el reto.',
    },
    {
      key: 'sesion-vivo',
      title: 'Sesión exclusiva en vivo · Martes 22 de diciembre, 20:00',
      url: process.env.NEXT_PUBLIC_PAZ_STUDENT_LIVE_URL || '/paz-en-la-mesa#inscripcion',
      description: 'Preguntas, oración y activación del Reto de 7 días.',
    },
    {
      key: 'reto-7',
      title: 'Reto de 7 días de Altar Familiar',
      url: '/cursos/paz-en-la-mesa/reto',
      description: 'Checklist diario con pasaje, enfoque, práctica y oración.',
    },
  ];
  for (const definition of definitions) {
    const rows = prepare(
      'SELECT id FROM course_materials WHERE program_id = ? AND lesson_id IS NULL AND metadata_json LIKE ?'
    ).all(programId, `%${definition.key}%`) as Array<{ id: string }>;
    const metadata = JSON.stringify({
      source: 'paz-en-la-mesa',
      pazAssetKey: definition.key,
      status: 'coming_soon',
      description: definition.description,
    });
    if (rows[0]) {
      prepare(`
        UPDATE course_materials
        SET title = ?, kind = 'external_link', url = ?, visibility = 'student', metadata_json = ?
        WHERE id = ?
      `).run(definition.title, definition.url, metadata, rows[0].id);
    } else {
      addMaterial(
        programId,
        {
          kind: 'external_link',
          title: definition.title,
          url: definition.url,
          visibility: 'student',
          metadata: {
            source: 'paz-en-la-mesa',
            pazAssetKey: definition.key,
            status: 'coming_soon',
            description: definition.description,
          },
        },
        null
      );
    }
  }
  console.log(`= Materiales globales verificados: ${definitions.length}`);
}

function ensureProduct(programId: string): void {
  const productId = ensureProgramProduct(programId);
  if (!productId) throw new Error('No se pudo crear el producto del taller.');
  const metadata = {
    ...PAZ_PRODUCT_METADATA,
    offerLabel: `Preventa USD ${PAZ_PRICING.presaleCents / 100} · Oficial USD ${PAZ_PRICING.officialCents / 100}`,
    offerPeriod: 'por hogar',
    offerDescription:
      'Taller de fin de año: 4 clases, cuaderno PDF de 24 páginas, sesión en vivo y reto de 7 días. Precio por hogar.',
  };
  prepare(`
    UPDATE products
    SET name = ?, description = ?, status = 'published', price_cents = ?, price_status = 'pending',
        metadata_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    PAZ_BRAND.title,
    PAZ_BRAND.description.slice(0, 2000),
    PAZ_PRICING.officialCents,
    JSON.stringify(metadata),
    nowIso(),
    productId
  );
  prepare(`
    INSERT OR IGNORE INTO product_resources (product_id, resource_id)
    SELECT ?, resource_id FROM course_programs WHERE id = ?
  `).run(productId, programId);
  console.log(
    `= Producto publicado: preventa USD ${PAZ_PRICING.presaleCents / 100} · oficial USD ${PAZ_PRICING.officialCents / 100}`
  );
  console.log(
    '  Precio genérico en espera: el cobro del taller se calcula en /paz-en-la-mesa/inscripcion y no usa PayPal.'
  );
}

function main(): void {
  console.log('================================================================');
  console.log(' PAZ EN LA MESA · APROVISIONAMIENTO DEL TALLER');
  console.log('================================================================');
  const programId = ensureProgram();
  const modules = ensureModules(programId);
  ensureLessons(programId, modules);
  ensureProgramMaterials(programId);
  ensureProduct(programId);
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  console.log('\nResumen:');
  console.log(`  Programa: ${program?.id || programId}`);
  console.log(`  Módulos (clases): ${PAZ_CLASSES.length}`);
  console.log(`  Lecciones (bloques): ${PAZ_CLASSES.length * 4}`);
  console.log(`  Liberación: ${RELEASE_AT} (${PAZ_DATES.launch})`);
  console.log('  Estado: published · contenido bloqueado por release_at');
  console.log('================================================================\n');
}

try {
  main();
  process.exit(0);
} catch (error) {
  console.error('ERROR al aprovisionar Paz en la mesa:', error);
  process.exit(1);
}
