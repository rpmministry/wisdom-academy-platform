import type { Metadata } from 'next';
import { PazEnLaMesaLanding } from '@/components/paz/PazEnLaMesaLanding';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { getPageUser } from '@/server/auth/pageAuth';
import { hasPermission } from '@/server/auth/authorization';

export const metadata: Metadata = {
  title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón | Wisdom Academy',
  description:
    'Taller de fin de año con Samuel y Gabby Palacio: 4 clases para sanar tu mesa, ordenar tu economía, oír a Dios y encender tu hogar. Preventa USD 27 por hogar.',
  openGraph: {
    title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
    description:
      '4 clases magistrales, cuaderno de 24 páginas, sesión en vivo y reto de 7 días. Estreno el 8 de diciembre de 2026.',
    images: [{ url: PAZ_BRAND.ogImage }],
  },
};

export const dynamic = 'force-dynamic';

export default async function PazEnLaMesaPage() {
  const user = await getPageUser();
  const showAdminNav = Boolean(user && hasPermission(user, 'orders.manage'));
  return <PazEnLaMesaLanding showAdminNav={showAdminNav} />;
}
