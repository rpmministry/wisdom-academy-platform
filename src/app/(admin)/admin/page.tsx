'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Portal Administrativo y Legal
 * ARCHIVO: src/app/(admin)/admin/page.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Renderiza el panel administrativo de Wisdom Academy:
 * 1. Control de usuarios y matrículas escolares.
 * 2. Emisión y cálculo de Boletines Trimestrales oficiales del Ecuador (MINEDUC).
 * 3. Generación y validación de Certificados de cursos libres con QR y hash SHA-256.
 * 4. Catálogo curricular de los 14 años de educación y talleres extracurriculares.
 * ==============================================================================
 */

import React from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <main>
      <AdminDashboard />
    </main>
  );
}

