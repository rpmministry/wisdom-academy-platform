import React from 'react';
import { PlatziCoursePlayerLayout } from '@/components/lms/PlatziCoursePlayerLayout';
import { requirePageContentAccess } from '@/server/auth/pageAuth';
import { findResourceBySlug, userCanAccessResource } from '@/server/domain/access';

export const dynamic = 'force-dynamic';

export default async function AulaVirtualPage({
  searchParams,
}: {
  searchParams: Promise<{ recurso?: string }>;
}) {
  const user = await requirePageContentAccess();
  const { recurso } = await searchParams;
  const requested = recurso ? findResourceBySlug(recurso) : null;
  const resource =
    requested && userCanAccessResource(user, requested)
      ? { slug: requested.slug, title: requested.title }
      : null;

  return (
    <main>
      <PlatziCoursePlayerLayout resource={resource} />
    </main>
  );
}
