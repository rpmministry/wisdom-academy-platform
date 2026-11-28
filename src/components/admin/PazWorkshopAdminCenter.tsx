'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { formatPazUsd } from '@/lib/paz-en-la-mesa/config';
import type { PazGeneralKpis, PazStudentDetailView } from '@/server/domain/pazAnalytics';
import type { PazAccessCodeView } from '@/server/domain/pazAccessCodes';
import type { PazPaymentIntentView } from '@/server/domain/paz';
import type { PazTestAccountInfo } from '@/server/domain/pazSeedAccounts';
import { PazAdminNavigation } from '@/components/paz/PazAdminNavigation';

type AdminTab =
  | 'resumen'
  | 'verificacion'
  | 'estudiantes'
  | 'codigos'
  | 'admins'
  | 'auditoria'
  | 'clases'
  | 'google_sync'
  | 'pruebas';

interface PazAdminAccount {
  key: string;
  name: string;
  configured: boolean;
  userId: string | null;
  email: string | null;
  displayName: string;
  status: string;
  mustChangePassword: boolean;
  roles: string[];
}

interface PazAuditLogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: string | null;
  after_json: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  approved: { bg: '#eef6ee', color: '#1b5e20', label: 'Confirmado' },
  pending: { bg: '#fff3e0', color: '#b45309', label: 'Pendiente' },
  rejected: { bg: '#fde8e8', color: '#9b1c1c', label: 'Rechazado' },
  cancelled: { bg: '#f3f4f6', color: '#4b5563', label: 'Cancelado' },
};

export function PazWorkshopAdminCenter() {
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [kpis, setKpis] = useState<PazGeneralKpis | null>(null);
  const [payments, setPayments] = useState<PazPaymentIntentView[]>([]);
  const [codes, setCodes] = useState<PazAccessCodeView[]>([]);
  const [admins, setAdmins] = useState<PazAdminAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<PazAuditLogRow[]>([]);
  const [, setTestAccounts] = useState<PazTestAccountInfo[]>([]);

  // Ficha individual y edición CRM
  const [selectedIntent, setSelectedIntent] = useState<PazPaymentIntentView | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<PazStudentDetailView | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Comprobante modal
  const [receiptPreview, setReceiptPreview] = useState<{
    intent: PazPaymentIntentView;
    url: string;
  } | null>(null);

  // Filtros CRM
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'payphone' | 'bank_transfer'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');
  const [showAllTransfers, setShowAllTransfers] = useState(false);

  // Generación manual de código
  const [manualCodeEmail, setManualCodeEmail] = useState('');

  // Aprovisionamiento de los 4 administradores
  const [adminEmails, setAdminEmails] = useState<Record<string, string>>({});
  const [provisionedCred, setProvisionedCred] = useState<{
    name: string;
    email: string;
    temporaryPassword: string | null;
    mensaje: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [includeTest, setIncludeTest] = useState(false);

  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<{
    rawCode: string;
    email: string;
    codePreview: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorBanner(null);
    try {
      const [kpiRes, payRes, codeRes, adminRes, auditRes] = await Promise.all([
        apiFetch<{ kpis: PazGeneralKpis }>(`/api/paz/analytics?includeTest=${includeTest ? '1' : '0'}`),
        apiFetch<{ pagos: PazPaymentIntentView[] }>('/api/paz/payments'),
        apiFetch<{ codes: PazAccessCodeView[] }>(`/api/paz/codes?includeTest=${includeTest ? '1' : '0'}`),
        apiFetch<{ admins: PazAdminAccount[] }>('/api/paz/admins').catch(() => ({ admins: [] })),
        apiFetch<{ logs: PazAuditLogRow[] }>('/api/paz/audit').catch(() => ({ logs: [] })),
      ]);
      setKpis(kpiRes.kpis);
      setPayments(payRes.pagos);
      setCodes(codeRes.codes);
      setAdmins(adminRes.admins);
      setAuditLogs(auditRes.logs);
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [includeTest]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingTransfersCount = useMemo(
    () => payments.filter((p) => p.method === 'bank_transfer' && p.status === 'pending').length,
    [payments]
  );

  const filteredParticipants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      if (methodFilter !== 'all' && p.method !== methodFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.buyerName.toLowerCase().includes(q) ||
        p.buyerEmail.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        (p.transferReference || '').toLowerCase().includes(q)
      );
    });
  }, [payments, methodFilter, statusFilter, searchQuery]);

  const verificationTransfers = useMemo(() => {
    return payments.filter((p) => {
      if (p.method !== 'bank_transfer') return false;
      if (!showAllTransfers && p.status !== 'pending') return false;
      return true;
    });
  }, [payments, showAllTransfers]);

  const openParticipantSheet = async (intent: PazPaymentIntentView) => {
    setSelectedIntent(intent);
    setEditName(intent.buyerName);
    setEditPhone(intent.buyerPhone || '');
    setEditRef(intent.transferReference || '');
    setEditNotes(intent.adminNotes || intent.reviewNote || '');
    setActionBusy(`sheet_${intent.id}`);
    try {
      const res = await apiFetch<{ student: PazStudentDetailView }>(`/api/paz/students/${intent.userId}`);
      setSelectedStudent(res.student);
    } catch {
      setSelectedStudent(null);
    } finally {
      setActionBusy(null);
    }
  };

  const saveParticipantEdits = async () => {
    if (!selectedIntent) return;
    setActionBusy(`save_${selectedIntent.id}`);
    setErrorBanner(null);
    try {
      const res = await apiFetch<{ pago: PazPaymentIntentView }>(`/api/paz/payments/${selectedIntent.id}`, {
        method: 'PATCH',
        body: {
          buyerName: editName,
          buyerPhone: editPhone,
          transferReference: editRef,
          adminNotes: editNotes,
        },
      });
      setSelectedIntent(res.pago);
      setMessage('Ficha del participante actualizada y registrada en auditoría.');
      await loadData();
    } catch (err) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const approveAndGenerateCode = async (intent: PazPaymentIntentView) => {
    setActionBusy(`gen_${intent.id}`);
    setMessage(null);
    setErrorBanner(null);
    try {
      const res = await apiFetch<{
        result: { rawCode: string; codePreview: string; email: string };
      }>('/api/paz/codes', {
        method: 'POST',
        body: {
          email: intent.buyerEmail,
          intentId: intent.id,
          isTest: false,
        },
      });

      setNewlyGeneratedCode({
        rawCode: res.result.rawCode,
        email: res.result.email,
        codePreview: res.result.codePreview,
      });
      setMessage(`Transferencia ${intent.reference} aprobada y código único generado.`);
      await loadData();
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const rejectTransfer = async (intent: PazPaymentIntentView) => {
    const reason = window.prompt(
      `Motivo del rechazo para ${intent.buyerName} (${intent.reference}):`
    );
    if (!reason || !reason.trim()) return;
    setActionBusy(`rej_${intent.id}`);
    setMessage(null);
    setErrorBanner(null);
    try {
      await apiFetch(`/api/paz/payments/${intent.id}`, {
        method: 'POST',
        body: { action: 'reject', note: reason.trim() },
      });
      setMessage(`Transferencia ${intent.reference} marcada como rechazada.`);
      await loadData();
    } catch (err) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const generateManualCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeEmail.trim()) return;
    setActionBusy('manual_code');
    setErrorBanner(null);
    try {
      const res = await apiFetch<{
        result: { rawCode: string; codePreview: string; email: string };
      }>('/api/paz/codes', {
        method: 'POST',
        body: { email: manualCodeEmail.trim().toLowerCase(), isTest: false },
      });
      setNewlyGeneratedCode({
        rawCode: res.result.rawCode,
        email: res.result.email,
        codePreview: res.result.codePreview,
      });
      setManualCodeEmail('');
      await loadData();
    } catch (err) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const revokeCode = async (codeId: string) => {
    const reason = window.prompt('Ingresa el motivo de revocación del código:');
    if (!reason) return;
    setActionBusy(`rev_${codeId}`);
    setErrorBanner(null);
    try {
      await apiFetch(`/api/paz/codes/${codeId}/revoke`, {
        method: 'POST',
        body: { reason },
      });
      setMessage('Código de acceso revocado correctamente.');
      await loadData();
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const regenerateCode = async (codeId: string) => {
    if (!window.confirm('¿Deseas revocar el código anterior y generar uno nuevo para este participante?')) {
      return;
    }
    setActionBusy(`regen_${codeId}`);
    setErrorBanner(null);
    try {
      const res = await apiFetch<{
        result: { rawCode: string; codePreview: string; email: string };
      }>(`/api/paz/codes/${codeId}/regenerate`, {
        method: 'POST',
      });
      setNewlyGeneratedCode({
        rawCode: res.result.rawCode,
        email: res.result.email,
        codePreview: res.result.codePreview,
      });
      setMessage('Código regenerado conservando el historial previo.');
      await loadData();
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const provisionWorkshopAdmin = async (name: string) => {
    const email = (adminEmails[name] || '').trim().toLowerCase();
    if (!email) {
      setErrorBanner(`Ingresa el correo electrónico real de ${name}.`);
      return;
    }
    setActionBusy(`admin_${name}`);
    setErrorBanner(null);
    setProvisionedCred(null);
    try {
      const res = await apiFetch<{
        created: boolean;
        email: string;
        name: string;
        temporaryPassword: string | null;
        mensaje: string;
      }>('/api/paz/admins', {
        method: 'POST',
        body: { name, email },
      });
      setProvisionedCred({
        name: res.name,
        email: res.email,
        temporaryPassword: res.temporaryPassword,
        mensaje: res.mensaje,
      });
      setMessage(res.mensaje);
      await loadData();
    } catch (err) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const seedAccounts = async () => {
    setActionBusy('seed');
    try {
      const res = await apiFetch<{ accounts: PazTestAccountInfo[] }>('/api/paz/seed-test-accounts', {
        method: 'POST',
      });
      setTestAccounts(res.accounts);
      setMessage('3 cuentas de prueba verificadas y listas para usar.');
      await loadData();
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  const downloadSheetsReplica = async () => {
    setActionBusy('replica');
    try {
      const res = await apiFetch<{ replica: Record<string, unknown[]> }>('/api/paz/sync?format=workbook');
      const blob = new Blob([JSON.stringify(res.replica, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paz-en-la-mesa-replica-sheets-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setErrorBanner(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className="paz-admin-crm paz-crm-shell">
      {/* Encabezado */}
      <div className="paz-crm-header">
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--paz-accent-text, #8f4e38)',
              letterSpacing: '0.06em',
            }}
          >
            <WisdomIcon name="shield" size={13} /> CRM Exclusivo del Taller
          </span>
          <h1
            style={{
              fontFamily: 'var(--paz-serif, serif)',
              fontSize: 'clamp(1.3rem, 3.5vw, 1.85rem)',
              margin: '0.2rem 0',
              lineHeight: 1.2,
            }}
          >
            Paz en la mesa · Administración
          </h1>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--paz-muted, #66615b)' }}>
            Inscritos, verificación de transferencias, códigos únicos y auditoría.
          </p>
        </div>

        <div className="paz-crm-header-actions">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              background: 'var(--paz-card-alt)',
              border: '1px solid var(--paz-card-border)',
              padding: '0.42rem 0.75rem',
              borderRadius: '10px',
              cursor: 'pointer',
              minHeight: '38px',
            }}
          >
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
            />
            Incluir pruebas
          </label>
          <a
            href="/api/paz/payments/export"
            className="paz-btn paz-btn--olive paz-btn--small"
          >
            <WisdomIcon name="download" size={14} /> CSV
          </a>
          <button
            type="button"
            onClick={() => loadData()}
            className="paz-btn paz-btn--ghost paz-btn--small"
            disabled={loading}
          >
            <WisdomIcon name="refresh" size={14} /> Actualizar
          </button>
        </div>
      </div>

      <PazAdminNavigation variant="admin" />

      {message && (
        <div
          style={{
            padding: '0.8rem 1.1rem',
            borderRadius: '12px',
            background: '#eef6ee',
            border: '1px solid #a3d9a5',
            color: '#1b5e20',
            fontSize: '0.88rem',
            marginBottom: '1rem',
          }}
        >
          {message}
        </div>
      )}

      {errorBanner && (
        <div
          style={{
            padding: '0.8rem 1.1rem',
            borderRadius: '12px',
            background: '#fde8e8',
            border: '1px solid #f5b7b1',
            color: '#9b1c1c',
            fontSize: '0.88rem',
            marginBottom: '1rem',
          }}
        >
          {errorBanner}
        </div>
      )}

      {/* Pestañas */}
      <div className="paz-crm-tabs" role="tablist" aria-label="Secciones del CRM">
        {[
          { id: 'resumen', label: 'Dashboard', icon: 'chart' },
          {
            id: 'verificacion',
            label: `Verificación (${pendingTransfersCount})`,
            icon: 'receipt',
          },
          { id: 'estudiantes', label: `Participantes (${payments.length})`, icon: 'users' },
          { id: 'codigos', label: `Códigos (${codes.length})`, icon: 'shield' },
          { id: 'admins', label: 'Admins (4)', icon: 'user' },
          { id: 'auditoria', label: 'Auditoría', icon: 'clock' },
          { id: 'clases', label: 'Clases (4)', icon: 'video' },
          { id: 'google_sync', label: 'Sheets', icon: 'file-text' },
          { id: 'pruebas', label: 'Pruebas', icon: 'award' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id as AdminTab)}
            className={`paz-crm-tab ${tab === t.id ? 'is-active' : ''}`}
          >
            <WisdomIcon name={t.icon as never} size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* MODAL: CÓDIGO GENERADO */}
      {newlyGeneratedCode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--paz-card-bg, #ffffff)',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.35rem 0' }}>
                Código único de 25 caracteres generado
              </h2>
              <p style={{ fontSize: '0.86rem', color: 'var(--paz-muted, #66615b)', margin: 0 }}>
                Este código se muestra una sola vez para entregarlo al participante.
              </p>
            </div>
            <div
              style={{
                background: 'var(--paz-card-alt, #faf8f5)',
                border: '1px solid var(--paz-card-border, #e4dacb)',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: 'var(--paz-muted, #7a7256)', display: 'block', marginBottom: '0.3rem' }}>
                Asociado a: <strong>{newlyGeneratedCode.email}</strong>
              </span>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: 'var(--paz-ink, #2b2927)',
                  letterSpacing: '0.07em',
                  padding: '0.45rem',
                  wordBreak: 'break-all',
                }}
              >
                {newlyGeneratedCode.rawCode}
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newlyGeneratedCode.rawCode)}
                className="paz-btn paz-btn--primary"
                style={{ justifyContent: 'center' }}
              >
                Copiar código único
              </button>
              <button
                type="button"
                onClick={() => {
                  const msg = `¡Hola! Tu pago para el taller "Paz en la mesa" ha sido verificado en Wisdom Academy. Tu código de acceso único es: ${newlyGeneratedCode.rawCode}\n\nActívalo ingresando a: https://wisdomacademy.alsiztech.com/paz-en-la-mesa/activar`;
                  navigator.clipboard.writeText(msg);
                }}
                className="paz-btn paz-btn--olive"
                style={{ justifyContent: 'center' }}
              >
                Copiar mensaje para WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setNewlyGeneratedCode(null)}
                className="paz-btn paz-btn--ghost"
                style={{ justifyContent: 'center' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISTA PREVIA DE COMPROBANTE */}
      {receiptPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9998,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--paz-card-bg, #ffffff)',
              borderRadius: '18px',
              padding: '1.5rem',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Comprobante · {receiptPreview.intent.buyerName}</h3>
                <small style={{ color: 'var(--paz-muted, #66615b)' }}>
                  Ref: {receiptPreview.intent.reference} · {receiptPreview.intent.receiptFilename}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreview(null)}
                className="paz-btn paz-btn--ghost paz-btn--small"
              >
                Cerrar
              </button>
            </div>

            {receiptPreview.intent.receiptMime === 'application/pdf' ? (
              <iframe
                src={receiptPreview.url}
                title="Comprobante PDF"
                style={{ width: '100%', height: '65vh', border: '1px solid var(--paz-card-border, #e4dacb)', borderRadius: '10px' }}
              />
            ) : (
              <img
                src={receiptPreview.url}
                alt={`Comprobante de ${receiptPreview.intent.buyerName}`}
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '10px', background: 'var(--paz-card-alt, #faf8f5)' }}
              />
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 1: DASHBOARD */}
      {tab === 'resumen' && kpis && (
        <div>
          <div className="paz-crm-kpis">
            <div className="paz-crm-kpi">
              <span style={{ fontSize: '0.76rem', color: 'var(--paz-muted)', fontWeight: 700 }}>Total inscritos</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--paz-ink)', margin: '0.2rem 0' }}>{kpis.totalRegistrations}</div>
              <small style={{ color: 'var(--paz-muted)' }}>Registros totales</small>
            </div>

            <div className="paz-crm-kpi">
              <span style={{ fontSize: '0.76rem', color: 'var(--paz-muted)', fontWeight: 700 }}>Pagos confirmados</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e', margin: '0.2rem 0' }}>{kpis.confirmedPayments}</div>
              <small style={{ color: 'var(--paz-muted)' }}>{kpis.gatewayEnrolled} PayPhone · {kpis.transferEnrolled} Transf.</small>
            </div>

            <div className="paz-crm-kpi paz-crm-kpi--highlight">
              <span style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 700 }}>Pend. verificación</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>{kpis.pendingBankTransfers}</div>
              <small style={{ color: '#d97706' }}>Transferencias</small>
            </div>

            <div className="paz-crm-kpi">
              <span style={{ fontSize: '0.76rem', color: 'var(--paz-muted)', fontWeight: 700 }}>Inscripc. pendientes</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--paz-accent-text)', margin: '0.2rem 0' }}>{kpis.pendingRegistrations}</div>
              <small style={{ color: 'var(--paz-muted)' }}>Sin confirmar</small>
            </div>

            <div className="paz-crm-kpi">
              <span style={{ fontSize: '0.76rem', color: 'var(--paz-muted)', fontWeight: 700 }}>Códigos generados</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--paz-ink)', margin: '0.2rem 0' }}>{kpis.totalCodesGenerated}</div>
              <small style={{ color: 'var(--paz-muted)' }}>{kpis.redeemedCodes} usados · {kpis.pendingCodes} pend.</small>
            </div>

            <div className="paz-crm-kpi">
              <span style={{ fontSize: '0.76rem', color: 'var(--paz-muted)', fontWeight: 700 }}>Accesos activos</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6', margin: '0.2rem 0' }}>{kpis.activatedAccounts}</div>
              <small style={{ color: 'var(--paz-muted)' }}>{kpis.loggedInAtLeastOnce} en aula</small>
            </div>
          </div>

          {/* Desglose por clases */}
          <div style={{ background: 'var(--paz-card-bg, #ffffff)', borderRadius: '18px', border: '1px solid var(--paz-card-border, #e4dacb)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0' }}>Participación activa y avance por clase</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {kpis.classMetrics.map((cm) => (
                <div
                  key={cm.classNumber}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    background: 'var(--paz-card-alt, #faf8f5)',
                    border: '1px solid var(--paz-card-border, #e4dacb)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block' }}>{cm.title}</strong>
                    <small style={{ color: 'var(--paz-muted, #7a7256)' }}>
                      {cm.studentCount} alumnos ingresaron · {cm.completedCount} completaron · {cm.totalVideoPlays} reproducciones
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--paz-accent-text, #8f4e38)' }}>{cm.averageMinutes} min</div>
                    <small style={{ color: 'var(--paz-muted, #7a7256)' }}>promedio activo</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: VERIFICACIÓN DE PAGOS */}
      {tab === 'verificacion' && (
        <div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Verificación de pagos por transferencia</h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem', color: 'var(--paz-muted, #66615b)' }}>
                Revisa el comprobante, verifica el ingreso en Banco Pichincha y aprueba o rechaza la transferencia.
              </p>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAllTransfers}
                onChange={(e) => setShowAllTransfers(e.target.checked)}
              />
              Mostrar también transferencias ya revisadas
            </label>
          </div>

          <div style={{ display: 'grid', gap: '0.9rem' }}>
            {verificationTransfers.map((intent) => {
              const badge = STATUS_BADGE[intent.status] || STATUS_BADGE.pending;
              return (
                <article
                  key={intent.id}
                  style={{
                    background: 'var(--paz-card-bg, #ffffff)',
                    borderRadius: '16px',
                    border: intent.status === 'pending' ? '1px solid #e6b86a' : '1px solid var(--paz-card-border, #e4dacb)',
                    padding: '1.15rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ minWidth: '260px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                      <strong style={{ fontSize: '1rem' }}>{intent.buyerName}</strong>
                      <span
                        style={{
                          padding: '0.18rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--paz-accent-text, #8f4e38)', fontWeight: 700 }}>
                        {intent.reference}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--paz-ink-soft, #4a463a)', lineHeight: 1.5 }}>
                      <span>{intent.buyerEmail}</span> · <span>Tel: {intent.buyerPhone || 'No registrado'}</span> ·{' '}
                      <strong>{formatPazUsd(intent.amountCents)}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--paz-muted, #66615b)', marginTop: '0.25rem' }}>
                      Fecha: {new Date(intent.createdAt).toLocaleString()} · Ref. transferencia:{' '}
                      <strong>{intent.transferReference || 'Sin número'}</strong>
                      {intent.adminNotes || intent.reviewNote ? (
                        <span> · Nota: {intent.adminNotes || intent.reviewNote}</span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {intent.hasReceipt && (
                      <button
                        type="button"
                        onClick={() =>
                          setReceiptPreview({
                            intent,
                            url: `/api/paz/payments/${intent.id}/receipt`,
                          })
                        }
                        className="paz-btn paz-btn--ghost paz-btn--small"
                      >
                        <WisdomIcon name="file-text" size={14} /> Ver comprobante
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openParticipantSheet(intent)}
                      className="paz-btn paz-btn--ghost paz-btn--small"
                    >
                      Observación / Ficha
                    </button>

                    {intent.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => approveAndGenerateCode(intent)}
                          className="paz-btn paz-btn--primary paz-btn--small"
                          disabled={actionBusy === `gen_${intent.id}`}
                        >
                          <WisdomIcon name="check" size={14} /> Aprobar y generar código
                        </button>
                        <button
                          type="button"
                          onClick={() => rejectTransfer(intent)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          style={{ color: '#9b1c1c', borderColor: '#f5b7b1' }}
                          disabled={actionBusy === `rej_${intent.id}`}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}

            {verificationTransfers.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)', color: 'var(--paz-muted, #7a7256)' }}>
                No hay transferencias pendientes de verificación en este momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 3: CRM PARTICIPANTES */}
      {tab === 'estudiantes' && (
        <div>
          <div className="paz-crm-filters">
            <input
              type="text"
              placeholder="Buscar por nombre, apellido, correo o referencia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="paz-crm-input"
            />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
              className="paz-crm-input"
            >
              <option value="all">Todos los métodos</option>
              <option value="payphone">PayPhone</option>
              <option value="bank_transfer">Transferencia</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="paz-crm-input"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Confirmado</option>
              <option value="rejected">Rechazado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          {/* Vista de tabla en escritorio */}
          <div className="paz-crm-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--paz-card-alt, #faf8f5)', borderBottom: '1px solid var(--paz-card-border, #e4dacb)', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Participante</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Método</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Inscripción</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Estado pago</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Código / Acceso</th>
                  <th style={{ padding: '0.8rem 0.9rem', textAlign: 'right' }}>Ficha</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((p) => {
                  const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
                  const isPendingTransfer = p.method === 'bank_transfer' && p.status === 'pending';
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--paz-card-border, #f2ede4)',
                        background: isPendingTransfer ? 'rgba(245, 158, 11, 0.06)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        <strong>{p.buyerName}</strong>
                        <div style={{ fontSize: '0.77rem', color: 'var(--paz-muted, #66615b)' }}>
                          {p.buyerEmail} {p.buyerPhone ? `· ${p.buyerPhone}` : ''}
                        </div>
                        <div style={{ fontSize: '0.73rem', fontFamily: 'monospace', color: 'var(--paz-accent-text, #8f4e38)' }}>{p.reference}</div>
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        <div>{p.method === 'bank_transfer' ? 'Transferencia' : 'PayPhone'}</div>
                        <small style={{ color: 'var(--paz-muted, #66615b)' }}>{formatPazUsd(p.amountCents)}</small>
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem', fontSize: '0.8rem', color: 'var(--paz-ink-soft, #4a463a)' }}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {isPendingTransfer ? 'Pend. verificación' : badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem', fontSize: '0.78rem' }}>
                        <div>Código: {p.hasAccessCode ? <strong>{p.accessCodeStatus}</strong> : 'No'}</div>
                        <div>Acceso: {p.hasActiveAccess ? <strong style={{ color: '#22c55e' }}>Activo</strong> : 'Inactivo'}</div>
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openParticipantSheet(p)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          disabled={actionBusy === `sheet_${p.id}`}
                        >
                          Abrir ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vista de tarjetas optimizada para celulares */}
          <div className="paz-crm-mobile-list">
            {filteredParticipants.map((p) => {
              const badge = STATUS_BADGE[p.status] || STATUS_BADGE.pending;
              const isPendingTransfer = p.method === 'bank_transfer' && p.status === 'pending';
              return (
                <article
                  key={`mob_${p.id}`}
                  className="paz-crm-mobile-card"
                  style={isPendingTransfer ? { borderColor: 'rgba(217, 119, 6, 0.5)' } : undefined}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.98rem', display: 'block' }}>{p.buyerName}</strong>
                      <span style={{ fontSize: '0.78rem', color: 'var(--paz-muted)' }}>{p.buyerEmail}</span>
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isPendingTransfer ? 'Pend. verificación' : badge.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--paz-ink-soft)' }}>
                    <span>{p.method === 'bank_transfer' ? 'Transferencia' : 'PayPhone'} · <strong>{formatPazUsd(p.amountCents)}</strong></span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--paz-accent-text)' }}>{p.reference}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--paz-muted)' }}>
                    <span>Código: {p.hasAccessCode ? <strong>{p.accessCodeStatus}</strong> : 'No'}</span>
                    <span>Acceso: {p.hasActiveAccess ? <strong style={{ color: '#22c55e' }}>Activo</strong> : 'Inactivo'}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openParticipantSheet(p)}
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={actionBusy === `sheet_${p.id}`}
                  >
                    Abrir ficha y editar
                  </button>
                </article>
              );
            })}
          </div>

          {/* FICHA INDIVIDUAL DEL PARTICIPANTE */}
          {selectedIntent && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: 'var(--paz-card-alt, #faf8f5)',
                borderRadius: '18px',
                border: '1px solid var(--paz-input-border, #d4c8b8)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Ficha individual · {selectedIntent.buyerName}</h3>
                  <small style={{ color: 'var(--paz-muted, #66615b)' }}>
                    {selectedIntent.buyerEmail} · Ref: {selectedIntent.reference} · Inscrito el{' '}
                    {new Date(selectedIntent.createdAt).toLocaleString()}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setSelectedStudent(null);
                  }}
                  className="paz-btn paz-btn--ghost paz-btn--small"
                >
                  Cerrar ficha
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.2rem' }}>Nombre completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--paz-input-border, #d4c8b8)', background: 'var(--paz-card-bg, #ffffff)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.2rem' }}>Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--paz-input-border, #d4c8b8)', background: 'var(--paz-card-bg, #ffffff)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.2rem' }}>Referencia transferencia</label>
                  <input
                    type="text"
                    value={editRef}
                    onChange={(e) => setEditRef(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--paz-input-border, #d4c8b8)', background: 'var(--paz-card-bg, #ffffff)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.2rem' }}>Observaciones administrativas</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--paz-input-border, #d4c8b8)', background: 'var(--paz-card-bg, #ffffff)' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: selectedStudent ? '1.25rem' : 0 }}>
                <button
                  type="button"
                  onClick={saveParticipantEdits}
                  className="paz-btn paz-btn--primary paz-btn--small"
                  disabled={actionBusy === `save_${selectedIntent.id}`}
                >
                  Guardar cambios en ficha
                </button>
                {selectedIntent.hasReceipt && (
                  <button
                    type="button"
                    onClick={() =>
                      setReceiptPreview({
                        intent: selectedIntent,
                        url: `/api/paz/payments/${selectedIntent.id}/receipt`,
                      })
                    }
                    className="paz-btn paz-btn--ghost paz-btn--small"
                  >
                    Ver comprobante adjunto
                  </button>
                )}
              </div>

              {selectedStudent && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '10px' }}>
                    <small style={{ color: 'var(--paz-muted, #66615b)' }}>Sesiones en aula</small>
                    <strong style={{ display: 'block', fontSize: '1.15rem' }}>{selectedStudent.totalSessions}</strong>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '10px' }}>
                    <small style={{ color: 'var(--paz-muted, #66615b)' }}>Minutos activos</small>
                    <strong style={{ display: 'block', fontSize: '1.15rem', color: '#17603a' }}>{selectedStudent.totalActiveMinutes} min</strong>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '10px' }}>
                    <small style={{ color: 'var(--paz-muted, #66615b)' }}>Avance global</small>
                    <strong style={{ display: 'block', fontSize: '1.15rem' }}>{selectedStudent.overallProgressPercent}%</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 4: CÓDIGOS DE ACCESO */}
      {tab === 'codigos' && (
        <div>
          <form
            onSubmit={generateManualCode}
            style={{
              background: 'var(--paz-card-bg, #ffffff)',
              borderRadius: '16px',
              border: '1px solid var(--paz-card-border, #e4dacb)',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ flex: '1 1 260px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                Generar código individual por correo autorizado
              </label>
              <input
                type="email"
                required
                placeholder="correo@participante.com"
                value={manualCodeEmail}
                onChange={(e) => setManualCodeEmail(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--paz-input-border, #d4c8b8)' }}
              />
            </div>
            <button
              type="submit"
              className="paz-btn paz-btn--primary paz-btn--small"
              disabled={actionBusy === 'manual_code'}
            >
              <WisdomIcon name="shield" size={14} /> Generar código único
            </button>
          </form>

          <div style={{ overflowX: 'auto', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--paz-card-alt, #faf8f5)', borderBottom: '1px solid var(--paz-card-border, #e4dacb)', textAlign: 'left' }}>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Vista Previa</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Correo Asociado</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Estado</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Emisión</th>
                  <th style={{ padding: '0.8rem 0.9rem' }}>Uso</th>
                  <th style={{ padding: '0.8rem 0.9rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f2ede4' }}>
                    <td style={{ padding: '0.8rem 0.9rem', fontFamily: 'monospace', fontWeight: 700 }}>{c.codePreview}</td>
                    <td style={{ padding: '0.8rem 0.9rem' }}>{c.email}</td>
                    <td style={{ padding: '0.8rem 0.9rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: c.status === 'redeemed' ? '#eef6ee' : c.status === 'revoked' ? '#fde8e8' : '#fff3e0',
                          color: c.status === 'redeemed' ? '#1b5e20' : c.status === 'revoked' ? '#9b1c1c' : '#b45309',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.8rem 0.9rem' }}>{new Date(c.generatedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '0.8rem 0.9rem' }}>
                      {c.redeemedAt ? `Canjeado el ${new Date(c.redeemedAt).toLocaleDateString()}` : c.revokeReason || 'Sin usar'}
                    </td>
                    <td style={{ padding: '0.8rem 0.9rem', textAlign: 'right', display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      {c.status !== 'redeemed' && (
                        <button
                          type="button"
                          onClick={() => regenerateCode(c.id)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          disabled={actionBusy === `regen_${c.id}`}
                        >
                          Regenerar
                        </button>
                      )}
                      {c.status !== 'redeemed' && c.status !== 'revoked' && (
                        <button
                          type="button"
                          onClick={() => revokeCode(c.id)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          style={{ color: '#9b1c1c' }}
                          disabled={actionBusy === `rev_${c.id}`}
                        >
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: ADMINISTRADORES (4) */}
      {tab === 'admins' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Equipo Administrativo del Taller (4 Administradores)</h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.86rem', color: 'var(--paz-muted, #66615b)' }}>
              Gabby, Samuel, Mauricio y Karen cuentan con permisos equivalentes dentro del CRM del taller. Registra el correo real de quien falte para generar su acceso individual con cambio obligatorio de contraseña.
            </p>
          </div>

          {provisionedCred && (
            <div style={{ padding: '1rem 1.25rem', borderRadius: '14px', background: '#eef6ee', border: '1px solid #a3d9a5', marginBottom: '1.25rem' }}>
              <strong>{provisionedCred.mensaje}</strong>
              {provisionedCred.temporaryPassword && (
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace', background: 'var(--paz-card-bg, #ffffff)', padding: '0.6rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Usuario: <strong>{provisionedCred.email}</strong> | Clave temporal: <strong>{provisionedCred.temporaryPassword}</strong>
                  </span>
                  <button
                    type="button"
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    onClick={() =>
                      navigator.clipboard.writeText(
                        `Acceso Admin Wisdom Academy\nUsuario: ${provisionedCred.email}\nContraseña temporal: ${provisionedCred.temporaryPassword}\nIngresa en /login y cambia tu contraseña.`
                      )
                    }
                  >
                    Copiar acceso
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem' }}>
            {admins.map((adm) => (
              <article
                key={adm.key}
                style={{
                  background: 'var(--paz-card-bg, #ffffff)',
                  borderRadius: '16px',
                  border: '1px solid var(--paz-card-border, #e4dacb)',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{adm.name}</strong>
                  <span
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '999px',
                      fontSize: '0.73rem',
                      fontWeight: 700,
                      background: adm.configured ? '#eef6ee' : '#fff3e0',
                      color: adm.configured ? '#1b5e20' : '#b45309',
                    }}
                  >
                    {adm.configured ? 'Activo' : 'Pendiente de correo'}
                  </span>
                </div>

                {adm.configured ? (
                  <div style={{ fontSize: '0.84rem', color: 'var(--paz-ink-soft, #4a463a)', lineHeight: 1.5 }}>
                    <div>Correo: <strong>{adm.email}</strong></div>
                    <div>Roles: <code>{adm.roles.join(', ')}</code></div>
                    <div>Recuperación de contraseña: <Link href="/recuperar-acceso" style={{ color: 'var(--paz-accent-text, #8f4e38)', textDecoration: 'underline' }}>Disponible</Link></div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '0.55rem', marginTop: '0.5rem' }}>
                    <input
                      type="email"
                      placeholder={`Correo real de ${adm.name}`}
                      value={adminEmails[adm.name] || ''}
                      onChange={(e) => setAdminEmails((prev) => ({ ...prev, [adm.name]: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid var(--paz-input-border, #d4c8b8)', fontSize: '0.86rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => provisionWorkshopAdmin(adm.name)}
                      className="paz-btn paz-btn--primary paz-btn--small"
                      disabled={actionBusy === `admin_${adm.name}`}
                    >
                      Crear acceso individual
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 6: AUDITORÍA */}
      {tab === 'auditoria' && (
        <div style={{ overflowX: 'auto', background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--paz-card-alt, #faf8f5)', borderBottom: '1px solid var(--paz-card-border, #e4dacb)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.9rem' }}>Fecha / Hora</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Administrador</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Operación</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Entidad</th>
                <th style={{ padding: '0.75rem 0.9rem' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f2ede4' }}>
                  <td style={{ padding: '0.75rem 0.9rem', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 0.9rem' }}>{log.actor_email || 'Sistema'}</td>
                  <td style={{ padding: '0.75rem 0.9rem', fontFamily: 'monospace', fontWeight: 700 }}>{log.action}</td>
                  <td style={{ padding: '0.75rem 0.9rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.entity_id}</td>
                  <td style={{ padding: '0.75rem 0.9rem', fontSize: '0.78rem', color: '#5c5847', maxWidth: '380px', wordBreak: 'break-word' }}>
                    {log.after_json || log.before_json || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PESTAÑA 7: CLASES & CONTENIDOS */}
      {tab === 'clases' && (
        <div style={{ background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Estado de las 4 clases en el aula privada</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--paz-muted, #66615b)' }}>
            Los videos se reproducen exclusivamente dentro de <code>/cursos/paz-en-la-mesa</code> para participantes con acceso activo.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { num: 1, title: 'La Mesa — Mesa Limpia', videoId: 'Fiv6IQ-omIs', ready: true },
              { num: 2, title: 'El Bolsillo — Bolsillos con Propósito', videoId: '2QsNl6rIEzA', ready: true },
              { num: 3, title: 'El Corazón — Bitácora de discernimiento y mapa profético', videoId: 'r0jVCPHmYZ0', ready: true },
              { num: 4, title: 'Fuego en el Hogar — Reto de 7 días de altar familiar', videoId: 'AB6t2eO0SWk', ready: true },
            ].map((c) => (
              <div key={c.num} style={{ padding: '1rem', borderRadius: '12px', background: 'var(--paz-card-alt, #faf8f5)', border: '1px solid var(--paz-card-border, #e4dacb)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <strong>Clase 0{c.num}: {c.title}</strong>
                <span
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    background: c.ready ? '#eef6ee' : '#fff3e0',
                    color: c.ready ? '#1b5e20' : '#b45309',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {c.ready ? `Video disponible (ID: ${c.videoId})` : 'Próximamente'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 8: SHEETS SYNC */}
      {tab === 'google_sync' && (
        <div style={{ background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Sincronización documental en 6 pestañas</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: 'var(--paz-muted, #66615b)' }}>
            Réplica estructurada para Google Sheets: <code>INSCRITOS</code>, <code>PAGOS</code>, <code>CODIGOS_ACCESO</code>, <code>HISTORIAL_INGRESOS</code>, <code>ACTIVIDAD_TALLER</code> y <code>RESUMEN_GENERAL</code>.
          </p>
          <button
            type="button"
            onClick={downloadSheetsReplica}
            className="paz-btn paz-btn--primary"
            disabled={actionBusy === 'replica'}
          >
            <WisdomIcon name="download" size={15} /> Descargar réplica completa en JSON
          </button>
        </div>
      )}

      {/* PESTAÑA 9: ACCESOS DE PRUEBA */}
      {tab === 'pruebas' && (
        <div style={{ background: 'var(--paz-card-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--paz-card-border, #e4dacb)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>3 Accesos de prueba deterministas</h3>
              <small style={{ color: 'var(--paz-muted, #66615b)' }}>Para validar experiencia de estudiante en los 3 escenarios sin alterar KPIs reales.</small>
            </div>
            <button
              type="button"
              onClick={seedAccounts}
              className="paz-btn paz-btn--primary paz-btn--small"
              disabled={actionBusy === 'seed'}
            >
              Aprovisionar / Verificar Cuentas
            </button>
          </div>
          <Link href="/login" target="_blank" className="paz-btn paz-btn--ghost paz-btn--small">
            Abrir pantalla de login
          </Link>
        </div>
      )}
    </div>
  );
}
