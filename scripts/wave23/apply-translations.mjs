/**
 * Apply per-locale string maps to en-US overlays → static/data/i18n/<locale>/...
 * Maps: scripts/wave23/maps/<locale>.json — object { "<en>": "<translated>" }
 *
 * Run: node scripts/wave23/apply-translations.mjs <locale>
 */
import fs from 'node:fs';
import path from 'node:path';

const ENUMS = new Set(['nominal', 'info', 'warning', 'intro', 'core', 'deep']);

const locale = process.argv[2];
if (!locale) {
  console.error('Usage: node scripts/wave23/apply-translations.mjs <locale>');
  process.exit(1);
}

const EN_ROOT = path.resolve('static/data/i18n/en-US');
const OUT_ROOT = path.resolve('static/data/i18n', locale);
const MAP_PATH = path.resolve('scripts/wave23/maps', `${locale}.json`);

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
if (typeof map !== 'object' || map === null) {
  console.error('Map must be a JSON object');
  process.exit(1);
}

/** @param {unknown} obj @param {string | null} key */
function transform(obj, key) {
  if (typeof obj === 'string') {
    if (key === 'u') return obj;
    if (key === 't' && ENUMS.has(obj)) return obj;
    if (key === 'type' && ENUMS.has(obj)) return obj;
    if (/^https?:\/\//i.test(obj)) return obj;
    const tr = map[obj];
    if (tr === undefined) {
      console.error(
        `Missing translation for locale ${locale}: ${JSON.stringify(obj).slice(0, 120)}…`,
      );
      process.exit(1);
    }
    return tr;
  }
  if (Array.isArray(obj)) return obj.map((v) => transform(v, key));
  if (obj && typeof obj === 'object') {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const [k, v] of Object.entries(obj)) o[k] = transform(v, k);
    return o;
  }
  return obj;
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

for (const rel of walkRel(EN_ROOT).sort()) {
  const src = path.join(EN_ROOT, rel);
  const raw = fs.readFileSync(src, 'utf8');
  const data = JSON.parse(raw);
  const next = transform(data, null);
  const dest = path.join(OUT_ROOT, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(next, null, 2) + '\n', 'utf8');
}
console.error(`Applied ${locale} → ${OUT_ROOT}`);
