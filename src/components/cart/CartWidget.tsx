'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/lib/cart/cartContext';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { Button } from '@/components/ui/Button';

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

/**
 * Acceso al carrito desde cualquier encabezado público. El panel se monta en
 * un portal para que ningún ancestro con overflow o backdrop-filter lo recorte.
 */
export const CartWidget: React.FC<{ className?: string }> = ({ className }) => {
  const { items, itemCount, subtotalCents, hydrated, removeItem, clearCart } = useCart();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      // Mantiene el foco dentro del diálogo mientras está abierto.
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const currency = items[0]?.currency || 'USD';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`wa-cart-trigger ${className || ''}`}
        onClick={() => setOpen(true)}
        aria-label={
          hydrated && itemCount > 0
            ? `Abrir carrito, ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}`
            : 'Abrir carrito'
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        data-count={hydrated ? itemCount : 0}
      >
        <WisdomIcon name="shopping-cart" size={18} color="current" />
        <span className="wa-cart-trigger-label">Carrito</span>
        {hydrated && itemCount > 0 && (
          <span className="wa-cart-count" aria-hidden="true">
            {itemCount}
          </span>
        )}
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="wa-cart-overlay"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <section
              ref={drawerRef}
              className="wa-cart-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Carrito de compra"
            >
              <header className="wa-cart-head">
                <div>
                  <span className="wa-eyebrow">Tu selección</span>
                  <h2>Carrito ({itemCount})</h2>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className="wa-portal-icon-button"
                  onClick={close}
                  aria-label="Cerrar carrito"
                >
                  <WisdomIcon name="close" size={18} color="current" />
                </button>
              </header>

              {!hydrated ? (
                <p role="status" className="wa-cart-status">
                  Cargando carrito…
                </p>
              ) : items.length === 0 ? (
                <div className="wa-cart-empty">
                  <WisdomIcon name="shopping-cart" size={30} />
                  <h3>Tu carrito está vacío</h3>
                  <p>Explora el catálogo y agrega los cursos o talleres que quieras comprar.</p>
                  <Link href="/catalogo#programas" onClick={close}>
                    <Button variant="primary-gold" size="sm">Explorar catálogo</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <ul className="wa-cart-list">
                    {items.map((item) => (
                      <li key={item.productId} className="wa-cart-item">
                        <div className="wa-cart-thumb">
                          <Image
                            src={item.coverImage}
                            alt=""
                            fill
                            sizes="84px"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className="wa-cart-item-copy">
                          <span>{item.category}</span>
                          <strong>{item.name}</strong>
                          <small>{money(item.priceCents, item.currency)}</small>
                        </div>
                        <button
                          type="button"
                          className="wa-cart-remove"
                          onClick={() => removeItem(item.productId)}
                          aria-label={`Quitar ${item.name} del carrito`}
                        >
                          <WisdomIcon name="close" size={15} color="current" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="wa-cart-total">
                    <span>Subtotal referencial</span>
                    <strong>{money(subtotalCents, currency)}</strong>
                    <small>El servidor confirma precios, descuentos y moneda al pagar.</small>
                  </div>

                  <div className="wa-cart-actions">
                    <Link href="/checkout" onClick={close} className="wa-cart-checkout-link">
                      <Button variant="primary-gold" size="lg">
                        Continuar al pago
                        <WisdomIcon name="arrow-right" size={16} />
                      </Button>
                    </Link>
                    <button
                      type="button"
                      className="wa-cart-clear"
                      onClick={clearCart}
                    >
                      Vaciar carrito
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>,
          document.body
        )}
    </>
  );
};

export default CartWidget;
