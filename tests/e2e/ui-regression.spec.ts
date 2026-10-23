import { test, expect } from '@playwright/test';

/**
 * Regresiones de interfaz: tema persistente, error de acceso y navegación
 * administrativa en un viewport móvil real.
 */

test.describe.configure({ timeout: 180_000 });

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

const adminLogin = async (page: import('@playwright/test').Page) => {
  const response = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.admin@wisdomacademy.test',
      contrasenia:
        process.env.WISDOM_E2E_ADMIN_PASSWORD || 'E2eAdminWisdom!2026-test',
    },
    headers: { origin },
  });
  expect(response.ok()).toBeTruthy();
};

test.describe('Interfaz y experiencia de acceso', () => {
  test('el tema oscuro persiste después de recargar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Boolean((window as unknown as { next?: unknown }).next),
      { timeout: 60_000 }
    );
    await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('wa_theme'))).toBe('dark');
  });

  test('un error de credenciales se anuncia y el formulario vuelve a estar disponible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const submit = page.getByRole('button', { name: /Ingresar a la plataforma/i });
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await page.fill('#login-identificador', 'e2e.estudiante@wisdomacademy.test');
    await page.fill('#login-contrasenia', 'CredencialIncorrecta123!');
    await submit.click();
    await expect(page.locator('#login-error')).toContainText(/incorrectos/i, {
      timeout: 15_000,
    });
    await expect(submit).toBeEnabled();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });

  test('las mutaciones administrativas sin token CSRF se rechazan', async ({ page }) => {
    await adminLogin(page);
    const response = await page.request.post('/api/admin/products', { data: { title: 'Sin CSRF' } });
    expect(response.status()).toBe(403);
  });

  test('el menú administrativo se abre en móvil sin desbordar la página', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await adminLogin(page);
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    const menu = page.locator('.wa-aw-menu').first();
    await expect(menu).toBeVisible({ timeout: 30_000 });
    await menu.click();
    await expect(page.locator('.wa-aw-sidebar.is-open')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(overflow).toBe(false);
  });
});
