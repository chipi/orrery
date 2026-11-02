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
// Two more measurements, each with its own budget (0.9.4, 2026-11-02):
//   - css: the stylesheets of the same static closure (shell, then what each route adds);
//   - lazy: what the route's dynamic imports pull in (lazy scenes, workers, their CSS) beyond
//     the shell and the route's own static closure. It loads on demand, but it still loads on
//     the visit that opens the scene, so it is watched too.
//
// Budgets live in scripts/route-budget.json (KB, brotli): `shell` / `routes` for JS,
// `css` and `lazy` for the other two (each `{ shell?, defaultRoute, routes }`). If a route trips its
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
const cssFiles = (keys) => new Set([...keys].flatMap((k) => manifest[k].css ?? []));
const cssKb = (files) => [...files].reduce((s, f) => s + brBytes(f), 0) / 1024;
/** Everything the closure's dynamic imports load that `have` doesn't: JS + its CSS. */
function lazyKb(keys, have, haveCss) {
  const lazy = new Set();
  for (const k of keys) for (const d of manifest[k].dynamicImports ?? []) closure(d, lazy);
  const js = [...lazy].filter((k) => !have.has(k));
  const css = [...cssFiles(js)].filter((f) => !haveCss.has(f));
  return kb(js) + cssKb(css);
}
const budgetOf = (table, route) => table?.routes?.[route] ?? table?.defaultRoute ?? Infinity;

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
const shellCss = cssFiles(shell);
rows.push({
  route: 'shell',
  kb: shellKb,
  budget: BUDGETS.shell,
  css: cssKb(shellCss),
  cssBudget: BUDGETS.css?.shell ?? Infinity,
  lazy: 0,
  lazyBudget: Infinity,
});
for (const n of readdirSync(NODES).filter((f) => f.endsWith('.js') && f !== '0.js')) {
  const route = nodeLabel(n);
  if (!route || !manifest[nodeKey(n)]) continue;
  const all = closure(nodeKey(n));
  const own = [...all].filter((k) => !shell.has(k));
  const ownCss = [...cssFiles(own)].filter((f) => !shellCss.has(f));
  const have = new Set([...shell, ...all]);
  rows.push({
    route,
    kb: kb(own),
    budget: BUDGETS.routes[route] ?? BUDGETS.defaultRoute,
    css: cssKb(ownCss),
    cssBudget: budgetOf(BUDGETS.css, route),
    lazy: lazyKb(all, have, new Set([...shellCss, ...ownCss])),
    lazyBudget: budgetOf(BUDGETS.lazy, route),
  });
}

const over = rows.flatMap((r) => [
  ...(r.kb > r.budget ? [`${r.route} JS ${r.kb.toFixed(0)} > ${r.budget} KB`] : []),
  ...(r.css > r.cssBudget ? [`${r.route} CSS ${r.css.toFixed(0)} > ${r.cssBudget} KB`] : []),
  ...(r.lazy > r.lazyBudget ? [`${r.route} lazy ${r.lazy.toFixed(0)} > ${r.lazyBudget} KB`] : []),
]);
rows.sort((a, b) => b.kb - a.kb);
if (report || over.length) {
  const cell = (v, b) =>
    `${v.toFixed(0).padStart(5)}/${String(b === Infinity ? '-' : b).padEnd(4)}`;
  console.log(`     ${'route'.padEnd(44)}    JS/budget  CSS/budget lazy/budget (KB br)`);
  for (const r of rows) {
    const bad = r.kb > r.budget || r.css > r.cssBudget || r.lazy > r.lazyBudget;
    console.log(
      `${bad ? 'OVER' : '    '} ${r.route.padEnd(44)} ${cell(r.kb, r.budget)} ${cell(r.css, r.cssBudget)} ${cell(r.lazy, r.lazyBudget)}`,
    );
  }
}
if (over.length) {
  console.error(`check-route-budget: ${over.length} over budget: ${over.join(', ')}`);
  process.exit(1);
}
console.log(
  `check-route-budget: ✓ ${rows.length - 1} routes + shell within budget (shell ${shellKb.toFixed(0)} KB br, largest ${rows.find((r) => r.route !== 'shell').route} ${rows.find((r) => r.route !== 'shell').kb.toFixed(0)} KB)`,
);
