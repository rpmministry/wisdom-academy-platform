import { test, expect } from '@playwright/test';

test.describe.configure({ timeout: 180_000 });

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

const studentLogin = async (page: import('@playwright/test').Page) => {
  const response = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.estudiante@wisdomacademy.test',
      contrasenia: process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test',
    },
    headers: { origin },
  });
  expect(response.ok()).toBeTruthy();
};

const adminLogin = async (page: import('@playwright/test').Page) => {
  const response = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.admin@wisdomacademy.test',
      contrasenia: process.env.WISDOM_E2E_ADMIN_PASSWORD || 'E2eAdminWisdom!2026-test',
    },
    headers: { origin },
  });
  expect(response.ok()).toBeTruthy();
};

test.describe('RBAC y navegación administrativa', () => {
  test('un visitante anónimo no entra al panel', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('un estudiante es redirigido fuera de Administración y CRM', async ({ page }) => {
    await studentLogin(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/admin/crm', { waitUntil: 'commit' }).catch(() => {});
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 120_000 });
  });

  test('el catálogo público no muestra accesos administrativos a un estudiante', async ({ page }) => {
    await studentLogin(page);
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { name: /Aprende con propósito/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^CRM$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Panel$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Administración/i })).toHaveCount(0);
  });

  test('un administrador autorizado ve el workspace y el CRM unificado', async ({ page }) => {
    await adminLogin(page);
    await page.goto('/admin');
    await expect(page.locator('.wa-aw-page-head h1')).toHaveText(/CRM · Dirección/i);
    await expect(page.getByRole('button', { name: /CRM · Dirección/i })).toBeVisible();
    await page.getByRole('button', { name: /CRM · Dirección/i }).click();
    await expect(page).toHaveURL(/tab=crm/);
    await expect(page.locator('.wa-crm-embedded-tabs')).toBeVisible();
    await expect(page.locator('.wa-crm-sidebar')).toHaveCount(0);
    await page.goto('/admin/crm', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.wa-aw-page-head h1')).toHaveText(/CRM · Dirección/i, {
      timeout: 120_000,
    });
    await expect(page.locator('.wa-crm-embedded-tabs')).toBeVisible();
    await expect(page.locator('.wa-crm-sidebar')).toHaveCount(0);
  });
});
