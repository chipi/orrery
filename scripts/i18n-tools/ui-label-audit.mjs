// UI-string checks for messages/<loc>.json, shared by ui-label-audit.test.ts (the
// ratchet gate) and the CLI below:
//   - defects: problems() with the short-label checks on ({ui: true}) per key
//   - variants: one short English label translated more than one way
// Known defects and allowed variants live in ui-label-baseline.json. The gate fails
// on anything new AND on a listed entry that no longer occurs, so the baseline only
// shrinks (each locale audit removes its entries with --prune).
//
//   node scripts/i18n-tools/ui-label-audit.mjs <loc|all>     report
//   node scripts/i18n-tools/ui-label-audit.mjs all --prune   drop fixed entries
import fs from 'node:fs';
import path from 'node:path';
import { problems } from '../lib/translate-quality.mjs';
import { TRANSLATED_LOCALES } from '../lib/locales.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
export const BASELINE_PATH = path.join(ROOT, 'scripts/i18n-tools/ui-label-baseline.json');
const read = (loc) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', `${loc}.json`), 'utf8'));
const stem = (r) => r.split(':')[0].split(' — ')[0];

/** {key: [reason stems]} for every UI string of `loc` that problems() rejects. */
export function uiDefects(loc) {
  const en = read('en-US');
  const m = read(loc);
  const out = {};
  for (const [k, e] of Object.entries(en)) {
    if (k.startsWith('$') || typeof e !== 'string' || typeof m[k] !== 'string') continue;
    const why = problems(loc, e, m[k], { ui: true });
    if (why.length) out[k] = [...new Set(why.map(stem))].sort();
  }
  return out;
}

/** {english label: {translation: [keys]}} for short labels with >1 translation. */
export function labelVariants(loc) {
  const en = read('en-US');
  const m = read(loc);
  const groups = Object.create(null);
  for (const [k, v] of Object.entries(en)) {
    if (typeof v !== 'string' || k.startsWith('$')) continue;
    const n = v.trim();
    if (n.split(/\s+/).length > 3 || n.length < 3 || /\{/.test(n)) continue;
    (groups[n.toLowerCase()] ??= []).push(k);
  }
  const out = {};
  for (const [label, ks] of Object.entries(groups)) {
    if (ks.length < 2) continue;
    const forms = Object.create(null);
    for (const k of ks)
      if (typeof m[k] === 'string') (forms[m[k].trim().toLowerCase()] ??= []).push(k);
    if (Object.keys(forms).length > 1) out[label] = forms;
  }
  return out;
}

export function readBaseline() {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
}

/** New and stale entries for one locale against the baseline. */
export function compare(loc, baseline = readBaseline()) {
  const permanent = baseline._permanent ?? {};
  const known = baseline.locales?.[loc]?.defects ?? {};
  const allowed = baseline.locales?.[loc]?.variants ?? {};
  const defects = uiDefects(loc);
  const variants = labelVariants(loc);
  const newDefects = [];
  for (const [k, stems] of Object.entries(defects)) {
    if (permanent[k]) continue;
    const extra = stems.filter((s) => !(known[k] ?? []).includes(s));
    if (extra.length) newDefects.push(`${k}: ${extra.join('; ')}`);
  }
  const staleDefects = Object.entries(known)
    .filter(([k, stems]) => stems.some((s) => !(defects[k] ?? []).includes(s)))
    .map(([k]) => k);
  const newVariants = Object.keys(variants).filter((l) => !(l in allowed));
  const staleVariants = Object.keys(allowed).filter((l) => !(l in variants));
  return { defects, variants, newDefects, staleDefects, newVariants, staleVariants };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2] ?? 'all';
  const locs = arg === 'all' ? TRANSLATED_LOCALES : [arg];
  const prune = process.argv.includes('--prune');
  const baseline = readBaseline();
  for (const loc of locs) {
    const r = compare(loc, baseline);
    console.log(
      `${loc}: defects ${Object.keys(r.defects).length} (new ${r.newDefects.length}, fixed ${r.staleDefects.length}) · variants ${Object.keys(r.variants).length} (new ${r.newVariants.length}, fixed ${r.staleVariants.length})`,
    );
    for (const d of r.newDefects) console.log(`  NEW defect   ${d}`);
    for (const v of r.newVariants)
      console.log(
        `  NEW variant  "${v}": ${Object.entries(r.variants[v])
          .map(([f, ks]) => `${f} [${ks.join(',')}]`)
          .join(' | ')}`,
      );
    if (prune && baseline.locales?.[loc]) {
      const b = baseline.locales[loc];
      for (const k of r.staleDefects) {
        const keep = (b.defects[k] ?? []).filter((s) => (r.defects[k] ?? []).includes(s));
        if (keep.length) b.defects[k] = keep;
        else delete b.defects[k];
      }
      for (const v of r.staleVariants) delete b.variants[v];
    }
  }
  if (prune) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n');
    console.log('baseline pruned');
  }
}
