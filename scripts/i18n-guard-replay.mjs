/**
 * Replay the shared translation checks (problems() in lib/translate-quality.mjs)
 * over the current corpus: how many existing translations would each check reject?
 * Run it before and after changing a check, and before a paid translation run: a
 * check change that suddenly rejects hundreds of reviewed strings is a false
 * positive, found here for free instead of in a pilot (2026-10-17 needed a paid
 * pilot round per false positive: "Glenn's 3", "Tianwen-1 orbiter", "Pacific 1969").
 *
 *   node scripts/i18n-guard-replay.mjs [--locales=sr-Cyrl,ja] [--examples=3] [--json=out.json]
 *
 * Compare against the committed checks with replay-proven-fix: run this in a
 * baseline worktree at the old commit and in the working tree, then diff the JSON.
 */
import fs from 'node:fs';
import path from 'node:path';
import { problems } from './lib/translate-quality.mjs';
import { SKIP_KEY } from './i18n-manifest.mjs';
import { LOCALES } from './i18n-detect.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  }),
);
const locs = args.locales ? String(args.locales).split(',') : LOCALES;
const nEx = Number(args.examples || 3);

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
function strings(v, at, out) {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, out);
  return out;
}
const get = (o, at) => at.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
// Reasons carry specifics ("names changed or missing: X"); group by their stem.
const stem = (r) => r.split(':')[0].split(' — ')[0];

const report = {};
for (const loc of locs) {
  const byReason = {};
  let total = 0;
  let rejected = 0;
  const base = path.join(ROOT, 'i18n-src', loc);
  const pairs = [];
  for (const f of walk(base)) {
    const rel = path.relative(base, f).replace(/\.json$/, '');
    let tr;
    let en;
    try {
      tr = JSON.parse(fs.readFileSync(f, 'utf8'));
      en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n-src', 'en-US', `${rel}.json`), 'utf8'));
    } catch {
      continue;
    }
    for (const [at, s] of strings(tr, '', [])) {
      const e = get(en, at);
      if (!SKIP_KEY.test(at) && typeof e === 'string') pairs.push([rel, at, e, s]);
    }
  }
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', `${loc}.json`), 'utf8'));
  const me = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en-US.json'), 'utf8'));
  for (const [k, s] of Object.entries(m))
    if (typeof me[k] === 'string') pairs.push(['messages', k, me[k], s]);
  for (const [rel, at, e, s] of pairs) {
    if (s.length < 4) continue;
    total++;
    const why = problems(loc, e, s);
    if (!why.length) continue;
    rejected++;
    for (const r of why) {
      const k = stem(r);
      (byReason[k] ||= { n: 0, ex: [] }).n++;
      if (byReason[k].ex.length < nEx) byReason[k].ex.push(`${rel} :: ${at} — ${r.slice(0, 120)}`);
    }
  }
  report[loc] = { total, rejected, byReason };
  console.log(
    `${loc.padEnd(8)} ${String(rejected).padStart(5)} / ${total} rejected (${((100 * rejected) / Math.max(1, total)).toFixed(1)}%)`,
  );
  for (const [k, v] of Object.entries(byReason).sort((a, b) => b[1].n - a[1].n)) {
    console.log(`    ${String(v.n).padStart(5)}  ${k}`);
    for (const x of v.ex) console.log(`           e.g. ${x}`);
  }
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(report, null, 1));
