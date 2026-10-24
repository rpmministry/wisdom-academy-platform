/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Layout Raíz de Aplicación Web (PWA)
 * ARCHIVO: src/app/layout.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Componente de diseño raíz para Next.js (App Router). Configura:
 * 1. Tipografías autohospedadas con licencia SIL OFL:
 *    - Bricolage Grotesque: titulares de marca y portada.
 *    - Schibsted Grotesk: cuerpo, navegación y controles de interfaz.
 *    - IBM Plex Mono: métricas, códigos de Moodle y rúbricas.
 * 2. Inyección de metadatos PWA conforme a /public/brand/favicon/head-snippet.html.
 * 3. Integración global del sistema de diseño (tokens.css y Carbon 2x Grid).
 * ==============================================================================
 */

import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/carbon-grid.css';
import '@/styles/components.css';
import '@/styles/marketing.css';
import '@/styles/responsive.css';
import '@/styles/educational-resources.css';
import '@/styles/platform-ui.css';
import '@/styles/courses.css';
import '@/styles/course-lms.css';
import '@/styles/resource-detail.css';
import '@/styles/lesson-workspace.css';
import '@/styles/meetings.css';
import '@/styles/admin-workspace.css';
import '@/styles/portal-shell.css';
import '@/styles/storefront.css';
import { AuthProvider } from '@/lib/auth/authContext';
import { CartProvider } from '@/lib/cart/cartContext';

/**
 * Evita que una compilación local con APP_URL=http://localhost:3000 publique
 * metadatos Open Graph con esa dirección. En producción se debe definir
 * APP_URL o NEXT_PUBLIC_APP_URL con el dominio HTTPS real.
 */
function publicSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '';
  if (configured && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)) {
    return configured.replace(/\/$/, '');
  }
  return 'https://wisdomacademy.edu.ec';
}

/**
 * Metadatos PWA y Open Graph alineados con los activos de marca de Wisdom Academy.
 */
export const metadata: Metadata = {
  metadataBase: new URL(publicSiteUrl()),
  title: 'Wisdom Academy — Educación integral, homeschool, cursos y talleres',
  description:
    'Plataforma educativa integral y bilingüe: educación básica, apoyo homeschool, cursos y talleres con acompañamiento académico, recursos digitales y acceso verificado.',
  applicationName: 'Wisdom Academy',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Wisdom Academy — Educación integral, homeschool, cursos y talleres',
    description:
      'Educación básica, apoyo homeschool, cursos y talleres con acompañamiento académico, recursos digitales y acceso verificado.',
    url: publicSiteUrl(),
    siteName: 'Wisdom Academy',
    images: [
      {
        url: '/brand/social/og-image-blue-dark.png',
        width: 1200,
        height: 630,
        alt: 'Wisdom Academy — Educación integral, homeschool, cursos y talleres',
      },
    ],
    locale: 'es_EC',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Wisdom Academy — Educación integral, homeschool, cursos y talleres',
    description:
      'Educación básica, apoyo homeschool, cursos y talleres con acompañamiento académico y acceso verificado.',
    images: ['/brand/social/og-image-blue-dark.png'],
  },
};

/**
 * Configuración del Viewport para dispositivos móviles y PWA.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Componente de diseño raíz (RootLayout)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('wa_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();",
          }}
        />
        <link
          rel="preload"
          href="/fonts/schibsted-grotesk-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/bricolage-grotesque-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <CartProvider>
          <AuthProvider>{children}</AuthProvider>
        </CartProvider>
      </body>
    </html>
  );
}
