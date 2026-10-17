/**
 * Seeded random sample of en-US / <loc> string pairs per content segment (long
 * editorial: essays, programs, science; mission descriptions; mission event notes;
 * fleet; planets & sites; universe; other short entries; UI short; UI long), for a
 * reviewer to grade OK / MINOR / BROKEN. Segments differ in risk (operator
 * 2026-10-17): grade them separately and re-translate only the failing ones.
 *
 *   LOC=sr-Cyrl [SEED=17 N_LONG=10 N_SHORT=25] node scripts/i18n-segment-sample.mjs > sample.md
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const LOC = process.env.LOC || 'sr-Cyrl';
const SEED = Number(process.env.SEED || 17);
import { SKIP_KEY } from './i18n-manifest.mjs';
let s = SEED;
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
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
function segmentOf(rel, at) {
  const top = rel.split(path.sep)[0].replace(/\.json$/, '');
  if (top === 'essays') return 'essays (long editorial)';
  if (top === 'programs') return 'programs (long editorial)';
  if (top === 'science') return 'science articles (editorial)';
  if (top === 'missions')
    return /events\.\d+\.note/.test(at) ? 'mission event notes' : 'mission descriptions';
  if (top === 'fleet') return 'fleet (launcher/capsule/engine/site descriptions)';
  if (['planets', 'moon-sites', 'mars-sites', 'small-bodies', 'belts', 'sun'].includes(top))
    return 'planets & sites (short facts)';
  if (top === 'universe') return 'universe (short entries)';
  return 'other short entries (earth-objects, satellites, iss, orbit-regimes, …)';
}
const segs = {};
const base = path.join(ROOT, 'i18n-src', LOC);
for (const f of walk(base)) {
  const rel = path.relative(base, f);
  let j, en;
  try {
    j = JSON.parse(fs.readFileSync(f, 'utf8'));
    en = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n-src', 'en-US', rel), 'utf8'));
  } catch {
    continue;
  }
  for (const [at, v] of strings(j, '', [])) {
    if (SKIP_KEY.test(at) || v.length < 20) continue;
    const e = get(en, at);
    if (typeof e !== 'string') continue;
    (segs[segmentOf(rel, at)] ||= []).push({ ref: `${rel} :: ${at}`, en: e, tr: v });
  }
}
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', `${LOC}.json`), 'utf8'));
const me = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en-US.json'), 'utf8'));
for (const [k, v] of Object.entries(m)) {
  if (typeof v !== 'string' || typeof me[k] !== 'string' || v.length < 4) continue;
  const seg =
    me[k].length <= 40
      ? 'UI strings — short (menus, labels, buttons)'
      : 'UI strings — long (help text, panels)';
  (segs[seg] ||= []).push({ ref: `messages :: ${k}`, en: me[k], tr: v });
}
const N = { editorial: Number(process.env.N_LONG || 10), short: Number(process.env.N_SHORT || 25) };
console.log(`# ${LOC} segment sample (seed ${SEED})\n`);
for (const [seg, list] of Object.entries(segs).sort()) {
  const editorial = /editorial/.test(seg);
  const pool = editorial ? list.filter((x) => x.en.length > 180) : list;
  const pick = [];
  const used = new Set();
  while (pick.length < Math.min(editorial ? N.editorial : N.short, pool.length)) {
    const i = Math.floor(rnd() * pool.length);
    if (!used.has(i)) {
      used.add(i);
      pick.push(pool[i]);
    }
  }
  console.log(`## ${seg} — ${list.length} strings in segment, ${pick.length} sampled\n`);
  pick.forEach((x, i) =>
    console.log(`### ${seg.split(' ')[0]}-${i + 1} \`${x.ref}\`\nEN: ${x.en}\n${LOC}: ${x.tr}\n`),
  );
}
