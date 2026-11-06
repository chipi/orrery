#!/usr/bin/env node
/**
 * Drop gallery slots (logos, patches, charts, press shots, near-duplicates) and renumber each
 * gallery so it stays contiguous (01..N), everywhere the slot is referenced.
 *
 *   node scripts/drop-gallery-slots.mjs fleet-galleries/h3/05 missions/apollo7/01 …   # dry run
 *   node scripts/drop-gallery-slots.mjs --apply <slot> …
 *
 * A slot is `<surface dir>/<id>/<NN>`. Per gallery the kept slots keep their order and are
 * renumbered from 01. What moves:
 * - files named `NN.*` / `NN-*` in static/images/<dir>/<id>/, static/credit-thumbs/images/<dir>/<id>/
 *   and masters/<dir>/<id>/ (base, ladder rungs, 1x1 crops, credit thumbs, masters);
 * - every JSON under static/data/ and scripts/i18n-tools/ that mentions the gallery: an object
 *   key naming a dropped slot is deleted, an array element naming one (a string, or an object
 *   with a string naming it, like a provenance row) is removed, and every kept slot's path is
 *   rewritten to its new number. Files keep their indentation (compact files stay compact);
 * - static/data/<surface>-hero-overrides.json slots: renumbered, or removed when the hero itself
 *   was dropped (the card falls back to 01 — pick a new hero after, the script says which).
 *
 * After --apply run `npx tsx scripts/rebuild-gallery-manifests.ts` (counts),
 * `node scripts/build-i18n-bundles.mjs`, `node scripts/mobile/build-offline-manifest.mjs` and
 * `npm run validate-image-integrity`. Refuses a slot that is not on disk, and dropping every
 * slot of a gallery.
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

const APPLY = process.argv.includes('--apply');
const slots = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slots.length) {
  console.error('usage: node scripts/drop-gallery-slots.mjs [--apply] <dir>/<id>/<NN> …');
  process.exit(2);
}

// surface name in <surface>-hero-overrides.json → served dir (src/lib/image-hero.ts SURFACE_TO_DIR)
const OVERRIDE_SURFACE = {
  'fleet-galleries': 'fleet',
  missions: 'missions',
  'moon-sites': 'moon-sites',
  'mars-sites': 'mars-sites',
  'earth-objects': 'earth-objects',
  planets: 'planets',
  'small-bodies': 'small-bodies',
  satellites: 'satellites',
};
const FILE_ROOTS = ['static/images', 'static/credit-thumbs/images', 'masters'];
const JSON_ROOTS = ['static/data', 'scripts/i18n-tools', 'i18n-src'];
// Generated or historical: the i18n bundles are rebuilt from i18n-src (build-i18n-bundles.mjs);
// slice-a-*-dryrun.json are past dry-run reports, kept as written.
const SKIP = [/^static\/data\/i18n\//, /slice-a-.*-dryrun\.json$/];

/** gallery "<dir>/<id>" → { drop:Set<NN>, map: Map<oldNN,newNN> } */
const galleries = new Map();
for (const s of slots) {
  const m = s.match(/^([a-z0-9-]+)\/([a-z0-9-]+)\/(\d\d)$/);
  if (!m) throw new Error(`not <dir>/<id>/<NN>: ${s}`);
  const [, dir, id, nn] = m;
  if (!existsSync(`static/images/${dir}/${id}/${nn}.webp`)) throw new Error(`not on disk: ${s}`);
  const key = `${dir}/${id}`;
  if (!galleries.has(key)) galleries.set(key, { dir, id, drop: new Set(), map: new Map() });
  galleries.get(key).drop.add(nn);
}
for (const g of galleries.values()) {
  const all = readdirSync(`static/images/${g.dir}/${g.id}`)
    .map((f) => f.match(/^(\d\d)\.webp$/)?.[1])
    .filter(Boolean)
    .sort();
  const kept = all.filter((n) => !g.drop.has(n));
  if (!kept.length) throw new Error(`${g.dir}/${g.id}: every slot would be dropped`);
  kept.forEach((n, i) => g.map.set(n, String(i + 1).padStart(2, '0')));
  const moves = [...g.map].filter(([a, b]) => a !== b).map(([a, b]) => `${a}→${b}`);
  console.log(
    `${g.dir}/${g.id}: drop ${[...g.drop].join(',')} · keep ${kept.length}${moves.length ? ' · ' + moves.join(' ') : ''}`,
  );
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// A slot path ends at its number or continues with an extension / rung suffix; image-ladder.json
// keys have no extension (`/images/fleet-galleries/juice/04`).
const refRe = (g) => new RegExp(`(^|/)${esc(g.dir)}/${esc(g.id)}/(\\d\\d)(?=[.\\-]|$)`, 'g');
/** 'drop' | 'keep' | null for a string naming a slot of any gallery in the set. */
function classify(str) {
  for (const g of galleries.values()) {
    for (const m of str.matchAll(refRe(g))) return g.drop.has(m[2]) ? 'drop' : 'keep';
  }
  return null;
}
function rewrite(str) {
  let out = str;
  for (const g of galleries.values())
    out = out.replace(refRe(g), (all, pre, nn) => `${pre}${g.dir}/${g.id}/${g.map.get(nn) ?? nn}`);
  return out;
}
const namesDropped = (v) =>
  typeof v === 'string'
    ? classify(v) === 'drop'
    : v &&
      typeof v === 'object' &&
      Object.values(v).some((x) => typeof x === 'string' && classify(x) === 'drop');
function walk(v) {
  if (Array.isArray(v)) return v.filter((x) => !namesDropped(x)).map(walk);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      if (classify(k) === 'drop') continue;
      out[rewrite(k)] = walk(x);
    }
    // A `count` that matched a sibling list's length (image-approved.json) follows the list.
    if (typeof v.count === 'number') {
      const list = Object.keys(v).find((k) => Array.isArray(v[k]) && v[k].length === v.count);
      if (list) out.count = out[list].length;
    }
    return out;
  }
  return typeof v === 'string' ? rewrite(v) : v;
}

// JSON references.
const jsonFiles = [];
const scan = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) scan(p);
    else if (e.name.endsWith('.json') && !SKIP.some((r) => r.test(p))) jsonFiles.push(p);
  }
};
JSON_ROOTS.forEach(scan);
const needles = [...galleries.keys()].map((k) => `${k}/`);
let jsonChanged = 0;
for (const f of jsonFiles) {
  const text = readFileSync(f, 'utf8');
  if (!needles.some((n) => text.includes(n))) continue;
  const before = JSON.parse(text);
  const after = walk(before);
  if (JSON.stringify(after) === JSON.stringify(before)) continue; // mentions the gallery, no slot changes
  const indentMatch = text.match(/^[{[]\r?\n([ \t]+)/);
  const indent = indentMatch ? indentMatch[1] : 0;
  const next = JSON.stringify(after, null, indent) + (text.endsWith('\n') ? '\n' : '');
  jsonChanged++;
  console.log(`  json ${f}`);
  if (APPLY) writeFileSync(f, next);
}

// Hero overrides (slot is "NN.jpg" with no path).
const reheroes = [];
for (const g of galleries.values()) {
  const surface = OVERRIDE_SURFACE[g.dir];
  const f = `static/data/${surface}-hero-overrides.json`;
  if (!surface || !existsSync(f)) continue;
  const text = readFileSync(f, 'utf8');
  const j = JSON.parse(text);
  const o = j.overrides?.[g.id];
  if (!o) continue;
  const nn = o.slot.slice(0, 2);
  if (g.drop.has(nn)) {
    delete j.overrides[g.id];
    reheroes.push(`${g.dir}/${g.id}`);
  } else if (g.map.get(nn) !== nn) o.slot = `${g.map.get(nn)}${o.slot.slice(2)}`;
  else continue;
  console.log(
    `  hero ${surface}/${g.id}: ${o.slot.slice(0, 2) === nn && !g.drop.has(nn) ? nn : g.drop.has(nn) ? `${nn} dropped → default 01` : `${nn}→${o.slot.slice(0, 2)}`}`,
  );
  if (APPLY)
    writeFileSync(f, JSON.stringify(j, null, text.match(/^\{\r?\n([ \t]+)/)?.[1] ?? 1) + '\n');
}

// Files: delete dropped, then rename kept through a temp name (no collisions).
let files = 0;
for (const g of galleries.values()) {
  for (const root of FILE_ROOTS) {
    const d = `${root}/${g.dir}/${g.id}`;
    if (!existsSync(d) || !statSync(d).isDirectory()) continue;
    const plan = [];
    for (const name of readdirSync(d)) {
      const m = name.match(/^(\d\d)([.-].*)$/);
      if (!m) continue;
      if (g.drop.has(m[1])) plan.push(['rm', name]);
      else if (g.map.get(m[1]) !== m[1]) plan.push(['mv', name, `${g.map.get(m[1])}${m[2]}`]);
    }
    files += plan.length;
    if (!APPLY) continue;
    for (const [op, name] of plan) if (op === 'rm') rmSync(join(d, name));
    for (const [op, name] of plan)
      if (op === 'mv') renameSync(join(d, name), join(d, `__tmp__${name}`));
    for (const [op, name, to] of plan)
      if (op === 'mv') renameSync(join(d, `__tmp__${name}`), join(d, to));
  }
}

console.log(
  `${APPLY ? '' : '[dry run] '}${galleries.size} galleries · ${jsonChanged} JSON files · ${files} files moved/removed`,
);
if (reheroes.length) console.log(`hero dropped — pick a new one: ${reheroes.join(' ')}`);
if (APPLY)
  console.log(
    'next: npx tsx scripts/rebuild-gallery-manifests.ts && node scripts/build-i18n-bundles.mjs && node scripts/mobile/build-offline-manifest.mjs && npm run validate-image-integrity',
  );
