import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { requirePagePermission } from '@/server/auth/pageAuth';
import { listPazPaymentIntents } from '@/server/domain/paz';
import { PazPaymentsAdmin } from '@/components/admin/PazPaymentsAdmin';

export const metadata: Metadata = {
  title: 'Pagos Paz en la mesa | Wisdom Academy',
};

export const dynamic = 'force-dynamic';

export default async function PazPaymentsAdminPage() {
  await requirePagePermission('orders.manage');
  const payments = listPazPaymentIntents('pending');
  return (
    <main>
      <div style={{ padding: '1rem 1rem 0' }}>
        <Link href="/admin?tab=crm" style={{ fontSize: '0.82rem' }}>
          ← Volver al CRM
        </Link>
      </div>
      <PazPaymentsAdmin initialPayments={payments} />
    </main>
  );
}
