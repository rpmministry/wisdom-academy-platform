import { test, expect } from '@playwright/test';

/**
 * Humo de la experiencia de Cursos y Talleres.
 * No depende de Google Drive ni de YouTube: valida que la ruta del estudiante
 * renderiza sin errores de página y que un programa inexistente no expone datos.
 */

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

test.describe('Cursos y talleres — experiencia de estudiante', () => {
  test.beforeEach(async ({ page }) => {
    const login = await page.request.post('/api/auth/login', {
      data: {
        identificador: 'e2e.estudiante@wisdomacademy.test',
        contrasenia: process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test',
      },
      headers: { origin },
    });
    expect(login.ok()).toBeTruthy();
  });

  test('muestra la ruta de aprendizaje sin errores de página', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/cursos');
    await expect(
      page.getByRole('heading', { name: /Cursos y talleres habilitados/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Mi portal/i }).first()).toBeVisible();
    await expect(page.getByText(/No hay cursos publicados con acceso vigente/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('un programa inexistente no renderiza contenido privado', async ({ page }) => {
    await page.goto('/cursos/programa-que-no-existe');
    await expect(page.getByText(/404|not found|no encontrada/i).first()).toBeVisible();
  });

  test('el acceso a un recurso abre el aula contextual y no vuelve a contenidos', async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto('/recurso/programa-homeschool-8-egb');
    await page.locator('.wa-portal[data-hydrated="true"]').waitFor({ timeout: 60_000 });
    const entry = page.getByRole('link', { name: /Entrar al aula/i }).first();
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/aula\?recurso=programa-homeschool-8-egb/, { timeout: 60_000 });
    await expect(page.locator('.wa-platzi-classroom')).toBeVisible({ timeout: 60_000 });
  });

  test('una asignatura Homeschool conserva el acceso al aula y no se marca como pendiente', async ({
    page,
  }) => {
    await page.goto('/recurso/curso-801-matematicas-y-pre-algebra');
    const entrar = page.getByRole('link', { name: /Entrar al aula/i }).first();
    await expect(entrar).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText('PRÓXIMAMENTE DISPONIBLE')).toHaveCount(0);
  });

  test('el botón de catálogo del portal apunta al módulo de programas', async ({ page }) => {
    await page.goto('/dashboard');
    const link = page.locator('a[href="/catalogo#programas"]').first();
    await expect(link).toBeVisible();
  });
});
