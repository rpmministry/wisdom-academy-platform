'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { useCart } from '@/lib/cart/cartContext';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  pricePending: boolean;
  coverImage: string;
  category: string;
  contentStatus: 'available' | 'upcoming';
  guideUrl: string | null;
}

interface QuoteItem {
  productId: string;
  slug: string;
  title: string;
  unitPriceCents: number;
  currency: string;
}

interface CheckoutQuote {
  items: QuoteItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  discountName: string | null;
}

interface CheckoutState {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
  approvalUrl?: string | null;
  freeAccessGranted?: boolean;
}

interface CompletedOrder {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function newIdempotencyKey(): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web-checkout-${random}`.slice(0, 100);
}

export default function CheckoutPage() {
  const router = useRouter();
  const {
    usuario,
    sesionLista,
    autenticar,
    cerrarSesion,
    refrescarSesion,
    paypalConfigured,
  } = useAuth();
  const { items, hydrated, subtotalCents, addItem, removeItem, clearCart } = useCart();

  const [identificador, setIdentificador] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [codigoInput, setCodigoInput] = useState('');
  const [codigoAplicado, setCodigoAplicado] = useState('');
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedOrder | null>(null);
  const [importingProduct, setImportingProduct] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const submittingRef = useRef(false);
  const idempotencyRef = useRef<{ signature: string; key: string }>({
    signature: '',
    key: '',
  });

  const productIds = useMemo(() => items.map((item) => item.productId), [items]);
  const productKey = productIds.join(',');
  const cartCurrency = items[0]?.currency || 'USD';
  const visibleSubtotal = quote?.subtotalCents ?? subtotalCents;
  const visibleDiscount = quote?.discountCents ?? 0;
  const visibleTotal = quote?.totalCents ?? subtotalCents;
  const visibleCurrency = quote?.currency || cartCurrency;
  const isFree = visibleTotal === 0;
  const canPay =
    Boolean(usuario) &&
    Boolean(quote) &&
    !quoteLoading &&
    !quoteError &&
    (isFree || paypalConfigured);
  const canAttemptPayment = usuario ? canPay : !quoteLoading;

  const cartItemById = useMemo(
    () => new Map(items.map((item) => [item.productId, item])),
    [items]
  );

  const importProductFromQuery = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('product');
    if (!requested) return;
    setImportingProduct(true);
    setImportError(null);
    try {
      const response = await apiFetch<{ productos: CatalogProduct[] }>('/api/catalog');
      const product = response.productos.find(
        (item) => item.id === requested || item.slug === requested
      );
      if (!product) {
        setImportError('El producto solicitado no está disponible en el catálogo.');
        return;
      }
      if (
        product.pricePending ||
        product.contentStatus === 'upcoming' ||
        product.guideUrl
      ) {
        setImportError('Este producto todavía no se puede comprar en línea.');
        return;
      }
      const result = addItem({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        currency: product.currency,
        coverImage: product.coverImage,
        category: product.category,
      });
      if (!result.ok && result.reason !== 'exists') {
        setImportError('No se pudo agregar el producto al carrito.');
        return;
      }
      const code = params.get('codigo');
      if (code) {
        setCodigoInput(code.toUpperCase());
        setCodigoAplicado(code.trim().toUpperCase());
      }
      router.replace('/checkout');
    } catch (err) {
      setImportError(errorMessage(err));
    } finally {
      setImportingProduct(false);
    }
  }, [addItem, router]);

  useEffect(() => {
    if (!hydrated) return;
    void importProductFromQuery();
    // El parámetro de producto se procesa una sola vez al abrir el checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!usuario || items.length === 0) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let cancelled = false;
    setQuote(null);
    setQuoteLoading(true);
    setQuoteError(null);
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiFetch<{ cotizacion: CheckoutQuote }>('/api/checkout/quote', {
          body: {
            productIds,
            codigoDescuento: codigoAplicado || undefined,
          },
        });
        if (!cancelled) setQuote(response.cotizacion);
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(errorMessage(err));
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // productKey representa la composición exacta del carrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoAplicado, items.length, productKey, usuario?.id]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loginLoading) return;
    setLoginError(null);
    if (!identificador.trim() || !contrasenia) {
      setLoginError('Ingresa tu usuario o correo y tu contraseña.');
      return;
    }
    setLoginLoading(true);
    try {
      const result = await autenticar(identificador.trim(), contrasenia);
      if (!result.exito) {
        setLoginError(result.mensaje);
        return;
      }
      setContrasenia('');
      if (result.debeCambiarContrasena) {
        router.push('/cambiar-contrasena?next=%2Fcheckout');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const cambiarCuenta = async () => {
    const result = await cerrarSesion();
    if (!result.exito) {
      setError(result.mensaje || 'No fue posible cerrar la sesión.');
      return;
    }
    setQuote(null);
    setCodigoAplicado('');
    setCodigoInput('');
  };

  const aplicarCodigo = () => {
    const code = codigoInput.trim().toUpperCase();
    if (!code) {
      setQuoteError('Escribe un código de descuento.');
      return;
    }
    setQuoteError(null);
    setCodigoAplicado(code);
  };

  const quitarCodigo = () => {
    setCodigoAplicado('');
    setCodigoInput('');
    setQuoteError(null);
  };

  const placeOrder = async () => {
    if (submittingRef.current || !usuario || items.length === 0) return;
    if (!canPay) {
      setError(
        isFree
          ? 'La cotización del servidor todavía no está lista.'
          : 'PayPal no está configurado en este entorno. No se realizará ningún cargo.'
      );
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const signature = `${items
      .map((item) => item.productId)
      .sort()
      .join(',')}|${codigoAplicado}|${usuario.id}`;
    if (idempotencyRef.current.signature !== signature) {
      idempotencyRef.current = { signature, key: newIdempotencyKey() };
    }

    try {
      const response = await apiFetch<{ checkout: CheckoutState }>('/api/checkout', {
        body: {
          productIds: items.map((item) => item.productId),
          codigoDescuento: codigoAplicado || undefined,
        },
        headers: { 'Idempotency-Key': idempotencyRef.current.key },
      });
      const checkout = response.checkout;
      if (checkout.approvalUrl) {
        window.location.assign(checkout.approvalUrl);
        return;
      }
      if (checkout.status === 'paid' || checkout.status === 'free') {
        clearCart();
        setCompleted({
          orderId: checkout.orderId,
          status: checkout.status,
          totalCents: checkout.totalCents,
          currency: checkout.currency,
        });
        await refrescarSesion();
        return;
      }
      if (checkout.status === 'failed' || checkout.status === 'cancelled') {
        idempotencyRef.current = { signature: '', key: '' };
        setError(
          'La orden anterior no se completó. Puedes reintentar el pago; no se cobró ningún importe.'
        );
        return;
      }
      setError(
        'La orden quedó pendiente sin una URL de PayPal. Revisa tu correo o contacta a administración con la referencia.'
      );
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        await refrescarSesion();
        setLoginError('Tu sesión expiró. Inicia sesión para reanudar el pago.');
      } else if (
        err instanceof ApiClientError &&
        ['PAYPAL_NOT_CONFIGURED', 'PAYPAL_CREATE_FAILED'].includes(err.code)
      ) {
        idempotencyRef.current = { signature: '', key: '' };
        setError(errorMessage(err));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const remove = (productId: string) => {
    if (submitting) return;
    removeItem(productId);
  };

  if (!hydrated || !sesionLista) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <p className="wa-checkout-notice" role="status">
            Preparando tu carrito y verificando la sesión…
          </p>
        </section>
      </main>
    );
  }

  if (completed) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-card wa-checkout-success">
            <div className="wa-checkout-card-head">
              <div>
                <span className="wa-eyebrow">Orden confirmada</span>
                <h1>Pago confirmado</h1>
                <p>
                  El servidor verificó el pago y habilitó únicamente los productos incluidos en
                  la orden.
                </p>
              </div>
              <WisdomIcon name="award" size={30} />
            </div>
            <ul className="wa-checkout-summary-list">
              <li className="wa-checkout-summary-row">
                <span>Referencia de la orden</span>
                <strong style={{ fontSize: '0.72rem' }}>{completed.orderId}</strong>
              </li>
              <li className="wa-checkout-summary-row">
                <span>Estado</span>
                <Badge variant="emerald" size="sm">
                  {completed.status === 'free' ? 'Acceso gratuito' : 'Pagada'}
                </Badge>
              </li>
              <li className="wa-checkout-summary-row is-total">
                <span>Total</span>
                <strong>{money(completed.totalCents, completed.currency)}</strong>
              </li>
            </ul>
            <div className="wa-checkout-success-actions">
              <Link href="/mi-acceso">
                <Button variant="primary-gold" size="sm">
                  Ver mis accesos
                </Button>
              </Link>
              <Link href="/cursos">
                <Button variant="secondary" size="sm">
                  Ir a mis cursos
                </Button>
              </Link>
              <Link href="/catalogo#programas">
                <Button variant="secondary" size="sm">
                  Seguir explorando
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="wa-checkout-page">
        <PublicHeader minimal />
        <section className="wa-checkout-main">
          <div className="wa-checkout-empty">
            <WisdomIcon name="shopping-cart" size={34} />
            <h1>Tu carrito está vacío</h1>
            <p>
              Agrega un curso o taller desde el catálogo para revisar el pedido y continuar con
              el pago. No se creó ninguna orden.
            </p>
            {(importError || error) && (
              <div className="wa-checkout-error" role="alert">
                <WisdomIcon name="shield" size={16} />
                <span>{importError || error}</span>
              </div>
            )}
            <Link href="/catalogo#programas">
              <Button variant="primary-gold" size="sm">
                Explorar catálogo
              </Button>
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
          <span className="wa-eyebrow">Checkout seguro</span>
          <h1>Revisa tu pedido y completa el pago</h1>
          <p>
            El importe final se calcula en el servidor con el catálogo vigente. Si todavía no
            tienes sesión, puedes iniciarla aquí mismo sin perder los productos del carrito.
          </p>
        </header>

        <ol className="wa-checkout-steps" aria-label="Etapas de la compra">
          <li className="is-active">1. Productos</li>
          <li className={usuario ? 'is-active' : undefined}>2. Identidad</li>
          <li className={usuario && quote && !quoteError ? 'is-active' : undefined}>3. Pago</li>
        </ol>

        <div className="wa-checkout-grid">
          <div>
            <section className="wa-checkout-card" aria-labelledby="checkout-products-heading">
              <div className="wa-checkout-card-head">
                <div>
                  <h2 id="checkout-products-heading">Productos del pedido</h2>
                  <p>{items.length} producto(s) · los precios se revalidan en el servidor.</p>
                </div>
                <Badge variant="navy" size="sm">
                  {items.length}
                </Badge>
              </div>

              {importingProduct && (
                <p role="status" className="wa-checkout-notice">
                  Cargando el producto solicitado…
                </p>
              )}
              {(importError || quoteError) && (
                <div className="wa-checkout-error" role="alert">
                  <WisdomIcon name="shield" size={16} />
                  <span>{importError || quoteError}</span>
                </div>
              )}

              <ul className="wa-checkout-items">
                {items.map((item) => {
                  const quoted = quote?.items.find((line) => line.productId === item.productId);
                  const unit = quoted?.unitPriceCents ?? item.priceCents;
                  return (
                    <li key={item.productId} className="wa-checkout-item">
                      <div className="wa-checkout-item-image">
                        <Image
                          src={cartItemById.get(item.productId)?.coverImage || item.coverImage}
                          alt=""
                          fill
                          sizes="86px"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <div className="wa-checkout-item-copy">
                        <span>{item.category}</span>
                        <strong>{quoted?.title || item.name}</strong>
                        <small>Cantidad: 1 · Acceso individual</small>
                      </div>
                      <div className="wa-checkout-item-side">
                        <strong>{money(unit, item.currency)}</strong>
                        <button
                          type="button"
                          className="wa-checkout-remove"
                          onClick={() => remove(item.productId)}
                          disabled={submitting}
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="wa-checkout-card" aria-labelledby="checkout-identity-heading">
              <div className="wa-checkout-card-head">
                <div>
                  <h2 id="checkout-identity-heading">Identidad del comprador</h2>
                  <p>
                    {usuario
                      ? 'La orden quedará vinculada a esta cuenta.'
                      : 'Inicia sesión con tu cuenta institucional para registrar la compra.'}
                  </p>
                </div>
                <WisdomIcon name={usuario ? 'shield' : 'user'} size={22} />
              </div>

              {usuario ? (
                <div className="wa-checkout-auth">
                  <p style={{ margin: 0, fontSize: '0.84rem' }}>
                    <strong>{usuario.nombreCompleto}</strong>
                    <br />
                    <span style={{ color: 'var(--text-secondary)' }}>{usuario.correo}</span>
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" onClick={() => void cambiarCuenta()}>
                      Usar otra cuenta
                    </Button>
                    <Link href="/cambiar-contrasena?next=%2Fcheckout">
                      <Button variant="secondary" size="sm">Cambiar contraseña</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form className="wa-checkout-auth" onSubmit={login}>
                  {loginError && (
                    <div className="wa-checkout-error" role="alert" id="checkout-login-error">
                      <WisdomIcon name="shield" size={16} />
                      <span>{loginError}</span>
                    </div>
                  )}
                  <div className="wa-checkout-auth-fields">
                    <label className="wa-checkout-field" htmlFor="checkout-identificador">
                      Usuario o correo
                      <input
                        id="checkout-identificador"
                        name="identificador"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={200}
                        value={identificador}
                        onChange={(event) => setIdentificador(event.target.value)}
                        aria-invalid={Boolean(loginError)}
                        aria-describedby={loginError ? 'checkout-login-error' : undefined}
                        required
                      />
                    </label>
                    <label className="wa-checkout-field" htmlFor="checkout-contrasenia">
                      Contraseña
                      <input
                        id="checkout-contrasenia"
                        name="contrasenia"
                        type="password"
                        autoComplete="current-password"
                        maxLength={300}
                        value={contrasenia}
                        onChange={(event) => setContrasenia(event.target.value)}
                        aria-invalid={Boolean(loginError)}
                        aria-describedby={loginError ? 'checkout-login-error' : undefined}
                        required
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button
                      type="submit"
                      variant="primary-navy"
                      size="sm"
                      disabled={loginLoading}
                      cargando={loginLoading}
                    >
                      {loginLoading ? 'Verificando…' : 'Iniciar sesión y continuar'}
                    </Button>
                    <Link href="/login?next=%2Fcheckout">
                      <Button variant="secondary" size="sm">Ir a la página de acceso</Button>
                    </Link>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
                    Las cuentas de Wisdom Academy se habilitan desde administración. Si todavía
                    no tienes credenciales, contacta a la institución; no necesitas crearlas de
                    nuevo.
                  </p>
                </form>
              )}
            </section>

            <section className="wa-checkout-card" aria-labelledby="checkout-payment-heading">
              <div className="wa-checkout-card-head">
                <div>
                  <h2 id="checkout-payment-heading">Método de pago</h2>
                  <p>El cobro se procesa con PayPal Orders API desde el servidor.</p>
                </div>
                <WisdomIcon name="credit-card" size={22} />
              </div>
              <div className="wa-checkout-paypal-note">
                <WisdomIcon name="shield" size={18} />
                <div>
                  <strong>Pago seguro con PayPal</strong>
                  {paypalConfigured
                    ? 'Serás redirigido a PayPal para aprobar el pago. Wisdom Academy solo habilita el acceso cuando el servidor verifica la captura; el webhook firmado completa la conciliación si el navegador se cierra antes de volver.'
                    : 'PayPal no está configurado en este entorno. Puedes revisar tu carrito, pero el cobro está deshabilitado hasta que administración configure las credenciales del servidor. No se realizará ningún cargo.'}
                </div>
              </div>
              <ul className="wa-checkout-summary-list">
                <li className="wa-checkout-summary-row">
                  <span>Acceso</span>
                  <strong>Solo productos de esta orden</strong>
                </li>
                <li className="wa-checkout-summary-row">
                  <span>Confirmación</span>
                  <strong>Captura y webhook verificados en el servidor</strong>
                </li>
                <li className="wa-checkout-summary-row">
                  <span>Reintentos</span>
                  <strong>Sin cargos duplicados por la misma orden</strong>
                </li>
              </ul>
            </section>
          </div>

          <aside className="wa-checkout-summary">
            <div className="wa-checkout-card">
              <div className="wa-checkout-card-head">
                <div>
                  <h2>Resumen de pago</h2>
                  <p>{usuario ? 'Total calculado por el servidor.' : 'Subtotal del carrito; inicia sesión para confirmar.'}</p>
                </div>
                {quoteLoading && <span role="status" className="wa-fin-status">Calculando…</span>}
              </div>

              <div className="wa-checkout-code">
                <label className="wa-checkout-field" htmlFor="checkout-codigo">
                  Código de descuento
                  <input
                    id="checkout-codigo"
                    value={codigoInput}
                    onChange={(event) => setCodigoInput(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        aplicarCodigo();
                      }
                    }}
                    placeholder="WA-PROMO-…"
                    autoComplete="off"
                    disabled={!usuario || submitting}
                    style={{ textTransform: 'uppercase' }}
                  />
                </label>
                {codigoAplicado ? (
                  <Button variant="secondary" size="sm" onClick={quitarCodigo} disabled={submitting}>
                    Quitar
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={aplicarCodigo} disabled={!usuario || submitting}>
                    Aplicar
                  </Button>
                )}
              </div>

              {quote?.discountName && (
                <p className="wa-checkout-notice" role="status">
                  Código aplicado: <strong>{quote.discountName}</strong>
                </p>
              )}

              <ul className="wa-checkout-summary-list">
                <li className="wa-checkout-summary-row">
                  <span>Subtotal</span>
                  <strong>{money(visibleSubtotal, visibleCurrency)}</strong>
                </li>
                {visibleDiscount > 0 && (
                  <li className="wa-checkout-summary-row is-discount">
                    <span>Descuento</span>
                    <strong>- {money(visibleDiscount, visibleCurrency)}</strong>
                  </li>
                )}
                <li className="wa-checkout-summary-row is-total">
                  <span>Total</span>
                  <strong>{money(visibleTotal, visibleCurrency)}</strong>
                </li>
              </ul>

              {!paypalConfigured && !isFree && (
                <div className="wa-checkout-error" role="alert">
                  <WisdomIcon name="shield" size={16} />
                  <span>PayPal no está configurado en el servidor. La compra está deshabilitada.</span>
                </div>
              )}

              {error && (
                <div className="wa-checkout-error" role="alert" aria-live="polite">
                  <WisdomIcon name="shield" size={16} />
                  <span>{error}</span>
                </div>
              )}

              <div className="wa-checkout-actions">
                <Button
                  variant="primary-gold"
                  size="lg"
                  onClick={() => {
                    if (!usuario) {
                      document
                        .getElementById('checkout-identificador')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      document.getElementById('checkout-identificador')?.focus();
                      return;
                    }
                    void placeOrder();
                  }}
                  disabled={submitting || quoteLoading || (Boolean(usuario) && !canAttemptPayment)}
                  cargando={submitting}
                >
                  {submitting
                    ? 'Preparando el pago…'
                    : !usuario
                      ? 'Inicia sesión para pagar'
                      : isFree
                        ? 'Confirmar acceso gratuito'
                        : 'Pagar con PayPal'}
                </Button>
                <Link href="/catalogo#programas" className="wa-checkout-back">
                  ← Volver al catálogo
                </Link>
              </div>

              <p style={{ margin: '0.75rem 0 0', color: 'var(--text-muted)', fontSize: '0.66rem', lineHeight: 1.5 }}>
                Al continuar aceptas que el acceso se concede únicamente cuando el servidor
                confirma el pago. Si cancelas PayPal, el carrito se conserva para reintentar.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
