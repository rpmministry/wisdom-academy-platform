import type { Metadata } from 'next';
import { PazEnLaMesaLanding } from '@/components/paz/PazEnLaMesaLanding';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';

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

export default function PazEnLaMesaPage() {
  return <PazEnLaMesaLanding />;
}
