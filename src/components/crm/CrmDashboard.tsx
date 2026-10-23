'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { Tabs } from '@/components/ui/Tabs';
import type { TabItem } from '@/components/ui/Tabs';
import { AdminOverview } from '@/components/admin/AdminOverview';

type Tab =
  | 'resumen'
  | 'academia'
  | 'programas'
  | 'usuarios'
  | 'productos'
  | 'descuentos'
  | 'regalos'
  | 'invitaciones'
  | 'ordenes'
  | 'auditoria';

interface CrmDashboardProps {
  embedded?: boolean;
  onOpenAdminTab?: (id: string) => void;
  availableAdminTabs?: string[];
}

interface Summary {
  usuariosActivos: number;
  estudiantesActivos: number;
  derechosActivos: number;
  derechosPorVencer7Dias: number;
  ordenesPagadas: number;
  ordenesPendientes: number;
  ordenesFallidas: number;
  ingresosCentavos: number;
  reembolsosCentavos: number;
  descuentosActivos: number;
  codigosRegaloActivos: number;
  invitacionesActivas: number;
  erroresWebhook: number;
  derechosPausadosPorRegalo: number;
  planesAcademicos?: number;
  clasesGeneradas?: number;
  estudiantesConPlan?: number;
  calendarioInicio?: string | null;
  calendarioFin?: string | null;
}

interface AdminUser {
  id: string;
  nombreCompleto: string;
  correo: string;
  roles?: string[];
  permisos?: string[];
  estadosRoles?: Array<{ roleCode: string; grantedAt: string }>;
  permisosDirectos?: Array<{ permissionCode: string; expiresAt: string | null }>;
  accessosGlobales?: Array<{
    id: string;
    kind: string;
    effectiveStatus: string;
    endsAt: string | null;
  }>;
  matriculas: Array<{ nombre: string; origen?: string }>;
  perfilEstudiante?: { gradoEcuador?: string } | null;
  debeCambiarContrasena?: boolean;
}

interface ResourceOption {
  id: string;
  slug: string;
  title: string;
  type: string;
  status?: string;
}

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  status: string;
  priceCents: number;
  priceStatus: 'defined' | 'pending';
  resources: ResourceOption[];
}

interface AdminDiscount {
  id: string;
  name: string;
  kind: string;
  value: number;
  status: string;
  appliesAll: boolean;
  startsAt: string;
  endsAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  resources: Array<{ id: string; title: string }>;
  codes: Array<{ id: string; hint: string; status: string; redemptions: number }>;
  redemptions: number;
}

interface AdminGift {
  id: string;
  hint: string;
  label: string | null;
  displayStatus: string;
  maxRedemptions: number;
  redemptionCount: number;
  redeemBy: string | null;
  accessStartsAt: string | null;
  durationDays: number | null;
  durationMonths: number | null;
  endsAt: string | null;
  unlimited: boolean;
  recipientEmail: string | null;
  resources: ResourceOption[];
  createdAt: string;
}

interface GiftBeneficiary {
  redemptionId: string;
  userId: string;
  email: string;
  name: string;
  redeemedAt: string;
  accessStartsAt: string;
  accessEndsAt: string | null;
  status: string;
  effectiveStatus: string;
}

interface AdminInvitation {
  id: string;
  kind: string;
  mode: string;
  email: string | null;
  hint: string;
  status: string;
  maxUses: number;
  useCount: number;
  expiresAt: string | null;
  accessEndsAt: string | null;
  unlimited: boolean;
  beneficiaries: Array<{ userId: string; email: string; name: string }>;
}

interface AdminOrder {
  id: string;
  userEmail: string;
  userName: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  items: Array<{ title: string; priceCents: number }>;
  transactions: Array<{ kind: string; amountCents: number; status: string; createdAt: string }>;
}

interface EntitlementRow {
  id: string;
  userId: string;
  userEmail: string;
  resourceTitle: string;
  resourceSlug: string;
  origin: string;
  effectiveStatus: string;
  startsAt: string;
  endsAt: string | null;
}

interface AuditEvent {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

interface AdminCourseProgram {
  id: string;
  slug: string;
  title: string;
  kind: 'course' | 'workshop';
  status: string;
}

const ROLE_OPTIONS = [
  ['principal_admin', 'Administrador principal'],
  ['delegated_admin', 'Administrador delegado'],
  ['instructor', 'Instructor'],
  ['founder', 'Fundador'],
  ['investor', 'Inversor'],
  ['student', 'Estudiante'],
  ['guardian', 'Representante legal'],
  ['customer', 'Cliente'],
];

const PERMISSION_OPTIONS = [
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
  'founder_codes.manage',
  'audit.read',
  'reports.read',
  'grades.manage',
  'settings.manage',
  'content.access_all',
];

const TYPE_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  grade: 'Grado',
  homeschool_program: 'Programa Homeschool',
  material: 'Material didáctico',
  collection: 'Colección',
};

function money(cents: number): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function fecha(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value)
  );
}

const inputStyle: React.CSSProperties = {
  minHeight: 40,
  padding: '0.5rem 0.625rem',
  borderRadius: 'var(--wa-radius-md)',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--wa-font-sans)',
  fontSize: '0.8125rem',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={labelStyle}>
      {label}
      {children}
    </label>
  );
}

function ResourcePicker({
  resources,
  selected,
  onChange,
}: {
  resources: ResourceOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <div
      style={{
        maxHeight: 190,
        overflowY: 'auto',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--wa-radius-md)',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      {resources.map((resource) => (
        <label
          key={resource.id}
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.75rem', padding: '0.25rem' }}
        >
          <input
            type="checkbox"
            checked={selected.includes(resource.id)}
            onChange={(event) => {
              onChange(
                event.target.checked
                  ? [...selected, resource.id]
                  : selected.filter((id) => id !== resource.id)
              );
            }}
          />
          <span>
            {resource.title}
            <span style={{ color: 'var(--text-muted)' }}> · {TYPE_LABEL[resource.type] || resource.type}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

const TAB_ICONS: Record<Tab, Parameters<typeof WisdomIcon>[0]['name']> = {
  resumen: 'chart',
  academia: 'graduation-cap',
  programas: 'book',
  usuarios: 'shield',
  productos: 'book',
  descuentos: 'award',
  regalos: 'sparkles',
  invitaciones: 'cross',
  ordenes: 'receipt',
  auditoria: 'activity',
};

const TAB_TITLES: Record<Tab, string> = {
  resumen: 'Dirección',
  academia: 'Academia',
  programas: 'Programas y cursos',
  usuarios: 'Usuarios y derechos',
  productos: 'Catálogo y productos',
  descuentos: 'Promociones y códigos',
  regalos: 'Códigos de regalo',
  invitaciones: 'Fundadores e inversores',
  ordenes: 'Pagos y reembolsos',
  auditoria: 'Auditoría de seguridad',
};

const CRM_TABS: Array<{ id: Tab; label: string }> = [
  { id: 'resumen', label: 'Dirección' },
  { id: 'academia', label: 'Academia' },
  { id: 'programas', label: 'Programas' },
  { id: 'usuarios', label: 'Usuarios y accesos' },
  { id: 'productos', label: 'Catálogo' },
  { id: 'descuentos', label: 'Descuentos' },
  { id: 'regalos', label: 'Regalos' },
  { id: 'invitaciones', label: 'Fundadores / inversores' },
  { id: 'ordenes', label: 'Pagos' },
  { id: 'auditoria', label: 'Auditoría' },
];

const ACADEMIC_MODULES: Array<{
  id: string;
  label: string;
  description: string;
  icon: Parameters<typeof WisdomIcon>[0]['name'];
}> = [
  { id: 'cursos', label: 'Cursos y talleres', description: 'Programas, módulos, clases, materiales y evaluaciones.', icon: 'book' },
  { id: 'matriculas', label: 'Matrícula', description: 'Estudiantes, cohortes y sincronización con Moodle.', icon: 'graduation-cap' },
  { id: 'certificados', label: 'Certificados', description: 'Emisión, QR y verificación de constancias.', icon: 'shield' },
  { id: 'catalogo', label: 'Grados escolares', description: 'Catálogo curricular K-12 y talleres libres.', icon: 'layout' },
  { id: 'estudiantes', label: 'Estudiantes y claves', description: 'Expedientes, credenciales y estados de cuenta.', icon: 'user' },
  { id: 'guias-diarias', label: 'Guías diarias', description: 'Auditoría, compilación y PDF de jornadas.', icon: 'file-text' },
  { id: 'gradebook', label: 'Calificaciones', description: 'Libro maestro y seguimiento académico.', icon: 'award' },
  { id: 'boletines', label: 'Boletines', description: 'Informes MINEDUC y portafolio homeschool.', icon: 'file-text' },
  { id: 'profesores', label: 'Profesores IA', description: 'Calibración OpenMAIC y bancos de trabajo.', icon: 'sparkles' },
  { id: 'meetings', label: 'Videollamadas', description: 'Repasos en vivo, horarios y enlaces.', icon: 'video' },
  { id: 'recursos', label: 'Recursos audiovisuales', description: 'Revisión y publicación de videos validados.', icon: 'video' },
];

const PROGRAM_TYPE_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  homeschool_program: 'Homeschool',
  grade: 'Grado',
  material: 'Material',
  collection: 'Colección',
};

const PROGRAM_STATUS_LABEL: Record<string, string> = {
  published: 'Publicado',
  draft: 'Borrador',
  archived: 'Archivado',
};

export function CrmDashboard({
  embedded = false,
  onOpenAdminTab,
  availableAdminTabs = [],
}: CrmDashboardProps) {
  const { usuario, sesionLista, tienePermiso, temaOscuro, alternarTema } = useAuth();
  const [tab, setTab] = useState<Tab>('resumen');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>([]);
  const [gifts, setGifts] = useState<AdminGift[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [coursePrograms, setCoursePrograms] = useState<AdminCourseProgram[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userEntitlements, setUserEntitlements] = useState<EntitlementRow[]>([]);
  const [selectedGiftId, setSelectedGiftId] = useState<string>('');
  const [giftBeneficiaries, setGiftBeneficiaries] = useState<GiftBeneficiary[]>([]);
  const [search, setSearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');
  const [programType, setProgramType] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [codesResult, setCodesResult] = useState<string[]>([]);
  const [tokenResult, setTokenResult] = useState<string | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    age: '12',
    grade: '',
    student: true,
  });
  const [roleToGrant, setRoleToGrant] = useState('delegated_admin');
  const [permissionToGrant, setPermissionToGrant] = useState('admin.access');
  const [passwordReset, setPasswordReset] = useState('');
  const [grantResourceId, setGrantResourceId] = useState('');
  const [grantDays, setGrantDays] = useState('365');

  const [productForm, setProductForm] = useState({
    slug: '',
    name: '',
    description: '',
    price: '10.00',
    status: 'draft',
    resources: [] as string[],
  });

  const [discountForm, setDiscountForm] = useState({
    name: '',
    kind: 'percentage',
    value: '20',
    appliesAll: false,
    startsAt: '',
    endsAt: '',
    maxUses: '',
    maxUsesPerUser: '',
    codeCount: '1',
    resources: [] as string[],
  });

  const [giftForm, setGiftForm] = useState({
    label: '',
    count: '1',
    maxRedemptions: '1',
    redeemBy: '',
    durationDays: '365',
    durationMonths: '',
    unlimited: false,
    recipientEmail: '',
    resources: [] as string[],
  });

  const [invitationForm, setInvitationForm] = useState({
    kind: 'founder',
    mode: 'nominated',
    email: '',
    label: '',
    maxUses: '1',
    accessDays: '',
    accessMonths: '12',
    unlimited: false,
  });

  const [giftExpand, setGiftExpand] = useState({
    resources: [] as string[],
    applyToExisting: false,
    confirm: false,
  });

  const safe = useCallback(async <T,>(path: string, fallback: T): Promise<T> => {
    try {
      return await apiFetch<T>(path);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 403 || err.status === 401)) return fallback;
      throw err;
    }
  }, []);

  const cargarTodo = useCallback(async () => {
    setError(null);
    try {
      const [
        summaryResponse,
        usersResponse,
        resourcesResponse,
        productsResponse,
        discountsResponse,
        giftsResponse,
        invitationsResponse,
        ordersResponse,
        auditResponse,
        coursesResponse,
      ] = await Promise.all([
        safe<{ resumen: Summary }>('/api/admin/summary', { resumen: null as unknown as Summary }),
        safe<{ usuarios: AdminUser[] }>('/api/admin/users', { usuarios: [] }),
        safe<{ recursos: ResourceOption[] }>('/api/admin/resources', { recursos: [] }),
        safe<{ productos: AdminProduct[] }>('/api/admin/products', { productos: [] }),
        safe<{ descuentos: AdminDiscount[] }>('/api/admin/discounts', { descuentos: [] }),
        safe<{ regalos: AdminGift[] }>('/api/admin/gifts', { regalos: [] }),
        safe<{ invitaciones: AdminInvitation[] }>('/api/admin/invitations', { invitaciones: [] }),
        safe<{ ordenes: AdminOrder[] }>('/api/admin/orders', { ordenes: [] }),
        safe<{ eventos: AuditEvent[] }>('/api/admin/audit', { eventos: [] }),
        safe<{ programas: AdminCourseProgram[] }>('/api/admin/courses', { programas: [] }),
      ]);
      setSummary(summaryResponse.resumen);
      setUsers(usersResponse.usuarios);
      setResources(resourcesResponse.recursos);
      setProducts(productsResponse.productos);
      setDiscounts(discountsResponse.descuentos);
      setGifts(giftsResponse.regalos);
      setInvitations(invitationsResponse.invitaciones);
      setOrders(ordersResponse.ordenes);
      setAudit(auditResponse.eventos);
      setCoursePrograms(coursesResponse.programas);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [safe]);

  useEffect(() => {
    if (!sesionLista || !usuario) return;
    void cargarTodo();
  }, [sesionLista, usuario, cargarTodo]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('crm');
    if (requested && CRM_TABS.some((item) => item.id === requested)) {
      setTab(requested as Tab);
    }
  }, []);

  const selectTab = (id: string) => {
    const next = id as Tab;
    setTab(next);
    setNotice(null);
    setError(null);
    const params = new URLSearchParams(window.location.search);
    params.set('crm', next);
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${params.toString()}`
    );
  };

  const crmTabItems: TabItem[] = CRM_TABS.map((item) => ({
    ...item,
    icono: <WisdomIcon name={TAB_ICONS[item.id]} size={14} color="current" />,
  }));

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUserId) {
      setUserEntitlements([]);
      return;
    }
    apiFetch<{ derechos: EntitlementRow[] }>(
      `/api/admin/entitlements?userId=${encodeURIComponent(selectedUserId)}`
    )
      .then((response) => setUserEntitlements(response.derechos))
      .catch(() => setUserEntitlements([]));
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedGiftId) {
      setGiftBeneficiaries([]);
      return;
    }
    apiFetch<{ beneficiarios: GiftBeneficiary[] }>(
      `/api/admin/gifts/${encodeURIComponent(selectedGiftId)}`
    )
      .then((response) => setGiftBeneficiaries(response.beneficiarios))
      .catch(() => setGiftBeneficiaries([]));
  }, [selectedGiftId]);

  const ejecutar = async (action: () => Promise<unknown>, mensaje: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(mensaje);
      await cargarTodo();
      if (selectedUserId) {
        const derechos = await apiFetch<{ derechos: EntitlementRow[] }>(
          `/api/admin/entitlements?userId=${encodeURIComponent(selectedUserId)}`
        );
        setUserEntitlements(derechos.derechos);
      }
      if (selectedGiftId) {
        const response = await apiFetch<{ beneficiarios: GiftBeneficiary[] }>(
          `/api/admin/gifts/${encodeURIComponent(selectedGiftId)}`
        );
        setGiftBeneficiaries(response.beneficiarios);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      user.nombreCompleto.toLowerCase().includes(term) ||
      user.correo.toLowerCase().includes(term) ||
      user.id.toLowerCase().includes(term)
    );
  });

  if (!sesionLista) {
    return <p role="status">Verificando sesión…</p>;
  }
  if (!usuario) {
    return <p>Debes iniciar sesión.</p>;
  }

  const tabs = CRM_TABS;

  const academicPrograms = useMemo(() => {
    const resourcePrograms = resources
      .filter((resource) =>
        ['course', 'workshop', 'homeschool_program', 'grade'].includes(resource.type)
      )
      .map((resource) => ({
        id: resource.id,
        slug: resource.slug,
        title: resource.title,
        type: resource.type,
        status: resource.status,
      }));
    const seen = new Set(resourcePrograms.map((program) => program.slug));
    const programEntries = coursePrograms
      .filter((program) => !seen.has(program.slug))
      .map((program) => ({
        id: `program-${program.id}`,
        slug: program.slug,
        title: program.title,
        type: program.kind,
        status: program.status,
      }));
    return [...programEntries, ...resourcePrograms];
  }, [resources, coursePrograms]);

  const availableAcademicModules = useMemo(
    () =>
      ACADEMIC_MODULES.filter(
        (module) =>
          !availableAdminTabs.length || availableAdminTabs.includes(module.id)
      ),
    [availableAdminTabs]
  );

  const courseProgramSlugs = useMemo(
    () => new Set(coursePrograms.map((program) => program.slug)),
    [coursePrograms]
  );

  const filteredAcademicPrograms = useMemo(() => {
    const term = programSearch.trim().toLowerCase();
    return academicPrograms.filter((resource) => {
      if (programType !== 'all' && resource.type !== programType) return false;
      if (!term) return true;
      return (
        resource.title.toLowerCase().includes(term) ||
        resource.slug.toLowerCase().includes(term)
      );
    });
  }, [academicPrograms, programSearch, programType]);

  return (
    <div className={`wa-crm-shell${embedded ? ' is-embedded' : ''}`}>
      {!embedded && (
      <aside className="wa-crm-sidebar">
        <Link href="/admin?tab=crm" className="wa-crm-logo">
          <Image
            src="/brand/svg/wisdom-icon-color.svg"
            alt="Wisdom Academy"
            width={32}
            height={32}
          />
          <div>
            <strong>Wisdom CRM</strong>
            <span>Control de plataforma</span>
          </div>
        </Link>
        <nav className="wa-crm-nav" aria-label="Secciones del CRM">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              data-active={tab === item.id}
              onClick={() => selectTab(item.id)}
            >
              <span className="wa-crm-nav-icon">
                <WisdomIcon name={TAB_ICONS[item.id]} size={15} color="current" />
              </span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="wa-crm-sidebar-footer">
          <Link href="/admin">? Panel académico</Link>
          <Link href="/catalogo#programas">Ver catálogo público ?</Link>
          <span style={{ color: 'var(--text-muted)', padding: '0.35rem 0.55rem' }}>
            Sesión: {usuario?.nombreCompleto || 'administrador'}
          </span>
        </div>
      </aside>
      )}
      <div className={`wa-crm-main${embedded ? ' is-embedded' : ''}`}>
        {!embedded && (
        <header className="wa-crm-topbar">
          <div>
            <h1>{TAB_TITLES[tab]}</h1>
            <p>Identidad, comercio, derechos de acceso y operación académica · datos en tiempo real</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.4rem 0.6rem', border: '1px solid var(--border-subtle)', borderRadius: 999, background: 'var(--bg-surface)' }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: '#10b981' }} />
              Sistema operativo
            </span>
            <button
              type="button"
              className="wa-theme-toggle"
              onClick={alternarTema}
              aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              <WisdomIcon name={temaOscuro ? 'sun' : 'moon'} size={16} color="current" />
            </button>
            <Link href="/admin"><Button variant="secondary" size="sm">Panel académico</Button></Link>
          </div>
        </header>
        )}
        {embedded && (
          <div className="wa-crm-embedded-tabs wa-crm-tabs-bar">
            <div className="wa-crm-tabs-meta">
              <span className="wa-eyebrow">Espacio de trabajo</span>
              <span aria-live="polite">{TAB_TITLES[tab]}</span>
            </div>
            <Tabs
              tabs={crmTabItems}
              activaId={tab}
              onCambiarTab={selectTab}
              ariaLabel="Secciones del CRM"
              idPrefix="crm"
              className="wa-crm-tabs"
            />
          </div>
        )}
        <div
          className={embedded ? 'wa-crm-embedded-content' : 'wa-crm-content'}
          role={embedded ? 'tabpanel' : undefined}
          id={embedded ? `crm-panel-${tab}` : undefined}
          aria-labelledby={embedded ? `crm-tab-${tab}` : undefined}
          aria-busy={loading || undefined}
        >

      {error && (
        <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}
      {notice && (
        <div role="status" style={{ padding: '0.75rem 1rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--accent-study)', color: 'var(--accent-study)', fontSize: '0.8125rem' }}>
          {notice}
        </div>
      )}
      {codesResult.length > 0 && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--brand-gold-dark)', background: 'var(--bg-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '0.8125rem' }}>Códigos generados (visibles una sola vez)</strong>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(codesResult.join('\n'));
                setNotice('Códigos copiados al portapapeles.');
              }}
            >
              Copiar todos
            </Button>
          </div>
          <pre style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>{codesResult.join('\n')}</pre>
          <Button variant="secondary" size="sm" style={{ marginTop: '0.5rem' }} onClick={() => setCodesResult([])}>
            Ocultar
          </Button>
        </div>
      )}
      {tokenResult && (
        <div style={{ padding: '0.875rem 1rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--brand-gold-dark)', background: 'var(--bg-subtle)' }}>
          <strong style={{ fontSize: '0.8125rem' }}>Código de invitación (visible una sola vez)</strong>
          <pre style={{ margin: '0.5rem 0', whiteSpace: 'pre-wrap', fontSize: '0.8125rem' }}>{tokenResult}</pre>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={() => { void navigator.clipboard?.writeText(tokenResult); setNotice('Invitación copiada.'); }}>Copiar</Button>
            <Button variant="secondary" size="sm" onClick={() => setTokenResult(null)}>Ocultar</Button>
          </div>
        </div>
      )}

      {tab === 'resumen' && (
        <AdminOverview
          userName={usuario?.nombreCompleto}
          availableTabs={availableAdminTabs}
          onOpenTab={(id) => onOpenAdminTab?.(id)}
          onOpenCrm={(area) => selectTab(area as Tab)}
          primaryCrmLabel="Gestionar accesos"
          primaryCrmArea="usuarios"
          loading={loading}
          initialSummary={summary}
          initialOrders={orders}
          initialUsers={users}
          initialAudit={audit}
        />
      )}

      {tab === 'academia' && (
        <div className="wa-crm-academic">
          <div className="wa-crm-academic-head">
            <div>
              <span className="wa-eyebrow">Dirección académica</span>
              <h2>Todo el colegio, desde el CRM</h2>
              <p>
                Matrícula, certificados, grados escolares, cursos y talleres comparten este espacio
                de trabajo. Cada módulo se abre en una pestaña interna, sin ventanas nuevas.
              </p>
            </div>
            <div className="wa-crm-academic-actions">
              {onOpenAdminTab && availableAdminTabs.includes('cursos') && (
                <Button variant="secondary" size="sm" onClick={() => onOpenAdminTab('cursos')}>
                  Gestionar cursos
                </Button>
              )}
              <Button variant="primary-gold" size="sm" onClick={() => selectTab('programas')}>
                Ver programas y cursos
              </Button>
            </div>
          </div>

          <div className="wa-crm-academic-grid">
            {availableAcademicModules.map((module) => (
              <button
                key={module.id}
                type="button"
                className="wa-crm-academic-card"
                onClick={() => onOpenAdminTab?.(module.id)}
                disabled={!onOpenAdminTab}
              >
                <span className="wa-crm-academic-icon">
                  <WisdomIcon name={module.icon} size={18} />
                </span>
                <strong>{module.label}</strong>
                <small>{module.description}</small>
                <span className="wa-crm-academic-open">Abrir módulo <WisdomIcon name="arrow-right" size={12} /></span>
              </button>
            ))}
            {availableAcademicModules.length === 0 && (
              <div className="wa-empty-state">
                <h2>Sin módulos académicos disponibles</h2>
                <p>Tu rol no incluye permisos para las áreas académicas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'programas' && (
        <div className="wa-crm-panel">
          <div className="wa-crm-academic-head">
            <div>
              <span className="wa-eyebrow">Acceso directo</span>
              <h2>Programas, cursos y talleres</h2>
              <p>
                Abre cualquier programa dentro de la plataforma, sin pestañas nuevas del navegador.
                Las rutas respetan tus permisos de acceso.
              </p>
            </div>
            <div className="wa-crm-academic-actions">
              {onOpenAdminTab && availableAdminTabs.includes('cursos') && (
                <Button variant="secondary" size="sm" onClick={() => onOpenAdminTab('cursos')}>
                  Gestionar cursos y talleres
                </Button>
              )}
              {onOpenAdminTab && availableAdminTabs.includes('catalogo') && (
                <Button variant="secondary" size="sm" onClick={() => onOpenAdminTab('catalogo')}>
                  Grados escolares
                </Button>
              )}
            </div>
          </div>

          <div className="wa-crm-program-filters">
            <label className="wa-crm-search">
              <WisdomIcon name="search" size={14} />
              <input
                type="search"
                value={programSearch}
                onChange={(event) => setProgramSearch(event.target.value)}
                placeholder="Buscar programa o curso"
                aria-label="Buscar programa o curso"
              />
            </label>
            <select
              value={programType}
              onChange={(event) => setProgramType(event.target.value)}
              aria-label="Filtrar por tipo de programa"
            >
              <option value="all">Todos los tipos</option>
              <option value="course">Cursos</option>
              <option value="workshop">Talleres</option>
              <option value="homeschool_program">Homeschool</option>
              <option value="grade">Grados</option>
            </select>
            <span>{filteredAcademicPrograms.length} programa(s)</span>
          </div>

          {loading ? (
            <div className="wa-ov-loading" role="status">
              <span className="wa-ov-spinner" />
              Cargando programas y cursos…
            </div>
          ) : filteredAcademicPrograms.length > 0 ? (
            <div className="wa-crm-table-wrap">
              <table className="wa-crm-table wa-crm-programs-table">
                <thead>
                  <tr>
                    <th>Programa</th>
                    <th className="wa-crm-col-type">Tipo</th>
                    <th className="wa-crm-col-status">Estado</th>
                    <th>Acceso directo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAcademicPrograms.map((resource) => {
                    const hasProgram = courseProgramSlugs.has(resource.slug);
                    return (
                      <tr key={resource.id}>
                        <td>
                          <strong>{resource.title}</strong>
                          <small>{resource.slug}</small>
                        </td>
                        <td className="wa-crm-col-type">{PROGRAM_TYPE_LABEL[resource.type] || resource.type}</td>
                        <td className="wa-crm-col-status">{PROGRAM_STATUS_LABEL[resource.status || 'published'] || resource.status}</td>
                        <td>
                          <div className="wa-crm-program-links">
                            <Link
                              href={hasProgram ? `/cursos/${resource.slug}` : `/recurso/${resource.slug}`}
                              className="wa-crm-program-link"
                            >
                              {hasProgram ? 'Abrir curso' : 'Abrir ficha'}
                              <WisdomIcon name="arrow-right" size={12} />
                            </Link>
                            {!hasProgram && (
                              <Link
                                href={`/aula?recurso=${encodeURIComponent(resource.slug)}`}
                                className="wa-crm-program-link is-secondary"
                              >
                                Aula
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wa-empty-state">
              <h2>Sin programas visibles</h2>
              <p>
                No hay programas que coincidan con el filtro o tu rol no incluye lectura del
                catálogo académico.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'usuarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Crear cuenta</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <Field label="Correo"><input style={inputStyle} value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></Field>
              <Field label="Nombre completo"><input style={inputStyle} value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /></Field>
              <Field label="Contraseña inicial (opcional)"><input type="password" style={inputStyle} value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} autoComplete="new-password" /></Field>
              {newUser.student && (
                <>
                  <Field label="Grado"><input style={inputStyle} value={newUser.grade} onChange={(event) => setNewUser({ ...newUser, grade: event.target.value })} placeholder="8.° EGB" /></Field>
                  <Field label="Edad"><input style={inputStyle} value={newUser.age} onChange={(event) => setNewUser({ ...newUser, age: event.target.value })} /></Field>
                </>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', margin: '0.75rem 0' }}>
              <input type="checkbox" checked={newUser.student} onChange={(event) => setNewUser({ ...newUser, student: event.target.checked })} />
              Crear expediente escolar (menor) y rol de estudiante
            </label>
            <Button
              variant="primary-gold"
              size="sm"
              disabled={busy}
              onClick={() =>
                void ejecutar(async () => {
                  const response = await apiFetch<{ usuario: AdminUser; passwordInicial: string | null }>(
                    '/api/admin/users',
                    {
                      body: {
                        email: newUser.email,
                        nombreCompleto: newUser.name,
                        password: newUser.password || undefined,
                        studentProfile: newUser.student
                          ? {
                              age: Number(newUser.age) || undefined,
                              grade: newUser.grade || undefined,
                              subnivel: Number(newUser.age) <= 10 ? 'Básica Elemental' : 'Básica Superior',
                            }
                          : undefined,
                      },
                    }
                  );
                  setNewUser({ email: '', name: '', password: '', age: '12', grade: '', student: true });
                  setSelectedUserId(response.usuario.id);
                  if (response.passwordInicial) {
                    window.alert(`Contraseña inicial (se muestra una sola vez):\n${response.passwordInicial}`);
                  }
                }, 'Cuenta creada.')
              }
            >
              Crear cuenta
            </Button>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 0.85fr) minmax(320px, 1.15fr)', gap: '1rem', alignItems: 'start' }}>
          <Card variant="surface" padding="md">
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo o ID"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 520, overflowY: 'auto' }}>
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.625rem',
                    borderRadius: 'var(--wa-radius-md)',
                    border: `1px solid ${selectedUserId === user.id ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    background: selectedUserId === user.id ? 'var(--brand-primary-soft)' : 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong style={{ fontSize: '0.8125rem' }}>{user.nombreCompleto}</strong>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{user.roles?.join(', ') || '—'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.correo}</span>
                </button>
              ))}
              {filteredUsers.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No hay usuarios visibles.</p>}
            </div>
          </Card>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {!selectedUser ? (
              <Card variant="surface" padding="lg"><p style={{ margin: 0, color: 'var(--text-secondary)' }}>Selecciona un usuario para gestionar roles, permisos y derechos.</p></Card>
            ) : (
              <>
                <Card variant="surface" padding="md">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.125rem' }}>{selectedUser.nombreCompleto}</h2>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedUser.correo} · {selectedUser.id}</p>
                    </div>
                    <Badge variant="navy">{selectedUser.roles?.join(' · ') || 'sin rol'}</Badge>
                  </div>
                  {selectedUser.perfilEstudiante && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0' }}>
                      Grado: {selectedUser.perfilEstudiante.gradoEcuador || '—'} · {selectedUser.matriculas.length} matrículas
                    </p>
                  )}
                  {selectedUser.accessosGlobales?.map((grant) => (
                    <div key={grant.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      <span>Acceso global {grant.kind} · {grant.effectiveStatus} · {fecha(grant.endsAt)}</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void ejecutar(
                            () =>
                              apiFetch(`/api/admin/global-access/${encodeURIComponent(grant.id)}`, {
                                method: 'PATCH',
                                body: { action: 'revoke', reason: 'Revocado desde CRM' },
                              }),
                            'Acceso global revocado.'
                          )
                        }
                      >
                        Revocar
                      </Button>
                    </div>
                  ))}
                </Card>

                <Card variant="surface" padding="md">
                  <h3 style={{ marginTop: 0, fontSize: '0.9375rem' }}>Roles</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <select value={roleToGrant} onChange={(event) => setRoleToGrant(event.target.value)} style={inputStyle}>
                      {ROLE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                    <Button
                      variant="primary-navy"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void ejecutar(
                          () => apiFetch(`/api/admin/users/${selectedUser.id}/roles`, { body: { roleCode: roleToGrant, action: 'grant' } }),
                          'Rol asignado.'
                        )
                      }
                    >
                      Asignar rol
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {selectedUser.estadosRoles?.map((role) => (
                      <button
                        key={role.roleCode}
                        title="Retirar rol"
                        onClick={() =>
                          void ejecutar(
                            () => apiFetch(`/api/admin/users/${selectedUser.id}/roles`, { body: { roleCode: role.roleCode, action: 'revoke' } }),
                            'Rol retirado.'
                          )
                        }
                        style={{ ...inputStyle, cursor: 'pointer', padding: '0.25rem 0.5rem', minHeight: 30 }}
                      >
                        {role.roleCode} ×
                      </button>
                    ))}
                  </div>
                </Card>

                <Card variant="surface" padding="md">
                  <h3 style={{ marginTop: 0, fontSize: '0.9375rem' }}>Permisos administrativos directos</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                    <select value={permissionToGrant} onChange={(event) => setPermissionToGrant(event.target.value)} style={inputStyle}>
                      {PERMISSION_OPTIONS.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <Button
                      variant="primary-navy"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void ejecutar(
                          () => apiFetch(`/api/admin/users/${selectedUser.id}/permissions`, { body: { permissionCode: permissionToGrant, action: 'grant' } }),
                          'Permiso concedido (solo si está dentro de tus atribuciones).'
                        )
                      }
                    >
                      Conceder
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    {selectedUser.permisosDirectos?.map((permission) => (
                      <button
                        key={permission.permissionCode}
                        title="Retirar permiso"
                        onClick={() =>
                          void ejecutar(
                            () => apiFetch(`/api/admin/users/${selectedUser.id}/permissions`, { body: { permissionCode: permission.permissionCode, action: 'revoke' } }),
                            'Permiso retirado.'
                          )
                        }
                        style={{ ...inputStyle, cursor: 'pointer', padding: '0.25rem 0.5rem', minHeight: 30 }}
                      >
                        {permission.permissionCode} ×
                      </button>
                    ))}
                    {(!selectedUser.permisosDirectos || selectedUser.permisosDirectos.length === 0) && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin permisos directos.</span>
                    )}
                  </div>
                </Card>

                <Card variant="surface" padding="md">
                  <h3 style={{ marginTop: 0, fontSize: '0.9375rem' }}>Derechos por recurso</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <select value={grantResourceId} onChange={(event) => setGrantResourceId(event.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 180 }}>
                      <option value="">Selecciona un recurso</option>
                      {resources.map((resource) => <option key={resource.id} value={resource.id}>{resource.title}</option>)}
                    </select>
                    <input value={grantDays} onChange={(event) => setGrantDays(event.target.value)} placeholder="Días" style={{ ...inputStyle, width: 90 }} />
                    <Button
                      variant="primary-gold"
                      size="sm"
                      disabled={busy || !grantResourceId}
                      onClick={() =>
                        void ejecutar(
                          () =>
                            apiFetch('/api/admin/entitlements', {
                              body: {
                                userId: selectedUser.id,
                                resourceId: grantResourceId,
                                origin: 'manual_owner',
                                durationDays: Number(grantDays) || null,
                                unlimited: !Number(grantDays),
                                reason: 'Concesión desde CRM',
                              },
                            }),
                          'Derecho concedido.'
                        )
                      }
                    >
                      Conceder acceso
                    </Button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.375rem' }}>Recurso</th>
                          <th style={{ padding: '0.375rem' }}>Origen</th>
                          <th style={{ padding: '0.375rem' }}>Estado</th>
                          <th style={{ padding: '0.375rem' }}>Fin</th>
                          <th style={{ padding: '0.375rem' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userEntitlements.map((entitlement) => (
                          <tr key={entitlement.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.375rem' }}>{entitlement.resourceTitle}</td>
                            <td style={{ padding: '0.375rem' }}>{entitlement.origin}</td>
                            <td style={{ padding: '0.375rem' }}>{entitlement.effectiveStatus}</td>
                            <td style={{ padding: '0.375rem' }}>{fecha(entitlement.endsAt)}</td>
                            <td style={{ padding: '0.375rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {['pause', 'resume', 'revoke'].map((action) => (
                                <button
                                  key={action}
                                  disabled={busy}
                                  onClick={() =>
                                    void ejecutar(
                                      () => apiFetch(`/api/admin/entitlements/${entitlement.id}`, { method: 'PATCH', body: { action, reason: 'Acción desde CRM' } }),
                                      `Derecho: ${action}.`
                                    )
                                  }
                                  style={{ ...inputStyle, minHeight: 26, padding: '0.125rem 0.375rem', cursor: 'pointer' }}
                                >
                                  {action === 'pause' ? 'Pausar' : action === 'resume' ? 'Reactivar' : 'Revocar'}
                                </button>
                              ))}
                              <button
                                disabled={busy}
                                onClick={() => {
                                  const base = entitlement.endsAt ? new Date(entitlement.endsAt) : new Date();
                                  base.setUTCDate(base.getUTCDate() + 30);
                                  void ejecutar(
                                    () => apiFetch(`/api/admin/entitlements/${entitlement.id}`, { method: 'PATCH', body: { action: 'extend', endsAt: base.toISOString() } }),
                                    'Vigencia ampliada 30 días.'
                                  );
                                }}
                                style={{ ...inputStyle, minHeight: 26, padding: '0.125rem 0.375rem', cursor: 'pointer' }}
                              >
                                +30 días
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card variant="surface" padding="md">
                  <h3 style={{ marginTop: 0, fontSize: '0.9375rem' }}>Restablecer contraseña</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="password"
                      value={passwordReset}
                      onChange={(event) => setPasswordReset(event.target.value)}
                      placeholder="Nueva contraseña (opcional)"
                      autoComplete="new-password"
                      style={{ ...inputStyle, flex: 1, minWidth: 180 }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void ejecutar(async () => {
                          const response = await apiFetch<{ passwordInicial: string | null }>(
                            `/api/admin/users/${selectedUser.id}/password`,
                            { method: 'POST', body: { password: passwordReset || undefined } }
                          );
                          if (response.passwordInicial) {
                            setPasswordReset('');
                            window.alert(`Contraseña inicial (se muestra una sola vez):\n${response.passwordInicial}`);
                          }
                          setPasswordReset('');
                        }, 'Contraseña restablecida.')
                      }
                    >
                      Restablecer
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {tab === 'productos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1.2fr)', gap: '1rem', alignItems: 'start' }}>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Nuevo producto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <Field label="Slug (minúsculas y guiones)"><input style={inputStyle} value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} /></Field>
              <Field label="Nombre"><input style={inputStyle} value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></Field>
              <Field label="Descripción"><textarea style={{ ...inputStyle, minHeight: 70 }} value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></Field>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Field label="Precio USD"><input style={inputStyle} value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></Field>
                <Field label="Estado">
                  <select style={inputStyle} value={productForm.status} onChange={(event) => setProductForm({ ...productForm, status: event.target.value })}>
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </Field>
              </div>
              <Field label="Recursos incluidos (obligatorio)"><ResourcePicker resources={resources} selected={productForm.resources} onChange={(ids) => setProductForm({ ...productForm, resources: ids })} /></Field>
              <Button
                variant="primary-gold"
                size="sm"
                disabled={busy}
                onClick={() => {
                  const priceCents = Math.round(Number(productForm.price) * 100);
                  void ejecutar(
                    () => apiFetch('/api/admin/products', { body: { slug: productForm.slug, name: productForm.name, description: productForm.description, priceCents, status: productForm.status, resourceIds: productForm.resources } }),
                    'Producto creado.'
                  ).then(() => setProductForm({ slug: '', name: '', description: '', price: '10.00', status: 'draft', resources: [] }));
                }}
              >
                Crear producto
              </Button>
            </div>
          </Card>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Productos ({products.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 620, overflowY: 'auto' }}>
              {products.map((product) => (
                <div key={product.id} style={{ padding: '0.625rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--wa-radius-md)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{product.name}</strong>
                    <span>
                      {product.priceStatus === 'pending'
                        ? 'Precio por definir'
                        : money(product.priceCents)}{' '}
                      · {product.status}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {product.slug} · {product.resources.length} recursos
                    {product.priceStatus === 'pending'
                      ? ' · No comprable hasta asignar precio'
                      : ''}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }} className="wa-no-print">
                    <input
                      defaultValue={(product.priceCents / 100).toFixed(2)}
                      style={{ ...inputStyle, width: 100, minHeight: 30 }}
                      onBlur={(event) => {
                        const priceCents = Math.round(Number(event.target.value) * 100);
                        if (priceCents === product.priceCents && product.priceStatus !== 'pending') return;
                        void ejecutar(
                          () => apiFetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { priceCents } }),
                          'Precio actualizado.'
                        );
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void ejecutar(
                          () => apiFetch(`/api/admin/products/${product.id}`, { method: 'PATCH', body: { status: product.status === 'published' ? 'draft' : 'published' } }),
                          'Estado del producto actualizado.'
                        )
                      }
                    >
                      {product.status === 'published' ? 'Despublicar' : 'Publicar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'descuentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Nueva promoción</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.625rem' }}>
              <Field label="Nombre"><input style={inputStyle} value={discountForm.name} onChange={(event) => setDiscountForm({ ...discountForm, name: event.target.value })} /></Field>
              <Field label="Tipo">
                <select style={inputStyle} value={discountForm.kind} onChange={(event) => setDiscountForm({ ...discountForm, kind: event.target.value })}>
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo (USD)</option>
                  <option value="full">Descuento total</option>
                </select>
              </Field>
              <Field label="Valor">
                <input style={inputStyle} value={discountForm.value} onChange={(event) => setDiscountForm({ ...discountForm, value: event.target.value })} disabled={discountForm.kind === 'full'} />
              </Field>
              <Field label="Inicio"><input type="datetime-local" style={inputStyle} value={discountForm.startsAt} onChange={(event) => setDiscountForm({ ...discountForm, startsAt: event.target.value })} /></Field>
              <Field label="Fin"><input type="datetime-local" style={inputStyle} value={discountForm.endsAt} onChange={(event) => setDiscountForm({ ...discountForm, endsAt: event.target.value })} /></Field>
              <Field label="Máximo de usos"><input style={inputStyle} value={discountForm.maxUses} onChange={(event) => setDiscountForm({ ...discountForm, maxUses: event.target.value })} placeholder="Sin límite" /></Field>
              <Field label="Máximo por usuario"><input style={inputStyle} value={discountForm.maxUsesPerUser} onChange={(event) => setDiscountForm({ ...discountForm, maxUsesPerUser: event.target.value })} placeholder="Sin límite" /></Field>
              <Field label="Cantidad de códigos"><input style={inputStyle} value={discountForm.codeCount} onChange={(event) => setDiscountForm({ ...discountForm, codeCount: event.target.value })} /></Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', margin: '0.75rem 0' }}>
              <input type="checkbox" checked={discountForm.appliesAll} onChange={(event) => setDiscountForm({ ...discountForm, appliesAll: event.target.checked })} />
              Autorizar explícitamente toda la plataforma (no recomendado)
            </label>
            {!discountForm.appliesAll && (
              <Field label="Recursos elegibles (el código no afecta a otros productos)">
                <ResourcePicker resources={resources} selected={discountForm.resources} onChange={(ids) => setDiscountForm({ ...discountForm, resources: ids })} />
              </Field>
            )}
            <Button
              variant="primary-gold"
              size="sm"
              style={{ marginTop: '0.75rem' }}
              disabled={busy}
              onClick={() =>
                void ejecutar(async () => {
                  const response = await apiFetch<{ codigos: string[] }>('/api/admin/discounts', {
                    body: {
                      name: discountForm.name,
                      kind: discountForm.kind,
                      value: discountForm.kind === 'fixed' ? Math.round(Number(discountForm.value) * 100) : Number(discountForm.value) || 0,
                      resourceIds: discountForm.resources,
                      appliesAll: discountForm.appliesAll,
                      startsAt: discountForm.startsAt ? new Date(discountForm.startsAt).toISOString() : undefined,
                      endsAt: discountForm.endsAt ? new Date(discountForm.endsAt).toISOString() : undefined,
                      maxUses: discountForm.maxUses ? Number(discountForm.maxUses) : null,
                      maxUsesPerUser: discountForm.maxUsesPerUser ? Number(discountForm.maxUsesPerUser) : null,
                      codeCount: Number(discountForm.codeCount) || 1,
                    },
                  });
                  setCodesResult(response.codigos);
                }, 'Promoción creada.')
              }
            >
              Crear promoción y códigos
            </Button>
          </Card>

          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Promociones ({discounts.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {discounts.map((discount) => (
                <div key={discount.id} style={{ padding: '0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--wa-radius-md)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{discount.name}</strong>
                    <span>{discount.kind === 'percentage' ? `${discount.value}%` : discount.kind === 'fixed' ? money(discount.value) : 'Total'} · {discount.status}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                    {discount.appliesAll ? 'Toda la plataforma' : discount.resources.map((resource) => resource.title).join(' · ') || 'Sin recursos'} · {discount.codes.length} códigos · {discount.redemptions} canjes
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void ejecutar(() => apiFetch(`/api/admin/discounts/${discount.id}`, { method: 'PATCH', body: { action: discount.status === 'active' ? 'pause' : 'activate' } }), 'Promoción actualizada.')}>
                      {discount.status === 'active' ? 'Pausar' : 'Activar'}
                    </Button>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void ejecutar(async () => {
                      const response = await apiFetch<{ codigos: string[] }>(`/api/admin/discounts/${discount.id}/codes`, { body: { count: 5 } });
                      setCodesResult(response.codigos);
                    }, 'Códigos generados.')}>
                      +5 códigos
                    </Button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                    {discount.codes.map((code) => (
                      <span key={code.id} style={{ padding: '0.125rem 0.375rem', border: '1px solid var(--border-subtle)', borderRadius: 6 }}>
                        {code.hint} · {code.status} · {code.redemptions}
                        {code.status !== 'revoked' && (
                          <button
                            title="Revocar código"
                            disabled={busy}
                            onClick={() => void ejecutar(() => apiFetch(`/api/admin/discount-codes/${code.id}`, { method: 'PATCH', body: { action: 'revoke' } }), 'Código revocado.')}
                            style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--status-danger)' }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'regalos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Nuevo código de regalo</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.625rem' }}>
              <Field label="Etiqueta"><input style={inputStyle} value={giftForm.label} onChange={(event) => setGiftForm({ ...giftForm, label: event.target.value })} /></Field>
              <Field label="Lote (1–100)"><input style={inputStyle} value={giftForm.count} onChange={(event) => setGiftForm({ ...giftForm, count: event.target.value })} /></Field>
              <Field label="Máximo de canjes"><input style={inputStyle} value={giftForm.maxRedemptions} onChange={(event) => setGiftForm({ ...giftForm, maxRedemptions: event.target.value })} /></Field>
              <Field label="Canjear antes de"><input type="datetime-local" style={inputStyle} value={giftForm.redeemBy} onChange={(event) => setGiftForm({ ...giftForm, redeemBy: event.target.value })} /></Field>
              <Field label="Duración en días"><input style={inputStyle} value={giftForm.durationDays} onChange={(event) => setGiftForm({ ...giftForm, durationDays: event.target.value })} disabled={giftForm.unlimited} /></Field>
              <Field label="Duración en meses"><input style={inputStyle} value={giftForm.durationMonths} onChange={(event) => setGiftForm({ ...giftForm, durationMonths: event.target.value })} disabled={giftForm.unlimited} /></Field>
              <Field label="Correo destinatario (opcional)"><input style={inputStyle} value={giftForm.recipientEmail} onChange={(event) => setGiftForm({ ...giftForm, recipientEmail: event.target.value })} /></Field>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', margin: '0.75rem 0' }}>
              <input type="checkbox" checked={giftForm.unlimited} onChange={(event) => setGiftForm({ ...giftForm, unlimited: event.target.checked })} />
              Acceso sin expiración (requiere decisión explícita)
            </label>
            <Field label="Recursos concretos del regalo (obligatorio)">
              <ResourcePicker resources={resources} selected={giftForm.resources} onChange={(ids) => setGiftForm({ ...giftForm, resources: ids })} />
            </Field>
            <Button
              variant="primary-gold"
              size="sm"
              style={{ marginTop: '0.75rem' }}
              disabled={busy}
              onClick={() =>
                void ejecutar(async () => {
                  const response = await apiFetch<{ codigos: Array<{ code: string }> }>('/api/admin/gifts', {
                    body: {
                      label: giftForm.label,
                      resourceIds: giftForm.resources,
                      count: Number(giftForm.count) || 1,
                      maxRedemptions: Number(giftForm.maxRedemptions) || 1,
                      redeemBy: giftForm.redeemBy ? new Date(giftForm.redeemBy).toISOString() : undefined,
                      durationDays: giftForm.unlimited ? undefined : Number(giftForm.durationDays) || undefined,
                      durationMonths: giftForm.unlimited ? undefined : Number(giftForm.durationMonths) || undefined,
                      unlimited: giftForm.unlimited,
                      recipientEmail: giftForm.recipientEmail || undefined,
                    },
                  });
                  setCodesResult(response.codigos.map((item) => item.code));
                }, 'Códigos de regalo creados.')
              }
            >
              Generar códigos
            </Button>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.95fr) minmax(320px, 1.05fr)', gap: '1rem', alignItems: 'start' }}>
            <Card variant="surface" padding="md">
              <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Códigos ({gifts.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 560, overflowY: 'auto' }}>
                {gifts.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => setSelectedGiftId(gift.id)}
                    style={{
                      textAlign: 'left',
                      padding: '0.625rem',
                      borderRadius: 'var(--wa-radius-md)',
                      border: `1px solid ${selectedGiftId === gift.id ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                      background: selectedGiftId === gift.id ? 'var(--brand-primary-soft)' : 'transparent',
                      color: 'inherit',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <strong>{gift.label || gift.hint}</strong>
                      <Badge variant={gift.displayStatus === 'active' ? 'emerald' : 'navy'} size="sm">{gift.displayStatus}</Badge>
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {gift.redemptionCount}/{gift.maxRedemptions} canjes · {gift.resources.length} recursos · {gift.unlimited ? 'sin expiración' : gift.durationDays ? `${gift.durationDays} días` : gift.durationMonths ? `${gift.durationMonths} meses` : 'fecha fija'}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card variant="surface" padding="md">
              {!selectedGiftId ? (
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Selecciona un código para ver beneficiarios y ampliar su alcance.</p>
              ) : (
                <>
                  <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Beneficiarios</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.75rem' }}>
                    {giftBeneficiaries.map((beneficiary) => (
                      <div key={beneficiary.redemptionId} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.75rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span>{beneficiary.name} · {beneficiary.email}<br /><span style={{ color: 'var(--text-muted)' }}>{beneficiary.effectiveStatus} · hasta {fecha(beneficiary.accessEndsAt)}</span></span>
                        <span style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {['pause', 'resume', 'revoke'].map((action) => (
                            <button key={action} disabled={busy} onClick={() => void ejecutar(() => apiFetch(`/api/admin/gifts/${selectedGiftId}/redemptions/${beneficiary.redemptionId}`, { method: 'PATCH', body: { action } }), `Beneficiario: ${action}.`)} style={{ ...inputStyle, minHeight: 26, padding: '0.125rem 0.375rem', cursor: 'pointer' }}>
                              {action === 'pause' ? 'Pausar' : action === 'resume' ? 'Activar' : 'Revocar'}
                            </button>
                          ))}
                        </span>
                      </div>
                    ))}
                    {giftBeneficiaries.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin canjes todavía.</span>}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void ejecutar(
                          () => apiFetch(`/api/admin/gifts/${selectedGiftId}`, { method: 'PATCH', body: { action: gifts.find((gift) => gift.id === selectedGiftId)?.displayStatus === 'paused' ? 'resume' : 'pause' } }),
                          'Estado del código actualizado.'
                        )
                      }
                    >
                      Pausar / reactivar código
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void ejecutar(() => apiFetch(`/api/admin/gifts/${selectedGiftId}`, { method: 'PATCH', body: { action: 'revoke', reason: 'Revocado desde CRM' } }), 'Código revocado.')}
                    >
                      Revocar código
                    </Button>
                  </div>

                  <h3 style={{ fontSize: '0.9375rem' }}>Ampliar alcance</h3>
                  <ResourcePicker resources={resources} selected={giftExpand.resources} onChange={(ids) => setGiftExpand({ ...giftExpand, resources: ids })} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                    <input type="checkbox" checked={giftExpand.applyToExisting} onChange={(event) => setGiftExpand({ ...giftExpand, applyToExisting: event.target.checked, confirm: false })} />
                    Aplicar también a quienes ya canjearon y conservan derechos
                  </label>
                  {giftExpand.applyToExisting && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', marginTop: '0.375rem', color: 'var(--status-danger)' }}>
                      <input type="checkbox" checked={giftExpand.confirm} onChange={(event) => setGiftExpand({ ...giftExpand, confirm: event.target.checked })} />
                      Confirmo la ampliación retroactiva y entiendo que afecta a beneficiarios existentes.
                    </label>
                  )}
                  <Button
                    variant="primary-gold"
                    size="sm"
                    style={{ marginTop: '0.625rem' }}
                    disabled={busy || giftExpand.resources.length === 0 || (giftExpand.applyToExisting && !giftExpand.confirm)}
                    onClick={() =>
                      void ejecutar(
                        () => apiFetch(`/api/admin/gifts/${selectedGiftId}`, { method: 'PATCH', body: { action: 'expand', resourceIds: giftExpand.resources, applyToExisting: giftExpand.applyToExisting, confirmarRetroactivo: giftExpand.confirm } }),
                        'Alcance del código ampliado.'
                      )
                    }
                  >
                    {giftExpand.applyToExisting ? 'Ampliar a futuros y beneficiarios existentes' : 'Ampliar solo a futuros canjes'}
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'invitaciones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(320px, 1.1fr)', gap: '1rem', alignItems: 'start' }}>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Nueva invitación global</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Solo el creador o un administrador con permiso expreso puede gestionar estos códigos.
              No conceden CRM ni acceso a expedientes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <Field label="Tipo">
                <select style={inputStyle} value={invitationForm.kind} onChange={(event) => setInvitationForm({ ...invitationForm, kind: event.target.value })}>
                  <option value="founder">Fundador</option>
                  <option value="investor">Inversor</option>
                </select>
              </Field>
              <Field label="Modalidad">
                <select style={inputStyle} value={invitationForm.mode} onChange={(event) => setInvitationForm({ ...invitationForm, mode: event.target.value })}>
                  <option value="nominated">Nominativa (correo verificado)</option>
                  <option value="open">Código abierto con límite</option>
                </select>
              </Field>
              {invitationForm.mode === 'nominated' && (
                <Field label="Correo del destinatario"><input style={inputStyle} value={invitationForm.email} onChange={(event) => setInvitationForm({ ...invitationForm, email: event.target.value })} /></Field>
              )}
              <Field label="Etiqueta"><input style={inputStyle} value={invitationForm.label} onChange={(event) => setInvitationForm({ ...invitationForm, label: event.target.value })} /></Field>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Field label="Usos máximos"><input style={inputStyle} value={invitationForm.maxUses} onChange={(event) => setInvitationForm({ ...invitationForm, maxUses: event.target.value })} disabled={invitationForm.mode === 'nominated'} /></Field>
                <Field label="Días de acceso"><input style={inputStyle} value={invitationForm.accessDays} onChange={(event) => setInvitationForm({ ...invitationForm, accessDays: event.target.value })} disabled={invitationForm.unlimited} /></Field>
                <Field label="Meses de acceso"><input style={inputStyle} value={invitationForm.accessMonths} onChange={(event) => setInvitationForm({ ...invitationForm, accessMonths: event.target.value })} disabled={invitationForm.unlimited} /></Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                <input type="checkbox" checked={invitationForm.unlimited} onChange={(event) => setInvitationForm({ ...invitationForm, unlimited: event.target.checked })} />
                Acceso global permanente
              </label>
              <Button
                variant="primary-gold"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void ejecutar(async () => {
                    const response = await apiFetch<{ invitacion: { token: string } }>('/api/admin/invitations', {
                      body: {
                        kind: invitationForm.kind,
                        mode: invitationForm.mode,
                        email: invitationForm.mode === 'nominated' ? invitationForm.email : undefined,
                        label: invitationForm.label,
                        maxUses: Number(invitationForm.maxUses) || 1,
                        accessDays: invitationForm.unlimited ? undefined : Number(invitationForm.accessDays) || undefined,
                        accessMonths: invitationForm.unlimited ? undefined : Number(invitationForm.accessMonths) || undefined,
                        unlimited: invitationForm.unlimited,
                      },
                    });
                    setTokenResult(response.invitacion.token);
                  }, 'Invitación creada.')
                }
              >
                Generar invitación
              </Button>
            </div>
          </Card>
          <Card variant="surface" padding="md">
            <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Invitaciones ({invitations.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {invitations.map((invitation) => (
                <div key={invitation.id} style={{ padding: '0.625rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--wa-radius-md)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{invitation.kind === 'founder' ? 'Fundador' : 'Inversor'} · {invitation.mode === 'nominated' ? 'Nominativa' : 'Abierta'}</strong>
                    <Badge variant={invitation.status === 'active' ? 'emerald' : 'navy'} size="sm">{invitation.status}</Badge>
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {invitation.hint} · {invitation.email || 'sin correo'} · {invitation.useCount}/{invitation.maxUses} usos · {invitation.beneficiaries.length} beneficiarios
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void ejecutar(() => apiFetch(`/api/admin/invitations/${invitation.id}`, { method: 'PATCH', body: { action: invitation.status === 'paused' ? 'resume' : 'pause' } }), 'Invitación actualizada.')}>
                      {invitation.status === 'paused' ? 'Reactivar' : 'Pausar'}
                    </Button>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => void ejecutar(() => apiFetch(`/api/admin/invitations/${invitation.id}`, { method: 'PATCH', body: { action: 'revoke' } }), 'Invitación revocada.')}>
                      Revocar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'ordenes' && (
        <Card variant="surface" padding="md">
          <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Órdenes y pagos ({orders.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.5rem' }}>Orden</th>
                  <th style={{ padding: '0.5rem' }}>Usuario</th>
                  <th style={{ padding: '0.5rem' }}>Productos</th>
                  <th style={{ padding: '0.5rem' }}>Total</th>
                  <th style={{ padding: '0.5rem' }}>Estado</th>
                  <th style={{ padding: '0.5rem' }}>Fecha</th>
                  <th style={{ padding: '0.5rem' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.5rem', fontFamily: 'var(--wa-font-mono)' }}>{order.id.slice(0, 14)}</td>
                    <td style={{ padding: '0.5rem' }}>{order.userEmail}</td>
                    <td style={{ padding: '0.5rem' }}>{order.items.map((item) => item.title).join(' · ')}</td>
                    <td style={{ padding: '0.5rem' }}>{money(order.totalCents)}</td>
                    <td style={{ padding: '0.5rem' }}>{order.status}</td>
                    <td style={{ padding: '0.5rem' }}>{fecha(order.paidAt || order.createdAt)}</td>
                    <td style={{ padding: '0.5rem' }}>
                      {(order.status === 'paid' || order.status === 'free') && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm('¿Procesar el reembolso completo? Los derechos de esta compra serán revocados.')) return;
                            void ejecutar(() => apiFetch(`/api/admin/orders/${order.id}/refund`, { method: 'POST' }), 'Reembolso procesado.');
                          }}
                        >
                          Reembolsar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 0 }}>
            Un reembolso o reversión revoca únicamente los derechos originados por esa compra. Los
            regalos, becas o compras independientes conservan su vigencia.
          </p>
        </Card>
      )}

      {tab === 'auditoria' && (
        <Card variant="surface" padding="md">
          <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Auditoría reciente ({audit.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: 620, overflowY: 'auto' }}>
            {audit.map((event) => (
              <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.75rem', padding: '0.375rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span><strong>{event.action}</strong> · {event.entityType} {event.entityId || ''} · {event.actorEmail || 'sistema'}</span>
                <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fecha(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
        </div>
      </div>
    </div>
  );
}


