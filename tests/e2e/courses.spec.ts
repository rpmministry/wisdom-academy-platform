import { test, expect, type Page } from '@playwright/test';

/**
 * Humo de la experiencia de Cursos y Talleres.
 * No depende de Google Drive ni de YouTube: valida que la ruta del estudiante
 * renderiza sin errores de página y que un programa inexistente no expone datos.
 */

const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const AULA_HOMESCHOOL = '/aula?recurso=programa-homeschool-8-egb';

const VIEWPORTS = [
  { nombre: '320x740', width: 320, height: 740 },
  { nombre: '360x800', width: 360, height: 800 },
  { nombre: '375x812', width: 375, height: 812 },
  { nombre: '390x844', width: 390, height: 844 },
  { nombre: '430x932', width: 430, height: 932 },
  { nombre: '768x1024', width: 768, height: 1024 },
  { nombre: '844x390', width: 844, height: 390 },
  { nombre: '1365x900', width: 1365, height: 900 },
];

async function abrirAula(page: Page) {
  await page.goto(AULA_HOMESCHOOL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.wa-platzi-classroom')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.wa-openmaic-stage').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.wa-slide-card').first()).toBeVisible({ timeout: 60_000 });
  // Deja estabilizar el ResizeObserver y la escala de la diapositiva.
  await page.waitForTimeout(350);
}

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
          ? getComputedStyle(tablistElement).gridTemplateColumns.trim().split(/\s+/).length
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

  test('matriz responsive: clase, visor, pestañas, dock y objetivos táctiles', async ({ page }) => {
    test.setTimeout(300_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await abrirAula(page);

      const panel = page.locator('.wa-platzi-right-panel');
      await expect(panel).toBeVisible();
      const tablist = panel.getByRole('tablist', {
        name: 'Herramientas del aula Platzi y Moodle',
      });
      await expect(tablist).toBeVisible();
      await expect(page.locator('.wa-slide-title')).toBeVisible();

      const panelBody = page.locator('#wa-tabpanel-clase');
      const tabs = [
        {
          tab: panel.getByRole('tab', { name: 'Ruta', exact: true }),
          id: 'wa-tab-temario',
          contenido: panelBody.locator('.wa-lesson-item').first(),
        },
        {
          tab: panel.getByRole('tab', { name: /^Profesor IA/ }),
          id: 'wa-tab-profesor',
          contenido: panelBody.getByLabel('Pregunta al Profesor IA'),
        },
        {
          tab: panel.getByRole('tab', { name: /^Moodle/ }),
          id: 'wa-tab-actividades',
          contenido: panelBody.getByText(/Quiz Formativo/i).first(),
        },
        {
          tab: panel.getByRole('tab', { name: /^Apuntes/ }),
          id: 'wa-tab-apuntes',
          contenido: panelBody.getByLabel('Apuntes de la lección'),
        },
      ];

      for (const item of tabs) {
        await item.tab.click();
        await expect(item.tab).toHaveAttribute('aria-selected', 'true');
        await expect(panelBody).toHaveAttribute('aria-labelledby', item.id);
        await expect(item.contenido).toBeVisible();
      }

      // Vuelve a Ruta para medir el contenido más largo y el espacio del dock.
      await page.getByRole('tab', { name: 'Ruta', exact: true }).click();
      await page.evaluate(() => window.scrollTo(0, 0));

      const metrics = await page.evaluate(() => {
        const rect = (selector: string) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            bottom: r.bottom,
          };
        };
        const stage = document.querySelector<HTMLElement>('.wa-openmaic-stage');
        const frame = document.querySelector<HTMLElement>('.wa-slide-frame');
        const main = document.querySelector<HTMLElement>('.wa-classroom-main');
        const panel = document.querySelector<HTMLElement>('.wa-platzi-right-panel');
        const tablist = document.querySelector<HTMLElement>(
          '.wa-platzi-right-panel [role="tablist"]',
        );
        const labels = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.wa-platzi-right-panel [role="tablist"] [role="tab"] > span:last-child',
          ),
        );
        const targets = Array.from(
          document.querySelectorAll<HTMLElement>(
            '.wa-openmaic-controls button, .wa-openmaic-mediabar button, ' +
              '.wa-platzi-right-panel button, .wa-mobile-dock-item, ' +
              '.wa-slide-steps button, .wa-explanation-link',
          ),
        )
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => Math.min(r.width, r.height));
        const dock = document.querySelector<HTMLElement>('.wa-mobile-dock');
        const panelBody = document.querySelector<HTMLElement>('#wa-tabpanel-clase');

        return {
          docOverflow:
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          mainHeight: main ? main.getBoundingClientRect().height : 0,
          stageOverflowY: stage ? getComputedStyle(stage).overflowY : '',
          stageWidth: stage ? stage.getBoundingClientRect().width : 0,
          stageHeight: stage ? stage.getBoundingClientRect().height : 0,
          frameWidth: frame ? frame.getBoundingClientRect().width : 0,
          frameHeight: frame ? frame.getBoundingClientRect().height : 0,
          tabColumns: tablist
            ? getComputedStyle(tablist).gridTemplateColumns.trim().split(/\s+/).length
            : 0,
          clippedLabels: labels.some(
            (label) =>
              label.scrollWidth > label.clientWidth + 1 ||
              label.scrollHeight > label.clientHeight + 1,
          ),
          panelBelowMain:
            Boolean(main && panel) &&
            (panel?.getBoundingClientRect().top || 0) >=
              (main?.getBoundingClientRect().bottom || 0) - 2,
          panelRightOfMain:
            Boolean(main && panel) &&
            (panel?.getBoundingClientRect().left || 0) >=
              (main?.getBoundingClientRect().right || 0) - 2,
          panelBodyOverflowY: panelBody ? getComputedStyle(panelBody).overflowY : '',
          minTarget: targets.length ? Math.min(...targets) : 0,
          dockDisplay: dock ? getComputedStyle(dock).display : 'none',
          panelBodyBottom: panelBody ? panelBody.getBoundingClientRect().bottom : 0,
          dockTop: dock ? dock.getBoundingClientRect().top : 0,
          mainRect: rect('.wa-classroom-main'),
          panelRect: rect('.wa-platzi-right-panel'),
        };
      });

      expect(metrics.docOverflow, `${viewport.nombre}: scroll horizontal global`).toBe(false);
      expect(metrics.mainHeight, `${viewport.nombre}: clase colapsada`).toBeGreaterThan(300);
      expect(metrics.stageWidth, `${viewport.nombre}: visor sin ancho`).toBeGreaterThan(0);
      expect(metrics.stageHeight, `${viewport.nombre}: visor sin alto`).toBeGreaterThan(0);
      expect(metrics.frameWidth, `${viewport.nombre}: diapositiva sin ancho`).toBeGreaterThan(0);
      expect(metrics.frameHeight, `${viewport.nombre}: diapositiva sin alto`).toBeGreaterThan(0);
      expect(metrics.clippedLabels, `${viewport.nombre}: etiqueta recortada`).toBe(false);

      if (viewport.width <= 1100) {
        expect(metrics.stageOverflowY, `${viewport.nombre}: escenario recortado`).not.toBe(
          'hidden',
        );
        expect(metrics.mainRect?.height || 0).toBeGreaterThan(300);
        expect(metrics.panelBelowMain, `${viewport.nombre}: panel no apilado`).toBe(true);
        expect(metrics.minTarget, `${viewport.nombre}: objetivo táctil menor a 44px`).toBeGreaterThanOrEqual(
          43.5,
        );
      } else {
        expect(metrics.stageOverflowY, `${viewport.nombre}: escritorio con scroll`).toBe('hidden');
        expect(metrics.panelRightOfMain, `${viewport.nombre}: panel no lateral`).toBe(true);
      }

      if (viewport.width <= 700) {
        expect(metrics.tabColumns, `${viewport.nombre}: pestañas no en dos columnas`).toBe(2);
        expect(metrics.dockDisplay, `${viewport.nombre}: dock oculto`).toBe('grid');
        expect(metrics.panelBodyOverflowY, `${viewport.nombre}: scroll anidado`).toBe('visible');

        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(150);
        const final = await page.evaluate(() => {
          const panelBody = document.querySelector<HTMLElement>('#wa-tabpanel-clase');
          const dock = document.querySelector<HTMLElement>('.wa-mobile-dock');
          return {
            panelBottom: panelBody ? panelBody.getBoundingClientRect().bottom : 0,
            dockTop: dock ? dock.getBoundingClientRect().top : 0,
          };
        });
        expect(
          final.panelBottom,
          `${viewport.nombre}: el dock tapa el final del contenido`,
        ).toBeLessThanOrEqual(final.dockTop + 1);
      } else {
        expect(metrics.dockDisplay, `${viewport.nombre}: dock visible fuera de móvil`).toBe('none');
        expect(metrics.tabColumns, `${viewport.nombre}: pestañas no en cuatro columnas`).toBe(4);
      }
    }

    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });

  test('pestañas: teclado, contenido y selección de clase en móvil', async ({ page }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 320, height: 740 });
    await abrirAula(page);

    const panel = page.locator('.wa-platzi-right-panel');
    const tabRuta = panel.getByRole('tab', { name: 'Ruta', exact: true });
    await tabRuta.focus();
    await page.keyboard.press('ArrowRight');
    await expect(panel.getByRole('tab', { name: /^Profesor IA/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#wa-tab-profesor')).toBeFocused();

    await page.keyboard.press('End');
    await expect(panel.getByRole('tab', { name: /^Apuntes/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('#wa-tab-apuntes')).toBeFocused();

    await page.keyboard.press('Home');
    await expect(tabRuta).toHaveAttribute('aria-selected', 'true');
    await expect(tabRuta).toBeFocused();

    const tabApuntes = panel.getByRole('tab', { name: /^Apuntes/ });
    await tabApuntes.click();
    const apuntes = page.locator('#wa-tabpanel-clase').getByLabel('Apuntes de la lección');
    await apuntes.fill('Nota de prueba responsive');
    await expect(apuntes).toHaveValue('Nota de prueba responsive');
    await expect(tabApuntes).toHaveAttribute('aria-selected', 'true');

    await tabRuta.click();
    const lecciones = page.locator('#wa-tabpanel-clase .wa-lesson-item');
    await expect(lecciones).toHaveCount(12);
    const tituloAnterior = await page.locator('.wa-slide-title').textContent();
    await lecciones.nth(1).click();
    await expect(lecciones.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.wa-slide-title')).not.toHaveText(tituloAnterior || '');

    const nested = await page.evaluate(() => {
      const body = document.querySelector<HTMLElement>('#wa-tabpanel-clase');
      return {
        overflowY: body ? getComputedStyle(body).overflowY : '',
        docOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(nested.overflowY).toBe('visible');
    expect(nested.docOverflow).toBe(false);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });

  test('visor: navegación, zoom manual, reproducción y cambio de orientación', async ({ page }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 320, height: 740 });
    await abrirAula(page);

    const mediabar = page.locator('.wa-openmaic-mediabar');
    await expect(mediabar.getByText(/1\s*\/\s*4/).first()).toBeVisible();
    const tituloInicial = await page.locator('.wa-slide-title').textContent();

    await page.getByRole('button', { name: 'Siguiente diapositiva' }).click();
    await expect(mediabar.getByText(/2\s*\/\s*4/).first()).toBeVisible();
    await expect(page.locator('.wa-slide-title')).not.toHaveText(tituloInicial || '');
    const tituloSiguiente = await page.locator('.wa-slide-title').textContent();

    await page.getByRole('button', { name: 'Diapositiva anterior', exact: true }).click();
    await expect(mediabar.getByText(/1\s*\/\s*4/).first()).toBeVisible();
    await expect(page.locator('.wa-slide-title')).not.toHaveText(tituloSiguiente || '');

    const stage = page.locator('.wa-openmaic-stage');
    await page.getByRole('button', { name: 'Ampliar zoom de la diapositiva' }).click();
    await expect(stage).toHaveClass(/wa-openmaic-stage--zoomed/);
    const zoomMetrics = await stage.evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(zoomMetrics.overflowY).toBe('auto');
    expect(zoomMetrics.scrollHeight).toBeGreaterThan(zoomMetrics.clientHeight + 20);
    expect(zoomMetrics.scrollWidth).toBeGreaterThan(zoomMetrics.clientWidth + 10);

    await stage.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.scrollLeft = el.scrollWidth;
    });
    const scrolled = await stage.evaluate((el) => ({
      top: el.scrollTop,
      left: el.scrollLeft,
    }));
    expect(scrolled.top).toBeGreaterThan(0);
    expect(scrolled.left).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Ajustar la diapositiva al visor' }).click();
    await expect(stage).not.toHaveClass(/wa-openmaic-stage--zoomed/);
    const restaurado = await page.evaluate(() => {
      const stageElement = document.querySelector<HTMLElement>('.wa-openmaic-stage');
      return {
        overflowY: stageElement ? getComputedStyle(stageElement).overflowY : '',
        docOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(restaurado.overflowY).toBe('visible');
    expect(restaurado.docOverflow).toBe(false);

    const pasos = page.locator('.wa-slide-steps button');
    await expect(pasos).toHaveCount(4);
    await pasos.nth(1).click();
    await expect(pasos.nth(1)).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Reproducir la clase paso a paso' }).click();
    await expect(page.getByRole('button', { name: 'Pausar la clase' })).toBeVisible();
    await page.getByRole('button', { name: 'Pausar la clase' }).click();
    await expect(
      page.getByRole('button', { name: 'Reproducir la clase paso a paso' }),
    ).toBeVisible();

    await page.setViewportSize({ width: 740, height: 320 });
    await page.waitForTimeout(700);
    const horizontal = await page.evaluate(() => {
      const stageElement = document.querySelector<HTMLElement>('.wa-openmaic-stage');
      const frame = document.querySelector<HTMLElement>('.wa-slide-frame');
      return {
        stageWidth: stageElement ? stageElement.getBoundingClientRect().width : 0,
        stageHeight: stageElement ? stageElement.getBoundingClientRect().height : 0,
        frameWidth: frame ? frame.getBoundingClientRect().width : 0,
        docOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(horizontal.stageWidth).toBeGreaterThan(0);
    expect(horizontal.stageHeight).toBeGreaterThan(0);
    expect(horizontal.frameWidth).toBeGreaterThan(0);
    expect(horizontal.docOverflow).toBe(false);

    await page.setViewportSize({ width: 320, height: 740 });
    await page.waitForTimeout(700);
    await expect(page.locator('.wa-slide-title')).toBeVisible();
    const vertical = await page.evaluate(() => {
      const stageElement = document.querySelector<HTMLElement>('.wa-openmaic-stage');
      return {
        stageWidth: stageElement ? stageElement.getBoundingClientRect().width : 0,
        stageHeight: stageElement ? stageElement.getBoundingClientRect().height : 0,
        docOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    expect(vertical.stageWidth).toBeGreaterThan(0);
    expect(vertical.stageHeight).toBeGreaterThan(0);
    expect(vertical.docOverflow).toBe(false);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });

  test('dock y modales: recursos, Profesor IA y guías cierran sin atrapar el foco', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 320, height: 740 });
    await abrirAula(page);

    const dockRecursos = page.getByRole('button', {
      name: 'Abrir los recursos de apoyo de la clase',
    });
    await dockRecursos.click();
    const recursos = page.locator('#wa-recursos-apoyo');
    await expect(recursos).toHaveAttribute('data-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Contraer recursos de apoyo' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(recursos).toHaveAttribute('data-expanded', 'false');
    await expect(dockRecursos).toHaveAttribute('aria-expanded', 'false');
    await page.waitForTimeout(400);

    await page
      .getByRole('button', { name: 'Preguntar al profesor de inteligencia artificial' })
      .click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/Consulta Pedagógica/);
    const modalMetrics = await page.evaluate(() => {
      const inner = document.querySelector<HTMLElement>('.wa-modal-dialog');
      const body = inner?.lastElementChild as HTMLElement | null;
      return {
        dialog: inner ? inner.getBoundingClientRect().toJSON() : null,
        viewportHeight: window.innerHeight,
        bodyOverflowY: body ? getComputedStyle(body).overflowY : '',
      };
    });
    expect(modalMetrics.dialog).not.toBeNull();
    expect(modalMetrics.dialog!.bottom).toBeLessThanOrEqual(modalMetrics.viewportHeight + 1);
    expect(modalMetrics.bodyOverflowY).toBe('auto');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: 'Abrir el centro de guías de estudio' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Centro de guías de estudio')).toBeVisible();
    const notaGuia = page.getByText(/Este es el único acceso a las guías del aula/i);
    await notaGuia.scrollIntoViewIfNeeded();
    await expect(notaGuia).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar modal' })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar modal' }).click();
    await expect(dialog).toHaveCount(0);

    const doc = await page.evaluate(() => ({
      horizontal:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));
    expect(doc.horizontal).toBe(false);
    expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  });
});
