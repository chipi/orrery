// The binding terms and native names a new English overlay uses, per locale, for its translators.
//   node scripts/i18n-tools/maps/2026-11-22-turn-off-term/term-sheet.mjs <en overlay> > sheet.json
import fs from 'node:fs';

const g = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const flat = (v) =>
  typeof v === 'string'
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(flat)
      : v && typeof v === 'object'
        ? Object.values(v).flatMap(flat)
        : [];
const text = flat(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))).join('\n');

const out = Object.fromEntries(L.map((l) => [l, {}]));
for (const [sec, entries] of Object.entries(g)) {
  if (sec.startsWith('_') || sec === 'sources' || !entries || typeof entries !== 'object') continue;
  for (const [name, e] of Object.entries(entries)) {
    if (!e || typeof e !== 'object') continue;
    let hit = false;
    if (sec === 'term') {
      if (!e._en) continue;
      try {
        hit = new RegExp(e._en, e._en_cs ? 'u' : 'iu').test(text);
      } catch {
        continue;
      }
    } else {
      hit = new RegExp(
        `(?<![\\p{L}])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`,
        'u',
      ).test(text);
    }
    if (!hit) continue;
    for (const l of L) if (typeof e[l] === 'string') out[l][`${sec}: ${name}`] = e[l];
  }
}
console.log(JSON.stringify(out, null, 1));
