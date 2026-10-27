'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { AccountMenu } from '@/components/layout/AccountMenu';
import type { TabItem } from '@/components/ui/Tabs';

interface AdminWorkspaceShellProps {
  items: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  userName?: string | null;
  roleLabel?: string | null;
  themeDark?: boolean;
  onToggleTheme?: () => void;
  onNewCourse?: () => void;
  children: React.ReactNode;
}

const GROUPS: Array<{ id: string; label: string; ids: string[] }> = [
  { id: 'crm', label: 'CRM · Centro de administración', ids: ['crm'] },
  {
    id: 'academia',
    label: 'Academia',
    ids: ['cursos', 'meetings', 'estudiantes', 'matriculas', 'profesores', 'guias-diarias', 'gradebook', 'boletines', 'certificados'],
  },
  { id: 'contenido', label: 'Contenido', ids: ['catalogo', 'recursos'] },
];

const SUBTITLES: Record<string, string> = {

  cursos: 'Crea programas, organiza semanas, publica materiales y evalúa el avance.',
  meetings: 'Gestiona enlaces, horarios y estados de los repasos semanales en vivo.',
  estudiantes: 'Expedientes, credenciales y estado de las cuentas.',
  matriculas: 'Matrícula, cohortes y sincronización con Moodle.',
  profesores: 'Profesores IA, cursos y bancos de trabajo.',
  'guias-diarias': 'Generación y publicación de guías diarias.',
  gradebook: 'Calificaciones, auditoría y seguimiento académico.',
  boletines: 'Boletines oficiales y portafolio del estudiante.',
  certificados: 'Emisión y verificación de certificados.',
  catalogo: 'Grados escolares, currículo K-12 y talleres.',
  recursos: 'Revisión y aprobación de recursos audiovisuales.',
  crm: 'Centro de administración: dirección, academia, comercio, accesos y auditoría.',
};

function initials(name?: string | null): string {
  if (!name) return 'WA';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const AdminWorkspaceShell: React.FC<AdminWorkspaceShellProps> = ({
  items,
  activeId,
  onSelect,
  userName,
  roleLabel,
  themeDark,
  onToggleTheme,
  onNewCourse,
  children,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);
  const activeItem = items.find((item) => item.id === activeId) || items[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        items: group.ids
          .map((id) => items.find((item) => item.id === id))
          .filter((item): item is TabItem => Boolean(item))
          .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase())),
      })).filter((group) => group.items.length > 0),
    [items, query]
  );

  const select = (id: string) => {
    onSelect(id);
    setMenuOpen(false);
  };

  return (
    <div className="wa-aw wa-admin-page">
      <aside className={`wa-aw-sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Navegación administrativa">
        <div className="wa-aw-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/svg/wisdom-icon-color.svg"
            alt=""
            width={34}
            height={34}
            className="wa-aw-brand-mark wa-logo-for-light"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/svg/wisdom-icon-on-dark.svg"
            alt=""
            width={34}
            height={34}
            className="wa-aw-brand-mark wa-logo-for-dark"
          />
          <div>
            <strong>Wisdom Academy</strong>
            <small>CRM · Dirección</small>
          </div>
        </div>

        <label className="wa-aw-search">
          <WisdomIcon name="search" size={15} color="current" />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar sección"
            aria-label="Buscar sección administrativa"
          />
          <kbd>⌘K</kbd>
        </label>

        <nav className="wa-aw-nav">
          {groups.map((group) => (
            <div key={group.id} className="wa-aw-group">
              <span className="wa-aw-group-label">{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`wa-aw-nav-item ${activeId === item.id ? 'is-active' : ''}`}
                  onClick={() => select(item.id)}
                  aria-current={activeId === item.id ? 'page' : undefined}
                >
                  <span className="wa-aw-nav-icon">{item.icono}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p className="wa-aw-empty">No hay secciones que coincidan.</p>
          )}
        </nav>

        <div className="wa-aw-sidebar-foot">
          <Link href="/" className="wa-aw-foot-link">
            <WisdomIcon name="home" size={15} color="current" /> Ver sitio
          </Link>
          <Link href="/dashboard" className="wa-aw-foot-link">
            <WisdomIcon name="arrow-right" size={15} color="current" /> Mi portal
          </Link>
          <div className="wa-aw-user">
            <span className="wa-aw-avatar">{initials(userName)}</span>
            <div>
              <strong>{userName || 'Administrador'}</strong>
              <small>{roleLabel || 'Acceso administrativo'}</small>
            </div>
          </div>
        </div>
      </aside>

      {menuOpen && <button type="button" className="wa-aw-scrim" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}

      <div className="wa-aw-main">
        <header className="wa-aw-topbar">
          <button
            type="button"
            className="wa-aw-menu"
            aria-label="Abrir menú administrativo"
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="wa-aw-breadcrumb">
            <span>CRM</span>
            <WisdomIcon name="chevron-right" size={13} color="current" />
            <strong>{activeItem?.label || 'Panel'}</strong>
          </div>
          <div className="wa-aw-topbar-actions">
            <Link href="/catalogo#programas" className="wa-aw-secondary-action">
              Ver catálogo <WisdomIcon name="arrow-right" size={14} color="current" />
            </Link>
            {onNewCourse && (
              <button type="button" className="wa-aw-primary-action" onClick={onNewCourse}>
                <span>+</span> Nuevo curso
              </button>
            )}
            {onToggleTheme && (
              <button
                type="button"
                className="wa-aw-icon-action"
                onClick={onToggleTheme}
                aria-label={themeDark ? 'Activar modo claro' : 'Activar modo oscuro'}
                title={themeDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              >
                <WisdomIcon name={themeDark ? 'sun' : 'moon'} size={17} color="current" />
              </button>
            )}
            <AccountMenu
              className="wa-account-admin"
              triggerClassName="wa-aw-top-avatar"
              showName={false}
              roleLabel={roleLabel || undefined}
            />
          </div>
        </header>

        <div className="wa-aw-content">
          <div className="wa-aw-page-head">
            <div>
              <span className="wa-aw-eyebrow">CRM · Centro de administración</span>
              <h1>{activeItem?.label || 'Panel administrativo'}</h1>
              <p>{SUBTITLES[activeId] || 'Gestiona la operación de Wisdom Academy.'}</p>
            </div>
            <div className="wa-aw-page-head-meta">
              <span className="wa-aw-live"><i /> Sistema operativo</span>
              <span>{roleLabel || 'Administrador'}</span>
            </div>
          </div>
          {children}
        </div>
        <footer className="wa-aw-footer">
          <span>Wisdom Academy · CRM</span>
          <nav aria-label="Enlaces administrativos">
            <Link href="/dashboard">Mi portal</Link>
            <Link href="/catalogo#programas">Catálogo</Link>
            <Link href="/">Sitio</Link>
          </nav>
        </footer>
      </div>
    </div>
  );
};


