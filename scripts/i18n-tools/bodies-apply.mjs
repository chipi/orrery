// Candidate edits: English body names → glossary form, in one CJK/ko locale.
// Prints every changed string (old → new) for review; --write applies them.
import fs from 'node:fs';
import path from 'node:path';
const [loc] = process.argv.slice(2);
const G = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).body;
const VEH =
  /\b(Saturn ?(V|IB|I|1B|5)\b|Blue Moon|[Tt]rans-[A-Z][a-z]+|[A-Z][a-z]+-watching|Lunar-Earth|Mars ?(Express|Pathfinder|Global|Reconnaissance|Odyssey|Climate|Polar|Observer|Science|Orbiter|Sample|Exploration|Atmosphere|Cube|One|Society|Direct|Base|Ascent|Helicopter|Organic|Z-2|Hope|Curiosity|[0-9](?![.,0-9])|-[0-9])|Mercury[- ](Magnetospher|Atlas|Redstone|Seven|program|capsule|Mark|Transfer|Planetary|[0-9](?![.,0-9]))|Atlas-Mercury|Project Mercury|Venus ?(Express|Climate)|Jupiter ?(Icy|C\b|-C|IRBM|Trojan)|Europa ?(Clipper|Lander|rocket)|Pluto ?(Kuiper|Express)|Moon ?(Mineralogy|Express)|Titan ?(II|III|IV|I\b|GLV|23|rocket)|Earth ?(Observing|Return)|Near-Earth|Sub-Earth|Trans-Earth|trans-Mars|Halley ?(Armada))/g;
const MERCURY_PLANET =
  /(^|\/)(planets|science\/planets|orbit-regimes[^/]*|science\/transfers|science\/orbits|science\/scales-time)\/|bepicolombo|messenger|mariner-10|programs\/ariane/;
const SKIP_KEY = /(^|\.)(l|u|url|href|src|id|slug|t|key|wikidata)$/;
const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const batchim = (w) => {
  const c = w.charCodeAt(w.length - 1) - 0xac00;
  return c >= 0 && c < 11172 ? c % 28 : 0;
};
function koParticles(s, word) {
  const b = batchim(word),
    rieul = b === 8;
  return s.replace(
    new RegExp(`${word}(를|을|는|은|가|이(?![가-힣]{2})|와|과|로|으로)`, 'g'),
    (m, p) => {
      const map = b
        ? {
            를: '을',
            는: '은',
            가: '이',
            와: '과',
            로: rieul ? '로' : '으로',
            으로: rieul ? '로' : '으로',
          }
        : { 을: '를', 은: '는', 이: '가', 과: '와', 으로: '로' };
      return word + (map[p] ?? p);
    },
  );
}
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const edits = [];
let n = 0;
for (const f of walk(`i18n-src/${loc}`)) {
  const rel = f.slice(`i18n-src/${loc}/`.length);
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
  const visit = (v, at) => {
    if (typeof v === 'string') {
      if (SKIP_KEY.test(at) || /^(https?:|\/)/.test(v)) return;
      // protect vehicle names
      const keep = [];
      let s = v.replace(VEH, (m) => `\u{e000}${keep.push(m) - 1}\u{e000}`);
      for (const [en, forms] of Object.entries(G)) {
        if (en === 'Mercury' && !MERCURY_PLANET.test(rel)) continue;
        const nat = forms[loc];
        s = s.replace(new RegExp(`( ?)\\b${en}(?:'s|’s)?\\b( ?)`, 'g'), (m, a, b, off, str) => {
          const before = str[off - 1] ?? '',
            after = str[off + m.length] ?? '';
          const lead = a && (CJK.test(before) || /[（「『(]/.test(before)) && loc !== 'ko' ? '' : a;
          const trail =
            b && (CJK.test(after) || /[、。，：）」』)]/.test(after)) && loc !== 'ko' ? '' : b;
          return lead + nat + trail;
        });
        if (loc === 'ko') s = koParticles(s, nat);
      }
      s = s.replace(/\u{e000}(\d+)\u{e000}/gu, (_, i) => keep[i]);
      if (s !== v) {
        edits.push({ rel, at, old: v, new: s });
        n++;
      }
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => visit(x, at ? `${at}.${i}` : `${i}`));
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k);
  };
  visit(doc, '');
}
fs.writeFileSync(
  `scripts/i18n-tools/maps/2026-10-17-translation-cleanup/bodies-edits-${loc}.json`,
  JSON.stringify(edits, null, 1),
);
console.log(loc, 'strings changed', n);
