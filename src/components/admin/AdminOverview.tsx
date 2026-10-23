'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

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

interface Order {
  id: string;
  userName: string;
  userEmail: string;
  status: string;
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  items: Array<{ title: string; priceCents: number }>;
}

interface UserRow {
  id: string;
  nombreCompleto: string;
  correo: string;
  roles?: string[];
  matriculas: Array<{ nombre: string; origen?: string }>;
}

interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  createdAt: string;
}

interface AdminOverviewProps {
  userName?: string | null;
  availableTabs: string[];
  onOpenTab: (id: string) => void;
  onOpenCrm?: (area: string) => void;
  primaryCrmLabel?: string;
  primaryCrmArea?: string;
  loading?: boolean;
  initialSummary?: Summary | null;
  initialOrders?: Order[];
  initialUsers?: UserRow[];
  initialAudit?: AuditRow[];
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Pagada',
  free: 'Gratuita',
  pending: 'Pendiente',
  failed: 'Fallida',
  refunded: 'Reembolsada',
  cancelled: 'Cancelada',
};

function money(cents: number): string {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(date);
}

function firstName(value?: string | null): string {
  return value?.trim().split(/\s+/)[0] || 'Administrador';
}

function buildRevenueSeries(orders: Order[]) {
  const months: Array<{ key: string; label: string; total: number; count: number }> = [];
  const now = new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    months.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('es-EC', { month: 'short', timeZone: 'UTC' }),
      total: 0,
      count: 0,
    });
  }
  for (const order of orders) {
    if (!['paid', 'free'].includes(order.status)) continue;
    const value = order.paidAt || order.createdAt;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    const month = months.find((item) => item.key === key);
    if (!month) continue;
    month.total += order.totalCents;
    month.count += 1;
  }
  return months;
}

function RevenueChart({ data }: { data: Array<{ label: string; total: number }> }) {
  const width = 640;
  const height = 190;
  const padX = 26;
  const padY = 18;
  const max = Math.max(...data.map((item) => item.total), 1);
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;
  const points = data.map((item, index) => {
    const x = padX + index * step;
    const y = height - padY - (item.total / max) * (height - padY * 2);
    return { x, y, ...item };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;

  return (
    <div className="wa-ov-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ingresos de los últimos seis meses">
        <defs>
          <linearGradient id="wa-ov-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-gold)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--brand-gold)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => {
          const y = padY + ((height - padY * 2) / 3) * line;
          return (
            <line
              key={line}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--border-subtle)"
              strokeDasharray="4 5"
            />
          );
        })}
        <polygon points={area} fill="url(#wa-ov-area)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--brand-gold)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" fill="var(--bg-surface)" stroke="var(--brand-gold)" strokeWidth="2" />
            <title>{`${point.label}: ${money(point.total)}`}</title>
          </g>
        ))}
      </svg>
      <div className="wa-ov-chart-labels">
        {data.map((item) => <span key={item.label}>{item.label}</span>)}
      </div>
    </div>
  );
}

function AccessDonut({ summary }: { summary: Summary }) {
  const segments = [
    { label: 'Activos', value: summary.derechosActivos, color: 'var(--brand-secondary)' },
    { label: 'Por vencer', value: summary.derechosPorVencer7Dias, color: 'var(--wa-amber-400)' },
    { label: 'Pausados', value: summary.derechosPausadosPorRegalo, color: 'var(--text-muted)' },
  ];
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="wa-ov-access">
      <div className="wa-ov-donut">
        <svg viewBox="0 0 140 140" role="img" aria-label="Distribución de derechos de acceso">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-subtle)" strokeWidth="16" />
          {segments.map((segment) => {
            const length = total > 0 ? (segment.value / total) * circumference : 0;
            const circle = (
              <circle
                key={segment.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += length;
            return circle;
          })}
          <text x="70" y="66" textAnchor="middle" className="wa-ov-donut-value">{total}</text>
          <text x="70" y="83" textAnchor="middle" className="wa-ov-donut-label">derechos</text>
        </svg>
      </div>
      <ul className="wa-ov-legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span style={{ background: segment.color }} />
            <div><strong>{segment.value}</strong><small>{segment.label}</small></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  userName,
  availableTabs,
  onOpenTab,
  onOpenCrm,
  primaryCrmLabel = 'Abrir CRM',
  primaryCrmArea = 'resumen',
  loading: externalLoading,
  initialSummary,
  initialOrders,
  initialUsers,
  initialAudit,
}) => {
  const { usuario, sesionLista } = useAuth();
  const hasInitialData = initialSummary !== undefined;
  const [summary, setSummary] = useState<Summary | null>(initialSummary ?? null);
  const [orders, setOrders] = useState<Order[]>(initialOrders ?? []);
  const [users, setUsers] = useState<UserRow[]>(initialUsers ?? []);
  const [audit, setAudit] = useState<AuditRow[]>(initialAudit ?? []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState('');

  const safe = useCallback(async <T,>(path: string, fallback: T): Promise<T> => {
    try {
      return await apiFetch<T>(path);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) return fallback;
      throw err;
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [summaryResponse, ordersResponse, usersResponse, auditResponse] = await Promise.all([
        safe<{ resumen: Summary }>('/api/admin/summary', { resumen: null as unknown as Summary }),
        safe<{ ordenes: Order[] }>('/api/admin/orders', { ordenes: [] }),
        safe<{ usuarios: UserRow[] }>('/api/admin/users', { usuarios: [] }),
        safe<{ eventos: AuditRow[] }>('/api/admin/audit?limit=12', { eventos: [] }),
      ]);
      setSummary(summaryResponse.resumen);
      setOrders(ordersResponse.ordenes);
      setUsers(usersResponse.usuarios);
      setAudit(auditResponse.eventos);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [safe]);

  useEffect(() => {
    if (initialSummary !== undefined) setSummary(initialSummary);
    if (initialOrders !== undefined) setOrders(initialOrders);
    if (initialUsers !== undefined) setUsers(initialUsers);
    if (initialAudit !== undefined) setAudit(initialAudit);
    if (initialSummary !== undefined) setLoading(false);
  }, [initialSummary, initialOrders, initialUsers, initialAudit]);

  useEffect(() => {
    if (hasInitialData || !sesionLista || !usuario) return;
    void load();
  }, [hasInitialData, sesionLista, usuario, load]);

  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat('es-EC', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date())
    );
  }, []);

  const revenueSeries = useMemo(() => buildRevenueSeries(orders), [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const topPrograms = useMemo(() => {
    const totals = new Map<string, { title: string; total: number; count: number }>();
    for (const order of orders) {
      if (!['paid', 'free'].includes(order.status)) continue;
      for (const item of order.items) {
        const current = totals.get(item.title) || { title: item.title, total: 0, count: 0 };
        current.total += item.priceCents;
        current.count += 1;
        totals.set(item.title, current);
      }
    }
    return [...totals.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders]);

  const canOpen = (id: string) => availableTabs.includes(id);

  if (externalLoading || loading) {
    return (
      <div className="wa-ov-loading" role="status">
        <span className="wa-ov-spinner" />
        Cargando centro de control…
      </div>
    );
  }

  return (
    <div className="wa-ov">
      {error && (
        <div className="wa-ov-error" role="alert">
          {error}
          <Button variant="secondary" size="sm" onClick={() => void load()}>Reintentar</Button>
        </div>
      )}

      <section className="wa-ov-hero">
        <div>
          <span className="wa-eyebrow">Dirección · {today || 'Hoy'}</span>
          <h2>Buenos días, {firstName(userName)}</h2>
          <p>
            Pulso operativo de Wisdom Academy: ingresos, accesos, comunidad y operación académica
            en una sola vista.
          </p>
        </div>
        <div className="wa-ov-hero-actions">
          {onOpenCrm && canOpen('crm') && (
            <Button onClick={() => onOpenCrm(primaryCrmArea)} icono={<WisdomIcon name="layout" size={15} />}>
              {primaryCrmLabel}
            </Button>
          )}
          <Button variant="secondary" onClick={() => void load()} icono={<WisdomIcon name="refresh" size={15} />}>
            Actualizar
          </Button>
        </div>
      </section>

      <div className="wa-ov-kpis">
        <article className="wa-ov-kpi is-revenue">
          <div className="wa-ov-kpi-top"><span>Ingresos registrados</span><WisdomIcon name="chart" size={16} /></div>
          <strong>{money(summary?.ingresosCentavos || 0)}</strong>
          <small>{summary?.ordenesPagadas || 0} órdenes pagadas · {money(summary?.reembolsosCentavos || 0)} reembolsados</small>
        </article>
        <article className="wa-ov-kpi is-access">
          <div className="wa-ov-kpi-top"><span>Derechos activos</span><WisdomIcon name="shield" size={16} /></div>
          <strong>{summary?.derechosActivos || 0}</strong>
          <small>{summary?.derechosPorVencer7Dias || 0} vencen en 7 días · {summary?.derechosPausadosPorRegalo || 0} pausados</small>
        </article>
        <article className="wa-ov-kpi is-community">
          <div className="wa-ov-kpi-top"><span>Comunidad</span><WisdomIcon name="users" size={16} /></div>
          <strong>{summary?.usuariosActivos || 0}</strong>
          <small>{summary?.estudiantesActivos || 0} estudiantes · {summary?.invitacionesActivas || 0} invitaciones activas</small>
        </article>
        <article className="wa-ov-kpi is-academic">
          <div className="wa-ov-kpi-top"><span>Plan académico</span><WisdomIcon name="graduation-cap" size={16} /></div>
          <strong>{summary?.planesAcademicos || 0}</strong>
          <small>{summary?.clasesGeneradas || 0} clases generadas · {summary?.estudiantesConPlan || 0} estudiantes</small>
        </article>
      </div>

      <div className="wa-ov-grid-main">
        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Actividad de ingresos</h3>
              <span>Últimos 6 meses · órdenes pagadas</span>
            </div>
            <Badge variant="emerald" size="sm">USD</Badge>
          </div>
          {orders.length > 0 ? (
            <RevenueChart data={revenueSeries} />
          ) : (
            <div className="wa-ov-empty">
              <WisdomIcon name="chart" size={22} />
              <strong>Sin datos de ingresos disponibles</strong>
              <span>Tu rol no incluye lectura de pagos o aún no hay órdenes registradas.</span>
            </div>
          )}
        </section>

        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Accesos y derechos</h3>
              <span>Distribución operativa</span>
            </div>
            {onOpenCrm && canOpen('crm') && (
              <button type="button" className="wa-ov-text-link" onClick={() => onOpenCrm('usuarios')}>
                Gestionar
              </button>
            )}
          </div>
          <AccessDonut summary={summary || {
            usuariosActivos: 0,
            estudiantesActivos: 0,
            derechosActivos: 0,
            derechosPorVencer7Dias: 0,
            ordenesPagadas: 0,
            ordenesPendientes: 0,
            ordenesFallidas: 0,
            ingresosCentavos: 0,
            reembolsosCentavos: 0,
            descuentosActivos: 0,
            codigosRegaloActivos: 0,
            invitacionesActivas: 0,
            erroresWebhook: 0,
            derechosPausadosPorRegalo: 0,
          }} />
        </section>
      </div>

      <div className="wa-ov-grid-lower">
        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Últimas órdenes</h3>
              <span>Pagos y accesos recientes</span>
            </div>
            {onOpenCrm && canOpen('crm') && (
              <button type="button" className="wa-ov-text-link" onClick={() => onOpenCrm('ordenes')}>
                Ver todas
              </button>
            )}
          </div>
          {recentOrders.length > 0 ? (
            <div className="wa-ov-table-wrap">
              <table className="wa-ov-table">
                <thead>
                  <tr><th>Orden</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td><code>{order.id.slice(0, 10)}</code></td>
                      <td>
                        <strong>{order.userName}</strong>
                        <small>{order.userEmail}</small>
                      </td>
                      <td>
                        <Badge
                          variant={order.status === 'paid' || order.status === 'free' ? 'emerald' : order.status === 'failed' ? 'gold' : 'navy'}
                          size="sm"
                        >
                          {STATUS_LABEL[order.status] || order.status}
                        </Badge>
                      </td>
                      <td>{money(order.totalCents)}</td>
                      <td>{shortDate(order.paidAt || order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="wa-ov-empty">
              <WisdomIcon name="receipt" size={22} />
              <strong>Sin órdenes visibles</strong>
              <span>Tu rol no incluye lectura de pagos o aún no hay movimientos.</span>
            </div>
          )}
        </section>

        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Actividad y alertas</h3>
              <span>Últimos eventos auditados</span>
            </div>
          </div>
          <ul className="wa-ov-activity">
            {audit.slice(0, 6).map((event) => (
              <li key={event.id}>
                <span className="wa-ov-activity-icon"><WisdomIcon name="activity" size={14} /></span>
                <div>
                  <strong>{event.action}</strong>
                  <small>{event.actorEmail || 'sistema'} · {shortDate(event.createdAt)}</small>
                </div>
              </li>
            ))}
            {audit.length === 0 && (
              <li className="wa-ov-activity-empty">Sin eventos de auditoría disponibles para tu rol.</li>
            )}
          </ul>
          <div className="wa-ov-alerts">
            {(summary?.derechosPorVencer7Dias || 0) > 0 && (
              <button type="button" onClick={() => onOpenCrm?.('usuarios')}>
                <WisdomIcon name="clock" size={15} />
                <span>{summary?.derechosPorVencer7Dias} derechos vencen en 7 días</span>
              </button>
            )}
            {(summary?.ordenesPendientes || 0) > 0 && (
              <button type="button" onClick={() => onOpenCrm?.('ordenes')}>
                <WisdomIcon name="receipt" size={15} />
                <span>{summary?.ordenesPendientes} órdenes pendientes</span>
              </button>
            )}
            {(summary?.erroresWebhook || 0) > 0 && (
              <button type="button" onClick={() => onOpenCrm?.('auditoria')}>
                <WisdomIcon name="shield" size={15} />
                <span>{summary?.erroresWebhook} errores de webhook</span>
              </button>
            )}
          </div>
        </section>
      </div>

      <div className="wa-ov-grid-bottom">
        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Programas con movimiento</h3>
              <span>Por ingresos registrados</span>
            </div>
          </div>
          {topPrograms.length > 0 ? (
            <ol className="wa-ov-top-programs">
              {topPrograms.map((program, index) => (
                <li key={program.title}>
                  <span className="wa-ov-rank">{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{program.title}</strong><small>{program.count} órdenes</small></div>
                  <span className="wa-ov-amount">{money(program.total)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="wa-ov-empty">
              <WisdomIcon name="book" size={22} />
              <strong>Aún no hay programas vendidos</strong>
              <span>Las órdenes pagadas alimentarán este ranking.</span>
            </div>
          )}
        </section>

        <section className="wa-ov-panel">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Accesos rápidos</h3>
              <span>Operación administrativa</span>
            </div>
          </div>
          <div className="wa-ov-quick">
            {canOpen('crm') && onOpenCrm && (
              <button type="button" onClick={() => onOpenCrm('usuarios')}>
                <WisdomIcon name="shield" size={17} /><span>Usuarios y accesos</span>
              </button>
            )}
            {canOpen('cursos') && (
              <button type="button" onClick={() => onOpenTab('cursos')}>
                <WisdomIcon name="book" size={17} /><span>Cursos y talleres</span>
              </button>
            )}
            {canOpen('matriculas') && (
              <button type="button" onClick={() => onOpenTab('matriculas')}>
                <WisdomIcon name="graduation-cap" size={17} /><span>Matrículas</span>
              </button>
            )}
            {canOpen('certificados') && (
              <button type="button" onClick={() => onOpenTab('certificados')}>
                <WisdomIcon name="award" size={17} /><span>Certificados</span>
              </button>
            )}
            {canOpen('catalogo') && (
              <button type="button" onClick={() => onOpenTab('catalogo')}>
                <WisdomIcon name="layout" size={17} /><span>Grados escolares</span>
              </button>
            )}
            {canOpen('guias-diarias') && (
              <button type="button" onClick={() => onOpenTab('guias-diarias')}>
                <WisdomIcon name="file-text" size={17} /><span>Guías diarias</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {recentUsers.length > 0 && (
        <section className="wa-ov-panel wa-ov-community">
          <div className="wa-ov-panel-head">
            <div>
              <h3>Comunidad reciente</h3>
              <span>Altas y expedientes visibles</span>
            </div>
          </div>
          <div className="wa-ov-community-grid">
            {recentUsers.map((user) => (
              <div key={user.id} className="wa-ov-person">
                <span>{user.nombreCompleto.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
                <div><strong>{user.nombreCompleto}</strong><small>{user.correo}</small></div>
                <em>{user.matriculas.length} matrícula(s)</em>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
