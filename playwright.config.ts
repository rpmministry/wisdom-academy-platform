/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Configuración de Pruebas E2E
 * ARCHIVO: playwright.config.ts
 *
 * PROPÓSITO:
 * Ejecuta pruebas reales en Microsoft Edge (canal instalado en Windows) contra
 * el servidor de desarrollo de Next.js. No descarga navegadores adicionales.
 * Los tamaños de pantalla y las funciones del aula se validan en un navegador
 * real, no mediante simulación de CSS.
 * ==============================================================================
 */

import { defineConfig } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

// Cada ejecución E2E usa una base temporal propia para no mezclar fixtures
// con la base local de desarrollo ni con datos reales.
const e2eDbPath =
  process.env.WISDOM_E2E_DB_PATH ||
  `test-results/wisdom-e2e-${process.pid}-${Date.now()}.db`;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL,
    browserName: 'chromium',
    channel: (process.env.PLAYWRIGHT_CHANNEL as 'msedge' | 'chrome' | undefined) || 'msedge',
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      WISDOM_E2E: '1',
      WISDOM_E2E_PASSWORD: 'E2eWisdom!2026-test',
      WISDOM_DB_PATH: e2eDbPath,
      WISDOM_BACKUP_DIR: 'test-results/e2e-backups',
      APP_URL: baseURL,
      CODE_HASH_PEPPER: 'e2e-only-code-pepper-32-bytes-minimum',
    },
  },
});
