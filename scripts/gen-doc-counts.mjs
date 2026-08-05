#!/usr/bin/env node
/**
 * Corpus-count generator + drift gate (architectural-review R4).
 *
 * The counts in TA.md / AGENTS.md (missions, fleet, science sections, schemas,
 * routes, …) drifted badly against a growing corpus — the docs said 113
 * missions / 251 fleet / 13 routes while the tree held 125 / 274 / more. A
 * hand-maintained count in prose WILL rot. This script computes the canonical
 * counts from the filesystem and writes them into a delimited GENERATED block in
 * docs/adr/TA.md.
 *
 *   node scripts/gen-doc-counts.mjs           # rewrite the block in place
 *   node scripts/gen-doc-counts.mjs --check   # exit 1 if the block is stale
 *
 * `--check` is wired into validate-data so CI + the pre-push hook fail when the
 * counts drift — you regenerate (npm run gen:doc-counts) and commit.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TA_PATH = join(ROOT, 'docs/adr/TA.md');
const START = '<!-- GENERATED:corpus-counts:start (npm run gen:doc-counts) -->';
const END = '<!-- GENERATED:corpus-counts:end -->';

/** Recursively count *.json files under `dir`, excluding index manifests. */
function countJson(relDir) {
  const dir = join(ROOT, relDir);
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      n += countJson(join(relDir, entry.name));
    } else if (
      entry.name.endsWith('.json') &&
      entry.name !== 'index.json' &&
      entry.name !== '_index.json' &&
      !entry.name.startsWith('_')
    ) {
      n += 1;
    }
  }
  return n;
}

/** Top-level user-facing route directories (a +page.svelte, not dev, not dynamic). */
function countRoutes() {
  const routesDir = join(ROOT, 'src/routes');
  let n = 0;
  const names = [];
  for (const entry of readdirSync(routesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'dev' || entry.name.startsWith('[')) continue;
    if (existsSync(join(routesDir, entry.name, '+page.svelte'))) {
      n += 1;
      names.push(entry.name);
    }
  }
  return { n, names: names.sort() };
}

function computeCounts() {
  const routes = countRoutes();
  return {
    'User-facing routes (top-level)': routes.n,
    Missions: countJson('static/data/missions'),
    'Fleet entries': countJson('static/data/fleet'),
    'Science sections': countJson('static/data/science'),
    Programs: countJson('static/data/programs'),
    'Descent profiles': countJson('static/data/descent-profiles'),
    'Launch profiles': countJson('static/data/launch-profiles'),
    'AJV schemas': countJson('static/data/schemas'),
    Essays: countJson('static/data/essays'),
    _routeNames: routes.names,
  };
}

function renderBlock(counts) {
  const rows = Object.entries(counts)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `| ${k} | **${v}** |`)
    .join('\n');
  return [
    START,
    '',
    '> Auto-generated from the filesystem — do not hand-edit. Run `npm run gen:doc-counts`.',
    '> Counting rule: `*.json` under each data dir (excluding `index.json` / `_`-prefixed);',
    '> routes = top-level `src/routes/<name>/+page.svelte` (excluding `dev/` + dynamic `[..]`).',
    '',
    '| Corpus | Count |',
    '| --- | --- |',
    rows,
    '',
    `_Top-level routes: ${counts._routeNames.join(' · ')}_`,
    '',
    END,
  ].join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const counts = computeCounts();
  const block = renderBlock(counts);
  const doc = readFileSync(TA_PATH, 'utf8');

  const s = doc.indexOf(START);
  const e = doc.indexOf(END);
  if (s === -1 || e === -1) {
    console.error(
      `gen-doc-counts: markers not found in ${TA_PATH}.\n` +
        `Insert this block where the counts should live:\n\n${block}\n`,
    );
    process.exit(check ? 1 : 2);
  }

  const current = doc.slice(s, e + END.length);
  if (current === block) {
    console.log('gen-doc-counts: corpus counts up to date ✓');
    return;
  }

  if (check) {
    console.error(
      'gen-doc-counts: corpus-count block is STALE. Run `npm run gen:doc-counts` and commit.\n' +
        '--- expected ---\n' +
        block,
    );
    process.exit(1);
  }

  const updated = doc.slice(0, s) + block + doc.slice(e + END.length);
  writeFileSync(TA_PATH, updated);
  console.log('gen-doc-counts: corpus counts updated in docs/adr/TA.md ✓');
}

main();
