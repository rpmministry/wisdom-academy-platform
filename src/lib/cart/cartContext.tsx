'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Carrito de Wisdom Academy.
 *
 * El carrito vive en el navegador para no perder la intención de compra al
 * iniciar sesión o al volver de PayPal. Sus precios son solo una referencia
 * visual: `/api/checkout` y `/api/checkout/quote` recalculan siempre el total
 * con el catálogo y los descuentos del servidor.
 */

const STORAGE_KEY = 'wa_cart_v1';
const MAX_ITEMS = 20;

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  coverImage: string;
  category: string;
  pricePending?: boolean;
}

export interface AddCartResult {
  ok: boolean;
  reason?: 'exists' | 'limit' | 'invalid';
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotalCents: number;
  addItem: (item: CartItem) => AddCartResult;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  hasItem: (productId: string) => boolean;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function isSafeText(value: unknown, max = 300): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function sanitizeItem(value: unknown): CartItem | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const priceCents = Number(candidate.priceCents);
  if (!isSafeText(candidate.productId, 120)) return null;
  if (!isSafeText(candidate.slug, 160)) return null;
  if (!isSafeText(candidate.name, 300)) return null;
  if (!isSafeText(candidate.currency, 3) || !/^[A-Z]{3}$/.test(candidate.currency)) return null;
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) return null;
  return {
    productId: candidate.productId,
    slug: candidate.slug,
    name: candidate.name,
    priceCents,
    currency: candidate.currency,
    coverImage: isSafeText(candidate.coverImage, 500)
      ? candidate.coverImage
      : '/images/courses/default.svg',
    category: isSafeText(candidate.category, 120) ? candidate.category : 'Cursos',
    pricePending: candidate.pricePending === true,
  };
}

function readStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const unique = new Map<string, CartItem>();
    for (const value of parsed.slice(0, MAX_ITEMS)) {
      const item = sanitizeItem(value);
      if (item && !unique.has(item.productId)) unique.set(item.productId, item);
    }
    return [...unique.values()];
  } catch {
    return [];
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const itemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    const stored = readStoredCart();
    itemsRef.current = stored;
    setItems(stored);
    setHydrated(true);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = readStoredCart();
      itemsRef.current = next;
      setItems(next);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      const payload = JSON.stringify(items);
      // Evita reescribir el carrito al recibir un evento de otra pestaña:
      // así dos pestañas no entran en un ciclo de sincronización.
      if (window.localStorage.getItem(STORAGE_KEY) === payload) return;
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch {
      // Sin almacenamiento local el carrito sigue operativo en memoria.
    }
  }, [hydrated, items]);

  const addItem = useCallback((item: CartItem): AddCartResult => {
    if (!sanitizeItem(item)) {
      return { ok: false, reason: 'invalid' };
    }
    if (itemsRef.current.some((current) => current.productId === item.productId)) {
      return { ok: false, reason: 'exists' };
    }
    if (itemsRef.current.length >= MAX_ITEMS) {
      return { ok: false, reason: 'limit' };
    }
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    setItems(next);
    return { ok: true };
  }, []);

  const removeItem = useCallback((productId: string) => {
    const next = itemsRef.current.filter((item) => item.productId !== productId);
    itemsRef.current = next;
    setItems(next);
  }, []);

  const clearCart = useCallback(() => {
    itemsRef.current = [];
    setItems([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento local no hay nada más que limpiar.
    }
  }, []);

  const hasItem = useCallback(
    (productId: string) => items.some((item) => item.productId === productId),
    [items]
  );

  const value = useMemo<CartContextValue>(() => {
    const subtotalCents = items.reduce(
      (total, item) => total + (Number.isSafeInteger(item.priceCents) ? item.priceCents : 0),
      0
    );
    return {
      items,
      hydrated,
      itemCount: items.length,
      subtotalCents,
      addItem,
      removeItem,
      clearCart,
      hasItem,
    };
  }, [addItem, clearCart, hasItem, hydrated, items, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe utilizarse dentro de CartProvider');
  }
  return context;
}
