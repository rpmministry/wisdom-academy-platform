import React from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PortalShell } from '@/components/layout/PortalShell';
import { requirePageUser } from '@/server/auth/pageAuth';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser();
  return (
    <AuthGuard>
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}
