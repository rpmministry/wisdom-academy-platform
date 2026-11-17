import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPageUser } from '@/server/auth/pageAuth';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazEnrollmentPanel } from '@/components/paz/PazEnrollmentPanel';
import { PAZ_BRAND, PAZ_PRICING } from '@/lib/paz-en-la-mesa/content';
import {
  formatPazUsd,
  pazPhaseAt,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';
import { pazBankDetails, pazPayphoneUrl } from '@/lib/paz-en-la-mesa/server';

export const metadata: Metadata = {
  title: 'Inscripción · Paz en la mesa | Wisdom Academy',
  description:
    'Reserva tu lugar en el taller Paz en la mesa. Preventa USD 27 por hogar, precio oficial USD 37. Pago por transferencia o PayPhone.',
};

export const dynamic = 'force-dynamic';

const NEXT_PATH = '/paz-en-la-mesa/inscripcion';

export default async function PazEnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; method?: string }>;
}) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();
  if (params.plan) nextParams.set('plan', params.plan);
  if (params.method) nextParams.set('method', params.method);
  const nextPath = `${NEXT_PATH}${nextParams.size ? `?${nextParams.toString()}` : ''}`;

  const user = await getPageUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (user.mustChangePassword) {
    redirect(`/cambiar-contrasena?next=${encodeURIComponent(nextPath)}`);
  }

  const phase = pazPhaseAt();
  const initialPlan =
    params.plan === 'official' || params.plan === 'scholarship' ? params.plan : 'presale';
  const initialMethod = params.method === 'payphone' ? 'payphone' : 'bank_transfer';
  const bank = pazBankDetails();
  const payphoneUrl = pazPayphoneUrl() || pazPublicConfig.payphoneUrl;
  const whatsappUrl = pazPublicConfig.whatsappUrl;

  return (
    <main className="paz-world">
      <PublicHeader />
      <section className="paz-section" style={{ paddingTop: '1.5rem' }}>
        <div className="paz-container paz-container--narrow">
          <nav className="paz-breadcrumbs" aria-label="Migas de pan">
            <Link href="/">Inicio</Link>
            <span>·</span>
            <Link href="/paz-en-la-mesa">Paz en la mesa</Link>
            <span>·</span>
            <strong>Inscripción</strong>
          </nav>

          <div className="paz-section-head" style={{ marginBottom: '1.5rem' }}>
            <span className="paz-kicker">
              <WisdomIcon name="credit-card" size={13} /> Reserva tu lugar
            </span>
            <h1 className="paz-h2">Inscripción al taller</h1>
            <p className="paz-lead">
              Un solo acceso por hogar. Elige tu plan y método de pago; el equipo validará el
              pago antes de activar las clases.
            </p>
          </div>

          <div className="paz-enroll-grid">
            <PazEnrollmentPanel
              userEmail={user.email}
              userName={user.displayName || ''}
              phase={phase}
              initialPlan={initialPlan}
              initialMethod={initialMethod}
              bank={bank}
              payphoneUrl={payphoneUrl}
              whatsappUrl={whatsappUrl}
            />

            <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div className="paz-payment">
                <h3>Resumen del taller</h3>
                <p>{PAZ_BRAND.subtitle}</p>
                <dl>
                  <div>
                    <dt>Preventa</dt>
                    <dd>{formatPazUsd(PAZ_PRICING.presaleCents)} por hogar</dd>
                  </div>
                  <div>
                    <dt>Precio oficial</dt>
                    <dd>{formatPazUsd(PAZ_PRICING.officialCents)} por hogar</dd>
                  </div>
                  <div>
                    <dt>Incluye</dt>
                    <dd style={{ textAlign: 'right' }}>4 clases, cuaderno PDF, sesión en vivo y reto</dd>
                  </div>
                </dl>
              </div>

              <div className="paz-payment">
                <h3>¿Necesitas ayuda?</h3>
                <p>
                  Escríbenos a <strong>{bank.email}</strong> o únete a la comunidad oficial.
                </p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="paz-btn paz-btn--olive paz-btn--small"
                    style={{ marginTop: '0.6rem' }}
                  >
                    <WisdomIcon name="users" size={15} /> WhatsApp oficial
                  </a>
                )}
              </div>

              <div className="paz-alert paz-alert--info">
                <strong>Política de acceso:</strong> el precio es por hogar. Las clases se
                liberan el 8 de diciembre de 2026 y el acceso se mantiene durante 12 meses.
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
