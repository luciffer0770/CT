import { copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, '..', 'dist');
const indexHtml = join(dist, 'index.html');
const notFound = join(dist, '404.html');

if (!existsSync(indexHtml)) {
  console.error('[postbuild] dist/index.html missing — build may have failed.');
  process.exit(1);
}
copyFileSync(indexHtml, notFound);
console.log('[postbuild] wrote 404.html (SPA fallback for GitHub Pages)');
