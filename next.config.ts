import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad comunes a la aplicación.
 *
 * No se define una Content-Security-Policy estricta todavía: la interfaz usa
 * scripts inline para el tema y estilos inline heredados, y una política
 * incompleta rompería el aula o los reproductores. La CSP debe implementarse
 * con nonces cuando se complete la migración de estilos; hasta entonces se
 * mantienen los controles que no afectan a la funcionalidad existente.
 */
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin-allow-popups',
  },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
