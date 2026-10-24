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

const financeLogin = async (page: import('@playwright/test').Page) => {
  const response = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.finanzas@wisdomacademy.test',
      contrasenia: process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test',
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

  test('sin permiso de pagos no se muestran las finanzas ni se puede consultar la API', async ({
    page,
  }) => {
    await adminLogin(page);
    await page.goto('/admin?tab=crm&crm=ordenes', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.wa-crm-embedded-tabs')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByRole('tab', { name: /^Pagos$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Evoluci.n de cobros/i })).toHaveCount(0);
    const response = await page.request.get('/api/admin/finance');
    expect(response.status()).toBe(403);
  });

  test('un analista con permiso de pagos consulta el módulo financiero', async ({ page }) => {
    await financeLogin(page);
    await page.goto('/admin?tab=crm&crm=ordenes', { waitUntil: 'domcontentloaded' });
    const financeTab = page.getByRole('tab', { name: /^Pagos$/i });
    await expect(financeTab).toBeVisible({ timeout: 120_000 });
    await financeTab.click();
    await expect(page.getByRole('heading', { name: /Evoluci.n de cobros/i })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Cobros confirmados/i).first()).toBeVisible();
    await expect(page.getByText(/Neto despu.s de reembolsos/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Exportar CSV/i })).toBeDisabled();
    await expect(financeTab).toHaveAttribute('aria-selected', 'true');
    const response = await page.request.get('/api/admin/finance');
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as {
      reporte: { summary: { capturedCents: number; pendingOrders: number } };
    };
    expect(payload.reporte.summary.capturedCents).toBe(0);
    expect(payload.reporte.summary.pendingOrders).toBe(0);
  });

  test('un administrador con users.read consulta registros y estados de matrícula', async ({
    page,
  }) => {
    await adminLogin(page);
    // Compila la ruta administrativa antes de medir la interfaz.
    await page.request.get('/api/admin/registrations?limit=1', { timeout: 120_000 });
    await page.goto('/admin?tab=crm&crm=registros', { waitUntil: 'domcontentloaded' });
    const registrationsTab = page.getByRole('tab', { name: /^Registros$/i });
    await expect(registrationsTab).toBeVisible({ timeout: 120_000 });
    await registrationsTab.click();
    await expect(page.getByRole('heading', { name: /Registros posteriores al pago/i })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByPlaceholder(/Comprador, correo, estudiante u orden/i).fill(
      'e2e.invitado@wisdomacademy.test'
    );
    await expect(page.getByText('e2e.invitado@wisdomacademy.test').first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Registro (pendiente|completado)/i).first()).toBeVisible();
    const response = await page.request.get('/api/admin/registrations?q=e2e.invitado');
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { registros: Array<{ buyerEmail: string }> };
    expect(payload.registros[0]?.buyerEmail).toBe('e2e.invitado@wisdomacademy.test');
  });
});
