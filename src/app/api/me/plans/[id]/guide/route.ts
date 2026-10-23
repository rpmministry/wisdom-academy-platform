import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { contentDisposition } from '@/server/http/contentDisposition';
import { prepare } from '@/server/db';
import { hasPermission } from '@/server/auth/authorization';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSession(request);
    const { id } = await context.params;
    const plan = prepare('SELECT * FROM academic_plans WHERE id = ?').get(id) as
      | { id: string; user_id: string; storage_path: string; title: string }
      | undefined;
    if (!plan) throw new ApiError(404, 'PLAN_NOT_FOUND', 'La guía solicitada no existe.');
    if (plan.user_id !== user.id && !hasPermission(user, 'minors.read') && !user.isOwner) {
      throw new ApiError(403, 'PLAN_FORBIDDEN', 'No tienes acceso a esta guía académica.');
    }

    const root = path.resolve(process.cwd(), '.data');
    const absolute = path.resolve(root, plan.storage_path);
    if (!absolute.startsWith(`${root}${path.sep}`)) {
      throw new ApiError(500, 'PLAN_PATH_INVALID', 'La ruta de la guía no es válida.');
    }
    const html = await fs.readFile(absolute, 'utf8');
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': contentDisposition(`guia-${plan.id}.html`, 'inline'),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
