// Site-wide scans for the translation error classes the close-out sweep (2026-10-31) found again
// and again; each checks a translation against its English, across every i18n-src tree.
//   node scripts/i18n-tools/pattern-scan.mjs <outdir> [--locales=…]
// Writes <outdir>/thousands-<loc>.json — ready apply-edits.mjs edits (mechanical, safe), and
// <outdir>/review.json — [{cls, loc, rel, at, en, tr, why}] for a translator to judge:
//   thousands  the English thousands separator copied into a comma-decimal locale (1,578 km
//              reads as 1.578 km): replaced with the locale's own separator (space or dot);
//   scale      billion/trillion/quadrillion/quintillion — long-scale false friends (fr billion =
//              10^12, sr квинтилион = 10^30, de Billion, nl biljoen, es billón, hi खरब …);
//   moonword   a Moon-landing word (allunaggio, alunizaje, alunissage, alunissagem) where the
//              English is not about the Moon;
//   falsefriend  known wrong-sense words from the samples (nl maandag for lunar day, pt maremoto
//              for marsquake, ru Водолей for Aquila, hi चंद्र ग्रहण for lunar capture …);
//   sametext   a field left identical to the English that has ordinary lowercase English words.
import fs from 'node:fs';
import path from 'node:path';

const R = 'i18n-src';
const outDir = process.argv[2];
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const LOCS = arg('locales', 'ru,ja,zh-CN,ko,hi,ar,sr-Cyrl,de,fr,es,it,nl,pt-BR').split(',');
const THOUSANDS = {
  fr: ' ',
  ru: ' ',
  es: ' ',
  'sr-Cyrl': '.',
  it: '.',
  de: '.',
  nl: '.',
  'pt-BR': '.',
};
const SCALE = /\b(billion|trillion|quadrillion|quintillion)s?\b/i;
// Long-scale false friends, per English scale word: the locale word that means 1000× more.
const SCALE_WRONG = {
  billion: {
    fr: /\bbillions?\b/i,
    de: /\bBillion/,
    nl: /\bbiljoen/i,
    es: /\bbill[óo]n|\bbillones/i,
    it: /\bbilion/i,
    'sr-Cyrl': /\bбилион/i,
  },
  trillion: {
    fr: /\btrillion/i,
    de: /\bTrillion/,
    nl: /\btriljoen/i,
    es: /\btrill[óo]n|\btrillones/i,
    it: /\btrilion/i,
    'sr-Cyrl': /\bтрилион/i,
    hi: /खरब/,
  },
  quintillion: { 'sr-Cyrl': /квинтилион/i, fr: /quintillion/i, de: /Quintillion/, es: /quintill/i },
};
// The locale's word for the English scale word; a translation that has neither it nor a digit
// expansion is listed for reading (zh 10亿 / 万亿, ja 10億 / 兆, ko 10억 / 조, ar مليار / تريليون).
const EXPECT = {
  billion: {
    ja: /億/,
    'zh-CN': /亿/,
    ko: /억/,
    ar: /مليار|بليون/,
    hi: /अरब|बिलियन/,
    ru: /млрд|миллиард/,
    'pt-BR': /bilh/,
    fr: /milliard/,
    de: /Milliard|Mrd/,
    nl: /miljard/,
    es: /millones|millardo/,
    it: /miliard/,
    'sr-Cyrl': /милијард/,
  },
  trillion: {
    ja: /兆/,
    'zh-CN': /万亿|兆/,
    ko: /조/,
    ar: /تريليون/,
    hi: /ट्रिलियन|लाख करोड़/,
    ru: /трлн|триллион/,
    'pt-BR': /trilh/,
    fr: /billion|mille milliards/,
    de: /Billion|Bio\./,
    nl: /biljoen/,
    es: /billón|billones/,
    it: /bilion|mille miliardi/,
    'sr-Cyrl': /билион|хиљаду милијарди/,
  },
};
const MOON = { it: /allun(aggi|ar|at|ò)/i, es: /aluniz/i, fr: /aluni(r|ss)/i, 'pt-BR': /alunis/i };
const FALSE = {
  nl: [[/\blunar (day|dawn|morning|noon)/i, /maandag(?!ochtend)|maanddag/i]],
  'pt-BR': [[/marsquake/i, /maremoto/i]],
  es: [[/marsquake/i, /maremoto/i]],
  it: [[/marsquake/i, /maremot/i]],
  ru: [[/\bAquila\b/, /Водоле/]],
  hi: [[/lunar capture|captured by lunar/i, /चंद्र ग्रहण/]],
  'sr-Cyrl': [[/\bquintillion/i, /квинтилион/]],
};
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const leaves = (o, pre = '', out = []) => {
  if (typeof o === 'string') out.push([pre, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, pre ? `${pre}.${k}` : k, out);
  return out;
};

fs.mkdirSync(outDir, { recursive: true });
const review = [];
const counts = {};
for (const loc of LOCS) {
  const edits = [];
  for (const f of walk(`${R}/${loc}`)) {
    const rel = path.relative(`${R}/${loc}`, f);
    const enFile = `${R}/en-US/${rel}`;
    if (!fs.existsSync(enFile)) continue;
    const en = new Map(leaves(JSON.parse(fs.readFileSync(enFile, 'utf8'))));
    for (const [at, tr] of leaves(JSON.parse(fs.readFileSync(f, 'utf8')))) {
      const e = en.get(at);
      if (!e || typeof e !== 'string') continue;
      const hit = (cls, why) => {
        review.push({ cls, loc, rel, at, en: e, tr, why });
        counts[`${cls} ${loc}`] = (counts[`${cls} ${loc}`] ?? 0) + 1;
      };
      // thousands: an English "1,578" kept as-is (en has the same token) in a comma-decimal locale
      const sep = THOUSANDS[loc];
      if (sep) {
        const toks = [...new Set(tr.match(/\b\d{1,3}(?:,\d{3})+\b/g) ?? [])].filter((t) =>
          e.includes(t),
        );
        if (toks.length) {
          let nu = tr;
          // RAE: Spanish four-digit numbers take no separator (1578 km, 1 600 000 km)
          for (const t of toks)
            nu = nu.split(t).join(t.replace(/,/g, loc === 'es' && t.length === 5 ? '' : sep));
          edits.push({ rel, at, old: tr, new: nu });
          counts[`thousands ${loc}`] = (counts[`thousands ${loc}`] ?? 0) + 1;
        }
      }
      if (SCALE.test(e)) {
        const word = e.match(SCALE)[1].toLowerCase();
        const wrong = SCALE_WRONG[word]?.[loc];
        const want = EXPECT[word]?.[loc];
        if (wrong?.test(tr) && !want?.test(tr)) hit('scale', `${word} rendered with ${wrong}`);
        else if (want && !want.test(tr) && !/\d{10,}|10\^|×\s*10/.test(tr))
          hit('scale', `${word} without ${want}`);
        else if (/quadrillion|quintillion/i.test(e) && !wrong)
          hit('scale', 'check rare scale word');
      }
      if (
        MOON[loc]?.test(tr) &&
        !/moon|lunar|luna|apollo|chang|artemis|surveyor|lunokhod|chandrayaan|slim|beresheet|im-1|lro|clementine|smart-1|kaguya|selene|ranger/i.test(
          rel,
        ) &&
        !/\b(Moon|lunar|Luna|Apollo|Chang'?e|Surveyor|Lunokhod|SLIM|Chandrayaan|Beresheet|Odysseus|Selene|LRO)\b/i.test(
          e,
        )
      )
        hit('moonword', 'Moon-landing word for a non-Moon landing');
      for (const [enRe, trRe] of FALSE[loc] ?? [])
        if (enRe.test(e) && trRe.test(tr)) hit('falsefriend', `${trRe}`);
      const structural =
        /(^|\.)(src|id|section|tab|image|reuse|diagram|credit|mission_id|paths\.\d+|url|href|slug)$/.test(
          at,
        );
      if (
        tr === e &&
        !structural &&
        /\s/.test(e) &&
        e.length >= 8 &&
        /\b[a-z]{4,}\b/.test(e.replace(/\]\([^)]*\)/g, '')) &&
        !/^https?:/.test(e)
      )
        hit('sametext', 'identical to the English');
    }
  }
  if (edits.length)
    fs.writeFileSync(path.join(outDir, `thousands-${loc}.json`), JSON.stringify(edits, null, 1));
}
fs.writeFileSync(path.join(outDir, 'review.json'), JSON.stringify(review, null, 1));
console.log(
  Object.entries(counts)
    .sort()
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n'),
);
console.log(`review items: ${review.length}`);
