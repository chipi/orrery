// 9b item 3: split one failing locale × segment cell into review batches for in-session
// subagents (free route). Each batch is [{rel, at, en, cur}] with the same segment rules as
// scripts/i18n-segment-sample.mjs (messages: rel "messages", flat key).
//   node segment-batches.mjs <loc> <segment-prefix> <maxChars> <outDir>
// Writes <outDir>/<loc>-<slug>-NN.json and prints one line per batch.
import fs from 'node:fs';
import path from 'node:path';
import { SKIP_KEY } from '../../../i18n-manifest.mjs';

const [loc, segPrefix, maxChars = '40000', outDir] = process.argv.slice(2);
const segmentOf = (rel, at) => {
  const top = rel.split('/')[0].replace(/\.json$/, '');
  if (top === 'essays') return 'essays';
  if (top === 'programs') return 'programs';
  if (top === 'science') return 'science';
  if (top === 'missions') return /events\.\d+\.note/.test(at) ? 'mission-events' : 'missions';
  if (top === 'fleet') return 'fleet';
  if (['planets', 'moon-sites', 'mars-sites', 'small-bodies', 'belts', 'sun'].includes(top))
    return 'planets-sites';
  if (top === 'universe') return 'universe';
  return 'other-short';
};
const walk = (d, o = []) => {
  for (const n of fs.readdirSync(d).sort()) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const strings = (v, at, o) => {
  if (typeof v === 'string') o.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, o));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, o);
  return o;
};
const get = (o, at) => at.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

const items = [];
if (segPrefix.startsWith('ui-')) {
  const m = JSON.parse(fs.readFileSync(`messages/${loc}.json`, 'utf8'));
  const me = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
  for (const [k, en] of Object.entries(me)) {
    if (typeof en !== 'string' || typeof m[k] !== 'string' || m[k].length < 4) continue;
    if ((segPrefix === 'ui-long') !== en.length > 40) continue;
    items.push({ rel: 'messages', at: k, en, cur: m[k] });
  }
} else {
  const base = `i18n-src/${loc}`;
  for (const f of walk(base)) {
    const rel = path.relative(base, f);
    let tr, en;
    try {
      tr = JSON.parse(fs.readFileSync(f, 'utf8'));
      en = JSON.parse(fs.readFileSync(`i18n-src/en-US/${rel}`, 'utf8'));
    } catch {
      continue;
    }
    for (const [at, cur] of strings(tr, '', [])) {
      if (SKIP_KEY.test(at) || cur.length < 20 || segmentOf(rel, at) !== segPrefix) continue;
      const e = get(en, at);
      if (typeof e === 'string') items.push({ rel, at, en: e, cur });
    }
  }
}
fs.mkdirSync(outDir, { recursive: true });
let batch = [],
  size = 0,
  n = 0;
const flush = () => {
  if (!batch.length) return;
  const f = `${outDir}/${loc}-${segPrefix}-${String(++n).padStart(2, '0')}.json`;
  fs.writeFileSync(f, JSON.stringify(batch, null, 1));
  console.log(f, batch.length, 'strings', size, 'en chars');
  batch = [];
  size = 0;
};
for (const it of items) {
  if (size + it.en.length > Number(maxChars)) flush();
  batch.push(it);
  size += it.en.length;
}
flush();
