import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/server/config';

/**
 * Evita que una visita anónima a un área privada caiga en un login genérico:
 * la ruta solicitada se conserva en `next` y el formulario devuelve al usuario
 * exactamente al punto de partida. La validación real de la sesión sigue
 * ocurriendo en el servidor de cada página y en cada API.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }
  const login = new URL('/login', request.url);
  login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/cursos/:path*',
    '/aula/:path*',
    '/contenidos/:path*',
    '/mi-acceso/:path*',
    '/recurso/:path*',
    '/admin/:path*',
  ],
};
