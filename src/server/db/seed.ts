import type { SqliteDatabase } from './sqlite';
import { nowIso } from './sqlite';
import { hashPasswordSync } from '../auth/passwords';
import { randomToken } from '../security/random';
import {
  HOMESCHOOL_ANNUAL_PRICE_CENTS,
  HOMESCHOOL_GUIDE_PATH,
  HOMESCHOOL_OFFER_DESCRIPTION,
  HOMESCHOOL_OFFER_LABEL,
  HOMESCHOOL_OFFER_PERIOD,
} from '@/lib/catalog/homeschoolOffer';

export const PERMISSIONS: Array<{
  code: string;
  description: string;
  category: string;
}> = [
  { code: 'admin.access', description: 'Acceder al panel administrativo', category: 'administracion' },
  { code: 'crm.access', description: 'Acceder al CRM y módulos comerciales', category: 'administracion' },
  { code: 'users.read', description: 'Consultar usuarios', category: 'usuarios' },
  { code: 'users.manage', description: 'Crear, editar y suspender usuarios', category: 'usuarios' },
  { code: 'users.roles.manage', description: 'Asignar o retirar roles', category: 'usuarios' },
  { code: 'users.permissions.manage', description: 'Conceder permisos administrativos directos', category: 'usuarios' },
  { code: 'minors.read', description: 'Consultar expedientes de estudiantes menores', category: 'menores' },
  { code: 'products.read', description: 'Consultar productos', category: 'catalogo' },
  { code: 'products.manage', description: 'Gestionar productos y precios', category: 'catalogo' },
  { code: 'resources.read', description: 'Consultar recursos educativos', category: 'catalogo' },
  { code: 'resources.manage', description: 'Gestionar recursos educativos', category: 'catalogo' },
  { code: 'meetings.manage', description: 'Gestionar salas de repaso semanal y enlaces de videollamada', category: 'academico' },
  { code: 'orders.read', description: 'Consultar órdenes y transacciones', category: 'pagos' },
  { code: 'orders.manage', description: 'Gestionar órdenes, pagos y conciliación', category: 'pagos' },
  { code: 'orders.refund', description: 'Reembolsar órdenes', category: 'pagos' },
  { code: 'enrollments.read', description: 'Consultar matrículas', category: 'academico' },
  { code: 'enrollments.manage', description: 'Gestionar matrículas', category: 'academico' },
  { code: 'entitlements.read', description: 'Consultar derechos de acceso', category: 'accesos' },
  { code: 'entitlements.manage', description: 'Crear, pausar, ampliar y revocar derechos', category: 'accesos' },
  { code: 'discounts.read', description: 'Consultar descuentos', category: 'promociones' },
  { code: 'discounts.manage', description: 'Gestionar descuentos y campañas', category: 'promociones' },
  { code: 'gifts.read', description: 'Consultar códigos de regalo', category: 'regalos' },
  { code: 'gifts.manage', description: 'Generar y gestionar códigos de regalo', category: 'regalos' },
  { code: 'invitations.read', description: 'Consultar invitaciones de fundador e inversor', category: 'invitaciones' },
  { code: 'invitations.manage', description: 'Gestionar invitaciones de fundador e inversor', category: 'invitaciones' },
  { code: 'founder_codes.manage', description: 'Gestionar códigos globales de fundador e inversor', category: 'invitaciones' },
  { code: 'audit.read', description: 'Consultar auditoría', category: 'seguridad' },
  { code: 'reports.read', description: 'Consultar informes', category: 'reportes' },
  { code: 'grades.manage', description: 'Registrar y modificar calificaciones', category: 'academico' },
  { code: 'settings.manage', description: 'Gestionar configuración de plataforma', category: 'seguridad' },
  { code: 'content.access_all', description: 'Acceso global explícito a contenidos formativos', category: 'contenidos' },
];

export const ROLE_DEFINITIONS: Array<{
  code: string;
  name: string;
  description: string;
  rank: number;
  permissions: string[];
}> = [
  {
    code: 'platform_owner',
    name: 'Creador de la plataforma',
    description: 'Control total formativo y administrativo. No transferible.',
    rank: 0,
    permissions: ['*'],
  },
  {
    code: 'principal_admin',
    name: 'Administrador principal',
    description: 'Administración académica, comercial y de usuarios, sin privilegios de creador.',
    rank: 10,
    permissions: [
      'admin.access',
      'crm.access',
      'users.read',
      'users.manage',
      'users.roles.manage',
      'users.permissions.manage',
      'minors.read',
      'products.read',
      'products.manage',
      'resources.read',
      'resources.manage',
      'meetings.manage',
      'orders.read',
      'orders.manage',
      'orders.refund',
      'enrollments.read',
      'enrollments.manage',
      'entitlements.read',
      'entitlements.manage',
      'discounts.read',
      'discounts.manage',
      'gifts.read',
      'gifts.manage',
      'invitations.read',
      'invitations.manage',
      'audit.read',
      'reports.read',
      'grades.manage',
      'content.access_all',
    ],
  },
  {
    code: 'delegated_admin',
    name: 'Administrador delegado',
    description: 'Solo puede ejecutar los permisos específicos que se le concedan.',
    rank: 20,
    permissions: ['admin.access', 'crm.access'],
  },
  {
    code: 'instructor',
    name: 'Instructor',
    description: 'Acceso a contenidos y gestión académica limitada, sin CRM.',
    rank: 30,
    permissions: ['content.access_all', 'resources.read', 'reports.read', 'grades.manage'],
  },
  {
    code: 'founder',
    name: 'Fundador',
    description: 'Acceso global a contenidos formativos habilitados, sin administración.',
    rank: 40,
    permissions: [],
  },
  {
    code: 'investor',
    name: 'Inversor',
    description: 'Acceso global a contenidos formativos habilitados, sin administración.',
    rank: 41,
    permissions: [],
  },
  {
    code: 'student',
    name: 'Estudiante',
    description: 'Acceso a los recursos escolares autorizados.',
    rank: 50,
    permissions: [],
  },
  {
    code: 'guardian',
    name: 'Representante legal',
    description: 'Acceso únicamente a los estudiantes legalmente vinculados.',
    rank: 51,
    permissions: [],
  },
  {
    code: 'customer',
    name: 'Cliente',
    description: 'Acceso únicamente a los productos adquiridos o asignados.',
    rank: 60,
    permissions: [],
  },
];

interface ResourceSeed {
  slug: string;
  type: 'course' | 'workshop' | 'grade' | 'homeschool_program' | 'material' | 'collection';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

const MATERIAS_4 = [
  [401, 'Matemáticas'],
  [402, 'Lengua y Literatura'],
  [403, 'Ciencias Naturales'],
  [404, 'Estudios Sociales del Ecuador'],
  [405, 'English Phonics & Reading'],
  [406, 'Software y Programación'],
  [407, 'Educación Cultural y Artística (ECA)'],
  [408, 'Educación Física y Salud'],
  [409, 'Relación con Dios'],
] as const;

const MATERIAS_8 = [
  [801, 'Matemáticas y Pre-Álgebra'],
  [802, 'Lengua y Literatura'],
  [803, 'Ciencias Naturales Integradas'],
  [804, 'Estudios Sociales e Historia del Ecuador'],
  [805, 'Academic English & Literature'],
  [806, 'Software y Programación Python'],
  [807, 'Ciencias Políticas y Relaciones Internacionales'],
  [808, 'Administración y Marketing Digital'],
  [809, 'Educación Cultural y Artística (ECA)'],
  [810, 'Educación Física y Salud'],
  [811, 'Relación con Dios (Teología y Cosmovisión)'],
] as const;

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

const SUBJECT_RESOURCES: ResourceSeed[] = [
  ...MATERIAS_4.map(([legacyId, title]) => ({
    slug: `curso-${legacyId}-${slugify(title)}`,
    type: 'course' as const,
    title: `${title} · 4.° EGB`,
    description: `Asignatura de la malla curricular de 4.° EGB (${title}).`,
    metadata: { legacyCourseId: legacyId, grade: '4.° EGB', subject: true },
  })),
  ...MATERIAS_8.map(([legacyId, title]) => ({
    slug: `curso-${legacyId}-${slugify(title)}`,
    type: 'course' as const,
    title: `${title} · 8.° EGB`,
    description: `Asignatura de la malla curricular de 8.° EGB (${title}).`,
    metadata: { legacyCourseId: legacyId, grade: '8.° EGB', subject: true },
  })),
];

const RESOURCE_SEEDS: ResourceSeed[] = [
  {
    slug: 'programa-homeschool-4-egb',
    type: 'homeschool_program',
    title: 'Programa Homeschool 4.° EGB',
    description: 'Programa escolar completo de 4.° EGB con nueve asignaturas y acompañamiento tutorial.',
    metadata: { grade: '4.° EGB', legacyCourseId: 400 },
  },
  {
    slug: 'programa-homeschool-8-egb',
    type: 'homeschool_program',
    title: 'Programa Homeschool 8.° EGB',
    description: 'Programa escolar completo de 8.° EGB con once asignaturas y acompañamiento tutorial.',
    metadata: { grade: '8.° EGB', legacyCourseId: 800 },
  },
  ...SUBJECT_RESOURCES,
  {
    slug: 'taller-python-ia-jovenes',
    type: 'workshop',
    title: 'Programación con IA y Python para Jóvenes',
    description: 'Taller asincrónico de 80 horas con proyectos guiados, docencia asistida por IA y certificación.',
    metadata: { hours: 80, modality: 'ASINCRONO_IA' },
  },
  {
    slug: 'taller-liderazgo-cristiano',
    type: 'workshop',
    title: 'Liderazgo y Cosmovisión Bíblica',
    description: 'Formación de 60 horas para desarrollar liderazgo con fundamentos éticos y bíblicos.',
    metadata: { hours: 60, modality: 'HIBRIDO_TUTORIA' },
  },
  {
    slug: 'taller-mayordomia-financiera',
    type: 'workshop',
    title: 'Mayordomía Financiera Cristiana',
    description: 'Taller de 45 horas sobre presupuesto, deuda, ahorro e inversión responsable.',
    metadata: { hours: 45, modality: 'ASINCRONO_IA' },
  },
  {
    slug: 'taller-musica-adoracion',
    type: 'workshop',
    title: 'Música para la Adoración',
    description: 'Taller de 50 horas de formación musical y teológica.',
    metadata: { hours: 50, modality: 'HIBRIDO_TUTORIA' },
  },
  {
    slug: 'taller-escuela-padres-homeschoolers',
    type: 'workshop',
    title: 'Escuela para Padres Homeschoolers',
    description: 'Acompañamiento de 40 horas para familias que educan en casa.',
    metadata: { hours: 40, modality: 'ASINCRONO_IA' },
  },
  {
    slug: 'material-guia-bienvenida-homeschool',
    type: 'material',
    title: 'Guía de bienvenida Homeschool',
    description:
      'Guía institucional para conocer el Portal Escolar, el aula virtual, los recursos de apoyo y los cursos y talleres.',
    metadata: {
      download: true,
      format: 'html',
      guideUrl: HOMESCHOOL_GUIDE_PATH,
      guideLabel: 'Guía de bienvenida Homeschool',
    },
  },
];

interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  resources: string[];
  metadata?: Record<string, unknown>;
}

const PROGRAM_4_SLUGS = SUBJECT_RESOURCES.filter((r) => r.slug.includes('-4') || /-(401|402|403|404|405|406|407|408|409)-/.test(r.slug));
const PROGRAM_8_SLUGS = SUBJECT_RESOURCES.filter((r) => /-(801|802|803|804|805|806|807|808|809|810|811)-/.test(r.slug));

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    slug: 'curso-python-ia-jovenes',
    name: 'Programación con IA y Python para Jóvenes',
    description: 'Producto de referencia de USD 10. Precio configurable desde el CRM.',
    priceCents: 1000,
    resources: ['taller-python-ia-jovenes'],
  },
  {
    slug: 'taller-liderazgo-cristiano',
    name: 'Liderazgo y Cosmovisión Bíblica',
    description: 'Taller completo de 60 horas con acceso temporal configurable.',
    priceCents: 2500,
    resources: ['taller-liderazgo-cristiano'],
  },
  {
    slug: 'taller-mayordomia-financiera',
    name: 'Mayordomía Financiera Cristiana',
    description: 'Taller de 45 horas sobre finanzas personales y familiares.',
    priceCents: 1500,
    resources: ['taller-mayordomia-financiera'],
  },
  {
    slug: 'taller-musica-adoracion',
    name: 'Música para la Adoración',
    description: 'Formación musical y teológica de 50 horas.',
    priceCents: 3000,
    resources: ['taller-musica-adoracion'],
  },
  {
    slug: 'taller-escuela-padres-homeschoolers',
    name: 'Escuela para Padres Homeschoolers',
    description: 'Programa de acompañamiento familiar de 40 horas.',
    priceCents: 2000,
    resources: ['taller-escuela-padres-homeschoolers'],
  },
  {
    slug: 'programa-homeschool-4-egb',
    name: 'Programa Homeschool 4.° EGB',
    description:
      'Programa completo de 4.° EGB con nueve asignaturas. Precio único anual por todo el año lectivo.',
    priceCents: HOMESCHOOL_ANNUAL_PRICE_CENTS,
    resources: ['programa-homeschool-4-egb', ...PROGRAM_4_SLUGS.map((r) => r.slug)],
    metadata: {
      homeschoolAnnualOffer: true,
      billingPeriod: 'year',
      annualPriceCents: HOMESCHOOL_ANNUAL_PRICE_CENTS,
      offerLabel: HOMESCHOOL_OFFER_LABEL,
      offerPeriod: HOMESCHOOL_OFFER_PERIOD,
      offerDescription: HOMESCHOOL_OFFER_DESCRIPTION,
    },
  },
  {
    slug: 'programa-homeschool-8-egb',
    name: 'Programa Homeschool 8.° EGB',
    description:
      'Programa completo de 8.° EGB con once asignaturas. Precio único anual por todo el año lectivo.',
    priceCents: HOMESCHOOL_ANNUAL_PRICE_CENTS,
    resources: ['programa-homeschool-8-egb', ...PROGRAM_8_SLUGS.map((r) => r.slug)],
    metadata: {
      homeschoolAnnualOffer: true,
      billingPeriod: 'year',
      annualPriceCents: HOMESCHOOL_ANNUAL_PRICE_CENTS,
      offerLabel: HOMESCHOOL_OFFER_LABEL,
      offerPeriod: HOMESCHOOL_OFFER_PERIOD,
      offerDescription: HOMESCHOOL_OFFER_DESCRIPTION,
    },
  },
  {
    slug: 'guia-bienvenida-homeschool',
    name: 'Guía de bienvenida Homeschool',
    description:
      'Guía institucional gratuita para familias y estudiantes que comienzan en Wisdom Academy.',
    priceCents: 0,
    resources: ['material-guia-bienvenida-homeschool'],
    metadata: {
      guideUrl: HOMESCHOOL_GUIDE_PATH,
      free: true,
    },
  },
];

function insertPermissionRows(db: SqliteDatabase): void {
  const insertPermission = db.prepare(
    'INSERT OR IGNORE INTO permissions (code, description, category) VALUES (?, ?, ?)'
  );
  for (const permission of PERMISSIONS) {
    insertPermission.run(permission.code, permission.description, permission.category);
  }
}

function insertRoleRows(db: SqliteDatabase): void {
  const insertRole = db.prepare(
    'INSERT OR IGNORE INTO roles (code, name, description, rank, is_system) VALUES (?, ?, ?, ?, 1)'
  );
  const insertRolePermission = db.prepare(
    'INSERT OR IGNORE INTO role_permissions (role_code, permission_code) VALUES (?, ?)'
  );

  for (const role of ROLE_DEFINITIONS) {
    insertRole.run(role.code, role.name, role.description, role.rank);
    const permissions = role.permissions.includes('*')
      ? PERMISSIONS.map((p) => p.code)
      : role.permissions;
    for (const permission of permissions) {
      insertRolePermission.run(role.code, permission);
    }
  }
}

function parseSeedMetadata(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Aplica la política única del catálogo Homeschool sobre bases existentes:
 * 1. Conserva el registro histórico duplicado de 8.° EGB, pero lo archiva para
 *    que no vuelva a aparecer en el Portal Escolar.
 * 2. Fija el precio anual de todos los programas Homeschool.
 * 3. Deja preparado el material de bienvenida como guía institucional.
 *
 * No elimina productos ni recursos: las órdenes, matrículas y derechos
 * históricos mantienen sus referencias.
 */
function normalizeHomeschoolCatalog(db: SqliteDatabase, timestamp: string): void {
  const offerMetadata = {
    homeschoolAnnualOffer: true,
    billingPeriod: 'year',
    annualPriceCents: HOMESCHOOL_ANNUAL_PRICE_CENTS,
    offerLabel: HOMESCHOOL_OFFER_LABEL,
    offerPeriod: HOMESCHOOL_OFFER_PERIOD,
    offerDescription: HOMESCHOOL_OFFER_DESCRIPTION,
  };

  db.prepare(`
    UPDATE products
    SET status = 'archived', updated_at = ?
    WHERE slug = 'grado-8-egb' AND status <> 'archived'
  `).run(timestamp);

  const homeschoolProducts = db.prepare(`
    SELECT DISTINCT p.id, p.metadata_json
    FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    JOIN resources r ON r.id = pr.resource_id
    WHERE r.type IN ('homeschool_program', 'grade')
  `).all() as Array<{ id: string; metadata_json: string }>;

  const updateHomeschoolProduct = db.prepare(`
    UPDATE products
    SET price_cents = ?, metadata_json = ?, updated_at = ?
    WHERE id = ?
  `);
  for (const product of homeschoolProducts) {
    const metadata = {
      ...parseSeedMetadata(product.metadata_json),
      ...offerMetadata,
    };
    updateHomeschoolProduct.run(
      HOMESCHOOL_ANNUAL_PRICE_CENTS,
      JSON.stringify(metadata),
      timestamp,
      product.id
    );
  }

  const guideResource = db.prepare(
    "SELECT id, metadata_json FROM resources WHERE slug = 'material-guia-bienvenida-homeschool'"
  ).get() as { id: string; metadata_json: string } | undefined;
  if (guideResource) {
    const metadata = {
      ...parseSeedMetadata(guideResource.metadata_json),
      download: true,
      format: 'html',
      guideUrl: HOMESCHOOL_GUIDE_PATH,
      guideLabel: 'Guía de bienvenida Homeschool',
    };
    db.prepare(`
      UPDATE resources
      SET title = ?, description = ?, metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      'Guía de bienvenida Homeschool',
      'Guía institucional para conocer el Portal Escolar, el aula virtual, los recursos de apoyo y los cursos y talleres.',
      JSON.stringify(metadata),
      timestamp,
      guideResource.id
    );
  }

  const guideProduct = db.prepare(
    "SELECT id, metadata_json FROM products WHERE slug = 'guia-bienvenida-homeschool'"
  ).get() as { id: string; metadata_json: string } | undefined;
  if (guideProduct) {
    const metadata = {
      ...parseSeedMetadata(guideProduct.metadata_json),
      guideUrl: HOMESCHOOL_GUIDE_PATH,
      free: true,
    };
    db.prepare(`
      UPDATE products
      SET name = ?, description = ?, metadata_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      'Guía de bienvenida Homeschool',
      'Guía institucional gratuita para familias y estudiantes que comienzan en Wisdom Academy.',
      JSON.stringify(metadata),
      timestamp,
      guideProduct.id
    );
  }
}

function insertCatalogRows(db: SqliteDatabase): void {
  const timestamp = nowIso();
  const insertResource = db.prepare(`
    INSERT OR IGNORE INTO resources
      (id, slug, type, title, description, status, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `);
  const resourceIds = new Map<string, string>();

  for (const resource of RESOURCE_SEEDS) {
    const id = `res_${resource.slug}`;
    resourceIds.set(resource.slug, id);
    insertResource.run(
      id,
      resource.slug,
      resource.type,
      resource.title,
      resource.description,
      JSON.stringify({ ...(resource.metadata ?? {}), seeded: true }),
      timestamp,
      timestamp
    );
  }

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products
      (id, slug, name, description, status, price_cents, currency, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'published', ?, 'USD', ?, ?, ?)
  `);
  const insertProductResource = db.prepare(
    'INSERT OR IGNORE INTO product_resources (product_id, resource_id) VALUES (?, ?)'
  );

  for (const product of PRODUCT_SEEDS) {
    const productId = `prod_${product.slug}`;
    insertProduct.run(
      productId,
      product.slug,
      product.name,
      product.description,
      product.priceCents,
      JSON.stringify({
        ...(product.metadata ?? {}),
        seeded: true,
        referencePrice: product.slug === 'curso-python-ia-jovenes',
      }),
      timestamp,
      timestamp
    );
    for (const resourceSlug of product.resources) {
      const resourceId = resourceIds.get(resourceSlug) ?? `res_${resourceSlug}`;
      insertProductResource.run(productId, resourceId);
    }
  }

  normalizeHomeschoolCatalog(db, timestamp);
}

function ensureSetting(db: SqliteDatabase, key: string, value: string): void {
  db.prepare(
    'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
  ).run(key, value, nowIso());
}

function ensureE2EAdmin(db: SqliteDatabase): void {
  const adminEmail = 'e2e.admin@wisdomacademy.test';
  const existingAdmin = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(adminEmail);
  if (existingAdmin) return;

  const timestamp = nowIso();
  const adminId = 'usr_e2e_admin';
  const adminPassword = process.env.WISDOM_E2E_ADMIN_PASSWORD || 'E2eAdminWisdom!2026-test';
  db.prepare(`
    INSERT INTO users
      (id, email, email_verified, display_name, username, password_hash, password_updated_at,
       must_change_password, status, is_minor, created_at, updated_at)
    VALUES (?, ?, 1, 'Administrador E2E', 'e2e_admin', ?, ?, 0, 'active', 0, ?, ?)
  `).run(
    adminId,
    adminEmail,
    hashPasswordSync(adminPassword),
    timestamp,
    timestamp,
    timestamp
  );
  db.prepare(`
    INSERT OR IGNORE INTO user_roles
      (id, user_id, role_code, granted_by, granted_at)
    VALUES ('ur_e2e_admin', ?, 'delegated_admin', 'seed_e2e', ?)
  `).run(adminId, timestamp);
  db.prepare(`
    INSERT OR IGNORE INTO crm_contacts (id, email, name, status, created_at, updated_at)
    VALUES ('ctc_e2e_admin', ?, 'Administrador E2E', 'customer', ?, ?)
  `).run(adminEmail, timestamp, timestamp);
  // Permiso específico para validar la bandeja de registros sin conceder
  // pagos, catálogo ni capacidades de gestión de usuarios.
  db.prepare(`
    INSERT OR IGNORE INTO user_permissions
      (id, user_id, permission_code, granted_by, granted_at)
    VALUES ('up_e2e_admin_users_read', ?, 'users.read', 'seed_e2e', ?)
  `).run(adminId, timestamp);
}

/**
 * Fixture exclusivo de pruebas E2E: administrador delegado con permisos
 * financieros explícitos. Permite validar la vista de pagos sin conceder
 * control total de la plataforma.
 */
function ensureE2EFinance(db: SqliteDatabase): void {
  const email = 'e2e.finanzas@wisdomacademy.test';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return;
  const timestamp = nowIso();
  const userId = 'usr_e2e_finance';
  const password = process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test';
  db.prepare(`
    INSERT INTO users
      (id, email, email_verified, display_name, username, password_hash, password_updated_at,
       must_change_password, status, is_minor, created_at, updated_at)
    VALUES (?, ?, 1, 'Analista Financiero E2E', 'e2e_finanzas', ?, ?, 0, 'active', 0, ?, ?)
  `).run(userId, email, hashPasswordSync(password), timestamp, timestamp, timestamp);
  db.prepare(`
    INSERT OR IGNORE INTO user_roles
      (id, user_id, role_code, granted_by, granted_at)
    VALUES ('ur_e2e_finance', ?, 'delegated_admin', 'seed_e2e', ?)
  `).run(userId, timestamp);
  const grant = db.prepare(`
    INSERT OR IGNORE INTO user_permissions
      (id, user_id, permission_code, granted_by, granted_at)
    VALUES (?, ?, ?, 'seed_e2e', ?)
  `);
  grant.run('up_e2e_finance_orders_read', userId, 'orders.read', timestamp);
  grant.run('up_e2e_finance_products_read', userId, 'products.read', timestamp);
}

/**
 * Orden gratuita de invitado con registro pendiente para probar la pantalla
 * posterior al pago sin ejecutar PayPal en E2E. El token se firma con el
 * CODE_HASH_PEPPER fijado por playwright.config.ts.
 */
function ensureE2EGuestRegistration(db: SqliteDatabase): void {
  const orderId = 'ord_e2e_guest_registration';
  const existing = db.prepare('SELECT id FROM orders WHERE id = ?').get(orderId);
  if (existing) return;
  const product = db
    .prepare("SELECT id FROM products WHERE slug = 'curso-python-ia-jovenes'")
    .get() as { id: string } | undefined;
  if (!product) return;
  const timestamp = nowIso();
  const email = 'e2e.invitado@wisdomacademy.test';
  const expiresAt = '2099-01-01T00:00:00.000Z';
  db.prepare(`
    INSERT INTO orders
      (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency,
       metadata_json, created_at, updated_at, paid_at, buyer_email, buyer_name,
       checkout_mode, registration_status)
    VALUES (?, 'usr_guest_checkout', 'free', 0, 0, 0, 'USD', '{"source":"e2e_fixture"}',
            ?, ?, ?, ?, 'Invitado E2E', 'guest', 'pending')
  `).run(orderId, timestamp, timestamp, timestamp, email);
  db.prepare(`
    INSERT INTO order_items
      (id, order_id, product_id, title_snapshot, unit_price_cents, quantity)
    VALUES ('oit_e2e_guest_registration', ?, ?, 'Programación con IA y Python para Jóvenes', 0, 1)
  `).run(orderId, product.id);
  db.prepare(`
    INSERT OR IGNORE INTO transactions
      (id, order_id, provider, kind, provider_txn_id, amount_cents, currency, status,
       metadata_json, created_at)
    VALUES ('txn_e2e_guest_registration', ?, 'free', 'free', ?, 0, 'USD', 'completed', '{}', ?)
  `).run(orderId, `free:${orderId}`, timestamp);
  db.prepare(`
    INSERT INTO checkout_registrations
      (id, order_id, buyer_email, buyer_name, buyer_type, product_kind, requires_guardian,
       status, expires_at, terms_version, privacy_version, data_json, created_at, updated_at)
    VALUES ('reg_e2e_guest', ?, ?, 'Invitado E2E', 'student', 'course', 0, 'pending', ?,
            '2026-10-24', '2026-10-24', '{}', ?, ?)
  `).run(orderId, email, expiresAt, timestamp, timestamp);
}

function seedE2EStudent(db: SqliteDatabase): void {
  if (process.env.WISDOM_E2E !== '1') return;
  ensureE2EAdmin(db);
  ensureE2EFinance(db);
  ensureE2EGuestRegistration(db);

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get('e2e.estudiante@wisdomacademy.test');
  if (existing) return;

  const timestamp = nowIso();
  const userId = 'usr_e2e_estudiante';
  const password = process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test';
  const programSlugs = [
    'programa-homeschool-8-egb',
    ...PROGRAM_8_SLUGS.map((r) => r.slug),
  ];

  db.prepare(`
    INSERT INTO users
      (id, email, email_verified, display_name, username, password_hash, password_updated_at,
       must_change_password, status, is_minor, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?, ?, ?, 0, 'active', 1, ?, ?)
  `).run(
    userId,
    'e2e.estudiante@wisdomacademy.test',
    'Estudiante E2E',
    'e2e_estudiante',
    hashPasswordSync(password),
    timestamp,
    timestamp,
    timestamp
  );

  db.prepare(`
    INSERT OR IGNORE INTO user_roles
      (id, user_id, role_code, granted_by, granted_at)
    VALUES (?, ?, 'student', 'seed_e2e', ?)
  `).run('ur_e2e_student', userId, timestamp);

  db.prepare(`
    INSERT OR IGNORE INTO student_profiles
      (id, user_id, full_name, age, grade, subnivel, folder_code, profile_agent, language,
       portfolio_owner, mentor_email, moodle_user_id, created_at, updated_at)
    VALUES (?, ?, ?, 12, ?, ?, ?, ?, 'ES', ?, ?, 108, ?, ?)
  `).run(
    'sp_e2e_estudiante',
    userId,
    'Estudiante E2E',
    '8.° de EGB',
    'Básica Superior',
    '08_Octavo_EGB_Avril',
    'middle_school_avril_12yo',
    'ESTUDIANTE_AUTONOMO',
    'familias@wisdomacademy.test',
    timestamp,
    timestamp
  );

  const insertEntitlement = db.prepare(`
    INSERT OR IGNORE INTO entitlements
      (id, user_id, resource_id, origin, origin_ref, status, starts_at, ends_at, granted_by,
       metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, 'manual_owner', 'seed_e2e', 'active', ?, NULL, 'seed_e2e', ?, ?, ?)
  `);
  for (const slug of programSlugs) {
    insertEntitlement.run(
      `ent_e2e_${slug}`,
      userId,
      `res_${slug}`,
      timestamp,
      JSON.stringify({ fixture: true }),
      timestamp,
      timestamp
    );
  }

}

/**
 * Siembra catálogo, roles y permisos de forma idempotente. No crea la cuenta
 * del creador: esa cuenta solo se aprovisiona con el procedimiento seguro.
 */
export function seedFoundation(db: SqliteDatabase): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    insertPermissionRows(db);
    insertRoleRows(db);
    insertCatalogRows(db);
    ensureSetting(db, 'code_hash_pepper', randomToken(32));
    ensureSetting(
      db,
      'owner_email',
      (process.env.PLATFORM_OWNER_EMAIL || 'mauriandrade2@gmail.com').toLowerCase()
    );
    seedE2EStudent(db);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
