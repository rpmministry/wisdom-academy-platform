import type { Metadata } from 'next';
import Link from 'next/link';
import { PazUnifiedEnrollment } from '@/components/paz/PazUnifiedEnrollment';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { pazBankDetails } from '@/lib/paz-en-la-mesa/server';
import { pazPhaseAt } from '@/lib/paz-en-la-mesa/config';

export const metadata: Metadata = {
  title: 'Inscripción Oficial · Paz en la mesa | Wisdom Academy',
  description:
    'Inscripción oficial al taller Paz en la mesa, orden en el bolsillo y fuego en el corazón con Samuel y Gabby Palacio. Paga en línea con PayPhone o transferencia.',
};

export const dynamic = 'force-dynamic';

export default async function PazInscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; method?: string }>;
}) {
  const params = await searchParams;
  const plan =
    params.plan === 'official' || params.plan === 'scholarship'
      ? params.plan
      : 'presale';
  const method = params.method === 'bank_transfer' ? 'bank_transfer' : 'payphone';

  const bank = pazBankDetails();
  const phase = pazPhaseAt();

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#f9f6f0',
        padding: 'clamp(1.5rem, 4vw, 3rem) 1rem',
        fontFamily: 'var(--paz-sans, sans-serif)',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* ENLACE DE RETORNO Y LOGO */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <Link
            href="/paz-en-la-mesa"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#8f4e38',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.92rem',
            }}
          >
            <WisdomIcon name="arrow-right" size={15} style={{ transform: 'rotate(180deg)' }} />
            Volver a la presentación completa del taller
          </Link>

          <span
            style={{
              fontSize: '0.82rem',
              color: '#7a7256',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Wisdom Academy · Taller Oficial
          </span>
        </div>

        {/* CABECERA DE PRIMERA VISTA */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              background: 'rgba(197, 160, 89, 0.18)',
              color: '#8f4e38',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '0.75rem',
            }}
          >
            Inscripción y Acceso Inmediato
          </span>
          <h1
            style={{
              margin: '0 0 0.5rem',
              fontSize: 'clamp(1.7rem, 4vw, 2.3rem)',
              fontFamily: 'var(--paz-serif, serif)',
              color: '#2b2927',
              lineHeight: 1.25,
            }}
          >
            Paz en la mesa, orden en el bolsillo y fuego en el corazón
          </h1>
          <p
            style={{
              margin: '0 auto',
              maxWidth: '580px',
              color: '#5c5847',
              fontSize: '0.96rem',
              lineHeight: 1.5,
            }}
          >
            Completa tus datos a continuación y procesa tu pago en línea con PayPhone o transferencia bancaria directa.
          </p>
        </div>

        {/* CAJA DE INSCRIPCIÓN Y PAGOS (DE PRIMERA VISTA) */}
        <PazUnifiedEnrollment
          initialPlan={plan}
          initialMethod={method}
          phase={phase}
          bank={bank}
          id="inscripcion-directa"
        />

        {/* PIE DE SEGURIDAD */}
        <div
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#8a8379',
          }}
        >
          {PAZ_BRAND.institution} · {PAZ_BRAND.hosts} · {PAZ_BRAND.foundation}
        </div>
      </div>
    </main>
  );
}
