import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { requirePagePermission } from '@/server/auth/pageAuth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission('admin.access');
  return <AuthGuard requireAdmin>{children}</AuthGuard>;
}
