// Garble pass, step 3 (fix): checks a fix round's decisions against its work file and writes
// the edits for apply-edits.mjs. Read-only on the repo.
//   node scripts/i18n-tools/garble-check.mjs <loc> <workfile.json> <decisions.json>… --out=<edits.json>
// Work file: garble-sample.mjs --per=all. Decisions: fix-brief.md's output, in work-file order.
// Each retranslation is listed for reading when it:
//   - changes a number;
//   - has an English-style thousands separator (1,731 is 1.731 in nl/de/…);
//   - loses or alters a markdown link target;
//   - is over the 140-character tagline cap;
//   - misses a technical term's binding form.
// Edits are written only for fields whose text in the repo is still the work file's `tr`.
// Exit 1 when a decision is missing or does not line up with the work file.
import fs from 'node:fs';
import { enRegex, locPattern } from './term-match.mjs';

const [loc, work, ...rest] = process.argv.slice(2);
const files = rest.filter((a) => !a.startsWith('--'));
const out = rest.find((a) => a.startsWith('--out='))?.slice(6);
if (!loc || !work || !files.length || !out) {
  console.error('usage: garble-check.mjs <loc> <workfile> <decisions>… --out=<edits.json>');
  process.exit(2);
}
const items = JSON.parse(fs.readFileSync(work, 'utf8'));
const decisions = files.flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const terms = Object.fromEntries(
  Object.entries(
    JSON.parse(fs.readFileSync(new URL('./native-terms.json', import.meta.url), 'utf8')).term ?? {},
  ).filter(([k]) => !k.startsWith('_')),
);
// Locales that write 1.731 for one thousand seven hundred thirty-one and 1,5 for one and a half.
const COMMA_DECIMAL = new Set(['nl', 'de', 'fr', 'es', 'it', 'pt-BR', 'ru', 'sr-Cyrl']);

const digits = (s) =>
  (s.replace(/\]\([^)]*\)/g, ']').match(/\d+(?:[.,\u00a0\u202f]\d+)*/g) ?? [])
    .map((n) => n.replace(/[^\d]/g, ''))
    .sort();
const links = (s) => (s.match(/\]\([^)]*\)/g) ?? []).sort().join(' ');
const valueAt = (doc, at) => at.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], doc);

let bad = 0;
const flags = [];
const edits = [];
const counts = { keep: 0, retranslate: 0, OK: 0, MINOR: 0, BROKEN: 0, stale: 0 };
items.forEach((it, i) => {
  const d = decisions[i];
  if (!d || d.rel !== it.rel || d.at !== it.at) {
    console.error(`#${i} ${it.rel}:${it.at} — no matching decision (got ${d?.rel}:${d?.at})`);
    bad++;
    return;
  }
  counts[d.decision] = (counts[d.decision] ?? 0) + 1;
  counts[d.grade] = (counts[d.grade] ?? 0) + 1;
  if (d.decision !== 'retranslate') return;
  const nu = d.new ?? '';
  const why = [];
  if (!nu.trim()) why.push('empty');
  const a = digits(it.en).join(' ');
  const b = digits(nu).join(' ');
  if (a !== b) why.push(`numbers ${a || '–'} → ${b || '–'}`);
  if (COMMA_DECIMAL.has(loc) && /\d,\d{3}(?!\d)/.test(nu) && !/\d,\d{3}(?!\d)/.test(it.tr))
    why.push('English-style 1,000 separator');
  if (links(it.en) !== links(nu)) why.push('link targets differ');
  if (it.at === 'tagline' && nu.length > 140) why.push(`tagline ${nu.length} > 140`);
  for (const [t, e] of Object.entries(terms)) {
    if (!e[loc] || !enRegex(t, e).test(it.en)) continue;
    const p = locPattern(e, loc);
    if (p && !p.test(nu)) why.push(`term ${t} → ${e[loc]} missing`);
  }
  if (why.length) flags.push({ i, rel: it.rel, at: it.at, why, en: it.en, tr: it.tr, new: nu });
  const now = valueAt(JSON.parse(fs.readFileSync(`i18n-src/${loc}/${it.rel}`, 'utf8')), it.at);
  if (now !== it.tr) {
    counts.stale++;
    return;
  }
  edits.push({ rel: it.rel, at: it.at, en: it.en, old: it.tr, new: nu });
});
fs.writeFileSync(out, JSON.stringify(edits, null, 1));
fs.writeFileSync(out.replace(/\.json$/, '.flags.json'), JSON.stringify(flags, null, 1));
console.log(
  `${loc}: ${items.length} items · keep ${counts.keep} · retranslate ${counts.retranslate} · ` +
    `OK ${counts.OK} / MINOR ${counts.MINOR} / BROKEN ${counts.BROKEN} · ` +
    `${edits.length} edits written · ${counts.stale} skipped (text changed since the work file) · ` +
    `${flags.length} flagged for reading`,
);
const kinds = {};
for (const f of flags)
  for (const w of f.why) kinds[w.split(' ')[0]] = (kinds[w.split(' ')[0]] ?? 0) + 1;
console.log('flags:', JSON.stringify(kinds));
process.exit(bad ? 1 : 0);
