import { expect, test } from '@playwright/test';

const PDF_PATH = '/docs/guia-de-bienvenida-homeschool-wisdom-academy.pdf';

test('el catálogo consolida Homeschool y muestra la oferta anual de USD 100', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  await expect(
    page.getByTestId('catalog-card-guia-bienvenida-homeschool')
  ).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId('catalog-card-programa-homeschool-4-egb')).toBeVisible();
  await expect(page.getByTestId('catalog-card-programa-homeschool-8-egb')).toBeVisible();
  await expect(page.getByTestId('catalog-card-grado-8-egb')).toHaveCount(0);
  await expect(page.getByText('Grado 8.° EGB', { exact: true })).toHaveCount(0);

  for (const slug of [
    'programa-homeschool-4-egb',
    'programa-homeschool-8-egb',
  ]) {
    const tarjeta = page.getByTestId(`catalog-card-${slug}`);
    await expect(tarjeta).toContainText('OFERTA ESPECIAL HOMESCHOOL');
    await expect(tarjeta).toContainText('$100 USD');
    await expect(tarjeta).toContainText('por todo el año lectivo');
    await expect(tarjeta).toContainText(
      'Una propuesta de formación para acompañar al estudiante durante su año escolar.'
    );
  }

  await page.getByTestId('catalog-card-programa-homeschool-8-egb').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'docs/evidencias/catalogo-homeschool-100.png',
  });
});

test('la tarjeta de bienvenida abre la guía completa dentro de la plataforma', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const tarjetaGuia = page.getByTestId('catalog-card-guia-bienvenida-homeschool');
  await expect(tarjetaGuia).toBeVisible({ timeout: 45_000 });
  await Promise.all([
    page.waitForURL(/\/guia-bienvenida-homeschool$/, { timeout: 45_000 }),
    tarjetaGuia.getByTestId('guide-open-link').click(),
  ]);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Guía de bienvenida Homeschool',
    })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Bienvenida a Wisdom Academy' })
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Cómo utilizar Recursos de apoyo' })
  ).toBeVisible();
  await expect(page.getByAltText('Logotipo institucional de Wisdom Academy')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Índice de la guía' })).toBeVisible();

  const pdf = await page.request.get(PDF_PATH);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  expect((await pdf.body()).byteLength).toBeGreaterThan(100_000);

  await page.evaluate(() => {
    (window as unknown as { __waPrinted?: boolean }).__waPrinted = false;
    window.print = () => {
      (window as unknown as { __waPrinted?: boolean }).__waPrinted = true;
    };
  });
  await page.getByRole('button', { name: 'Imprimir guía' }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { __waPrinted?: boolean }).__waPrinted === true
    )
  ).toBe(true);

  await page.getByRole('link', { name: 'Volver al Portal Escolar' }).first().click();
  await expect(page).toHaveURL(/#programas$/);
});

test('la guía es legible en móvil sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/guia-bienvenida-homeschool');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Guía de bienvenida Homeschool' })
  ).toBeVisible();
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(desborde).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'docs/evidencias/guia-bienvenida-movil.png',
  });
});

test('los talleres sin materiales muestran Próximamente disponible sin CTA de compra', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/catalogo');
  const taller = page.getByTestId('catalog-card-taller-mayordomia-financiera');
  await expect(taller).toBeVisible({ timeout: 45_000 });
  await expect(taller).toHaveAttribute('data-content-status', 'upcoming');
  await expect(taller.getByTestId('catalog-upcoming-taller-mayordomia-financiera')).toBeVisible();
  await expect(taller).toContainText('PRÓXIMAMENTE DISPONIBLE');
  await expect(taller).toContainText(
    'Estamos preparando los materiales educativos de este programa.'
  );
  await expect(taller.getByRole('button', { name: 'Comprar' })).toHaveCount(0);
  await expect(taller.getByRole('link', { name: 'Acceder' })).toHaveCount(0);
  await expect(taller.getByText('Materiales en preparación').first()).toBeVisible();
});
