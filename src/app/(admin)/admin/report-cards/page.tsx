import React from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

export default function AdminReportCardsPage() {
  return <AdminDashboard initialTab="boletines" allowInitialTab />;
}

