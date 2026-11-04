/**
 * English words left in short labels of non-Latin locales ("Active Orbiter · 2006 – 現在",
 * "無人着陸機 · Mission Complete" — found by the 2026-11-04 title sample; i18n-detect's
 * englishProse needs 3+ English words and misses them). Read-only.
 *
 *   node scripts/i18n-tools/english-in-labels.mjs [locales] [--list]
 *
 * A Latin word in a translated string of at most 120 characters is flagged when the same word
 * is in the English of that field AND the English text anywhere writes it in lowercase — an
 * ordinary word (orbiter, mission, complete), not a name (Apollo, Mars Express) or an acronym.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const LIST = args.includes('--list');
const locArg = args.find((a) => !a.startsWith('--'));
const LOCS = locArg ? locArg.split(',') : ['ru', 'sr-Cyrl', 'ja', 'ko', 'zh-CN', 'hi', 'ar'];

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const strings = (v, at, out) => {
  if (typeof v === 'string') out.push([at, v]);
  else if (v && typeof v === 'object')
    for (const k of Object.keys(v)) strings(v[k], at ? `${at}.${k}` : k, out);
  return out;
};
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);

// Ordinary words: the English prose writes them in lowercase at least as often as capitalized
// (orbiter, mission, complete), unlike names (Atlas, Falcon, Saturn — "this atlas" is rare).
const lc = new Map();
const uc = new Map();
const lower = new Set();
const enFiles = [...walk('i18n-src/en-US'), 'messages/en-US.json'];
for (const f of enFiles)
  for (const [, s] of strings(JSON.parse(readFileSync(f, 'utf8')), '', []))
    for (const w of s.match(/(?<![\w/.#-])[A-Za-z]{4,}(?![\w/.#-])/g) ?? []) {
      const k = w.toLowerCase();
      const m = w === k ? lc : uc;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
for (const [k, n] of lc) if (n >= (uc.get(k) ?? 0)) lower.add(k);

// Proper names kept in English by the origin rule (fleet, missions, sites): removed from the
// text before looking for ordinary words, so "Long March 3B" or "Crew Dragon" don't count.
const NAMES = new Set();
for (const f of [...walk('static/data/fleet'), ...walk('static/data/missions')]) {
  const n = JSON.parse(readFileSync(f, 'utf8')).name;
  if (typeof n === 'string' && /[A-Z]/.test(n)) NAMES.add(n);
}
for (const f of walk('i18n-src/en-US'))
  for (const [at, v] of strings(JSON.parse(readFileSync(f, 'utf8')), '', []))
    if (/(^|\.)(name|site_name)$/.test(at) && v.length < 60) NAMES.add(v);
const NAME_LIST = [...NAMES].filter((n) => n.length > 3).sort((a, b) => b.length - a.length);
const stripNames = (t) => NAME_LIST.reduce((x, n) => (x.includes(n) ? x.split(n).join(' ') : x), t);

const summary = {};
for (const loc of LOCS) {
  let hits = 0;
  for (const f of walk('i18n-src/en-US')) {
    const tf = f.replace('/en-US/', `/${loc}/`);
    if (!existsSync(tf)) continue;
    const en = JSON.parse(readFileSync(f, 'utf8'));
    const tr = JSON.parse(readFileSync(tf, 'utf8'));
    for (const [at, t] of strings(tr, '', [])) {
      if (t.length > 120 || /^(https?:|\/)/.test(t)) continue;
      // Only short label fields: free text names too many things in English (Star 48B,
      // Mars Science Laboratory) for a word list to judge; labels are where leftovers hide.
      if (!/(^|\.)(mission_type|label|subtitle|kicker|badge|caption_short)$/.test(at)) continue;
      // Structural values (enums, ids, link labels) are not reader text.
      if (
        /(^|\.)(type|kind|align|section|id|href|u|url|l|image|icon|slug|diagram|status|credit|source)$/.test(
          at,
        )
      )
        continue;
      const e = get(en, at);
      if (typeof e !== 'string' || e === t) continue;
      const words = (stripNames(t).match(/(?<!\p{L})[A-Za-z]{4,}(?!\p{L})/gu) ?? []).filter(
        (w) =>
          lower.has(w.toLowerCase()) &&
          new RegExp(`\\b${w}\\b`, 'i').test(e) &&
          !/^[A-Z]{2,}$/.test(w),
      );
      if (!words.length) continue;
      hits++;
      if (LIST) console.log(`${loc}\t${f.slice(15)} ${at}\t${words.join(', ')}\t${t}`);
    }
  }
  summary[loc] = hits;
}
console.log(summary);
