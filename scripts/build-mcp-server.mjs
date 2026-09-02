/**
 * Bundle the MCP server for its container image (S4 · #462).
 *
 * esbuild (already in the tree via vite) resolves the SvelteKit aliases
 * explicitly — no dependence on the generated .svelte-kit/tsconfig.json — and
 * inlines the kernel's static JSON ($data planets/small-bodies, station TLEs).
 * The SDK and all deps are bundled: the runtime image carries ONE file plus the
 * messages/ bundles (read at runtime for ×14 tool descriptions — kept external
 * so a locale fix never needs a rebundle).
 *
 * Out: dist-mcp/server.mjs. Local dev keeps `npx tsx server/mcp/main.ts`.
 */
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(root, 'server/mcp/main.ts')],
  outfile: path.join(root, 'dist-mcp/server.mjs'),
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
  // node:* builtins stay external automatically on platform:node.
  banner: {
    // createRequire shim: some bundled CJS deps probe require() under ESM.
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
});
