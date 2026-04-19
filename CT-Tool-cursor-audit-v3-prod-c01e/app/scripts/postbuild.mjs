import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, '..', 'dist');
const indexHtml = join(dist, 'index.html');
const notFound = join(dist, '404.html');
const manifestPath = join(dist, 'manifest.webmanifest');
const swPublic = join(root, '..', 'public', 'sw.js');
const swDist = join(dist, 'sw.js');

if (!existsSync(indexHtml)) {
  console.error('[postbuild] dist/index.html missing — build may have failed.');
  process.exit(1);
}
copyFileSync(indexHtml, notFound);
console.log('[postbuild] wrote 404.html (SPA fallback for GitHub Pages)');

if (existsSync(swPublic)) {
  copyFileSync(swPublic, swDist);
  console.log('[postbuild] copied sw.js (offline cache)');
}

// GitHub project Pages live under /<repo>/ — PWA manifest must use the same base or "Add to home screen" opens the wrong URL.
const base = process.env.VITE_BASE || '/';
const baseNorm = base.endsWith('/') ? base : `${base}/`;
if (existsSync(manifestPath)) {
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const m = JSON.parse(raw);
    m.start_url = baseNorm;
    m.scope = baseNorm;
    writeFileSync(manifestPath, `${JSON.stringify(m, null, 2)}\n`);
    console.log('[postbuild] patched manifest start_url / scope →', baseNorm.trim());
  } catch (e) {
    console.warn('[postbuild] could not patch manifest:', e?.message || e);
  }
}
