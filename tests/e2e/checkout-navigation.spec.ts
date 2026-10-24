import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 240_000 });

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const studentEmail = 'e2e.estudiante@wisdomacademy.test';
const studentPassword = process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test';

async function studentLogin(page: import('@playwright/test').Page) {
  const response = await page.request.post('/api/auth/login', {
    data: { identificador: studentEmail, contrasenia: studentPassword },
    headers: { origin },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe('Navegación responsive y perfil', () => {
  test('el encabezado público no desborda en la matriz de tamaños', async ({ page }) => {
    const sizes = [
      { width: 320, height: 740 },
      { width: 360, height: 800 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 844, height: 390 },
      { width: 1280, height: 800 },
      { width: 1440, height: 900 },
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto('/catalogo', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.wa-public-actions')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(200);

      const metrics = await page.evaluate(() => {
        const header = document.querySelector('.wa-public-header');
        const controls = Array.from(
          header?.querySelectorAll<HTMLElement>(
            '.wa-catalog-brand, .wa-public-nav, .wa-public-actions > *'
          ) || []
        ).filter((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        return {
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          outOfBounds: controls.some((element) => {
            const rect = element.getBoundingClientRect();
            return rect.left < -1 || rect.right > window.innerWidth + 1;
          }),
        };
      });
      expect(metrics.overflow, `desbordamiento en ${size.width}x${size.height}`).toBe(false);
      expect(metrics.outOfBounds, `control fuera de pantalla en ${size.width}x${size.height}`).toBe(false);
    }
  });

  test('el menú de cuenta permite cerrar sesión y no deja la sesión activa', async ({ page }) => {
    await studentLogin(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('.wa-account-trigger').first();
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await trigger.click();
    await expect(page.getByRole('menuitem', { name: /Cerrar sesión/i })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: /Cerrar sesión/i })).toHaveCount(0);

    await trigger.click();
    await page.getByRole('menuitem', { name: /Cerrar sesión/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    await page.goto('/mi-acceso', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
  });

  test('el acceso anónimo conserva la ruta de retorno después del login', async ({ page }) => {
    // Calienta la ruta de autenticación en el servidor de desarrollo para que
    // la medición no incluya la compilación inicial de Next.js.
    await page.request.post('/api/auth/login', {
      data: { identificador: 'warmup@test.local', contrasenia: 'no-es-una-clave' },
      headers: { origin },
    });
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
    const submit = page.getByRole('button', { name: /Ingresar a la plataforma/i });
    await expect(submit).toBeEnabled({ timeout: 30_000 });
    await page.fill('#login-identificador', studentEmail);
    await page.fill('#login-contrasenia', studentPassword);
    await submit.click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  });
});

test.describe('Carrito desde el catálogo', () => {
  test('agregar, abrir el carrito y retirar un producto actualiza el contador', async ({ page }) => {
    await page.request.get('/api/catalog', { timeout: 120_000 });
    await page.goto('/catalogo?portal=escolar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: /Portal Escolar/i })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 }
    );
    const add = page.locator('.wa-course-cart-add').first();
    await expect(add).toBeVisible({ timeout: 30_000 });
    await add.click();
    await expect(page.locator('.wa-cart-count')).toHaveText('1');
    await page.getByRole('button', { name: /Abrir carrito/i }).first().click();
    const drawer = page.getByRole('dialog', { name: /Carrito de compra/i });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: /Quitar .* del carrito/i }).first().click();
    await expect(drawer.getByText(/Tu carrito está vacío/i)).toBeVisible();
  });

  test('Comprar ahora abre el checkout sin pedir login previo', async ({ page }) => {
    await page.request.get('/api/catalog', { timeout: 120_000 });
    await page.goto('/catalogo?portal=escolar', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: /Portal Escolar/i })).toHaveAttribute(
      'aria-selected',
      'true',
      { timeout: 30_000 }
    );
    const card = page
      .locator('.wa-course-card')
      .filter({ has: page.locator('.wa-course-cart-add') })
      .first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: /^Comprar$/ }).click();
    const modal = page.getByRole('dialog').first();
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: /Comprar ahora/i }).click();
    await expect(page).toHaveURL(/\/checkout/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: /Revisa tu pedido/i })).toBeVisible();
    await expect(page.locator('#checkout-identificador')).toBeVisible();
  });
});

test.describe('Checkout preservando carrito', () => {
  test('el carrito sobrevive al iniciar sesión dentro del checkout', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    const catalogResponse = await page.request.get('/api/catalog');
    expect(catalogResponse.ok()).toBeTruthy();
    const catalog = (await catalogResponse.json()) as {
      productos: Array<{
        id: string;
        slug: string;
        name: string;
        priceCents: number;
        currency: string;
        pricePending: boolean;
        category: string;
        contentStatus: string;
        guideUrl: string | null;
        coverImage: string;
      }>;
    };
    const purchasable = catalog.productos.filter(
      (item) =>
        !item.pricePending &&
        item.contentStatus === 'available' &&
        !item.guideUrl &&
        item.priceCents > 0
    );
    const product =
      purchasable.find((item) => item.slug === 'curso-python-ia-jovenes') ||
      purchasable[0];
    expect(product, 'debe existir un producto comprable en el catálogo').toBeTruthy();
    if (!product) return;

    await page.addInitScript(
      ({ item }) => {
        if (!window.localStorage.getItem('wa_cart_v1')) {
          window.localStorage.setItem('wa_cart_v1', JSON.stringify([item]));
        }
      },
      {
        item: {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
          currency: product.currency,
          coverImage: product.coverImage,
          category: product.category,
        },
      }
    );

    await page.goto('/checkout', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole('heading', { name: /Revisa tu pedido/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(product.name, { exact: false }).first()).toBeVisible();
    await expect(page.locator('#checkout-identificador')).toBeVisible();

    await page.fill('#checkout-identificador', studentEmail);
    await page.fill('#checkout-contrasenia', studentPassword);
    await page.getByRole('button', { name: /Iniciar sesión y continuar/i }).click();
    await expect(page.getByRole('button', { name: /Usar otra cuenta/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/\/checkout/);
    const stored = await page.evaluate(() => {
      const raw = window.localStorage.getItem('wa_cart_v1');
      return raw ? (JSON.parse(raw) as Array<{ productId: string }>) : [];
    });
    expect(stored.some((item) => item.productId === product.id)).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow, 'el checkout no debe desbordar en 320 px').toBe(false);
  });
});
