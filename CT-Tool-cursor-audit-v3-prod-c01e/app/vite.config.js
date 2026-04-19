import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)))
const base = process.env.VITE_BASE || '/'
const buildId = (process.env.GITHUB_SHA || '').slice(0, 7) || new Date().toISOString().slice(0, 10)

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
].join('; ');

export default defineConfig({
  base,
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    passWithNoTests: false,
  },
  plugins: [
    react(),
    {
      name: 'inject-csp-meta',
      transformIndexHtml(html, ctx) {
        if (ctx.server) return html;
        if (html.includes('http-equiv="Content-Security-Policy"')) return html;
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}" />`,
        );
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '0.0.0'),
    __APP_BUILD__: JSON.stringify(buildId),
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Manual chunking keeps the main bundle small so the CDN can
        // cache feature chunks separately. Vite 8 / rolldown requires
        // a function here.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/exceljs') || id.includes('exceljs')) return 'excel';
          if (id.includes('/jspdf')) return 'pdf';
          if (id.includes('/html2canvas/')) return 'pdf';
          if (id.includes('/dompurify/')) return 'pdf';
          if (id.includes('/react') || id.includes('/zustand/')) return 'vendor';
        },
      },
    },
  },
})
