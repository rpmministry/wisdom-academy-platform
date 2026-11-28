'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Barra superior global de progreso de navegación.
 * Responde de forma inmediata al primer clic en cualquier enlace interno,
 * evitando la sensación de bloqueo o múltiples clics mientras el servidor
 * transmite la siguiente ruta.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const safetyRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (safetyRef.current !== null) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  };

  useEffect(() => {
    clearTimers();
    if (!active) return;
    setProgress(100);
    const doneTimer = window.setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 180);
    return () => window.clearTimeout(doneTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  useEffect(() => {
    const startProgress = () => {
      clearTimers();
      setActive(true);
      setProgress(18);
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          const step = prev < 50 ? 10 : prev < 75 ? 4 : 1.5;
          return Math.min(90, prev + step);
        });
      }, 180);
      safetyRef.current = window.setTimeout(() => {
        clearTimers();
        setActive(false);
        setProgress(0);
      }, 10000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        const currentFull = `${window.location.pathname}${window.location.search}`;
        const nextFull = `${url.pathname}${url.search}`;
        if (currentFull === nextFull) return;
        startProgress();
      } catch {
        // Ignore malformed URLs
      }
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimers();
    };
  }, []);

  if (!active && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #b36a50 0%, #c5a059 100%)',
          boxShadow: '0 0 10px rgba(179, 106, 80, 0.55)',
          transition: progress === 100 ? 'width 140ms ease-out' : 'width 180ms ease',
        }}
      />
    </div>
  );
}

export default NavigationProgress;
