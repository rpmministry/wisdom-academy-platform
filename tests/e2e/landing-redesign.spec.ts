import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 320, height: 600, name: '320px-mobile-narrow' },
  { width: 360, height: 740, name: '360px-mobile-standard' },
  { width: 390, height: 844, name: '390px-mobile-iphone' },
  { width: 768, height: 1024, name: '768px-tablet-portrait' },
  { width: 1024, height: 768, name: '1024px-tablet-landscape' },
  { width: 1280, height: 800, name: '1280px-desktop-small' },
  { width: 1440, height: 900, name: '1440px-desktop-large' },
];

test.describe('Landing Page Wisdom Academy - Rediseño Estratégico Multi-dispositivo', () => {
  for (const vp of VIEWPORTS) {
    test(`renderiza sin desbordamiento horizontal y con jerarquía correcta a ${vp.width}px (${vp.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // 1. Verificación de cero desbordamiento horizontal
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      expect(overflow).toBe(false);

      // 2. Propuesta de valor en el Hero (H1 claro y sin ambigüedades)
      const h1 = page.locator('h1.wa-catalog-title');
      await expect(h1).toBeVisible();
      await expect(h1).toContainText('Educación integral');
      await expect(h1).toContainText('excelencia y propósito');

      // 3. CTAs estratégicos duales en la primera vista
      const ctaWorkshops = page.locator('.wa-home-hero-actions a[href="#cursos-talleres"]');
      const ctaSchool = page.locator('.wa-home-hero-actions a[href="#portal-escolar"]');
      await expect(ctaWorkshops).toBeVisible();
      await expect(ctaSchool).toBeVisible();

      // 4. Gateway de dos caminos formativos (#academia / #dos-caminos)
      await expect(page.locator('#gateway-cursos')).toBeAttached();
      await expect(page.locator('#gateway-escolar')).toBeAttached();

      // 5. Escaparate destacado de Cursos y Talleres (#cursos-talleres)
      const workshopsSection = page.locator('#cursos-talleres');
      await expect(workshopsSection).toBeAttached();

      // 6. Catálogo interactivo con tabs y tarjetas (#programas)
      const catalogSection = page.locator('#programas');
      await expect(catalogSection).toBeAttached();

      // 7. Secciones institucionales: Método, Docentes, Preguntas y CTA
      await expect(page.locator('#metodo')).toBeAttached();
      await expect(page.locator('#docentes')).toBeAttached();
      await expect(page.locator('#preguntas')).toBeAttached();
      await expect(page.locator('.wa-home-cta')).toBeAttached();
      await expect(page.locator('.wa-home-footer')).toBeAttached();

      // Captura de evidencia por tamaño
      await page.screenshot({
        path: `docs/evidencias/landing-${vp.name}.png`,
        fullPage: false,
      });
    });
  }

  test('navegación interactiva hacia Cursos y Talleres y Portal Escolar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Clic en el CTA de Cursos y Talleres
    const ctaWorkshops = page.locator('.wa-home-hero-actions a[href="#cursos-talleres"]');
    await expect(ctaWorkshops).toBeVisible();
    await ctaWorkshops.click();

    // Verificación de que la sección de Cursos y Talleres está en pantalla
    const workshopsSection = page.locator('#cursos-talleres');
    await expect(workshopsSection).toBeVisible();

    // Verificación de tarjetas destacadas de talleres (Teología N2N de #1 por tener contenido activo)
    await expect(page.getByText('Programa de Teología').first()).toBeVisible();
    await expect(page.getByText('Programación con IA y Python').first()).toBeVisible();
    await expect(page.getByText('Mayordomía Financiera').first()).toBeVisible();
    await expect(page.getByText('Liderazgo y Cosmovisión').first()).toBeVisible();

    // Clic en Conocer Portal Escolar
    const ctaSchool = page.locator('.wa-home-hero-actions a[href="#portal-escolar"]');
    await expect(ctaSchool).toBeVisible();
    await ctaSchool.click();

    // Verificación de que el ancla de Portal Escolar y el catálogo están presentes
    await expect(page.locator('#portal-escolar')).toBeAttached();
    await expect(page.locator('#programas')).toBeVisible();
  });

  test('apertura de la vista previa del Portal Escolar desde el gateway', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/', { waitUntil: 'load' });

    const btnModal = page.locator('#gateway-escolar button:has-text("Vista previa del portal")');
    await expect(btnModal).toBeVisible();
    // Reintento de clic si la hidratación está en curso
    await expect(async () => {
      await btnModal.click();
      await expect(page.locator('.wa-school-content')).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 15_000 });

    // Se abre el diálogo modal con el itinerario de 4.° y 8.° EGB
    await expect(page.locator('.wa-school-title')).toContainText('itinerario académico');

    // Cerrar modal
    const closeBtn = page.locator('.wa-school-close');
    await closeBtn.click();
    await expect(page.locator('.wa-school-content')).toHaveCount(0);
  });
});
