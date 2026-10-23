import { requirePagePermission } from '@/server/auth/pageAuth';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const dynamic = 'force-dynamic';

/**
 * El CRM comparte el mismo workspace administrativo.
 * La ruta antigua sigue funcionando, pero muestra el shell unificado con el
 * CRM activo en lugar de una interfaz paralela.
 */
export default async function CrmPage() {
  await requirePagePermission('crm.access');
  return <AdminDashboard initialTab="crm" />;
}
