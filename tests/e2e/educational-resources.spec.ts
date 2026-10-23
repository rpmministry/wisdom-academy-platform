/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas End-to-End del Panel de Recursos
 * ARCHIVO: tests/e2e/educational-resources.spec.ts
 *
 * PROPÓSITO:
 * Valida en Edge real los flujos críticos del panel lateral:
 * - Abrir/cerrar y recuperar espacio del visor.
 * - Reproducir un video validado dentro del aula.
 * - Reportar un video y recibir una sustitución sin recargar la clase.
 * - Estado vacío, error de API y reintento.
 * - Cambio de unidad y asignatura (contexto académico).
 * - Navegación por teclado y tres tamaños de pantalla representativos.
 *
 * Las respuestas de la API se interceptan para evitar dependencia de red y de
 * credenciales. Los identificadores usados aquí son datos de prueba y no se
 * presentan como recomendaciones reales.
 * ==============================================================================
 */

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import type {
  ContextoAcademico,
  RecursoVideo,
  ResultadoRecomendaciones,
  ResumenContextoAcademico,
} from '@/types/educationalResources';

const DIRECTORIO_EVIDENCIAS = 'docs/evidencias';
const origin = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

test.beforeAll(() => {
  fs.mkdirSync(DIRECTORIO_EVIDENCIAS, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  const login = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.estudiante@wisdomacademy.test',
      contrasenia: process.env.WISDOM_E2E_PASSWORD || 'E2eWisdom!2026-test',
    },
    headers: { origin },
  });
  expect(login.ok()).toBeTruthy();

  await page.addInitScript(() => {
    localStorage.setItem('wa_theme', 'light');
  });

  // Las pruebas no dependen de servicios externos de YouTube.
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.route('https://www.youtube.com/**', (route) => route.abort());
  await page.route('https://i.ytimg.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="#1E3A8A"/><circle cx="160" cy="90" r="28" fill="#FAF8F5" opacity="0.92"/><path d="M152 76 L178 90 L152 104 Z" fill="#1E3A8A"/><text x="160" y="150" font-family="Arial" font-size="14" fill="#FAF8F5" text-anchor="middle">Video educativo</text></svg>`,
    })
  );
});

function crearRecurso(
  id: string,
  titulo: string,
  canal: string
): RecursoVideo {
  const fecha = '2026-10-21T12:00:00.000Z';
  return {
    id,
    titulo,
    canal,
    url: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&hl=es`,
    miniaturaUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duracionSegundos: 720,
    duracionTexto: '12:00',
    idioma: 'es',
    estado: 'VALIDADO',
    validacion: {
      versionCriterios: 'WA-RECURSOS-2026.10.2',
      fechaValidacion: fecha,
      tecnica: {
        superada: true,
        existe: true,
        privacidad: 'public',
        embedPermitido: true,
        regionPermitida: true,
        duracionVerificada: true,
        idiomaVerificado: true,
        fuente: 'youtube_api',
        comprobaciones: [
          {
            id: 'EXISTENCIA',
            etiqueta: 'Existencia verificada',
            resultado: 'pasa',
            detalle: 'El video existe y responde a la API oficial.',
            critica: true,
          },
          {
            id: 'PRIVACIDAD',
            etiqueta: 'Video público',
            resultado: 'pasa',
            detalle: 'El video está disponible como público.',
            critica: true,
          },
          {
            id: 'INSERCION',
            etiqueta: 'Reproducción integrada permitida',
            resultado: 'pasa',
            detalle: 'YouTube autoriza la reproducción integrada.',
            critica: true,
          },
          {
            id: 'REGION',
            etiqueta: 'Disponible en EC',
            resultado: 'pasa',
            detalle: 'Sin restricciones regionales conocidas para EC.',
            critica: true,
          },
        ],
      },
      academica: {
        superada: true,
        puntuacion: 94,
        coberturaTitulo: 1,
        coberturaTema: 1,
        nivelEvidencia: 'metadatos',
        idiomaEvidencia: 'declarado',
        senales: ['Señal didáctica: explicación, primaria.'],
        motivos: ['Coincidencia del tema en el título: 100%.'],
        rechazoDuro: false,
        versionCriterios: 'WA-RECURSOS-2026.10.2',
        fechaValidacion: fecha,
      },
    },
    puntuacion: 94,
    motivos: ['Coincidencia del tema en el título: 100%.'],
    origen: 'youtube_api',
    reproduceIntegrado: true,
    busqueda: 'contexto de prueba',
  };
}

function resumirContexto(contexto: ContextoAcademico): ResumenContextoAcademico {
  return {
    asignatura: contexto.asignatura,
    unidad: contexto.unidad,
    tema: contexto.tema,
    curso: contexto.curso,
    nivel: contexto.nivel,
    idioma: contexto.idioma,
    diapositiva: contexto.diapositiva,
  };
}

function respuestaMock(
  contexto: ContextoAcademico,
  recursos: RecursoVideo[],
  pendientes: RecursoVideo[] = []
): ResultadoRecomendaciones {
  const consulta = `${contexto.tema} explicación paso a paso español`;
  return {
    ok: true,
    origen: recursos.length > 0 || pendientes.length > 0 ? 'youtube_api' : 'solo_enlaces',
    contexto: resumirContexto(contexto),
    claveContexto: 'wa-rec-mock',
    consulta,
    busquedaUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(consulta)}`,
    generadoEn: new Date().toISOString(),
    expiraEn: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    cache: 'miss',
    recursos,
    pendientes,
    mensaje:
      recursos.length > 0
        ? 'La recomendación principal está validada.'
        : 'No encontramos videos que superen los controles para este tema. Usa la búsqueda contextualizada.',
  };
}

async function interceptarRecomendaciones(
  page: Page,
  opciones?: {
    vacio?: boolean;
    fallarPrimera?: boolean;
    solicitudes?: ContextoAcademico[];
    recursos?: RecursoVideo[];
    pendientes?: RecursoVideo[];
  }
): Promise<void> {
  let intentos = 0;
  await page.route('**/api/educational-resources/recommendations', async (route) => {
    intentos += 1;
    if (opciones?.fallarPrimera && intentos === 1) {
      await route.fulfill({
        status: 500,
        json: {
          ok: false,
          mensaje: 'Fallo simulado de YouTube.',
          recursos: [],
          pendientes: [],
        },
      });
      return;
    }

    let contexto: ContextoAcademico | null = null;
    try {
      const cuerpo = route.request().postDataJSON() as { contexto?: ContextoAcademico };
      contexto = cuerpo.contexto || null;
    } catch {
      contexto = null;
    }
    if (!contexto) {
      await route.fulfill({ status: 400, json: { ok: false, mensaje: 'Contexto ausente.' } });
      return;
    }
    opciones?.solicitudes?.push(contexto);

    const recursos = opciones?.vacio
      ? []
      : opciones?.recursos || [
          crearRecurso(
            'TestVideo01',
            `${contexto.tema} explicación paso a paso`,
            'Escuela de Matemáticas'
          ),
        ];
    await route.fulfill({
      status: 200,
      json: respuestaMock(contexto, recursos, opciones?.pendientes || []),
    });
  });
}

test('escritorio: abre, contrae y devuelve espacio al visor', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const principal = page.locator('.wa-classroom-main');
  const anchoExpandido = await principal.evaluate((el) => el.getBoundingClientRect().width);

  await page.getByTestId('educational-resources-close').click();
  await page.waitForTimeout(400);
  const anchoContraido = await principal.evaluate((el) => el.getBoundingClientRect().width);
  expect(anchoContraido).toBeGreaterThan(anchoExpandido + 150);

  await expect(page.getByTestId('educational-resources-toggle')).toBeVisible();
  await page.getByTestId('educational-resources-toggle').click();
  await page.waitForTimeout(400);
  const anchoReexpandido = await principal.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(anchoReexpandido - anchoExpandido)).toBeLessThan(3);

  // El visor conserva sus diapositivas y controles originales.
  await expect(page.locator('.wa-slide-title').first()).toBeVisible();
});

test('conserva el estado del panel durante la sesión de estudio', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/aula');
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();

  const listaDesplazable = page.locator('.wa-resources-scroll');
  await listaDesplazable.evaluate((elemento) => {
    elemento.scrollTop = 180;
  });
  const desplazamientoPrevio = await listaDesplazable.evaluate(
    (elemento) => elemento.scrollTop
  );
  expect(desplazamientoPrevio).toBeGreaterThan(0);

  await page.getByTestId('educational-resources-close').click();
  await expect(page.getByTestId('educational-resources-toggle')).toBeVisible();
  await page.getByTestId('educational-resources-toggle').click();
  await expect(page.getByTestId('educational-resources-close')).toBeVisible();
  const desplazamientoRestaurado = await page
    .locator('.wa-resources-scroll')
    .evaluate((elemento) => elemento.scrollTop);
  expect(desplazamientoRestaurado).toBeGreaterThanOrEqual(desplazamientoPrevio - 2);

  await page.getByTestId('educational-resources-close').click();
  await expect(page.getByTestId('educational-resources-toggle')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('educational-resources-toggle')).toBeVisible();

  await page.getByTestId('educational-resources-toggle').click();
  await expect(page.getByTestId('educational-resources-close')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('educational-resources-close')).toBeVisible();
});

test('reproduce un video validado dentro del visor y permite cerrarlo', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
  await page.getByTestId('educational-play-button').click();

  const iframe = page.getByTestId('educational-video-iframe');
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/TestVideo01/);

  await page.getByTestId('educational-player-close').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveCount(0);
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
});

test('permite seleccionar otra opción validada y reproducirla de inmediato', async ({
  page,
}) => {
  const alternativa = crearRecurso(
    'TestVideo02',
    'Otra explicación validada de fracciones',
    'Canal alternativo'
  );
  await interceptarRecomendaciones(page, {
    recursos: [
      crearRecurso(
        'TestVideo01',
        'Fracciones equivalentes explicación paso a paso',
        'Escuela de Matemáticas'
      ),
      alternativa,
    ],
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await page.getByTestId('educational-play-button').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo01/
  );

  await page.getByTestId('educational-player-close').click();
  await page.getByTestId('educational-alternative-TestVideo02').click();

  // La selección abre el visor sin un segundo clic ni un estado bloqueado.
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo02/
  );
});

test('buscar otros videos conserva el actual y permite volver a él', async ({ page }) => {
  const alternativa = crearRecurso(
    'TestVideo02',
    'Otra explicación validada de fracciones equivalentes',
    'Canal alternativo'
  );
  await interceptarRecomendaciones(page, {
    recursos: [
      crearRecurso(
        'TestVideo01',
        'Fracciones equivalentes explicación paso a paso',
        'Escuela de Matemáticas'
      ),
      alternativa,
    ],
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await page.getByTestId('educational-play-button').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo01/
  );

  await page.getByTestId('educational-player-search').click();
  await expect(page.getByTestId('educational-tab-search')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByTestId('educational-return-current')).toBeVisible();
  await expect(page.getByTestId('educational-search-input')).toBeFocused();

  await page.getByTestId('educational-search-input').fill('tema inexistente');
  await expect(page.getByText('No encontramos coincidencias en esta clase')).toBeVisible();
  await expect(page.getByTestId('educational-return-current')).toBeVisible();

  await page.getByTestId('educational-search-input').fill('otra explicación');
  await page.getByTestId('educational-alternative-TestVideo02').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo02/
  );

  await page.getByTestId('educational-player-previous').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo01/
  );

  await page.getByTestId('educational-player-close').click();
  await expect(page.getByTestId('educational-tab-search')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByTestId('educational-search-input')).toHaveValue(
    'otra explicación'
  );
  await expect(page.getByTestId('educational-return-current')).toBeVisible();

  await page.getByTestId('educational-return-current').click();
  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo01/
  );
});

test('valida y reproduce una sugerencia pendiente desde el visor', async ({ page }) => {
  const pendiente = crearRecurso(
    'TestVideo03',
    'Fracciones con material concreto',
    'Canal pendiente'
  );
  pendiente.estado = 'PENDIENTE_REVISION';
  pendiente.puntuacion = 60;
  const validado = crearRecurso(
    'TestVideo03',
    'Fracciones con material concreto',
    'Canal pendiente'
  );

  await page.route('**/api/educational-resources/validate', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        mensaje: 'El video superó los controles disponibles.',
        recurso: validado,
      },
    });
  });
  await interceptarRecomendaciones(page, { pendientes: [pendiente] });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await page.getByTestId('educational-play-button').click();
  await expect(page.getByTestId('educational-player-suggestions')).toBeVisible();
  await page.getByTestId('educational-suggestion-validate-TestVideo03').click();

  await expect(page.getByTestId('educational-video-iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/TestVideo03/
  );
});

test('reporta un video y recibe una sustitución sin recargar la clase', async ({ page }) => {
  const sustituto = crearRecurso(
    'TestVideo02',
    'Otra explicación de fracciones equivalentes',
    'Canal educativo alternativo'
  );
  const solicitudesReporte: Array<Record<string, unknown>> = [];

  await interceptarRecomendaciones(page);
  await page.route('**/api/educational-resources/reports', async (route) => {
    solicitudesReporte.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        registrado: true,
        duplicado: false,
        estadoRecurso: 'EN_COMPROBACION',
        mensaje:
          'Reporte registrado para comprobación. Mientras se revisa, te mostramos una alternativa validada.',
        recursoSustituto: sustituto,
        busquedaUrl: 'https://www.youtube.com/results?search_query=fracciones+equivalentes',
        sustitucion: {
          encontrada: true,
          intentos: 1,
          motivo: 'Se seleccionó una alternativa validada y no reportada.',
        },
      },
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();

  await page.getByTestId('educational-report-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('El enlace está roto').check();
  await page.getByRole('button', { name: 'Enviar reporte' }).click();

  await expect(page.getByTestId('educational-report-result')).toBeVisible();
  await expect(page.getByTestId('educational-report-result')).toContainText(
    'Reporte registrado'
  );
  await expect(page.getByTestId('educational-report-result')).toContainText(
    'Otra explicación de fracciones equivalentes'
  );
  expect(solicitudesReporte[0]?.videoId).toBe('TestVideo01');
  expect(solicitudesReporte[0]?.tipo).toBe('ENLACE_ROTO');

  await page.getByRole('button', { name: 'Volver a la clase' }).click();
  await expect(page.getByTestId('educational-resource-card')).toContainText(
    'Otra explicación de fracciones equivalentes'
  );

  // Las operaciones del panel no alteran el progreso de la clase.
  await expect(
    page.getByText(/Progreso: 0 de 12 lecciones/).first()
  ).toBeVisible();
});

test('muestra un estado vacío honesto y una búsqueda contextualizada', async ({ page }) => {
  await interceptarRecomendaciones(page, { vacio: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await expect(page.getByTestId('educational-resources-empty')).toBeVisible();
  await expect(page.getByTestId('educational-resources-empty')).toContainText(
    'Sin videos validados para este tema'
  );
  const enlace = page.getByTestId('educational-search-link');
  await expect(enlace).toBeVisible();
  await enlace.click();
  await expect(page.getByTestId('educational-tab-search')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByTestId('educational-external-search-link')).toBeHidden();
  await page.getByText('¿No está en la lista? Buscar en YouTube').click();
  await expect(page.getByTestId('educational-external-search-link')).toHaveAttribute(
    'href',
    /youtube\.com\/results\?search_query=/
  );
});

test('muestra el mejor video pendiente como apoyo y permite solicitar revisión', async ({
  page,
}) => {
  const tituloLargo =
    'NúmerosEnterosYRectaNuméricaExplicaciónPasoAPasoParaLaClaseDeMatemáticas';
  const pendiente = crearRecurso(
    'TestVideo01',
    tituloLargo,
    'Escuela de Matemáticas'
  );
  pendiente.estado = 'PENDIENTE_REVISION';
  pendiente.puntuacion = 69;
  pendiente.motivos = ['El recurso no alcanza la evidencia exigida.'];

  const solicitudesRevision: Array<Record<string, unknown>> = [];
  await page.route('**/api/educational-resources/review', async (route) => {
    solicitudesRevision.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        mensaje:
          'Solicitud registrada. El equipo docente puede revisar y aprobar este video.',
        estado: 'SOLICITADA',
      },
    });
  });

  await interceptarRecomendaciones(page, { vacio: true, pendientes: [pendiente] });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  // El pendiente ocupa la tarjeta principal; no se oculta tras un estado vacío.
  const tarjeta = page.getByTestId('educational-resource-card');
  await expect(tarjeta).toBeVisible();
  await expect(page.getByTestId('educational-resources-empty')).toHaveCount(0);
  await expect(tarjeta).toContainText('Pendiente de revisión');
  await expect(tarjeta).toContainText('Video de apoyo');

  // El título largo no desborda horizontalmente la tarjeta.
  const overflowTarjeta = await tarjeta.evaluate(
    (elemento) => elemento.scrollWidth - elemento.clientWidth
  );
  expect(overflowTarjeta).toBeLessThanOrEqual(1);
  const overflowTitulo = await page
    .locator('.wa-resource-title')
    .evaluate((elemento) => elemento.scrollWidth - elemento.clientWidth);
  expect(overflowTitulo).toBeLessThanOrEqual(1);

  const botonRevision = page.getByTestId('educational-request-review');
  await expect(botonRevision).toBeVisible();
  await botonRevision.click();
  await expect(tarjeta).toContainText(
    'Solicitud registrada. El equipo docente puede revisar y aprobar este video.'
  );
  expect(solicitudesRevision[0]?.videoId).toBe('TestVideo01');
  await page.screenshot({ path: `${DIRECTORIO_EVIDENCIAS}/recursos-pendiente.png` });
});

test('el panel docente aprueba y publica un recurso pendiente', async ({ page }) => {
  await page.request.post('/api/auth/logout');
  const adminLogin = await page.request.post('/api/auth/login', {
    data: {
      identificador: 'e2e.admin@wisdomacademy.test',
      contrasenia: process.env.WISDOM_E2E_ADMIN_PASSWORD || 'E2eAdminWisdom!2026-test',
    },
    headers: { origin },
  });
  expect(adminLogin.ok()).toBeTruthy();
  await page.addInitScript(() => {
    sessionStorage.setItem('wa_recursos_admin_token', 'token-e2e');
  });

  const recurso = crearRecurso(
    'TestVideo01',
    'Números enteros y recta numérica explicación paso a paso',
    'Escuela de Matemáticas'
  );
  recurso.estado = 'PENDIENTE_REVISION';
  recurso.puntuacion = 69;
  const candidato = {
    id: 'wa-rec-e2e:TestVideo01',
    contextoClave: 'wa-rec-e2e',
    contexto: {
      edad: 12,
      nivel: 'Básica Superior',
      curso: '8.° de EGB (Básica Superior)',
      asignatura: 'Matemáticas y Pre-Álgebra',
      area: 'MATEMATICAS',
      unidad: 'Números enteros y recta numérica',
      tema: 'Números enteros y recta numérica',
      subtema: 'Los enteros se ordenan en la recta numérica.',
      objetivos: ['Interpretar números enteros'],
      conceptos: ['recta numérica'],
      idioma: 'es',
    },
    recurso,
    estado: 'SOLICITADA',
    solicitudes: 1,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };

  let aprobado = false;
  await page.route('**/api/educational-resources/review', async (route) => {
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        versionCriterios: 'WA-RECURSOS-2026.10.2',
        candidatos: [{ ...candidato, estado: aprobado ? 'APROBADA' : 'SOLICITADA' }],
      },
    });
  });
  const cuerposAprobacion: Array<Record<string, unknown>> = [];
  await page.route('**/api/educational-resources/approve', async (route) => {
    cuerposAprobacion.push(route.request().postDataJSON() as Record<string, unknown>);
    aprobado = true;
    await route.fulfill({
      status: 200,
      json: {
        ok: true,
        mensaje:
          'Recurso aprobado y publicado. Actualiza las recomendaciones del aula para verlo como validado.',
        recursoCurado: { id: 'TestVideo01' },
      },
    });
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/admin/recursos');

  await expect(page.locator('.wa-admin-resource-item').first()).toBeVisible();
  await page.locator('.wa-admin-resource-item').first().click();

  await page
    .getByLabel('Revisor responsable')
    .fill('Coordinación Académica');
  await page
    .getByLabel('Evidencia de revisión')
    .fill('Revisé el video completo, el tema, el lenguaje y la reproducción.');

  for (const etiqueta of [
    'Pertinencia curricular',
    'Idioma adecuado',
    'Nivel y edad apropiados',
    'Contenido seguro',
    'Reproducción integrada verificada',
    'Disponible en la región',
  ]) {
    await page.getByLabel(new RegExp(etiqueta)).check();
  }

  await page.getByRole('button', { name: 'Aprobar y publicar' }).click();
  await expect(page.getByText(/Recurso aprobado y publicado/).first()).toBeVisible();
  expect(cuerposAprobacion[0]?.videoId).toBe('TestVideo01');
  const confirmaciones = cuerposAprobacion[0]?.confirmaciones as
    | Record<string, boolean>
    | undefined;
  expect(Object.values(confirmaciones || {}).every(Boolean)).toBe(true);
  await page.screenshot({ path: `${DIRECTORIO_EVIDENCIAS}/admin-revision.png` });
});

test('la clase sigue visible ante un fallo de API y se recupera con reintento', async ({
  page,
}) => {
  await interceptarRecomendaciones(page, { fallarPrimera: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await expect(page.locator('.wa-slide-title').first()).toBeVisible();
  await expect(page.locator('.wa-resources-empty[role="alert"]')).toContainText(
    'No pudimos verificar recursos en este momento'
  );

  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
});

test('actualiza recomendaciones al cambiar de unidad y de asignatura', async ({ page }) => {
  const solicitudes: ContextoAcademico[] = [];
  await interceptarRecomendaciones(page, { solicitudes });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
  await expect
    .poll(() => solicitudes.some((contexto) => /Números enteros y recta numérica/.test(contexto.unidad)))
    .toBe(true);

  await page.getByRole('button', { name: /Valor absoluto y distancia/ }).first().click();
  await expect
    .poll(() => solicitudes.some((contexto) => /Valor absoluto y distancia/.test(contexto.unidad)))
    .toBe(true);
  await expect(page.getByTestId('educational-resources-panel')).toContainText(
    'Valor absoluto y distancia'
  );

  await page.selectOption('[data-testid="classroom-subject-select"]', 'Lengua y Literatura');
  await expect
    .poll(() =>
      solicitudes.some(
        (contexto) =>
          contexto.asignatura === 'Lengua y Literatura' &&
          /El texto argumentativo y la tesis/.test(contexto.unidad)
      )
    )
    .toBe(true);
  await expect(page.getByTestId('educational-resources-panel')).toContainText(
    'Lengua y Literatura'
  );
});

test('tablet: cajón superpuesto, cierre y restauración de foco', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto('/aula');
  await expect(page.locator('.wa-classroom-main')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const disparador = page.getByTestId('educational-resources-floating-trigger');
  await expect(disparador).toBeVisible();
  await disparador.click();
  await expect(page.getByTestId('educational-resources-close')).toBeVisible();
  await expect(page.locator('.wa-resources-backdrop')).toBeVisible();
  await page.screenshot({ path: `${DIRECTORIO_EVIDENCIAS}/recursos-tablet.png` });

  await page.getByTestId('educational-resources-close').click();
  await expect(disparador).toBeVisible();
  await expect(disparador).toBeFocused();
});

test('móvil: panel deslizante, sin scroll horizontal y cierre táctil', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/aula');
  await expect(page.locator('.wa-classroom-main')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);

  const disparadorDock = page.getByTestId('educational-dock-toggle');
  await expect(disparadorDock).toBeVisible();
  await disparadorDock.click();
  await expect(page.getByTestId('educational-resources-close')).toBeVisible();
  await page.screenshot({ path: `${DIRECTORIO_EVIDENCIAS}/recursos-movil.png` });

  await page.getByTestId('educational-resources-close').click();
  await expect(page.getByTestId('educational-dock-toggle')).toBeVisible();
});

test('miniaturas 16:9 y títulos completos de hasta tres líneas', async ({ page }) => {
  const tituloLargo =
    'Fracciones equivalentes: comparación con distinto denominador y ejemplos resueltos para primaria';
  const alternativa = crearRecurso(
    'TestVideo02',
    tituloLargo,
    'Canal alternativo de Matemáticas'
  );
  await interceptarRecomendaciones(page, {
    recursos: [
      crearRecurso(
        'TestVideo01',
        'Fracciones equivalentes explicación paso a paso',
        'Escuela de Matemáticas'
      ),
      alternativa,
    ],
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');

  const miniatura = page.getByTestId('educational-thumbnail-TestVideo01');
  await expect(miniatura).toBeVisible();
  const caja = await miniatura.boundingBox();
  expect(caja).not.toBeNull();
  expect(Math.abs(caja!.width / caja!.height - 16 / 9)).toBeLessThan(0.03);

  const ajusteImagen = await miniatura
    .locator('img')
    .evaluate((imagen) => getComputedStyle(imagen).objectFit);
  expect(ajusteImagen).toBe('cover');

  // YouTube exige al menos 120x70 px para una miniatura que inicia reproducción.
  const miniaturaAlternativa = page.getByTestId('educational-thumbnail-TestVideo02');
  const cajaAlternativa = await miniaturaAlternativa.boundingBox();
  expect(cajaAlternativa).not.toBeNull();
  expect(cajaAlternativa!.width).toBeGreaterThanOrEqual(120);
  expect(cajaAlternativa!.height).toBeGreaterThanOrEqual(70);
  expect(
    Math.abs(cajaAlternativa!.width / cajaAlternativa!.height - 16 / 9)
  ).toBeLessThan(0.03);

  const metricaTitulo = await page.locator('.wa-resource-title').evaluate((elemento) => {
    const estilo = getComputedStyle(elemento);
    return {
      alto: elemento.getBoundingClientRect().height,
      interlineado: Number.parseFloat(estilo.lineHeight),
      lineas: estilo.getPropertyValue('-webkit-line-clamp'),
      titulo: elemento.getAttribute('title'),
      texto: elemento.textContent?.trim() || '',
    };
  });
  expect(metricaTitulo.lineas).toBe('3');
  expect(metricaTitulo.alto / metricaTitulo.interlineado).toBeLessThanOrEqual(3.05);
  expect(metricaTitulo.titulo).toBe(metricaTitulo.texto);

  const tituloAlternativa = page
    .getByTestId('educational-alternative-TestVideo02')
    .locator('strong');
  const metricaAlternativa = await tituloAlternativa.evaluate((elemento) => {
    const estilo = getComputedStyle(elemento);
    return {
      alto: elemento.getBoundingClientRect().height,
      interlineado: Number.parseFloat(estilo.lineHeight),
      lineas: estilo.getPropertyValue('-webkit-line-clamp'),
      titulo: elemento.getAttribute('title'),
    };
  });
  expect(metricaAlternativa.lineas).toBe('3');
  expect(metricaAlternativa.alto / metricaAlternativa.interlineado).toBeLessThanOrEqual(
    3.05
  );
  expect(metricaAlternativa.titulo).toBe(tituloLargo);
});

test('móvil: el visor interno conserva 16:9 y regresa al aula', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/aula');
  await page.getByTestId('educational-dock-toggle').click();
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();

  await page.getByTestId('educational-play-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const iframe = page.getByTestId('educational-video-iframe');
  await expect(iframe).toBeVisible();

  const medidas = await page.evaluate(() => {
    const marco = document.querySelector('[data-testid="educational-video-iframe"]');
    const dialogo = document.querySelector('[role="dialog"]');
    if (!marco || !dialogo) return null;
    const cajaMarco = marco.getBoundingClientRect();
    const cajaDialogo = dialogo.getBoundingClientRect();
    return {
      anchoMarco: cajaMarco.width,
      altoMarco: cajaMarco.height,
      anchoDialogo: cajaDialogo.width,
      desborde: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(medidas).not.toBeNull();
  expect(Math.abs(medidas!.anchoMarco / medidas!.altoMarco - 16 / 9)).toBeLessThan(0.04);
  expect(medidas!.anchoDialogo).toBeLessThanOrEqual(390);
  expect(medidas!.desborde).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: `${DIRECTORIO_EVIDENCIAS}/recursos-movil-visor.png`,
  });

  await page.getByTestId('educational-player-back-to-class').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('educational-resources-panel')).toHaveAttribute(
    'data-expanded',
    'false'
  );
});

test('teléfono estrecho: reproductor utilizable y sin scroll horizontal', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/aula');
  await page.getByTestId('educational-dock-toggle').click();
  await page.getByTestId('educational-play-button').click();
  const iframe = page.getByTestId('educational-video-iframe');
  await expect(iframe).toBeVisible();
  // Espera a que termine la animación del modal antes de medir píxeles CSS.
  await page.waitForTimeout(300);

  const medidas = await page.evaluate(() => {
    const marco = document.querySelector('[data-testid="educational-video-iframe"]');
    if (!marco) return null;
    const caja = marco.getBoundingClientRect();
    return {
      alto: caja.height,
      ancho: caja.width,
      desborde: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  expect(medidas).not.toBeNull();
  expect(medidas!.alto).toBeGreaterThanOrEqual(200);
  expect(medidas!.ancho).toBeLessThanOrEqual(320);
  expect(medidas!.desborde).toBeLessThanOrEqual(1);

  await page.getByTestId('educational-player-back-to-class').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('video sin inserción: conserva la información y ofrece una salida controlada', async ({
  page,
}) => {
  const sinInsercion = crearRecurso(
    'TestVideo09',
    'Fracciones equivalentes sin permiso de inserción',
    'Canal restringido'
  );
  sinInsercion.reproduceIntegrado = false;

  await interceptarRecomendaciones(page, { recursos: [sinInsercion] });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');
  await page.getByTestId('educational-play-button').click();

  const aviso = page.getByTestId('educational-video-unavailable');
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText('no puede reproducirse dentro del aula');
  await expect(page.getByTestId('educational-video-iframe')).toHaveCount(0);
  await expect(page.getByTestId('educational-video-player')).toContainText(
    'Fracciones equivalentes sin permiso de inserción'
  );
  await expect(
    page.getByTestId('educational-video-player').locator('a[href*="youtube.com/watch"]').first()
  ).toHaveAttribute('href', /youtube\.com\/watch\?v=TestVideo09/);

  await page.getByTestId('educational-player-search').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('educational-tab-search')).toHaveAttribute(
    'aria-selected',
    'true'
  );
  await expect(page.getByTestId('educational-return-current')).toBeVisible();
});

test('teclado: Enter abre, Escape cierra y el foco regresa al disparador', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/aula');

  const disparador = page.getByTestId('educational-resources-floating-trigger');
  await disparador.focus();
  await page.keyboard.press('Enter');

  const cierre = page.getByTestId('educational-resources-close');
  await expect(cierre).toBeVisible();
  await expect(cierre).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(disparador).toBeVisible();
  await expect(disparador).toBeFocused();
});

test('escritorio: captura de evidencia visual', async ({ page }) => {
  await interceptarRecomendaciones(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/aula');
  await expect(page.getByTestId('educational-resource-card')).toBeVisible();
  await page.screenshot({ path: `${DIRECTORIO_EVIDENCIAS}/recursos-escritorio.png` });
});

