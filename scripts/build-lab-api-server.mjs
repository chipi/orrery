/**
 * Bundle the lab-api server for its container image (D · #533).
 *
 * Same shape as build-mcp-server.mjs: esbuild resolves the SvelteKit aliases
 * explicitly and inlines the kernel's static JSON (the /ask door imports the
 * registry directly — one kernel, both doors). Runtime image carries ONE file
 * plus messages/ (read at runtime for ×14 localized companions).
 *
 * Out: dist-lab-api/server.mjs. Local dev keeps `npx tsx server/lab-api/main.ts`.
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(root, 'server/lab-api/main.ts')],
  outfile: path.join(root, 'dist-lab-api/server.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  sourcemap: true,
  alias: {
    $lib: path.join(root, 'src/lib'),
    $data: path.join(root, 'static/data'),
    $types: path.join(root, 'src/types'),
  },
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
