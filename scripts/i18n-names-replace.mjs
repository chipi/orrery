/**
 * Deterministic names fix — no model, no cost. For strings where a known name was
 * translated or transliterated (problems(): "names translated or missing"), replace
 * the localised form listed in scripts/i18n-name-forms.json with the English name.
 * Only inside the flagged strings, only the names that string is missing, and an
 * edit is kept only if it removes that failure without adding another.
 *
 *   node scripts/i18n-names-replace.mjs --replay=<i18n-guard-replay --json output> [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { problems } from './lib/translate-quality.mjs';
import { writeJsonEdits } from './lib/json-surgical.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const FORMS = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, 'i18n-name-forms.json'), 'utf8'),
);
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  }),
);
const replay = JSON.parse(fs.readFileSync(String(args.replay), 'utf8'));
const get = (o, at, flat) =>
  flat
    ? o[at]
    : at.split('.').reduce((a, k) => (a == null ? a : a[/^\d+$/.test(k) ? Number(k) : k]), o);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stats = { fixed: 0, partial: 0, noForm: 0 };
const leftover = {};
const byFile = new Map();
for (const [loc, r] of Object.entries(replay)) {
  const ex = r.byReason['names translated or missing (keep exactly as in English)']?.ex || [];
  for (const line of ex) {
    const [file, rest] = line.split(' :: ');
    const [at, reason] = rest.split(' — ');
    const missing = reason.replace(/^.*keep exactly as in English\): /, '').split(', ');
    const k = `${loc}\u0000${file}`;
    if (!byFile.has(k)) byFile.set(k, []);
    byFile.get(k).push({ at, missing });
  }
}
for (const [k, items] of byFile) {
  const [loc, file] = k.split('\u0000');
  const flat = file === 'messages';
  const enP = flat
    ? path.join(ROOT, 'messages', 'en-US.json')
    : path.join(ROOT, 'i18n-src', 'en-US', `${file}.json`);
  const tgP = flat
    ? path.join(ROOT, 'messages', `${loc}.json`)
    : path.join(ROOT, 'i18n-src', loc, `${file}.json`);
  const en = JSON.parse(fs.readFileSync(enP, 'utf8'));
  const tg = JSON.parse(fs.readFileSync(tgP, 'utf8'));
  const edits = [];
  for (const { at, missing } of items) {
    const src = get(en, at, flat);
    const old = get(tg, at, flat);
    if (typeof src !== 'string' || typeof old !== 'string') continue;
    let nu = old;
    for (const name of missing) {
      const forms = (FORMS[loc] || {})[name] || [];
      for (const f of [...forms].sort((a, b) => b.length - a.length))
        nu = nu.replace(new RegExp(esc(f), 'g'), FORMS._replacements?.[loc]?.[f] ?? name); // inflected form → name + ending
    }
    if (nu === old) {
      stats.noForm++;
      for (const n of missing) leftover[`${loc} ${n}`] = (leftover[`${loc} ${n}`] || 0) + 1;
      continue;
    }
    const before = problems(loc, src, old);
    const after = problems(loc, src, nu);
    const newProblems = after.filter(
      (p) => !before.includes(p) && !p.startsWith('names translated'),
    );
    if (newProblems.length) continue;
    edits.push({ at, old, nu });
    if (after.some((p) => p.startsWith('names translated'))) stats.partial++;
    else stats.fixed++;
  }
  if (edits.length && !args['dry-run']) writeJsonEdits(tgP, edits, { flat });
}
console.log(
  `${args['dry-run'] ? '(dry run) ' : ''}fixed ${stats.fixed}, partly fixed ${stats.partial}, no known form ${stats.noForm}`,
);
const top = Object.entries(leftover).sort((a, b) => b[1] - a[1]);
console.log(
  `no known form for (locale name: strings): ${top
    .slice(0, 40)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')}`,
);
