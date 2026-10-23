import type { Metadata } from 'next';
import { CatalogExperience } from '@/components/catalog/CatalogExperience';

export const metadata: Metadata = {
  title: 'Catálogo de programas, cursos y talleres — Wisdom Academy',
  description:
    'Explora programas homeschool, grados, talleres profesionales y recursos digitales. Cada producto enumera sus recursos y el acceso se verifica en el servidor.',
};

export default function CatalogPage() {
  return <CatalogExperience />;
}
