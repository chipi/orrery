#!/usr/bin/env node
/**
 * Static server for the pruned Capacitor build/ (Layer 1 mobile e2e webServer).
 *
 * Why not `vite preview`: for a SvelteKit app `vite preview` serves the
 * internal `.svelte-kit/output/` tree, NOT the adapter-static `build/` dir.
 * For the browser build the two match, so the main e2e config gets away with
 * it — but the mobile prune (prune-streamed-assets.mjs) operates on `build/`,
 * so `.svelte-kit/output/` is UNPRUNED and `vite preview` would serve the very
 * files we removed. Capacitor ships `build/` verbatim (cap sync copies it into
 * the native app), so serving `build/` directly is both correct and the only
 * way the prune assertions mean anything.
 *
 * Missing files 404 (sirv default) — that's the point: a pruned bucket must be
 * absent. The SPA/locale fallback is a Capacitor-runtime behaviour asserted via
 * the precached 404.html shell, not reproduced here (that's Layer 2).
 */
import { createServer } from 'node:http';
import path from 'node:path';
import sirv from 'sirv';

const PORT = Number(process.env.PORT ?? 4173);
const HOST = process.env.HOST ?? '127.0.0.1';
// DIR: override the served tree — a local-simulator stream origin serves the
// FULL asset tree (e.g. DIR=static) while the on-device bundle is the pruned
// build/. CORS=1: send the header the Capacitor WebView needs for
// cross-origin texture fetches (crossOrigin='anonymous'; GitHub Pages / the
// VPS send it in production). Both off by default — Layer 1 serves build/
// and stubs the CDN in-page.
const DIR = path.resolve(process.cwd(), process.env.DIR ?? 'build');
const CORS = process.env.CORS === '1';

const serve = sirv(DIR, { dev: false, etag: true, gzip: false, brotli: false });
const server = createServer((req, res) => {
  if (CORS) res.setHeader('Access-Control-Allow-Origin', '*');
  serve(req, res);
});
server.listen(PORT, HOST, () => {
  console.log(
    `[serve-build] serving ${path.relative(process.cwd(), DIR)}/ on http://${HOST}:${PORT}${CORS ? ' (CORS *)' : ''}`,
  );
});

// Clean shutdown so Playwright's webServer teardown doesn't leak the process.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => process.exit(0)));
