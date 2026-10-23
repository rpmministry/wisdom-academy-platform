/**
 * Comprobación de secretos para Wisdom Academy.
 *
 * - Nunca imprime valores de credenciales.
 * - Verifica que .env y variantes locales no estén rastreados por Git.
 * - Si PAYPAL_CLIENT_SECRET está definido, busca su valor en el código fuente
 *   y en los artefactos de compilación `.next`.
 * - Rechaza el prefijo NEXT_PUBLIC_ para el secreto de PayPal.
 */

import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

dotenv.config({ path: '.env.local' });
dotenv.config();

const root = process.cwd();
const failures: string[] = [];
const notes: string[] = [];

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.map',
  '.css',
  '.html',
  '.txt',
  '.md',
]);

function walk(target: string, output: string[]): void {
  if (!fs.existsSync(target)) return;
  const entries = fs.readdirSync(target, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(absolute, output);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    output.push(absolute);
  }
}

function scanForValue(files: string[], value: string, label: string): void {
  if (!value) return;
  let matches = 0;
  for (const file of files) {
    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    if (content.includes(value)) matches += 1;
  }
  if (matches > 0) {
    failures.push(`${label}: el valor aparece en ${matches} archivo(s).`);
  }
}

const sourceFiles: string[] = [];
walk(path.join(root, 'src'), sourceFiles);
walk(path.join(root, 'public'), sourceFiles);
walk(path.join(root, 'scripts'), sourceFiles);

const selfPath = path.join(root, 'scripts', 'check-secrets.ts');
for (const file of sourceFiles) {
  if (path.resolve(file) === path.resolve(selfPath)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('NEXT_PUBLIC_PAYPAL_CLIENT_SECRET')) {
    failures.push(
      `Se encontró NEXT_PUBLIC_PAYPAL_CLIENT_SECRET en ${path.relative(root, file)}; el secreto solo puede vivir en el servidor.`
    );
  }
}

const buildFiles: string[] = [];
walk(path.join(root, '.next'), buildFiles);
if (buildFiles.length === 0) {
  notes.push('No hay artefactos de .next para revisar; ejecuta npm run build antes de la comprobación final.');
}

const staticFiles: string[] = [];
walk(path.join(root, '.next', 'static'), staticFiles);
for (const file of staticFiles) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes(['PAYPAL', 'CLIENT', 'SECRET'].join('_'))) {
    failures.push(
      `El bundle cliente ${path.relative(root, file)} menciona el secreto de PayPal; el secreto debe quedar solo en el servidor.`
    );
  }
}
if (staticFiles.length > 0) {
  notes.push(`Se revisaron ${staticFiles.length} archivo(s) de .next/static en busca de nombres de secretos.`);
}

const secret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
if (secret) {
  scanForValue(sourceFiles, secret, 'PAYPAL_CLIENT_SECRET en el código fuente');
  scanForValue(buildFiles, secret, 'PAYPAL_CLIENT_SECRET en .next');
  notes.push('PAYPAL_CLIENT_SECRET está definido; se comprobó que no aparezca en fuente ni en .next.');
} else {
  notes.push('PAYPAL_CLIENT_SECRET no está definido en este entorno; no hay valor que buscar.');
}

for (const candidate of ['.env', '.env.local', '.env.development.local', '.env.production.local']) {
  try {
    const tracked = execFileSync('git', ['ls-files', '--error-unmatch', candidate], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    if (tracked) failures.push(`${candidate} está rastreado por Git.`);
  } catch {
    // No rastreado: es el estado esperado.
  }
}

console.log('WISDOM ACADEMY · COMPROBACIÓN DE SECRETOS\n');
for (const note of notes) console.log(`[INFO] ${note}`);
if (failures.length === 0) {
  console.log('[OK] No se detectaron secretos expuestos ni archivos de entorno versionados.');
} else {
  for (const failure of failures) console.log(`[FAIL] ${failure}`);
  process.exit(1);
}
