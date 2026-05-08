/**
 * Extract sorted unique translatable strings from en-US science overlays
 * only (subset of extract-catalog.mjs scoped to static/data/i18n/en-US/science).
 *
 * Used by translation batches that want to author /science overlays
 * separately from the rest of the en-US catalogue. Output feeds into
 * scripts/wave23/maps/<locale>.json which apply-translations.mjs uses
 * to write each locale's overlay tree.
 *
 * Run: node scripts/wave23/extract-science-catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const EN_ROOT = path.resolve('static/data/i18n/en-US/science');
const OUT = path.resolve('scripts/wave23/science-catalog.json');

const ENUMS = new Set(['nominal', 'info', 'warning', 'intro', 'core', 'deep']);

/** @param {unknown} obj @param {string | null} key */
function collect(obj, key, into) {
  if (typeof obj === 'string') {
    if (key === 'u') return;
    if (key === 't' && ENUMS.has(obj)) return;
    if (key === 'type' && ENUMS.has(obj)) return;
    if (/^https?:\/\//i.test(obj)) return;
    into.add(obj);
    return;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) collect(v, key, into);
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) collect(v, k, into);
  }
}

function walk(dir, into) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, into);
    else if (ent.name.endsWith('.json')) {
      const raw = fs.readFileSync(p, 'utf8');
      collect(JSON.parse(raw), null, into);
    }
  }
}

const into = new Set();
walk(EN_ROOT, into);
const sorted = [...into].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
console.error(`Wrote ${sorted.length} science strings to ${OUT}`);
