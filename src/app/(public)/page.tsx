import type { Metadata } from 'next';
import { CatalogExperience } from '@/components/catalog/CatalogExperience';

export const metadata: Metadata = {
  title: 'Wisdom Academy — Educación integral, homeschool, cursos y talleres',
  description:
    'Plataforma educativa integral y bilingüe: programas de educación básica, apoyo homeschool, cursos y talleres con acompañamiento académico, recursos digitales y acceso verificado.',
};

export default function HomePage() {
  return <CatalogExperience home />;
}
