'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { formatPazUsd } from '@/lib/paz-en-la-mesa/config';
import type { PazGeneralKpis, PazStudentDetailView } from '@/server/domain/pazAnalytics';
import type { PazAccessCodeView } from '@/server/domain/pazAccessCodes';
import type { PazPaymentIntentView } from '@/server/domain/paz';
import type { PazTestAccountInfo } from '@/server/domain/pazSeedAccounts';

type AdminTab = 'resumen' | 'estudiantes' | 'codigos' | 'clases' | 'google_sync' | 'pruebas';

export function PazWorkshopAdminCenter() {
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [kpis, setKpis] = useState<PazGeneralKpis | null>(null);
  const [payments, setPayments] = useState<PazPaymentIntentView[]>([]);
  const [codes, setCodes] = useState<PazAccessCodeView[]>([]);
  const [testAccounts, setTestAccounts] = useState<PazTestAccountInfo[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<PazStudentDetailView | null>(null);

  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [includeTest, setIncludeTest] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal para código recién generado
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<{
    rawCode: string;
    email: string;
    codePreview: string;
  } | null>(null);

  // Carga de datos principales
  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [kpiRes, payRes, codeRes] = await Promise.all([
        apiFetch<{ kpis: PazGeneralKpis }>(`/api/paz/analytics?includeTest=${includeTest ? '1' : '0'}`),
        apiFetch<{ pagos: PazPaymentIntentView[] }>('/api/paz/payments'),
        apiFetch<{ codes: PazAccessCodeView[] }>(`/api/paz/codes?includeTest=${includeTest ? '1' : '0'}`),
      ]);
      setKpis(kpiRes.kpis);
      setPayments(payRes.pagos);
      setCodes(codeRes.codes);
    } catch (err: unknown) {
      setMessage(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [includeTest]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Cargar estudiante individual
  const viewStudent = async (userId: string) => {
    setActionBusy(userId);
    try {
      const res = await apiFetch<{ student: PazStudentDetailView }>(`/api/paz/students/${userId}`);
      setSelectedStudent(res.student);
    } catch (err: unknown) {
      setMessage(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Aprobar transferencia y generar código de 25 caracteres
  const approveAndGenerateCode = async (intent: PazPaymentIntentView) => {
    setActionBusy(`gen_${intent.id}`);
    setMessage(null);
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

      await loadData();
    } catch (err: unknown) {
      setMessage(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Revocar código
  const revokeCode = async (codeId: string) => {
    const reason = window.prompt('Ingresa el motivo de revocación del código:');
    if (!reason) return;
    setActionBusy(`rev_${codeId}`);
    try {
      await apiFetch(`/api/paz/codes/${codeId}/revoke`, {
        method: 'POST',
        body: { reason },
      });
      setMessage('Código de acceso revocado correctamente.');
      await loadData();
    } catch (err: unknown) {
      setMessage(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Aprovisionar las 3 cuentas de prueba
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
      setMessage(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  // Descargar réplica Google Sheets en JSON
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
      setMessage(errorMessage(err));
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div
      style={{
        maxWidth: '1240px',
        margin: '1.5rem auto',
        padding: '0 1rem',
        fontFamily: 'var(--paz-sans, sans-serif)',
        color: '#2b2927',
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #e4dacb',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: '#8f4e38',
              letterSpacing: '0.06em',
            }}
          >
            <WisdomIcon name="shield" size={13} /> Centro de Control Exclusivo
          </span>
          <h1
            style={{
              fontFamily: 'var(--paz-serif, serif)',
              fontSize: '1.85rem',
              margin: '0.25rem 0',
              lineHeight: 1.2,
            }}
          >
            Paz en la mesa · Administración y Analítica
          </h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#66615b' }}>
            Control de participantes, verificación de transferencias, emisión de códigos de 25 caracteres y métricas en vivo.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.82rem',
              background: '#f2ede4',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={includeTest}
              onChange={(e) => setIncludeTest(e.target.checked)}
            />
            Incluir cuentas de prueba en KPIs
          </label>
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

      {message && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: '#eef6ee',
            border: '1px solid #a3d9a5',
            color: '#1b5e20',
            fontSize: '0.88rem',
            marginBottom: '1.5rem',
          }}
        >
          {message}
        </div>
      )}

      {/* Pestañas */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e4dacb',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { id: 'resumen', label: 'Resumen & Analítica', icon: 'chart' },
          { id: 'estudiantes', label: `Participantes (${payments.length})`, icon: 'users' },
          { id: 'codigos', label: `Códigos 25 Caracteres (${codes.length})`, icon: 'shield' },
          { id: 'clases', label: 'Clases & Contenidos (4)', icon: 'video' },
          { id: 'google_sync', label: 'Sincronización Sheets', icon: 'file-text' },
          { id: 'pruebas', label: 'Accesos de Prueba', icon: 'award' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as AdminTab)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.75rem 1.1rem',
              border: 'none',
              background: tab === t.id ? '#ffffff' : 'transparent',
              borderBottom: tab === t.id ? '3px solid #8f4e38' : '3px solid transparent',
              color: tab === t.id ? '#8f4e38' : '#66615b',
              fontWeight: tab === t.id ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.9rem',
              borderRadius: '8px 8px 0 0',
            }}
          >
            <WisdomIcon name={t.icon as any} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* MODAL DE CÓDIGO GENERADO */}
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
              background: '#ffffff',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(143,78,56,0.12)',
                  color: '#8f4e38',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <WisdomIcon name="shield" size={26} />
              </div>
              <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.35rem 0' }}>
                Código único de 25 caracteres generado
              </h2>
              <p style={{ fontSize: '0.86rem', color: '#66615b', margin: 0 }}>
                Este código se entrega una sola vez al estudiante para activar su cuenta.
              </p>
            </div>

            <div
              style={{
                background: '#faf8f5',
                border: '1px solid #e4dacb',
                padding: '1rem',
                borderRadius: '12px',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: '#7a7256', display: 'block', marginBottom: '0.3rem' }}>
                Asociado a: <strong>{newlyGeneratedCode.email}</strong>
              </span>
              <div
                style={{
                  fontSize: '1.3rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: '#2b2927',
                  letterSpacing: '0.08em',
                  padding: '0.5rem',
                }}
              >
                {newlyGeneratedCode.rawCode}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newlyGeneratedCode.rawCode);
                  alert('Código copiado al portapapeles.');
                }}
                className="paz-btn paz-btn--primary"
                style={{ justifyContent: 'center' }}
              >
                <WisdomIcon name="file-text" size={15} /> Copiar código único
              </button>

              <button
                type="button"
                onClick={() => {
                  const msg = `¡Hola! Tu transferencia para el taller "Paz en la mesa" ha sido verificada en Wisdom Academy. Tu código de acceso único es: ${newlyGeneratedCode.rawCode}\n\nActívalo ingresando a: https://wisdomacademy.alsiztech.com/paz-en-la-mesa/activar`;
                  navigator.clipboard.writeText(msg);
                  alert('Plantilla de WhatsApp copiada al portapapeles.');
                }}
                className="paz-btn paz-btn--olive"
                style={{ justifyContent: 'center' }}
              >
                <WisdomIcon name="users" size={15} /> Copiar mensaje para WhatsApp
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

      {/* PESTAÑA 1: RESUMEN & ANALÍTICA */}
      {tab === 'resumen' && kpis && (
        <div>
          {/* Tarjetas KPI */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ padding: '1.25rem', borderRadius: '16px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
              <span style={{ fontSize: '0.8rem', color: '#7a7256', fontWeight: 600 }}>Total Inscritos Habilitados</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2b2927', margin: '0.2rem 0' }}>{kpis.totalEnrolled}</div>
              <small style={{ color: '#666' }}>{kpis.gatewayEnrolled} pasarela · {kpis.transferEnrolled} transferencia</small>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: '16px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
              <span style={{ fontSize: '0.8rem', color: '#7a7256', fontWeight: 600 }}>Participaron al menos 1 vez</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#17603a', margin: '0.2rem 0' }}>{kpis.loggedInAtLeastOnce}</div>
              <small style={{ color: '#666' }}>{kpis.neverLoggedIn} todavía no ingresan</small>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: '16px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
              <span style={{ fontSize: '0.8rem', color: '#7a7256', fontWeight: 600 }}>Activos recientes (48h)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8f4e38', margin: '0.2rem 0' }}>{kpis.recentlyActiveCount}</div>
              <small style={{ color: '#666' }}>Estudiantes en plataforma</small>
            </div>

            <div style={{ padding: '1.25rem', borderRadius: '16px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
              <span style={{ fontSize: '0.8rem', color: '#7a7256', fontWeight: 600 }}>Tiempo Activo Real Acumulado</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a', margin: '0.2rem 0' }}>{kpis.totalActiveHours} h</div>
              <small style={{ color: '#666' }}>Promedio {kpis.averageActiveMinutesPerStudent} min / alumno</small>
            </div>
          </div>

          {/* Desglose por clases */}
          <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e4dacb', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 1rem 0' }}>Participación activa y avance por clase</h3>
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {kpis.classMetrics.map((cm) => (
                <div
                  key={cm.classNumber}
                  style={{
                    padding: '1rem',
                    borderRadius: '12px',
                    background: '#faf8f5',
                    border: '1px solid #e4dacb',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem', display: 'block' }}>{cm.title}</strong>
                    <small style={{ color: '#7a7256' }}>
                      {cm.studentCount} alumnos ingresaron · {cm.completedCount} completaron · {cm.totalVideoPlays} reproducciones de video
                    </small>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#8f4e38' }}>{cm.averageMinutes} min</div>
                    <small style={{ color: '#7a7256' }}>tiempo promedio activo</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: ESTUDIANTES */}
      {tab === 'estudiantes' && (
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                border: '1px solid #d4c8b8',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dacb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e4dacb', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Comprador / Estudiante</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Referencia</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Método</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Valor</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {payments
                  .filter((p) =>
                    searchQuery
                      ? p.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase())
                      : true
                  )
                  .map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f2ede4' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <strong>{p.buyerName}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#666' }}>{p.buyerEmail} · {p.buyerPhone || 'Sin tel'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{p.reference}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>
                          {p.method === 'bank_transfer' ? 'Transferencia' : 'PayPhone'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{formatPazUsd(p.amountCents)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: p.status === 'approved' ? '#eef6ee' : '#fff3e0',
                            color: p.status === 'approved' ? '#1b5e20' : '#e65100',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => viewStudent(p.userId)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          disabled={actionBusy === p.userId}
                        >
                          Ver perfil
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* DETALLE DE ESTUDIANTE SELECCIONADO */}
          {selectedStudent && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1.5rem',
                background: '#faf8f5',
                borderRadius: '16px',
                border: '1px solid #e4dacb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.2rem 0' }}>Historial y Métricas de {selectedStudent.fullName}</h3>
                  <small style={{ color: '#666' }}>{selectedStudent.email} · Registrado el {new Date(selectedStudent.enrolledAt).toLocaleDateString()}</small>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="paz-btn paz-btn--ghost paz-btn--small"
                >
                  Cerrar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px' }}>
                  <small style={{ color: '#666' }}>Sesiones Totales</small>
                  <strong style={{ display: 'block', fontSize: '1.2rem' }}>{selectedStudent.totalSessions}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px' }}>
                  <small style={{ color: '#666' }}>Minutos Activos</small>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: '#17603a' }}>{selectedStudent.totalActiveMinutes} min</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px' }}>
                  <small style={{ color: '#666' }}>Minutos de Video</small>
                  <strong style={{ display: 'block', fontSize: '1.2rem', color: '#8f4e38' }}>{selectedStudent.totalVideoMinutes} min</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#ffffff', borderRadius: '10px' }}>
                  <small style={{ color: '#666' }}>Avance Global</small>
                  <strong style={{ display: 'block', fontSize: '1.2rem' }}>{selectedStudent.overallProgressPercent}%</strong>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: '0.88rem', display: 'block', marginBottom: '0.5rem' }}>Progreso por clases:</strong>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {selectedStudent.classesProgress.map((cp) => (
                    <div
                      key={cp.classNumber}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#ffffff',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.84rem',
                      }}
                    >
                      <span>Clase 0{cp.classNumber}</span>
                      <span>{cp.activeMinutes} min activos · {cp.completed ? 'Completada ✔' : 'En progreso'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 3: CÓDIGOS DE 25 CARACTERES */}
      {tab === 'codigos' && (
        <div>
          <div style={{ marginBottom: '1.5rem', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dacb', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Transferencias pendientes de código</h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.88rem', color: '#666' }}>
              Al aprobar una transferencia bancaria verificada, el sistema genera un código único criptográfico de 25 caracteres para que el participante active su cuenta.
            </p>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {payments
                .filter((p) => p.method === 'bank_transfer' && p.status === 'pending')
                .map((intent) => (
                  <div
                    key={intent.id}
                    style={{
                      padding: '0.9rem 1.1rem',
                      borderRadius: '12px',
                      background: '#faf8f5',
                      border: '1px solid #e4dacb',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <strong>{intent.buyerName}</strong> ({intent.buyerEmail})
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        Ref: {intent.transferReference || 'Sin comprobante adjunto'} · {formatPazUsd(intent.amountCents)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => approveAndGenerateCode(intent)}
                      className="paz-btn paz-btn--primary paz-btn--small"
                      disabled={actionBusy === `gen_${intent.id}`}
                    >
                      <WisdomIcon name="shield" size={14} /> Aprobar y emitir código 25 caracteres
                    </button>
                  </div>
                ))}
              {payments.filter((p) => p.method === 'bank_transfer' && p.status === 'pending').length === 0 && (
                <div style={{ color: '#7a7256', fontSize: '0.88rem', fontStyle: 'italic' }}>
                  No hay transferencias pendientes de verificación en este momento.
                </div>
              )}
            </div>
          </div>

          <h3 style={{ margin: '1.5rem 0 0.75rem 0', fontSize: '1.1rem' }}>Historial de códigos emitidos</h3>
          <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dacb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#faf8f5', borderBottom: '1px solid #e4dacb', textAlign: 'left' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Vista Previa</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Correo Asociado</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Estado</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Fecha Emisión</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Activación</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f2ede4' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700 }}>{c.codePreview}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{c.email}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background:
                            c.status === 'redeemed'
                              ? '#eef6ee'
                              : c.status === 'revoked'
                              ? '#fde8e8'
                              : '#fff3e0',
                          color:
                            c.status === 'redeemed'
                              ? '#1b5e20'
                              : c.status === 'revoked'
                              ? '#9b1c1c'
                              : '#e65100',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>{new Date(c.generatedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {c.redeemedAt ? new Date(c.redeemedAt).toLocaleDateString() : 'Pendiente'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {c.status !== 'redeemed' && c.status !== 'revoked' ? (
                        <button
                          type="button"
                          onClick={() => revokeCode(c.id)}
                          className="paz-btn paz-btn--ghost paz-btn--small"
                          style={{ color: '#c53030' }}
                          disabled={actionBusy === `rev_${c.id}`}
                        >
                          Revocar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: CLASES & CONTENIDOS */}
      {tab === 'clases' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dacb', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Estado de las 4 clases en el aula privada</h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#666' }}>
              Los videos y materiales se reproducen exclusivamente dentro de <code>/cursos/paz-en-la-mesa</code> para estudiantes inscritos con derecho activo.
            </p>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ padding: '1rem', borderRadius: '12px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Clase 01: La Mesa — Limpiar el plato antes de pedir postre</strong>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#eef6ee', color: '#1b5e20', fontSize: '0.75rem', fontWeight: 700 }}>
                    Video editado disponible (ID: Fiv6IQ-omIs)
                  </span>
                </div>
                <small style={{ color: '#666', display: 'block', marginTop: '0.3rem' }}>
                  4 bloques pedagógicos cargados · Protocolo de conversación de fin de año
                </small>
              </div>

              <div style={{ padding: '1rem', borderRadius: '12px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Clase 02: El Bolsillo — Matriz de asignación y presupuesto 2027</strong>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#eef6ee', color: '#1b5e20', fontSize: '0.75rem', fontWeight: 700 }}>
                    Video editado disponible (ID: 2QsNl6rIEzA)
                  </span>
                </div>
                <small style={{ color: '#666', display: 'block', marginTop: '0.3rem' }}>
                  4 bloques pedagógicos cargados · Matriz de asignación y presupuesto 2027
                </small>
              </div>

              {[
                { num: 3, title: 'El Corazón — Bitácora de discernimiento y mapa profético' },
                { num: 4, title: 'El Altar — Reto de 7 días de altar familiar' },
              ].map((c) => (
                <div key={c.num} style={{ padding: '1rem', borderRadius: '12px', background: '#faf8f5', border: '1px solid #e4dacb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>Clase 0{c.num}: {c.title}</strong>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: '#fff3e0', color: '#e65100', fontSize: '0.75rem', fontWeight: 700 }}>
                      Estructura lista · Próximamente estreno
                    </span>
                  </div>
                  <small style={{ color: '#666', display: 'block', marginTop: '0.3rem' }}>
                    4 bloques preparados · Contenido bloqueado hasta fecha de estreno oficial
                  </small>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 5: GOOGLE SHEETS SYNC */}
      {tab === 'google_sync' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dacb', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>Sincronización documental en 6 pestañas</h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.88rem', color: '#666' }}>
            La base de datos de Wisdom Academy mantiene una réplica estructurada para Google Sheets organizada en: <code>INSCRITOS</code>, <code>PAGOS</code>, <code>CODIGOS_ACCESO</code>, <code>HISTORIAL_INGRESOS</code>, <code>ACTIVIDAD_TALLER</code> y <code>RESUMEN_GENERAL</code>.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <button
              type="button"
              onClick={downloadSheetsReplica}
              className="paz-btn paz-btn--primary"
              disabled={actionBusy === 'replica'}
            >
              <WisdomIcon name="download" size={15} /> Descargar réplica completa en JSON/Excel
            </button>
          </div>

          <div style={{ background: '#faf8f5', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e4dacb' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Guía para conectar Google Sheets API oficial:
            </strong>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#5c5847', lineHeight: 1.6 }}>
              <li>Crear un Service Account en Google Cloud Console con permisos para Google Sheets API.</li>
              <li>Crear la hoja en Google Drive con las 6 pestañas mencionadas y compartirla con el correo del Service Account.</li>
              <li>Configurar las variables <code>PAZ_GOOGLE_SHEETS_SPREADSHEET_ID</code> y <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> en <code>.env</code>.</li>
              <li>El motor sincronizará los eventos de la cola automáticamente sin exponer secretos en texto plano.</li>
            </ol>
          </div>
        </div>
      )}

      {/* PESTAÑA 6: ACCESOS DE PRUEBA */}
      {tab === 'pruebas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem 0' }}>3 Accesos de prueba deterministas</h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#666' }}>
                Credenciales listas para que experimentes personalmente toda la plataforma como estudiante en los 3 escenarios.
              </p>
            </div>
            <button
              type="button"
              onClick={seedAccounts}
              className="paz-btn paz-btn--primary paz-btn--small"
              disabled={actionBusy === 'seed'}
            >
              <WisdomIcon name="refresh" size={14} /> Aprovisionar / Verificar Cuentas
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {[
              {
                title: 'Acceso de Prueba 1 · Pago mediante pasarela',
                email: 'paz.estudiante.pasarela@wisdomacademy.test',
                pass: 'PazTest2026!AccesoSeguro',
                badge: 'Simulación Pasarela',
                desc: 'Simula una compra directa con tarjeta o PayPhone. Derecho activo automático tras el pago.',
              },
              {
                title: 'Acceso de Prueba 2 · Transferencia bancaria verificada',
                email: 'paz.estudiante.transferencia@wisdomacademy.test',
                pass: 'PazTest2026!AccesoSeguro',
                badge: 'Código 25 Caracteres',
                desc: 'Simula una transferencia verificada por el admin y canjeada con código criptográfico.',
              },
              {
                title: 'Acceso de Prueba 3 · Autorización administrativa directa',
                email: 'paz.estudiante.admin@wisdomacademy.test',
                pass: 'PazTest2026!AccesoSeguro',
                badge: 'Beca / Directo',
                desc: 'Simula una beca u autorización especial concedida directamente por el administrador.',
              },
            ].map((acc, idx) => (
              <div
                key={acc.email}
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1px solid #e4dacb',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#f2ede4', color: '#8f4e38' }}>
                    {acc.badge}
                  </span>
                  <h4 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1rem' }}>{acc.title}</h4>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#666' }}>{acc.desc}</p>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', background: '#faf8f5', padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'inline-block' }}>
                    Usuario: <strong>{acc.email}</strong> | Clave: <strong>{acc.pass}</strong>
                  </div>
                </div>

                <Link
                  href="/login"
                  target="_blank"
                  className="paz-btn paz-btn--ghost paz-btn--small"
                >
                  <WisdomIcon name="user" size={14} /> Iniciar sesión en nueva pestaña
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
