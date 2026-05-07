/**
 * Walk static/data/i18n/en-US vs de in parallel; build en→de for all translatable strings.
 * Emit JSON array of German strings in the same order as scripts/wave23/catalog.json.
 *
 * Run: node scripts/wave23/extract-de-strings-in-catalog-order.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ENUMS = new Set(['nominal', 'info', 'warning', 'intro', 'core', 'deep']);

/** @param {unknown} en @param {unknown} de @param {string | null} key @param {Map<string, string>} acc */
function pairWalk(en, de, key, acc) {
  if (typeof en === 'string' && typeof de === 'string') {
    if (key === 'u') return;
    if (key === 't' && ENUMS.has(en) && ENUMS.has(de)) return;
    if (key === 'type' && ENUMS.has(en) && ENUMS.has(de)) return;
    if (/^https?:\/\//i.test(en)) return;
    acc.set(en, de);
    return;
  }
  if (Array.isArray(en) && Array.isArray(de)) {
    const n = Math.min(en.length, de.length);
    for (let i = 0; i < n; i++) pairWalk(en[i], de[i], key, acc);
    return;
  }
  if (
    en &&
    de &&
    typeof en === 'object' &&
    typeof de === 'object' &&
    !Array.isArray(en) &&
    !Array.isArray(de)
  ) {
    for (const k of Object.keys(en)) {
      if (k in de) pairWalk(en[k], de[k], k, acc);
    }
  }
}

function walkRel(dir, base = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...walkRel(p, rel));
    else if (ent.name.endsWith('.json')) out.push(rel);
  }
  return out;
}

const EN_ROOT = path.resolve('static/data/i18n/en-US');
const DE_ROOT = path.resolve('static/data/i18n/de');
const catalogPath = path.resolve('scripts/wave23/catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const acc = new Map();

for (const rel of walkRel(EN_ROOT).sort()) {
  const enPath = path.join(EN_ROOT, rel);
  const dePath = path.join(DE_ROOT, rel);
  if (!fs.existsSync(dePath)) {
    console.error(`Missing de overlay: ${rel}`);
    process.exit(1);
  }
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const de = JSON.parse(fs.readFileSync(dePath, 'utf8'));
  pairWalk(en, de, null, acc);
}

const ordered = [];
const missing = [];
for (const s of catalog) {
  const tr = acc.get(s);
  if (tr === undefined) missing.push(s.slice(0, 120));
  else ordered.push(tr);
}

if (missing.length) {
  console.error(`Missing ${missing.length} de mappings, e.g.:`, missing.slice(0, 5));
  process.exit(1);
}

const out = path.resolve('scripts/wave23/de-strings-catalog-order.json');
fs.writeFileSync(out, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
console.error(`Wrote ${ordered.length} strings → ${out}`);
