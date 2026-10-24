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
import { PublicHeader } from '@/components/layout/PublicHeader';
import { AcademySections } from '@/components/marketing/AcademySections';
import { SchoolPortalModal } from '@/components/catalog/SchoolPortalModal';
import { useCart } from '@/lib/cart/cartContext';
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
  const { usuario } = useAuth();
  const { addItem, hasItem } = useCart();
  const [productos, setProductos] = useState<CatalogProduct[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [portalActivo, setPortalActivo] = useState<'school' | 'pro'>(home ? 'school' : 'pro');
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [orden, setOrden] = useState<'recomendados' | 'precio-asc' | 'precio-desc' | 'nombre'>('recomendados');
  const [seleccionado, setSeleccionado] = useState<CatalogProduct | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!cartNotice) return;
    const timer = window.setTimeout(() => setCartNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  useEffect(() => {
    if (!seleccionado) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSeleccionado(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [seleccionado]);

  const cargar = useCallback(async () => {
    if (!hasLoaded.current) setCargando(true);
    setError(null);
    try {
      const response = await apiFetch<{ productos: CatalogProduct[] }>('/api/catalog', {
        // El catálogo agrega productos, recursos y programas; en redes lentas o
        // servidores en arranque merece más margen que una mutación puntual.
        timeoutMs: 45_000,
      });
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

  // El portal elegido se refleja en la URL para conservarlo al recargar y
  // permitir enlaces directos al Portal Escolar o a Cursos y Talleres.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('portal');
    if (requested === 'escolar') setPortalActivo('school');
    if (requested === 'cursos') setPortalActivo('pro');
  }, []);

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

  const agregarAlCarrito = (producto: CatalogProduct): boolean => {
    if (esProductoGuia(producto) || esProximamente(producto) || esPrecioPendiente(producto)) {
      return false;
    }
    const result = addItem({
      productId: producto.id,
      slug: producto.slug,
      name: producto.name,
      priceCents: producto.priceCents,
      currency: producto.currency,
      coverImage: producto.coverImage,
      category: producto.category,
    });
    if (result.ok) {
      setCartNotice(`«${producto.name}» se agregó al carrito.`);
      return true;
    }
    if (result.reason === 'exists') {
      setCartNotice(`«${producto.name}» ya está en tu carrito.`);
    } else if (result.reason === 'limit') {
      setCartNotice('El carrito admite hasta 20 productos. Retira uno para continuar.');
    } else {
      setCartNotice('No fue posible agregar este producto al carrito.');
    }
    return false;
  };

  const abrirCompra = (producto: CatalogProduct) => {
    if (esProductoGuia(producto) || esProximamente(producto) || esPrecioPendiente(producto)) return;
    setSeleccionado(producto);
  };

  const comprarAhora = (producto: CatalogProduct) => {
    if (esPrecioPendiente(producto) || esProximamente(producto)) return;
    if (!hasItem(producto.id)) agregarAlCarrito(producto);
    setSeleccionado(null);
    router.push('/checkout');
  };

  const collage = productos.slice(0, 3);

  return (
    <main className="wa-catalog-page">
      <PublicHeader home={home} />

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
            const next = value === 'school' ? 'school' : 'pro';
            setPortalActivo(next);
            setCategoria('Todos');
            const url = new URL(window.location.href);
            url.searchParams.set('portal', next === 'school' ? 'escolar' : 'cursos');
            window.history.replaceState(null, '', url.toString());
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

        {cartNotice && (
          <div className="wa-checkout-notice" role="status" aria-live="polite">
            {cartNotice}
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
              const periodo = producto.metadata.offerPeriod?.trim();

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
                                : `Pago seguro con PayPal${periodo ? ` · ${periodo}` : ''}`}
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
                        <div className="wa-course-buy-actions">
                          <Button variant="primary-navy" size="sm" onClick={() => abrirCompra(producto)}>
                            {producto.priceCents === 0 ? 'Obtener' : 'Comprar'}
                          </Button>
                          <button
                            type="button"
                            className="wa-course-cart-add"
                            aria-label={`Agregar ${producto.name} al carrito`}
                            title="Agregar al carrito"
                            onClick={() => agregarAlCarrito(producto)}
                          >
                            <WisdomIcon name="shopping-cart" size={15} color="current" />
                          </button>
                        </div>
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
          className="wa-course-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSeleccionado(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-course-modal-title"
            className="wa-course-modal"
          >
            <div className="wa-course-modal-cover">
              <Image src={seleccionado.coverImage} alt="" fill sizes="560px" />
              <div className="wa-course-cover-overlay" />
              <button
                type="button"
                className="wa-course-modal-close"
                onClick={() => setSeleccionado(null)}
                aria-label="Cerrar ficha de compra"
              >
                <WisdomIcon name="close" size={18} color="#fff" />
              </button>
              <div className="wa-course-modal-title">
                <Badge variant="gold" size="sm">{seleccionado.category}</Badge>
                <h2 id="wa-course-modal-title">{seleccionado.name}</h2>
              </div>
            </div>
            <div className="wa-course-modal-body">
              {seleccionado.annualOffer ? (
                <OfertaAnualHomeschool producto={seleccionado} contexto="modal" />
              ) : (
                <p className="wa-course-modal-price">
                  Total:{' '}
                  <strong>
                    {seleccionado.pricePending
                      ? 'Precio por definir'
                      : formatoPrecio(seleccionado.priceCents, seleccionado.currency)}
                  </strong>
                  {seleccionado.metadata.offerPeriod ? (
                    <span> · {seleccionado.metadata.offerPeriod}</span>
                  ) : null}
                </p>
              )}
              <p className="wa-course-modal-includes">
                Incluye: {seleccionado.resources.map((resource) => resource.title).join(' · ')}
              </p>
              <p className="wa-course-modal-note">
                El código de descuento y el importe definitivo se confirman en el checkout. La
                compra concede acceso únicamente a los productos incluidos en la orden pagada.
              </p>
              <div className="wa-course-modal-actions">
                <Button variant="secondary" size="sm" onClick={() => setSeleccionado(null)}>
                  Seguir explorando
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => agregarAlCarrito(seleccionado)}
                  disabled={seleccionado.pricePending}
                >
                  <WisdomIcon name="shopping-cart" size={15} />
                  Agregar al carrito
                </Button>
                <Button
                  variant="primary-gold"
                  size="sm"
                  onClick={() => comprarAhora(seleccionado)}
                  disabled={seleccionado.pricePending}
                >
                  {seleccionado.priceCents === 0 ? 'Obtener ahora' : 'Comprar ahora'}
                  <WisdomIcon name="arrow-right" size={15} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
