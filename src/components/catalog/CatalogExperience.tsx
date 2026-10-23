'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { AcademySections } from '@/components/marketing/AcademySections';
import { SchoolPortalModal } from '@/components/catalog/SchoolPortalModal';
import {
  HOMESCHOOL_OFFER_DESCRIPTION,
  HOMESCHOOL_OFFER_LABEL,
  HOMESCHOOL_OFFER_PERIOD,
  formatoPrecioAnual,
} from '@/lib/catalog/homeschoolOffer';
import * as Tabs from '@radix-ui/react-tabs';

interface CatalogResource {
  id: string;
  slug: string;
  type: string;
  title: string;
  description: string | null;
}

interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  pricePending: boolean;
  metadata: {
    accessDays?: number;
    accessMonths?: number;
    hours?: number;
    modality?: string;
    homeschoolAnnualOffer?: boolean;
    billingPeriod?: string;
    annualPriceCents?: number;
    offerLabel?: string;
    offerPeriod?: string;
    offerDescription?: string;
    guideUrl?: string;
  };
  coverImage: string;
  category: string;
  resourceCount: number;
  grade: string | null;
  resources: CatalogResource[];
  accessible: boolean;
  annualOffer: boolean;
  guideUrl: string | null;
  contentStatus: 'available' | 'upcoming';
}

interface CheckoutState {
  orderId: string;
  status: string;
  totalCents: number;
  currency: string;
  approvalUrl?: string | null;
  freeAccessGranted?: boolean;
}

const CATEGORIES = ['Todos', 'Programas y grados', 'Talleres', 'Cursos', 'Recursos gratuitos'];

const TYPE_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  grade: 'Grado',
  homeschool_program: 'Programa Homeschool',
  material: 'Material digital',
  collection: 'Colección',
};

const HOME_HERO_IMAGES = [
  '/images/hero/academic-excellence.webp',
  '/images/hero/student-development.webp',
  '/images/hero/educational-technology.webp',
] as const;

function formatoPrecio(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function horasProducto(product: CatalogProduct): string {
  if (product.metadata.hours) return `${product.metadata.hours} h`;
  if (product.category === 'Programas y grados') {
    return `${product.resourceCount} asignaturas`;
  }
  return `${product.resourceCount} ${product.resourceCount === 1 ? 'recurso' : 'recursos'}`;
}

function esProductoGuia(product: CatalogProduct): boolean {
  return Boolean(product.guideUrl);
}

function esProximamente(product: CatalogProduct): boolean {
  return product.contentStatus === 'upcoming';
}

function esPrecioPendiente(product: CatalogProduct): boolean {
  return product.pricePending === true;
}

function precioOrdenable(product: CatalogProduct): number {
  return esPrecioPendiente(product) ? Number.MAX_SAFE_INTEGER : product.priceCents;
}

function OfertaAnualHomeschool({
  producto,
  contexto,
}: {
  producto: CatalogProduct;
  contexto: 'card' | 'modal';
}) {
  return (
    <div
      className={`wa-homeschool-offer wa-homeschool-offer--${contexto}`}
      aria-label="Oferta especial de los programas Homeschool"
    >
      <span className="wa-homeschool-offer-label">
        <WisdomIcon name="sparkles" size={13} />
        {HOMESCHOOL_OFFER_LABEL}
      </span>
      <div className="wa-homeschool-offer-price">
        <strong>{formatoPrecioAnual(producto.priceCents, producto.currency)}</strong>
        <span>{HOMESCHOOL_OFFER_PERIOD}</span>
      </div>
      <p>{HOMESCHOOL_OFFER_DESCRIPTION}</p>
    </div>
  );
}

export function CatalogExperience({ home = false }: { home?: boolean }) {
  const router = useRouter();
  const {
    usuario,
    sesionLista,
    tienePermiso,
    refrescarSesion,
    temaOscuro,
    alternarTema,
  } = useAuth();
  const [productos, setProductos] = useState<CatalogProduct[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [portalActivo, setPortalActivo] = useState<'school' | 'pro'>(home ? 'school' : 'pro');
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [orden, setOrden] = useState<'recomendados' | 'precio-asc' | 'precio-desc' | 'nombre'>('recomendados');
  const [seleccionado, setSeleccionado] = useState<CatalogProduct | null>(null);
  const [codigo, setCodigo] = useState('');
  const [comprando, setComprando] = useState(false);
  const [resultado, setResultado] = useState<CheckoutState | null>(null);
  const hasLoaded = useRef(false);
  const checkoutKey = useRef<string>('');

  const nuevoCheckoutKey = (productId: string): string => {
    const random =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `shop-${productId}-${random}`.slice(0, 100);
  };

  const cargar = useCallback(async () => {
    if (!hasLoaded.current) setCargando(true);
    setError(null);
    try {
      const response = await apiFetch<{ productos: CatalogProduct[] }>('/api/catalog');
      setProductos(response.productos);
      hasLoaded.current = true;
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, usuario?.id]);

  const isSchoolProduct = (product: CatalogProduct) =>
    product.category === 'Programas y grados' || product.category === 'Recursos gratuitos';

  const portalProducts = useMemo(
    () =>
      productos.filter((product) =>
        portalActivo === 'school' ? isSchoolProduct(product) : !isSchoolProduct(product)
      ),
    [portalActivo, productos]
  );

  const categoryOptions = useMemo(
    () => ['Todos', ...new Set(portalProducts.map((product) => product.category))],
    [portalProducts]
  );

  useEffect(() => {
    if (!categoryOptions.includes(categoria)) setCategoria('Todos');
  }, [categoria, categoryOptions]);

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    const list = portalProducts.filter((product) => {
      const matchesCategory = categoria === 'Todos' || product.category === categoria;
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description || '').toLowerCase().includes(term) ||
        product.resources.some((resource) => resource.title.toLowerCase().includes(term));
      return matchesCategory && matchesTerm;
    });
    if (orden === 'precio-asc') return [...list].sort((a, b) => precioOrdenable(a) - precioOrdenable(b));
    if (orden === 'precio-desc') return [...list].sort((a, b) => precioOrdenable(b) - precioOrdenable(a));
    if (orden === 'nombre') return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [busqueda, categoria, orden, portalProducts]);

  const abrirCompra = (producto: CatalogProduct) => {
    if (esProductoGuia(producto) || esProximamente(producto) || esPrecioPendiente(producto)) return;
    if (!sesionLista) return;
    if (!usuario) {
      router.push('/login');
      return;
    }
    setResultado(null);
    setCodigo('');
    checkoutKey.current = nuevoCheckoutKey(producto.id);
    setSeleccionado(producto);
  };

  const comprar = async () => {
    if (!seleccionado || esPrecioPendiente(seleccionado)) return;
    setComprando(true);
    setError(null);
    try {
      if (!checkoutKey.current) checkoutKey.current = nuevoCheckoutKey(seleccionado.id);
      const response = await apiFetch<{ checkout: CheckoutState }>('/api/checkout', {
        body: {
          productIds: [seleccionado.id],
          codigoDescuento: codigo.trim() || undefined,
        },
        headers: { 'Idempotency-Key': checkoutKey.current },
      });
      const checkout = response.checkout;
      setResultado(checkout);
      if (checkout.approvalUrl) {
        window.location.assign(checkout.approvalUrl);
        return;
      }
      await refrescarSesion();
      await cargar();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setComprando(false);
    }
  };

  const collage = productos.slice(0, 3);

  return (
    <main className="wa-catalog-page">
      <header className="wa-catalog-header">
        <Link href="/" className="wa-catalog-brand" aria-label="Wisdom Academy">
          <Image
            src="/brand/svg/wisdom-logo-horizontal-black.svg"
            alt="Wisdom Academy"
            width={168}
            height={32}
            priority
            className="wa-logo-for-light"
          />
          <Image
            src="/brand/svg/wisdom-logo-horizontal-white.svg"
            alt=""
            width={168}
            height={32}
            priority
            className="wa-logo-for-dark"
          />
        </Link>
        <nav className="wa-catalog-nav">
          {home ? (
            <>
              <a href="#academia" className="wa-landing-anchor">Academia</a>
              <a href="#metodo" className="wa-landing-anchor">Método</a>
              <a href="#programas" className="wa-landing-anchor">Programas</a>
              <a href="#preguntas" className="wa-landing-anchor">Preguntas</a>
            </>
          ) : (
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm">Inicio</Button>
            </Link>
          )}
          <button
            type="button"
            className="wa-theme-toggle"
            onClick={alternarTema}
            aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            title={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
          >
            <WisdomIcon name={temaOscuro ? 'sun' : 'moon'} size={16} color="current" />
          </button>
          {usuario ? (
            <>
              <Link href="/mi-acceso" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">Mi acceso</Button>
              </Link>
              {tienePermiso('admin.access') && (
                <Link href="/admin" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm">Panel</Button>
                </Link>
              )}
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="primary-navy" size="sm">Mi portal</Button>
              </Link>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <Button variant="primary-gold" size="sm">Iniciar sesión</Button>
            </Link>
          )}
        </nav>
      </header>

      <section className={`wa-catalog-hero${home ? ' wa-home-hero' : ''}`}>
        <div>
          <span className="wa-catalog-kicker">
            <WisdomIcon name="sparkles" size={13} /> {home ? 'Academia integral · Educación, tecnología y futuro' : 'Catálogo oficial 2026–2027'}
          </span>
          <h1 className="wa-catalog-title">
            {home ? (
              <>
                Aprende. Crea.<br />
                <span>Lidera tu futuro.</span>
              </>
            ) : (
              <>
                Aprende con propósito.<br />
                Crece con <span>Wisdom</span>.
              </>
            )}
          </h1>
          <p className="wa-catalog-lead">
            {home
              ? 'Educación básica, homeschool, cursos y talleres que integran excelencia académica, tecnología y formación en valores para preparar a cada estudiante para el futuro.'
              : 'Programas de educación básica, apoyo homeschool, cursos y talleres de formación integral, además de recursos digitales. Cada producto enumera exactamente los contenidos que habilita y el acceso se verifica en el servidor.'}
          </p>
          {home && (
            <div className="wa-home-hero-actions">
              <a href="#programas" style={{ textDecoration: 'none' }}>
                <Button variant="primary-gold" size="lg">Explorar programas</Button>
              </a>
              <Link href="/login" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="lg">Ingresar al portal</Button>
              </Link>
            </div>
          )}
          <div className="wa-catalog-search">
            <WisdomIcon name="search" size={18} color="current" />
            <input
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  setBusqueda(busqueda.trim());
                  document.getElementById('programas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              placeholder={home ? 'Busca un programa, grado, taller o materia' : 'Busca por curso, materia, grado o taller'}
              aria-label="Buscar cursos"
            />
            <button
              type="button"
              onClick={() => {
                setBusqueda(busqueda.trim());
                document.getElementById('programas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Buscar
            </button>
          </div>
          <div className="wa-catalog-stats" aria-busy={cargando}>
            <div><strong>{cargando || error ? '—' : productos.length}</strong>productos publicados</div>
            <div><strong>{cargando || error ? '—' : productos.reduce((total, product) => total + product.resourceCount, 0)}</strong>recursos formativos</div>
            <div><strong>200</strong>días de referencia flexibles</div>
            <div><strong>100%</strong>acceso verificado</div>
          </div>
        </div>
        <div className="wa-catalog-collage" aria-hidden="true">
          {home ? (
            HOME_HERO_IMAGES.map((src, index) => (
              <div className="wa-catalog-collage-card" key={src} style={{ zIndex: index + 1 }}>
                <Image src={src} alt="" fill sizes="(max-width: 980px) 60vw, 30vw" priority={index === 0} />
              </div>
            ))
          ) : cargando ? (
            [0, 1, 2].map((index) => (
              <div
                className="wa-catalog-collage-card is-loading"
                key={`skeleton-${index}`}
                style={{ zIndex: index + 1 }}
              />
            ))
          ) : (
            collage.map((product, index) => (
              <div className="wa-catalog-collage-card" key={product.id} style={{ zIndex: index + 1 }}>
                <Image src={product.coverImage} alt="" fill sizes="(max-width: 980px) 60vw, 30vw" priority={index === 0} />
              </div>
            ))
          )}
          <div className="wa-catalog-collage-badge">
            <WisdomIcon name="shield" size={15} />
            Acceso seguro y trazable
          </div>
        </div>
      </section>

      <section className="wa-catalog-body" id="programas">
        {home && (
          <div className="wa-home-head" style={{ marginTop: 0 }}>
            <span className="wa-catalog-kicker">
              <WisdomIcon name="book" size={13} /> Dos portales integrados
            </span>
            <h2>Una academia, dos formas de avanzar</h2>
            <p>
              Elige el Portal Escolar para los itinerarios de educación básica o el Portal de Cursos
              y Talleres para formación complementaria aplicada. Puedes cambiar de portal sin salir
              del catálogo.
            </p>
          </div>
        )}
        <Tabs.Root
          value={portalActivo}
          onValueChange={(value) => {
            setPortalActivo(value as 'school' | 'pro');
            setCategoria('Todos');
          }}
          className="wa-portal-tabs"
        >
          <Tabs.List className="wa-portal-tabs-list" aria-label="Portales de Wisdom Academy">
            <Tabs.Trigger value="school" className="wa-portal-tab">
              <span className="wa-portal-tab-icon"><WisdomIcon name="graduation-cap" size={18} color="current" /></span>
              <span>
                <strong>Portal Escolar</strong>
                <small>Itinerarios de educación básica, calendario y ruta diaria</small>
              </span>
              <Badge variant="navy" size="sm">{productos.filter(isSchoolProduct).length}</Badge>
            </Tabs.Trigger>
            <Tabs.Trigger value="pro" className="wa-portal-tab">
              <span className="wa-portal-tab-icon"><WisdomIcon name="sparkles" size={18} color="current" /></span>
              <span>
                <strong>Cursos y Talleres</strong>
                <small>Formación complementaria para servir a la sociedad</small>
              </span>
              <Badge variant="gold" size="sm">{productos.filter((product) => !isSchoolProduct(product)).length}</Badge>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <div className="wa-portal-intro">
          <div>
            <span className="wa-student-eyebrow">{portalActivo === 'school' ? 'Portal Escolar' : 'Portal de Cursos y Talleres'}</span>
            <h3>
              {portalActivo === 'school'
                ? 'Un itinerario académico personalizado, con horario y ruta diaria.'
                : 'Habilidades concretas, proyectos reales y estándares profesionales.'}
            </h3>
            <p>
              {portalActivo === 'school'
                ? 'Cada nivel tiene su propio horario, materias y planificación. La vista previa te permite conocer el portal antes de iniciar sesión, sin perder el contexto del catálogo.'
                : 'Cursos y talleres diseñados para jóvenes y adultos que quieren aplicar tecnología, liderazgo, finanzas, música y formación familiar al mundo real.'}
            </p>
          </div>
          {portalActivo === 'school' && (
            <Button variant="secondary" onClick={() => setSchoolModalOpen(true)}>
              Ver vista del Portal Escolar
            </Button>
          )}
        </div>

        <div className="wa-catalog-toolbar">
          <div className="wa-catalog-chips" role="tablist" aria-label="Filtrar por categoría">
            {categoryOptions.map((item) => (
              <button
                key={item}
                className="wa-catalog-chip"
                data-active={categoria === item}
                onClick={() => setCategoria(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <label className="wa-catalog-sort">
            Ordenar
            <select value={orden} onChange={(event) => setOrden(event.target.value as typeof orden)}>
              <option value="recomendados">Recomendados</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre A–Z</option>
            </select>
          </label>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              margin: '0.75rem 0',
              padding: '0.75rem 1rem',
              borderRadius: 12,
              border: '1px solid var(--status-danger)',
              color: 'var(--status-danger)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span>{error}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                void cargar();
              }}
            >
              Reintentar
            </Button>
          </div>
        )}

        {cargando ? (
          <p role="status" style={{ padding: '2rem 0' }}>Cargando catálogo…</p>
        ) : filtrados.length === 0 ? (
          <div className="wa-catalog-empty">
            <WisdomIcon name="book" size={28} />
            <h2>No encontramos resultados</h2>
            <p>Prueba con otra palabra o cambia la categoría.</p>
            <Button variant="secondary" size="sm" onClick={() => { setBusqueda(''); setCategoria('Todos'); }}>
              Limpiar filtros
            </Button>
          </div>
        ) : (
          <div className="wa-catalog-grid">
            {filtrados.map((producto) => {
              const guia = esProductoGuia(producto);
              const proximamente = esProximamente(producto);
              const precioPendiente = esPrecioPendiente(producto);
              const ofertaAnual = producto.annualOffer;

              return (
                <article
                  className={`wa-course-card${proximamente ? ' is-upcoming' : ''}`}
                  key={producto.id}
                  data-testid={`catalog-card-${producto.slug}`}
                  data-content-status={producto.contentStatus}
                >
                  <div className="wa-course-cover">
                    <Image src={producto.coverImage} alt={producto.name} fill sizes="(max-width: 600px) 100vw, 320px" />
                    <div className="wa-course-cover-overlay" />
                    <Image
                      src="/brand/svg/wisdom-logo-horizontal-white.svg"
                      alt="Wisdom Academy"
                      width={112}
                      height={22}
                      className="wa-course-logo"
                      style={{ width: 'auto', height: 22 }}
                    />
                    {proximamente && (
                      <span className="wa-course-upcoming-pill">Próximamente</span>
                    )}
                    <span className="wa-course-type">
                      {guia
                        ? 'Guía gratuita'
                        : TYPE_LABEL[producto.resources[0]?.type || 'course'] || 'Formación'}
                    </span>
                  </div>
                  <div className="wa-course-body">
                    <div className="wa-course-meta">
                      <span>{producto.category}</span>
                      <span>·</span>
                      <span>{horasProducto(producto)}</span>
                      {producto.grade && <><span>·</span><span>{producto.grade}</span></>}
                    </div>
                    <h2 className="wa-course-title">{producto.name}</h2>
                    <p className="wa-course-description">{producto.description}</p>

                    {proximamente && (
                      <div
                        className="wa-course-upcoming"
                        role="status"
                        data-testid={`catalog-upcoming-${producto.slug}`}
                      >
                        <span>PRÓXIMAMENTE DISPONIBLE</span>
                        <p>
                          Estamos preparando los materiales educativos de este programa.
                          Pronto podrás consultar sus recursos desde Wisdom Academy.
                        </p>
                      </div>
                    )}

                    <div className="wa-course-meta" style={{ color: 'var(--text-secondary)' }}>
                      <span>
                        {proximamente
                          ? 'Materiales en preparación'
                          : `${producto.resourceCount} recursos incluidos`}
                      </span>
                      {producto.metadata.modality && <span>· {producto.metadata.modality}</span>}
                    </div>

                    {ofertaAnual && <OfertaAnualHomeschool producto={producto} contexto="card" />}

                    {isSchoolProduct(producto) && !guia && (
                      <button
                        type="button"
                        className="wa-course-portal-link"
                        onClick={() => setSchoolModalOpen(true)}
                      >
                        <WisdomIcon name="graduation-cap" size={13} color="current" />
                        Vista del Portal Escolar
                      </button>
                    )}
                    <div className="wa-course-footer">
                      <div className="wa-course-price">
                        {guia ? (
                          <>
                            Gratis
                            <small>Lectura en línea y PDF</small>
                          </>
                        ) : precioPendiente ? (
                          <>
                            Precio por definir
                            <small>Disponible al configurarse administrativamente</small>
                          </>
                        ) : ofertaAnual ? (
                          <>
                            Inscripción anual
                            <small>Cobertura de todo el año lectivo</small>
                          </>
                        ) : (
                          <>
                            {producto.priceCents === 0
                              ? 'Gratis'
                              : formatoPrecio(producto.priceCents, producto.currency)}
                            <small>
                              {proximamente
                                ? 'Inscripción al publicar los materiales'
                                : producto.priceCents === 0
                                ? 'Acceso inmediato'
                                : 'Pago seguro con PayPal'}
                            </small>
                          </>
                        )}
                      </div>
                      {guia ? (
                        <Link
                          href={producto.guideUrl || '#'}
                          style={{ textDecoration: 'none' }}
                          data-testid="guide-open-link"
                        >
                          <Button variant="primary-gold" size="sm">
                            <WisdomIcon name="book" size={15} />
                            Abrir guía
                          </Button>
                        </Link>
                      ) : precioPendiente ? (
                        <span className="wa-course-unavailable">
                          <WisdomIcon name="clock" size={15} />
                          Precio por definir
                        </span>
                      ) : proximamente ? (
                        <span className="wa-course-unavailable">
                          <WisdomIcon name="clock" size={15} />
                          Próximamente disponible
                        </span>
                      ) : producto.accessible ? (
                        <Link href={`/recurso/${producto.resources[0]?.slug || ''}`} style={{ textDecoration: 'none' }}>
                          <Button variant="primary-gold" size="sm">Acceder</Button>
                        </Link>
                      ) : (
                        <Button variant="primary-navy" size="sm" onClick={() => abrirCompra(producto)}>
                          {producto.priceCents === 0 ? 'Obtener' : 'Comprar'}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="wa-catalog-trust">
          <div className="wa-catalog-trust-item">
            <WisdomIcon name="shield" size={20} color="#2563eb" />
            <div>
              <strong>Acceso con derechos verificados</strong>
              <span>Compra, regalo o invitación: cada recurso se valida en el backend.</span>
            </div>
          </div>
          <div className="wa-catalog-trust-item">
            <WisdomIcon name="award" size={20} color="#047857" />
            <div>
              <strong>Currículo adaptable + IA</strong>
              <span>Planificación modular, guías diarias y acompañamiento con profesores IA.</span>
            </div>
          </div>
          <div className="wa-catalog-trust-item">
            <WisdomIcon name="book" size={20} color="#b45309" />
            <div>
              <strong>200 días de referencia</strong>
              <span>Guías descargables con objetivos, teoría, práctica y evaluación formativa adaptables.</span>
            </div>
          </div>
        </div>
      </section>

      {home && <AcademySections />}

      <footer className="wa-home-footer">
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
            <a href="#academia">Academia</a>
            <a href="#programas">Programas</a>
            <a href="#metodo">Método</a>
            <a href="#preguntas">Preguntas</a>
            <Link href="/login">Portal</Link>
            <Link href="/catalogo">Catálogo</Link>
          </div>
          <div style={{ textAlign: 'right', minWidth: 180 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Wisdom Academy</strong>
            <p style={{ margin: '0.35rem 0 0' }}>Ecuador · Modalidad híbrida · 2026</p>
          </div>
        </div>
      </footer>

      <SchoolPortalModal
        open={schoolModalOpen}
        onOpenChange={setSchoolModalOpen}
        isAuthenticated={Boolean(usuario)}
        onExplorePrograms={() => {
          setPortalActivo('school');
          setCategoria('Todos');
          requestAnimationFrame(() => {
            document.getElementById('programas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
      />

      {seleccionado && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Comprar ${seleccionado.name}`}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8, 15, 30, 0.65)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 100 }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSeleccionado(null);
          }}
        >
          <div style={{ width: 'min(560px, 100%)', borderRadius: 20, background: 'var(--bg-surface)', overflow: 'hidden', boxShadow: 'var(--shadow-overlay)' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 7' }}>
              <Image src={seleccionado.coverImage} alt="" fill sizes="560px" />
              <div className="wa-course-cover-overlay" />
              <div style={{ position: 'absolute', left: '1rem', bottom: '0.8rem', color: '#fff' }}>
                <Badge variant="gold" size="sm">{seleccionado.category}</Badge>
                <h2 style={{ margin: '0.4rem 0 0', fontFamily: 'var(--wa-font-display)', fontSize: '1.35rem' }}>{seleccionado.name}</h2>
              </div>
            </div>
            <div style={{ padding: '1.1rem' }}>
              {seleccionado.annualOffer ? (
                <OfertaAnualHomeschool producto={seleccionado} contexto="modal" />
              ) : (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Total:{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {seleccionado.pricePending
                      ? 'Precio por definir'
                      : formatoPrecio(seleccionado.priceCents, seleccionado.currency)}
                  </strong>
                </p>
              )}
              <p style={{ margin: '0.4rem 0 0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Incluye: {seleccionado.resources.map((resource) => resource.title).join(' · ')}
              </p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 650 }}>
                Código de descuento (opcional)
                <input
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value)}
                  placeholder="WA-PROMO-…"
                  autoComplete="off"
                  style={{ minHeight: 42, padding: '0.55rem 0.7rem', borderRadius: 9, border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', textTransform: 'uppercase' }}
                />
              </label>
              {resultado && (
                <div style={{ marginTop: '0.8rem', padding: '0.7rem', borderRadius: 10, background: 'var(--brand-primary-soft)', fontSize: '0.78rem' }}>
                  {resultado.status === 'free' ? (
                    <>
                      <strong>Acceso gratuito registrado.</strong>
                      <div style={{ marginTop: '0.4rem' }}>
                        <Link href="/mi-acceso"><Button variant="primary-gold" size="sm">Ver mi acceso</Button></Link>
                      </div>
                    </>
                  ) : resultado.status === 'paid' ? (
                    <>
                      <strong>Pago confirmado.</strong>
                      <div style={{ marginTop: '0.4rem' }}>
                        <Link href="/mi-acceso"><Button variant="primary-gold" size="sm">Ver mi acceso</Button></Link>
                      </div>
                    </>
                  ) : (
                    <span>Orden creada. Redirigiendo a PayPal…</span>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '0.9rem' }}>
                <Button variant="secondary" size="sm" onClick={() => setSeleccionado(null)} disabled={comprando}>
                  Cancelar
                </Button>
                <Button
                  variant="primary-gold"
                  size="sm"
                  onClick={comprar}
                  disabled={comprando || seleccionado.pricePending}
                  cargando={comprando}
                >
                  {seleccionado.pricePending
                    ? 'Precio por definir'
                    : seleccionado.priceCents === 0
                      ? 'Confirmar acceso'
                      : 'Pagar con PayPal'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
