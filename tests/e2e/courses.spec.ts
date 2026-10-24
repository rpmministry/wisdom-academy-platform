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

  test('el aula homeschool conserva visor y pestañas en una pantalla móvil pequeña', async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 320, height: 740 });

    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/aula?recurso=programa-homeschool-8-egb', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('.wa-platzi-classroom')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.wa-openmaic-stage').first()).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.wa-slide-card').first()).toBeVisible({ timeout: 60_000 });

    const panel = page.locator('.wa-platzi-right-panel');
    await expect(panel).toBeVisible();
    const tablist = panel.getByRole('tablist', {
      name: 'Herramientas del aula Platzi y Moodle',
    });
    await expect(tablist).toBeVisible();

    for (const name of [/Ruta/, /Profesor IA/, /Moodle/, /Apuntes/]) {
      await expect(panel.getByRole('tab', { name })).toBeVisible();
    }

    const mobileLayout = await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('.wa-openmaic-stage');
      const tablistElement = document.querySelector<HTMLElement>(
        '.wa-platzi-right-panel [role="tablist"]',
      );
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.wa-platzi-right-panel [role="tablist"] [role="tab"] > span:last-child',
        ),
      );

      return {
        stageOverflowY: stage ? getComputedStyle(stage).overflowY : '',
        tabColumns: tablistElement
          ? getComputedStyle(tablistElement).gridTemplateColumns.trim().split(/\\s+/).length
          : 0,
        clippedLabels: labels.some(
          (label) =>
            getComputedStyle(label).textOverflow === 'ellipsis' &&
            label.scrollWidth > label.clientWidth + 1,
        ),
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    expect(mobileLayout.stageOverflowY).not.toBe('hidden');
    expect(mobileLayout.tabColumns).toBe(2);
    expect(mobileLayout.clippedLabels).toBe(false);
    expect(mobileLayout.horizontalOverflow).toBe(false);

    await panel.getByRole('tab', { name: /Profesor IA/ }).click();
    await expect(panel.getByRole('tab', { name: /Profesor IA/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(pageErrors).toEqual([]);
  });
});
