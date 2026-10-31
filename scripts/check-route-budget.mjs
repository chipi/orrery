#!/usr/bin/env node
// Per-route JavaScript size budget (Phase 5, 2026-10-30).
//
// WHY: a single computed lookup on the paraglide messages module put the whole
// ~3 MB message catalogue into /science, /explore and /lab, and a static JSON
// import put a 693 KB alt-text map into every page. Nothing failed; the pages
// just got heavier. This gate fails the build when a route's JS grows past its
// budget.
//
// What it measures, from the Vite client manifest (brotli bytes as served —
// the .br sibling vite-plugin-compression2 writes, or brotli q11 for files under
// its 1 KB threshold):
//   - shell: the static import closure of the root layout + client entry, which
//     every page loads;
//   - each route node (page or layout): the static closure of that node MINUS
//     the shell, i.e. what that route adds.
// Dynamic imports (lazy scenes, workers) are not counted: they load on demand.
//
// Budgets live in scripts/route-budget.json (KB, brotli). If a route trips its
// budget, find what grew (`node scripts/check-route-budget.mjs --report`) and
// remove it; raise a budget only for a real feature, with the reason in the
// commit. Run after `vite build`. Wired into `npm run build`.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const OUT = '.svelte-kit/output/client';
const NODES = '.svelte-kit/generated/client-optimized/nodes';
const MANIFEST = join(OUT, '.vite/manifest.json');
const BUDGETS = JSON.parse(readFileSync('scripts/route-budget.json', 'utf8'));
const report = process.argv.includes('--report');

if (!existsSync(MANIFEST)) {
  console.error(`check-route-budget: ${MANIFEST} not found — run after \`vite build\`.`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));

const brCache = new Map();
function brBytes(file) {
  if (!brCache.has(file)) {
    const p = join(OUT, file);
    const size = existsSync(`${p}.br`)
      ? statSync(`${p}.br`).size
      : brotliCompressSync(readFileSync(p), {
          params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
        }).length;
    brCache.set(file, size);
  }
  return brCache.get(file);
}

function closure(key, acc = new Set()) {
  if (acc.has(key) || !manifest[key]) return acc;
  acc.add(key);
  for (const i of manifest[key].imports ?? []) closure(i, acc);
  return acc;
}

const kb = (keys) => [...keys].reduce((s, k) => s + brBytes(manifest[k].file), 0) / 1024;

// Shell = root layout node + every client entry (start/app).
const nodeKey = (n) => `${NODES}/${n}`;
const shell = closure(nodeKey('0.js'));
for (const k of Object.keys(manifest))
  if (manifest[k].isEntry && !k.startsWith(NODES)) closure(k, shell);

// Label a node by the route files its generated module imports.
function nodeLabel(n) {
  const src = readFileSync(join(NODES, n), 'utf8');
  const files = [...src.matchAll(/src\/routes(\/[^'"]*?)\/?\+(page|layout)(?:\.[a-z]+)+/g)];
  if (!files.length) return null;
  const [, dir, kind] = files[0];
  return `${kind === 'layout' ? 'layout ' : ''}${dir || '/'}`;
}

const rows = [];
const shellKb = kb(shell);
rows.push({ route: 'shell', kb: shellKb, budget: BUDGETS.shell });
for (const n of readdirSync(NODES).filter((f) => f.endsWith('.js') && f !== '0.js')) {
  const route = nodeLabel(n);
  if (!route || !manifest[nodeKey(n)]) continue;
  const own = [...closure(nodeKey(n))].filter((k) => !shell.has(k));
  rows.push({ route, kb: kb(own), budget: BUDGETS.routes[route] ?? BUDGETS.defaultRoute });
}

const over = rows.filter((r) => r.kb > r.budget);
rows.sort((a, b) => b.kb - a.kb);
if (report || over.length) {
  for (const r of rows)
    console.log(
      `${r.kb > r.budget ? 'OVER' : '    '} ${r.route.padEnd(44)} ${r.kb.toFixed(0).padStart(5)} KB br  (budget ${r.budget})`,
    );
}
if (over.length) {
  console.error(
    `check-route-budget: ${over.length} over budget: ${over.map((r) => `${r.route} ${r.kb.toFixed(0)} > ${r.budget} KB`).join(', ')}`,
  );
  process.exit(1);
}
console.log(
  `check-route-budget: ✓ ${rows.length - 1} routes + shell within budget (shell ${shellKb.toFixed(0)} KB br, largest ${rows.find((r) => r.route !== 'shell').route} ${rows.find((r) => r.route !== 'shell').kb.toFixed(0)} KB)`,
);
