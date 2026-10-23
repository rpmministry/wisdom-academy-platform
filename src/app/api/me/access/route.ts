import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import {
  accessibleResources,
  listUserEntitlements,
  listUserGlobalGrants,
} from '@/server/domain/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const entitlements = listUserEntitlements(user.id);
    const globalGrants = listUserGlobalGrants(user.id);
    const resources = accessibleResources(user).map((resource) => ({
      id: resource.id,
      slug: resource.slug,
      type: resource.type,
      title: resource.title,
      description: resource.description,
    }));
    return NextResponse.json(
      {
        ok: true,
        accesoContenidoGlobal: user.hasGlobalContentAccess,
        derechos: entitlements,
        accesosGlobales: globalGrants,
        recursos: resources,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
