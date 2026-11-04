// Chunk 3, widening 1 (2026-11-04, term-candidates --misses): forms right for the sense — zh
// 地球同步(转移)轨道 (the common Chinese name for GEO and GTO), ru геопереходная (GTO), "nearly
// polar" in every Latin-script locale, ar word orders and bare الحضيض / الأوج in their own
// fields, de «erdnahen Orbit», hi with a hyphen.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const W = {
  'low Earth orbit': {
    ar: ['مدار (?:ال)?أرض (?:ال)?منخفض'],
    de: ['erdnah\\p{L}* (?:Erd)?[Oo]rbit'],
  },
  geostationary: {
    ru: ['геопереходн'],
    'zh-CN': ['地球同步'],
    ar: ['(?:ال)?أقمار (?:ال)?ثابتة'],
  },
  'polar orbit': {
    ar: ['شبه قطبي'],
    de: ['polar\\p{L}* (?:Erd)?(?:umlauf)?bahn', 'polar\\p{L}* Umlauf'],
    fr: ['orbites? quasi[- ]polaires?'],
    es: ['órbitas? casi polar'],
    it: ['orbit\\p{L}* quasi polar'],
    nl: ['poolba(?:a|n)n', 'polaire banen', 'poolban'],
    'pt-BR': ['órbitas? quase polar'],
  },
  perihelion: { ar: ['حضيض'] },
  aphelion: { ar: ['أوج'] },
  eccentricity: { ar: ['انحراف\\p{L}* (?:ال)?(?:مركزي|مداري)'] },
  'launch window': { hi: ['प्रक्षेपण-खिड़'] },
};
let n = 0;
for (const [term, w] of Object.entries(W))
  for (const [loc, v] of Object.entries(w))
    for (const s of v)
      if (!g.term[term]._match[loc].includes(s)) {
        g.term[term]._match[loc].push(s);
        n++;
      }
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');
console.log('stems added', n);
