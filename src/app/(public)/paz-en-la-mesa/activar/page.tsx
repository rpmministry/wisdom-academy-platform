import React from 'react';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PazCodeActivationForm } from '@/components/paz/PazCodeActivationForm';

export const metadata: Metadata = {
  title: 'Activar acceso por transferencia bancaria | Paz en la mesa · Wisdom Academy',
  description:
    'Valida tu código de seguridad de 25 caracteres para activar tu cuenta y acceder a las 4 clases del taller Paz en la mesa, orden en el bolsillo y fuego en el corazón.',
};

export const dynamic = 'force-dynamic';

export default function PazActivarPage() {
  return (
    <main className="paz-world" style={{ minHeight: '100dvh', background: '#fdfbf7' }}>
      <PublicHeader />
      <div style={{ padding: '2rem 1rem' }}>
        <PazCodeActivationForm />
      </div>
    </main>
  );
}
