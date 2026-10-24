'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface RegistrationView {
  registrationId: string;
  orderId: string;
  orderStatus: string;
  status: 'pending' | 'completed' | 'expired' | 'revoked';
  expiresAt: string;
  completedAt: string | null;
  buyerEmail: string;
  buyerName: string | null;
  products: Array<{ title: string; kind: string }>;
  productKind: string;
  requiresGuardian: boolean;
  grade: string | null;
  accountExists: boolean;
  canLinkCurrentSession: boolean;
  totalCents: number;
  currency: string;
  termsVersion: string;
  privacyVersion: string;
  marketingOptIn: boolean;
  redirectTo: string;
  loginUrl: string;
  courseUrl: string;
}

interface RegistrationCompleteResponse {
  registro: {
    registrationId: string;
    orderId: string;
    redirectTo: string;
    loginUrl: string;
    productNames: string[];
    emailSent: boolean;
  };
  usuario: { id: string } | null;
  csrfToken: string | null;
}

interface FormState {
  buyerFirstName: string;
  buyerLastName: string;
  documentType: string;
  documentNumber: string;
  country: string;
  phone: string;
  studentFirstName: string;
  studentLastName: string;
  studentBirthDate: string;
  studentAcademicNotes: string;
  guardianFirstName: string;
  guardianLastName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelationship: string;
  guardianAuthorization: boolean;
  password: string;
  passwordConfirm: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingOptIn: boolean;
}

const EMPTY_FORM: FormState = {
  buyerFirstName: '',
  buyerLastName: '',
  documentType: '',
  documentNumber: '',
  country: 'Ecuador',
  phone: '',
  studentFirstName: '',
  studentLastName: '',
  studentBirthDate: '',
  studentAcademicNotes: '',
  guardianFirstName: '',
  guardianLastName: '',
  guardianEmail: '',
  guardianPhone: '',
  guardianRelationship: '',
  guardianAuthorization: false,
  password: '',
  passwordConfirm: '',
  acceptTerms: false,
  acceptPrivacy: false,
  marketingOptIn: false,
};

const PRODUCT_KIND_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  program: 'Programa académico',
  mixed: 'Varios productos',
  other: 'Producto educativo',
};

function splitName(name: string | null): [string, string] {
  if (!name) return ['', ''];
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return [parts[0], ''];
  return [parts[0], parts.slice(1).join(' ')];
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function RegistrationInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { usuario, sesionLista, cerrarSesion } = useAuth();
  const token = searchParams.get('token') || '';
  const [view, setView] = useState<RegistrationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<RegistrationCompleteResponse['registro'] | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setLoadError('El enlace no contiene un token de registro válido.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<{ registro: RegistrationView }>(
      `/api/checkout/registration?token=${encodeURIComponent(token)}`
    )
      .then((response) => {
        if (cancelled) return;
        const registration = response.registro;
        setView(registration);
        setNeedsLogin(registration.accountExists && !registration.canLinkCurrentSession);
        const [first, last] = splitName(registration.buyerName);
        setForm((current) => ({
          ...current,
          buyerFirstName: current.buyerFirstName || first,
          buyerLastName: current.buyerLastName || last,
          guardianFirstName: current.guardianFirstName || first,
          guardianLastName: current.guardianLastName || last,
          guardianEmail: current.guardianEmail || registration.buyerEmail,
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        if (
          err instanceof ApiClientError &&
          (err.code === 'REGISTRATION_EXPIRED' ||
            err.code === 'REGISTRATION_TOKEN_INVALID' ||
            err.code === 'REGISTRATION_NOT_FOUND')
        ) {
          setExpired(true);
        }
        setLoadError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, usuario?.id]);

  const newAccount = Boolean(view && !view.accountExists);
  const isMinor = Boolean(view?.requiresGuardian);
  const canSubmit = useMemo(() => {
    if (!view || view.status !== 'pending') return false;
    if (!view.canLinkCurrentSession && view.accountExists) return false;
    return true;
  }, [view]);

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const logoutAndRetry = async () => {
    const result = await cerrarSesion();
    if (!result.exito) {
      setFormError(result.mensaje || 'No se pudo cerrar la sesión.');
      return;
    }
    router.refresh();
  };

  const resend = async () => {
    if (!token || resending) return;
    setResending(true);
    setResendMessage(null);
    try {
      const response = await apiFetch<{ enviado: boolean; mensaje: string }>(
        '/api/checkout/registration/resend',
        { body: { token } }
      );
      setResendMessage(response.mensaje);
    } catch (err) {
      setResendMessage(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!view || submitting || !canSubmit) return;
    setFormError(null);
    if (!form.buyerFirstName.trim() || !form.buyerLastName.trim()) {
      setFormError('Completa tus nombres y apellidos.');
      return;
    }
    if (!form.acceptTerms || !form.acceptPrivacy) {
      setFormError('Debes aceptar los términos y el tratamiento de datos personales.');
      return;
    }
    if (isMinor) {
      if (
        !form.studentFirstName.trim() ||
        !form.studentLastName.trim() ||
        !form.studentBirthDate
      ) {
        setFormError('Completa los datos del estudiante y su fecha de nacimiento.');
        return;
      }
      if (!form.guardianFirstName.trim() || !form.guardianLastName.trim()) {
        setFormError('Completa los datos del representante legal.');
        return;
      }
      if (!form.guardianEmail.trim() || !form.guardianPhone.trim()) {
        setFormError('Indica el correo y teléfono del representante legal.');
        return;
      }
      if (!form.guardianRelationship) {
        setFormError('Indica la relación del representante con el estudiante.');
        return;
      }
      if (!form.guardianAuthorization) {
        setFormError('El representante legal debe autorizar la matrícula.');
        return;
      }
    }
    if (newAccount) {
      if (form.password.length < 12) {
        setFormError('La contraseña debe tener al menos 12 caracteres.');
        return;
      }
      if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        setFormError('La contraseña debe combinar mayúsculas, minúsculas y números.');
        return;
      }
      if (form.password !== form.passwordConfirm) {
        setFormError('La contraseña y su confirmación deben coincidir.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await apiFetch<RegistrationCompleteResponse>(
        '/api/checkout/registration',
        {
          body: {
            token,
            ...form,
          },
        }
      );
      setSuccess(response.registro);
      const hasSession = Boolean(response.usuario) || Boolean(view.canLinkCurrentSession);
      const destination = hasSession
        ? response.registro.redirectTo
        : `/login?next=${encodeURIComponent(response.registro.redirectTo)}`;
      window.setTimeout(() => router.replace(destination), 1100);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'EMAIL_EXISTS') {
        setNeedsLogin(true);
      }
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!sesionLista || loading) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <p className="wa-checkout-notice" role="status">
            Verificando tu compra…
          </p>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <div className="wa-checkout-card-head">
              <div>
                <span className="wa-eyebrow">Registro posterior al pago</span>
                <h1>{expired ? 'El enlace venció' : 'No pudimos abrir este registro'}</h1>
                <p>{loadError}</p>
              </div>
              <WisdomIcon name="shield" size={28} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {expired && (
                <Link href="/bienvenida/recuperar">
                  <Button variant="primary-gold" size="sm">Solicitar nuevo enlace</Button>
                </Link>
              )}
              <Link href="/catalogo">
                <Button variant="secondary" size="sm">Ir al catálogo</Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="sm">Iniciar sesión</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!view) return null;

  if (success) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <div className="wa-checkout-card-head">
              <div>
                <span className="wa-eyebrow">Matrícula lista</span>
                <h1>¡Bienvenido a Wisdom Academy!</h1>
                <p>
                  Tu cuenta ha sido {newAccount ? 'creada' : 'vinculada'} y tu matrícula está
                  lista. Te llevamos a tu contenido.
                </p>
              </div>
              <WisdomIcon name="award" size={30} />
            </div>
            <ul className="wa-checkout-summary-list">
              <li className="wa-checkout-summary-row">
                <span>Correo de acceso</span>
                <strong>{view.buyerEmail}</strong>
              </li>
              <li className="wa-checkout-summary-row">
                <span>Producto</span>
                <strong>{success.productNames.join(' · ')}</strong>
              </li>
            </ul>
            {!success.emailSent && (
              <p className="wa-checkout-notice">
                La matrícula está activa. El servicio de correo no está configurado, así que no
                pudimos enviar el mensaje de bienvenida; guarda tu correo de acceso.
              </p>
            )}
            <div className="wa-checkout-success-actions">
              <Link href={success.redirectTo}>
                <Button variant="primary-gold" size="sm">Entrar a mi producto</Button>
              </Link>
              <Link href="/mi-acceso">
                <Button variant="secondary" size="sm">Ver mis accesos</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (view.status === 'completed') {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <div className="wa-checkout-card-head">
              <div>
                <span className="wa-eyebrow">Registro completado</span>
                <h1>Tu acceso ya está activo</h1>
                <p>
                  La compra de {view.products.map((product) => product.title).join(' · ')} ya
                  está vinculada a una cuenta. Ingresa con {view.buyerEmail}.
                </p>
              </div>
              <WisdomIcon name="shield" size={28} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={view.courseUrl}>
                <Button variant="primary-gold" size="sm">Ir a mi producto</Button>
              </Link>
              <Link href={`/login?next=${encodeURIComponent(view.redirectTo)}`}>
                <Button variant="secondary" size="sm">Iniciar sesión</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (view.orderStatus === 'refunded' || view.orderStatus === 'reversed') {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <div className="wa-checkout-card-head">
              <div>
                <span className="wa-eyebrow">Compra no disponible</span>
                <h1>La orden fue reembolsada o revertida</h1>
                <p>
                  No es posible activar una matrícula para esta compra. Si necesitas ayuda,
                  contacta a administración con la referencia {view.orderId}.
                </p>
              </div>
              <WisdomIcon name="shield" size={28} />
            </div>
            <Link href="/catalogo">
              <Button variant="primary-gold" size="sm">Volver al catálogo</Button>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (view.status !== 'pending') {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <h1>Este registro no está disponible</h1>
            <p>El enlace fue revocado o ya no puede utilizarse.</p>
            <Link href="/bienvenida/recuperar">
              <Button variant="primary-gold" size="sm">Solicitar un nuevo enlace</Button>
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="wa-checkout-page">
      <PublicHeader minimal />
      <section className="wa-checkout-main">
        <header className="wa-checkout-head">
          <span className="wa-eyebrow">Pago confirmado</span>
          <h1>Activa tu espacio de estudio</h1>
          <p>
            ¡Tu compra ha sido confirmada! Completa tus datos para activar tu espacio de estudio
            en Wisdom Academy. Usarás el correo <strong>{view.buyerEmail}</strong> para ingresar
            posteriormente.
          </p>
        </header>

        <ol className="wa-checkout-steps" aria-label="Etapas del registro">
          <li className="is-active">1. Pago confirmado</li>
          <li className="is-active">2. Datos y credenciales</li>
          <li>3. Acceso al producto</li>
        </ol>

        <div className="wa-checkout-grid">
          <form className="wa-registration-form" onSubmit={submit}>
            <section className="wa-checkout-card">
              <div className="wa-checkout-card-head">
                <div>
                  <h2>Producto adquirido</h2>
                  <p>La matrícula se limita a estos productos.</p>
                </div>
                <Badge variant="gold" size="sm">
                  {PRODUCT_KIND_LABEL[view.productKind] || 'Producto'}
                </Badge>
              </div>
              <ul className="wa-checkout-summary-list">
                {view.products.map((product) => (
                  <li key={product.title} className="wa-checkout-summary-row">
                    <span>{product.title}</span>
                    <strong>{PRODUCT_KIND_LABEL[product.kind] || product.kind}</strong>
                  </li>
                ))}
                <li className="wa-checkout-summary-row is-total">
                  <span>Total pagado</span>
                  <strong>{money(view.totalCents, view.currency)}</strong>
                </li>
              </ul>
            </section>

            {needsLogin ? (
              <section className="wa-checkout-card">
                <div className="wa-checkout-card-head">
                  <div>
                    <h2>Este correo ya tiene una cuenta</h2>
                    <p>
                      Inicia sesión o recupera tu contraseña para vincular la compra de forma
                      segura. No crearemos una segunda cuenta.
                    </p>
                  </div>
                  <WisdomIcon name="user" size={22} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!usuario && (
                    <>
                      <Link
                        href={`/login?next=${encodeURIComponent(
                          `/bienvenida/registro?token=${encodeURIComponent(token)}`
                        )}`}
                      >
                        <Button variant="primary-gold" size="sm">Iniciar sesión</Button>
                      </Link>
                      <Link
                        href={`/recuperar-acceso?email=${encodeURIComponent(view.buyerEmail)}`}
                      >
                        <Button variant="secondary" size="sm">Recuperar contraseña</Button>
                      </Link>
                    </>
                  )}
                  {usuario && (
                    <Button variant="secondary" size="sm" onClick={() => void logoutAndRetry()}>
                      Cerrar sesión y usar otra cuenta
                    </Button>
                  )}
                </div>
                {usuario && !view.canLinkCurrentSession && (
                  <p className="wa-checkout-error" role="alert" style={{ marginTop: '0.7rem' }}>
                    La cuenta activa es {usuario.correo}, pero la compra corresponde a{' '}
                    {view.buyerEmail}. Cierra sesión y entra con el correo correcto.
                  </p>
                )}
              </section>
            ) : (
              <>
                <section className="wa-checkout-card">
                  <div className="wa-checkout-card-head">
                    <div>
                      <h2>Datos personales</h2>
                      <p>
                        {view.canLinkCurrentSession
                          ? 'Vincularemos la compra a tu cuenta existente.'
                          : 'Estos datos se guardan en el expediente institucional.'}
                      </p>
                    </div>
                  </div>
                  <div className="wa-checkout-auth-fields">
                    <label className="wa-checkout-field">
                      Nombres
                      <input
                        value={form.buyerFirstName}
                        onChange={(event) => update('buyerFirstName', event.target.value)}
                        autoComplete="given-name"
                        maxLength={80}
                        required
                      />
                    </label>
                    <label className="wa-checkout-field">
                      Apellidos
                      <input
                        value={form.buyerLastName}
                        onChange={(event) => update('buyerLastName', event.target.value)}
                        autoComplete="family-name"
                        maxLength={80}
                        required
                      />
                    </label>
                    <label className="wa-checkout-field">
                      Tipo de documento (opcional)
                      <select
                        value={form.documentType}
                        onChange={(event) => update('documentType', event.target.value)}
                      >
                        <option value="">Selecciona…</option>
                        <option value="cedula">Cédula</option>
                        <option value="pasaporte">Pasaporte</option>
                        <option value="dni">DNI</option>
                        <option value="ruc">RUC</option>
                        <option value="otro">Otro</option>
                      </select>
                    </label>
                    <label className="wa-checkout-field">
                      Número de documento (opcional)
                      <input
                        value={form.documentNumber}
                        onChange={(event) => update('documentNumber', event.target.value)}
                        maxLength={30}
                        autoComplete="off"
                      />
                    </label>
                    <label className="wa-checkout-field">
                      País de residencia
                      <select
                        value={form.country}
                        onChange={(event) => update('country', event.target.value)}
                        required
                      >
                        <option>Ecuador</option>
                        <option>Colombia</option>
                        <option>Perú</option>
                        <option>Chile</option>
                        <option>Argentina</option>
                        <option>México</option>
                        <option>Estados Unidos</option>
                        <option>España</option>
                        <option>Otro</option>
                      </select>
                    </label>
                    <label className="wa-checkout-field">
                      Teléfono {isMinor ? '' : '(opcional)'}
                      <input
                        value={form.phone}
                        onChange={(event) => update('phone', event.target.value)}
                        type="tel"
                        autoComplete="tel"
                        maxLength={30}
                        required={isMinor}
                      />
                    </label>
                  </div>
                  <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Correo de la compra: <strong>{view.buyerEmail}</strong>. El correo de acceso
                    debe coincidir con el de la compra.
                  </p>
                </section>

                {isMinor && (
                  <section className="wa-checkout-card">
                    <div className="wa-checkout-card-head">
                      <div>
                        <h2>Estudiante y representante legal</h2>
                        <p>
                          Este programa está destinado a menores de edad. La cuenta de acceso
                          pertenece al representante; el estudiante no necesita correo propio.
                        </p>
                      </div>
                    </div>
                    <div className="wa-checkout-auth-fields">
                      <label className="wa-checkout-field">
                        Nombres del estudiante
                        <input
                          value={form.studentFirstName}
                          onChange={(event) => update('studentFirstName', event.target.value)}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Apellidos del estudiante
                        <input
                          value={form.studentLastName}
                          onChange={(event) => update('studentLastName', event.target.value)}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Fecha de nacimiento
                        <input
                          type="date"
                          value={form.studentBirthDate}
                          onChange={(event) => update('studentBirthDate', event.target.value)}
                          max={new Date().toISOString().slice(0, 10)}
                          required
                        />
                      </label>
                      {view.grade && (
                        <label className="wa-checkout-field">
                          Grado o nivel
                          <input value={view.grade} readOnly />
                        </label>
                      )}
                      <label className="wa-checkout-field">
                        Información académica previa (opcional)
                        <input
                          value={form.studentAcademicNotes}
                          onChange={(event) => update('studentAcademicNotes', event.target.value)}
                          maxLength={500}
                          placeholder="Colegio anterior, nivel, necesidades de apoyo…"
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Nombre del representante legal
                        <input
                          value={form.guardianFirstName}
                          onChange={(event) => update('guardianFirstName', event.target.value)}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Apellidos del representante legal
                        <input
                          value={form.guardianLastName}
                          onChange={(event) => update('guardianLastName', event.target.value)}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Correo del representante
                        <input
                          type="email"
                          value={form.guardianEmail}
                          onChange={(event) => update('guardianEmail', event.target.value)}
                          maxLength={254}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Teléfono del representante
                        <input
                          type="tel"
                          value={form.guardianPhone}
                          onChange={(event) => update('guardianPhone', event.target.value)}
                          maxLength={30}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Relación con el estudiante
                        <select
                          value={form.guardianRelationship}
                          onChange={(event) => update('guardianRelationship', event.target.value)}
                          required
                        >
                          <option value="">Selecciona…</option>
                          <option value="madre">Madre</option>
                          <option value="padre">Padre</option>
                          <option value="representante">Representante legal</option>
                          <option value="tutor">Tutor</option>
                          <option value="otro">Otro</option>
                        </select>
                      </label>
                    </div>
                    <label className="wa-registration-check">
                      <input
                        type="checkbox"
                        checked={form.guardianAuthorization}
                        onChange={(event) =>
                          update('guardianAuthorization', event.target.checked)
                        }
                      />
                      <span>
                        Autorizo la matrícula del estudiante y el tratamiento de sus datos
                        personales para fines académicos.
                      </span>
                    </label>
                  </section>
                )}

                {newAccount && (
                  <section className="wa-checkout-card">
                    <div className="wa-checkout-card-head">
                      <div>
                        <h2>Crea tu contraseña</h2>
                        <p>
                          Usarás {view.buyerEmail} para ingresar. No solicitamos contraseñas de
                          PayPal ni datos de tarjetas.
                        </p>
                      </div>
                      <WisdomIcon name="shield" size={22} />
                    </div>
                    <div className="wa-checkout-auth-fields">
                      <label className="wa-checkout-field">
                        Contraseña
                        <input
                          type="password"
                          value={form.password}
                          onChange={(event) => update('password', event.target.value)}
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={200}
                          required
                        />
                      </label>
                      <label className="wa-checkout-field">
                        Confirmar contraseña
                        <input
                          type="password"
                          value={form.passwordConfirm}
                          onChange={(event) => update('passwordConfirm', event.target.value)}
                          autoComplete="new-password"
                          minLength={12}
                          maxLength={200}
                          required
                        />
                      </label>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                      Mínimo 12 caracteres, con mayúsculas, minúsculas y números.
                    </p>
                  </section>
                )}

                <section className="wa-checkout-card">
                  <div className="wa-checkout-card-head">
                    <div>
                      <h2>Consentimientos</h2>
                      <p>Puedes aceptar las comunicaciones comerciales por separado.</p>
                    </div>
                  </div>
                  <label className="wa-registration-check">
                    <input
                      type="checkbox"
                      checked={form.acceptTerms}
                      onChange={(event) => update('acceptTerms', event.target.checked)}
                      required
                    />
                    <span>
                      Acepto los{' '}
                      <Link href="/terminos" target="_blank" rel="noreferrer">
                        términos y condiciones
                      </Link>{' '}
                      (versión {view.termsVersion}).
                    </span>
                  </label>
                  <label className="wa-registration-check">
                    <input
                      type="checkbox"
                      checked={form.acceptPrivacy}
                      onChange={(event) => update('acceptPrivacy', event.target.checked)}
                      required
                    />
                    <span>
                      Acepto el{' '}
                      <Link href="/privacidad" target="_blank" rel="noreferrer">
                        tratamiento de mis datos personales
                      </Link>{' '}
                      con fines académicos y administrativos (versión {view.privacyVersion}).
                    </span>
                  </label>
                  <label className="wa-registration-check">
                    <input
                      type="checkbox"
                      checked={form.marketingOptIn}
                      onChange={(event) => update('marketingOptIn', event.target.checked)}
                    />
                    <span>Deseo recibir comunicaciones comerciales opcionales.</span>
                  </label>
                </section>

                {formError && (
                  <div className="wa-checkout-error" role="alert">
                    <WisdomIcon name="shield" size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="wa-checkout-actions">
                  <Button
                    type="submit"
                    variant="primary-gold"
                    size="lg"
                    disabled={submitting || !canSubmit}
                    cargando={submitting}
                  >
                    {submitting
                      ? 'Activando tu matrícula…'
                      : newAccount
                        ? 'Crear mi cuenta y activar acceso'
                        : 'Vincular compra a mi cuenta'}
                  </Button>
                </div>
              </>
            )}

            {formError && needsLogin && (
              <div className="wa-checkout-error" role="alert">
                <WisdomIcon name="shield" size={16} />
                <span>{formError}</span>
              </div>
            )}
          </form>

          <aside className="wa-checkout-summary">
            <div className="wa-checkout-card">
              <h2 style={{ marginTop: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.1rem' }}>
                Tu compra está confirmada
              </h2>
              <ul className="wa-checkout-summary-list">
                <li className="wa-checkout-summary-row">
                  <span>Estado del pago</span>
                  <Badge variant="emerald" size="sm">Pagado</Badge>
                </li>
                <li className="wa-checkout-summary-row">
                  <span>Registro</span>
                  <strong>Pendiente de completar</strong>
                </li>
                <li className="wa-checkout-summary-row">
                  <span>Acceso</span>
                  <strong>Se activa al guardar</strong>
                </li>
                <li className="wa-checkout-summary-row">
                  <span>Orden</span>
                  <strong style={{ fontSize: '0.66rem' }}>{view.orderId}</strong>
                </li>
              </ul>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                El enlace caduca el{' '}
                {new Intl.DateTimeFormat('es-EC', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                }).format(new Date(view.expiresAt))}
                . Si lo pierdes, puedes solicitar uno nuevo desde{' '}
                <Link href="/bienvenida/recuperar">recuperar registro</Link>.
              </p>
              <div className="wa-fin-toolbar-actions" style={{ marginTop: '0.6rem' }}>
                <Button variant="secondary" size="sm" onClick={() => void resend()} disabled={resending}>
                  {resending ? 'Enviando…' : 'Reenviar enlace al correo'}
                </Button>
              </div>
              {resendMessage && (
                <p role="status" className="wa-checkout-notice" style={{ fontSize: '0.7rem' }}>
                  {resendMessage}
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense
      fallback={
        <main className="wa-checkout-page">
          <section className="wa-checkout-main">
            <p className="wa-checkout-notice">Verificando tu compra…</p>
          </section>
        </main>
      }
    >
      <RegistrationInner />
    </Suspense>
  );
}
