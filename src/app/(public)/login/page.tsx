'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { apiFetch } from '@/lib/api/client';
import type { RolUsuario } from '@/lib/auth/types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string }
          ) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const {
    autenticar,
    iniciarSesionGoogle,
    tienePermiso,
    usuario,
  } = useAuth();
  const [identificador, setIdentificador] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleListo, setGoogleListo] = useState(false);

  /**
   * Solo acepta rutas internas absolutas. Así el parámetro `next` conserva el
   * checkout o el recurso solicitado sin habilitar redirecciones externas.
   */
  const destinoSolicitado = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('next');
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null;
    return raw.slice(0, 2000);
  }, []);

  const redirigiendo = useRef(false);
  const irAlPortal = useCallback(
    (requiereCambio = false, rol?: RolUsuario) => {
      if (redirigiendo.current) return;
      redirigiendo.current = true;
      const destino = destinoSolicitado();
      if (requiereCambio) {
        router.replace(
          destino
            ? `/cambiar-contrasena?next=${encodeURIComponent(destino)}`
            : '/cambiar-contrasena'
        );
        return;
      }
      if (destino) {
        router.replace(destino);
        return;
      }
      const esAdmin = rol === 'ADMIN' || tienePermiso('admin.access');
      router.replace(esAdmin ? '/admin?tab=crm' : '/dashboard');
    },
    [destinoSolicitado, router, tienePermiso]
  );

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (usuario) irAlPortal(usuario.debeCambiarContrasena, usuario.rol);
  }, [usuario, irAlPortal]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ googleClientId: string | null }>('/api/auth/config')
      .then((config) => {
        if (!cancelled) setGoogleClientId(config.googleClientId);
      })
      .catch(() => {
        if (!cancelled) setGoogleClientId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const manejarCredencialGoogle = useCallback(
    async (credential?: string) => {
      if (!credential || cargando) return;
      setErrorLogin(null);
      setCargando(true);
      try {
        const resultado = await iniciarSesionGoogle(credential);
        if (resultado.exito) {
          irAlPortal(Boolean(resultado.debeCambiarContrasena), resultado.rol);
        } else {
          setErrorLogin(resultado.mensaje);
        }
      } finally {
        setCargando(false);
      }
    },
    [cargando, iniciarSesionGoogle, irAlPortal]
  );

  useEffect(() => {
    if (!googleClientId || googleListo) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const idApi = window.google?.accounts?.id;
      const container = document.getElementById('wa-google-button');
      if (!idApi || !container) return;
      idApi.initialize({
        client_id: googleClientId,
        callback: (response) => manejarCredencialGoogle(response.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      idApi.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'signin_with',
      });
      setGoogleListo(true);
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId, googleListo, manejarCredencialGoogle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hydrated || cargando) return;
    if (!identificador.trim() || !contrasenia) {
      setErrorLogin('Por favor completa todos los campos requeridos.');
      return;
    }
    setErrorLogin(null);
    setCargando(true);
    try {
      const resultado = await autenticar(identificador.trim(), contrasenia);
      if (resultado.exito) {
        irAlPortal(Boolean(resultado.debeCambiarContrasena), resultado.rol);
      } else {
        setErrorLogin(resultado.mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="wa-auth-page">
      <PublicHeader minimal showLogin={false} />

      <main className="wa-auth-main">
        <div className="wa-auth-shell">
          <aside className="wa-auth-brand-panel" aria-label="Presentación de Wisdom Academy">
            <Link href="/" className="wa-auth-brand-top" aria-label="Wisdom Academy">
              <Image
                src="/brand/svg/wisdom-logo-horizontal-white.svg"
                alt="Wisdom Academy"
                width={196}
                height={35}
                priority
              />
            </Link>

            <div className="wa-auth-brand-copy">
              <span className="wa-auth-institution">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/svg/wisdom-icon-on-dark.svg"
                  alt=""
                  width={26}
                  height={26}
                  aria-hidden="true"
                />
                Acceso institucional 2026–2027
              </span>
              <span className="wa-eyebrow">Academia integral y global</span>
              <h1>Aprender con propósito empieza aquí.</h1>
              <p>
                Programas de educación básica, apoyo homeschool, cursos y talleres con
                acompañamiento académico, recursos digitales y proyección internacional.
              </p>

              <ul className="wa-auth-features">
                <li>
                  <WisdomIcon name="shield" size={17} />
                  Acceso personal e intransferible por rol institucional.
                </li>
                <li>
                  <WisdomIcon name="book" size={17} />
                  Currículo adaptable, recursos digitales y evaluaciones.
                </li>
                <li>
                  <WisdomIcon name="chart" size={17} />
                  Seguimiento académico, calificaciones y boletines.
                </li>
              </ul>
            </div>

            <div className="wa-auth-brand-stats" aria-label="Indicadores institucionales">
              <div><strong>+14</strong><span>años de recorrido</span></div>
              <div><strong>200</strong><span>días de referencia</span></div>
              <div><strong>100%</strong><span>acceso verificado</span></div>
            </div>

            <p className="wa-auth-brand-foot">Comunidad global · Aprendizaje sin fronteras</p>
          </aside>

          <section className="wa-auth-form-panel">
            <div className="wa-auth-form-inner">
              <div className="wa-auth-form-head">
                <span className="wa-eyebrow">Acceso a la comunidad</span>
                <h2>Bienvenido de nuevo</h2>
                <p>Ingresa con las credenciales de tu cuenta institucional.</p>
              </div>

              <Card variant="surface" padding="lg" className="wa-auth-card">
                {googleClientId && (
                  <div className="wa-auth-google">
                    <div
                      id="wa-google-button"
                      style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }}
                      aria-label="Iniciar sesión con Google"
                    />
                    <div className="wa-auth-divider">
                      <span />
                      o con contraseña
                      <span />
                    </div>
                  </div>
                )}

                {errorLogin && (
                  <div id="login-error" role="alert" aria-live="polite" className="wa-auth-error">
                    <WisdomIcon name="shield" size={17} />
                    <span>{errorLogin}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="wa-auth-form" data-hydrated={hydrated ? 'true' : 'false'}>
                  <label className="wa-auth-field" htmlFor="login-identificador">
                    <span>Usuario o correo institucional</span>
                    <input
                      id="login-identificador"
                      name="identificador"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={200}
                      aria-invalid={Boolean(errorLogin)}
                      aria-describedby={errorLogin ? 'login-error' : undefined}
                      value={identificador}
                      onChange={(e) => setIdentificador(e.target.value)}
                      placeholder="Usuario o correo institucional"
                      required
                    />
                  </label>

                  <label className="wa-auth-field" htmlFor="login-contrasenia">
                    <span className="wa-auth-field-row">
                      <span>Contraseña</span>
                      <button
                        type="button"
                        className="wa-auth-password-toggle"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-pressed={mostrarPassword}
                        aria-controls="login-contrasenia"
                      >
                        {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                      </button>
                    </span>
                    <input
                      id="login-contrasenia"
                      name="contrasenia"
                      type={mostrarPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      maxLength={300}
                      aria-invalid={Boolean(errorLogin)}
                      aria-describedby={errorLogin ? 'login-error' : undefined}
                      value={contrasenia}
                      onChange={(e) => setContrasenia(e.target.value)}
                      placeholder="********"
                      required
                    />
                  </label>

                  <Button
                    type="submit"
                    variant="primary-gold"
                    size="lg"
                    disabled={!hydrated || cargando}
                    cargando={cargando}
                    aria-busy={!hydrated || cargando}
                    style={{ marginTop: 'var(--wa-space-1)', width: '100%' }}
                  >
                    {!hydrated
                      ? 'Preparando acceso…'
                      : cargando
                        ? 'Verificando credenciales…'
                        : 'Ingresar a la plataforma'}
                  </Button>
                </form>

                <div className="wa-auth-security-note">
                  <WisdomIcon name="shield" size={16} />
                  <div>
                    <strong>Acceso personal e intransferible</strong>
                    Las credenciales se generan desde el Panel de Gestión. Cada estudiante accede
                    únicamente a su información académica, apuntes y calificaciones.
                  </div>
                </div>
              </Card>

              <div className="wa-auth-links">
                <Link href="/" className="wa-auth-back">← Volver a la portada principal</Link>
                <Link href="/catalogo#programas" className="wa-auth-back">Ver catálogo de cursos →</Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="wa-home-footer wa-auth-footer">
        <div className="wa-home-footer-inner">
          <div>
            <Link href="/" aria-label="Wisdom Academy">
              <Image
                src="/brand/svg/wisdom-logo-horizontal-black.svg"
                alt="Wisdom Academy"
                width={150}
                height={28}
                className="wa-logo-for-light"
              />
              <Image
                src="/brand/svg/wisdom-logo-horizontal-white.svg"
                alt=""
                width={150}
                height={28}
                className="wa-logo-for-dark"
              />
            </Link>
            <p style={{ margin: '0.6rem 0 0', maxWidth: 420, lineHeight: 1.6 }}>
              Plataforma educativa integral: educación básica, apoyo homeschool, cursos y talleres.
              Currículo personalizable, referentes internacionales y acompañamiento académico.
            </p>
          </div>
          <div className="wa-home-footer-links">
            <Link href="/">Inicio</Link>
            <Link href="/catalogo">Catálogo</Link>
            <Link href="/login">Portal</Link>
          </div>
          <div style={{ textAlign: 'right', minWidth: 180 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Wisdom Academy</strong>
            <p style={{ margin: '0.35rem 0 0' }}>Ecuador · Modalidad híbrida · 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}



