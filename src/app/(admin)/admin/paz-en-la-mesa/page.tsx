import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePagePermission } from '@/server/auth/pageAuth';
import { PazWorkshopAdminCenter } from '@/components/admin/PazWorkshopAdminCenter';

export const metadata: Metadata = {
  title: 'Paz en la mesa · Administración y Analítica | Wisdom Academy',
};

export const dynamic = 'force-dynamic';

export default async function PazAdminPage() {
  await requirePagePermission('orders.manage');
  return (
    <main>
      <div style={{ padding: '1rem 1rem 0', maxWidth: '1240px', margin: '0 auto' }}>
        <Link href="/admin?tab=crm" style={{ fontSize: '0.85rem', color: '#8f4e38', fontWeight: 600 }}>
          ← Volver al Panel de Administración
        </Link>
      </div>
      <PazWorkshopAdminCenter />
    </main>
  );
}
