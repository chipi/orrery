// Pass 2 candidate edits for ja / zh-CN / ko: English glossary terms left in body text →
// the locale's glossary form, for the given classes (body, feature, place, station).
// Vehicle names are protected; CJK spacing removed; Korean particles re-chosen.
// Writes maps/2026-10-17-translation-cleanup/glossary-edits-<loc>.json for showdiff.mjs
// (review) and apply-edits.mjs (write).
//   node scripts/i18n-tools/glossary-apply.mjs <loc> <class[,class…]>
import fs from 'node:fs';
import path from 'node:path';
const [loc, classes = 'body'] = process.argv.slice(2);
const GL = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
// Longest first, so "Cape Canaveral" is replaced before a shorter key could match inside it.
// Launch-site page names (pass 1) are the canonical form of "Baikonur Site 1" etc.
const sitePages = Object.fromEntries(
  fs.readdirSync('i18n-src/en-US/fleet/launch-site').flatMap((f) => {
    const en = JSON.parse(fs.readFileSync(`i18n-src/en-US/fleet/launch-site/${f}`, 'utf8')).name;
    const nat = JSON.parse(fs.readFileSync(`i18n-src/${loc}/fleet/launch-site/${f}`, 'utf8')).name;
    return en && nat && /\d/.test(en) ? [[en, { [loc]: nat }]] : [];
  }),
);
const AFB = {
  ru: 'база ВВС Ванденберг',
  ja: 'ヴァンデンバーグ空軍基地',
  'zh-CN': '范登堡空军基地',
  ko: '반덴버그 공군기지',
  hi: 'वैंडेनबर्ग वायुसेना अड्डा',
  ar: 'قاعدة فاندنبرغ الجوية',
  'sr-Cyrl': 'ваздухопловна база Ванденберг',
  de: 'Vandenberg Air Force Base',
  fr: 'base aérienne de Vandenberg',
  es: 'Base de la Fuerza Aérea Vandenberg',
  it: 'Vandenberg Air Force Base',
  nl: 'Vandenberg Air Force Base',
  'pt-BR': 'Base da Força Aérea de Vandenberg',
};
const ALIAS = {
  // Not for the Latin-script languages: their own text already names Fra Mauro, and the
  // article belongs to "Highlands" (de "in den Fra Mauro Highlands").
  ...(['de', 'fr', 'es', 'it', 'nl', 'pt-BR'].includes(loc)
    ? {}
    : {
        'Fra Mauro Highlands': GL.feature['Fra Mauro'],
        'Fra Mauro highlands': GL.feature['Fra Mauro'],
      }),
  // Before 2021 it was an Air Force Base — not "Space Force" (dates matter in these notes).
  'Vandenberg AFB': AFB,
  'Vandenberg Air Force Base': AFB,
  'Baikonur Site 1': sitePages["Baikonur Site 1/5 (Gagarin's Start)"] && {
    [loc]: sitePages["Baikonur Site 1/5 (Gagarin's Start)"][loc]
      .replace(/ ?[(（].*$/, '')
      .replace('1/5', '1'),
  },
};
const G = Object.fromEntries(
  [...classes.split(',').map((c) => GL[c] ?? {}), sitePages, ALIAS]
    .flatMap((o) => Object.entries(o))
    .filter(([, f]) => f)
    .flatMap(([en, f]) =>
      / Crater$/.test(en)
        ? [
            [en, f],
            [en.replace(/ Crater$/, ' crater'), f],
          ]
        : [[en, f]],
    )
    .sort((a, b) => b[0].length - a[0].length),
);
const VEH =
  /\b(Saturn ?(V|IB|I|1B|5)\b|Blue Moon|[Tt]rans-[A-Z][a-z]+|[A-Z][a-z]+-watching|Lunar-Earth|Mars ?(Express|Pathfinder|Global|Reconnaissance|Odyssey|Climate|Polar|Observer|Science|Orbiter|Sample|Exploration|Atmosphere|Cube|One|Society|Direct|Base|Ascent|Helicopter|Organic|Z-2|Hope|Curiosity|[0-9]+(?![.,][0-9])|-[0-9])|Mercury[- ](Magnetospher|Atlas|Redstone|Seven|program|capsule|Mark|Transfer|Planetary|[0-9]+(?![.,][0-9]))|Atlas-Mercury|Project Mercury|Venus ?(Express|Climate)|Jupiter ?(Icy|C\b|-C|IRBM|Trojan)|Europa ?(Clipper|Lander|rocket)|Pluto ?(Kuiper|Express)|Moon ?(Mineralogy|Express)|Titan ?(II|III|IV|I\b|GLV|23|rocket)|Earth ?(Observing|Return)|Near-Earth|Sub-Earth|Trans-Earth|trans-Mars|Halley ?(Armada)|Pioneer Venus|ISS-[A-Za-z]|Phobos[ -]?[0-9]|[Oo]f the (Sun|Moon|Earth)|Moon Trees?|Moon[ -](Village|Sniper)|close Earth|Earth (gravity|flyby|swing)|(Sun|Earth|Moon)[ -]?(point|flyby)|Emirates Mars Mission|Starship Mars|Mars Surveyor|Mars (Sample|Science|Ascent|Base|Society|Direct|Climate|Polar|Global|Observer|Odyssey|Express|Pathfinder|Exploration)|[Nn]ear-Earth|[A-Z][a-z]+-(sized|like|class|mass|radius|watching)|Moon Impact|Mars (Relay|Oxygen))/g;
const ROCKET_FAMILY = new Set(['Saturn', 'Titan', 'Jupiter']);
const ROCKET_PATH =
  /(^|\/)fleet\/(launcher|engine|launch-site)\/|programs\/(apollo|skylab|gemini|mercury)\b|missions\/earth\/(gemini|mercury)|rockets\//;
const ROCKET_WORDS =
  /rocket|launch|booster|engine|missile|stage|Redstone|ロケット|エンジン|ミサイル|火箭|发动机|导弹|운반|로켓|엔진|미사일|ракет|двигател|ракета|रॉकेट|इंजन|صاروخ|محرك|ракет|мотор|razz|missil|misil|motor|fusée|cohete|foguete|Rakete|raket|Triebwerk|lanceur|lanzador/i;
const LATIN = new Set(['de', 'fr', 'es', 'it', 'nl', 'pt-BR']);
// The glossary holds the form used inside a sentence ("cráter Gale", "Terre"); a
// Romance/Germanic sentence needs the article the English source didn't have. These
// rules only add an article where a preposition stands right before the swapped word;
// every edit is still read in showdiff before it is applied.
const ART = {
  es: [
    [/\bde (Centro|Complejo)\b/g, 'del $1'],
    [/\b(en|desde) (Centro|Complejo)\b/g, '$1 el $2'],
    [/\b(en|desde) (Base|Estación)\b/g, '$1 la $2'],
    [
      /\b(en|sobre|desde|hacia|hasta|por|con|bajo|entre) (cráter|Tierra|Luna)\b/g,
      (m, p, w) => `${p} ${w === 'cráter' ? 'el' : 'la'} ${w}`,
    ],
    [/\bde (cráter|Sol)\b/g, 'del $1'],
    [/\ba (cráter|Sol)\b/g, 'al $1'],
    [/\bde (Tierra|Luna)\b/g, 'de la $1'],
    [/\ba (Tierra|Luna)\b/g, 'a la $1'],
    [/\be (EEI)\b/g, 'y $1'],
  ],
  fr: [
    [/\bà (Mer|Océan)\b/g, (m, w) => (w === 'Mer' ? 'dans la mer' : "dans l'océan")],
    [/\b(du|le) (base|station)\b/g, (m, a, w) => `${a === 'du' ? 'de la' : 'la'} ${w}`],
    [/\b(à|depuis|vers) (base|station)\b/g, '$1 la $2'],
    [
      /\b(dans|sur|vers|depuis|sous|par) (cratère|Terre|Lune)\b/g,
      (m, p, w) => `${p} ${w === 'cratère' ? 'le' : 'la'} ${w}`,
    ],
    [/\bde (cratère|Soleil)\b/g, 'du $1'],
    [/\bà (cratère|Soleil)\b/g, 'au $1'],
    [/\bde (Terre|Lune)\b/g, 'de la $1'],
    [/\bà (Terre|Lune)\b/g, 'à la $1'],
  ],
  it: [
    [/\bdello (Centro)\b/g, 'del $1'],
    [/\bin (cratere|Terra|Luna)\b/g, (m, w) => (w === 'cratere' ? 'nel cratere' : `sulla ${w}`)],
    [/\bdi (cratere|Sole)\b/g, 'del $1'],
    [/\ba (cratere|Sole)\b/g, 'al $1'],
    [/\bsu (cratere|Sole)\b/g, 'sul $1'],
    [/\bdi (Terra|Luna)\b/g, 'della $1'],
    [/\bsu (Terra|Luna)\b/g, 'sulla $1'],
  ],
  'pt-BR': [
    [/\b(de|em) (Centro|Complexo)\b/g, (m, p, w) => `${p === 'de' ? 'do' : 'no'} ${w}`],
    [/\b(de|em) (Base|Estação)\b/g, (m, p, w) => `${p === 'de' ? 'da' : 'na'} ${w}`],
    [/\bem (cratera|Terra|Lua)\b/g, 'na $1'],
    [/\bde (cratera|Terra|Lua)\b/g, 'da $1'],
    [/\bem Sol\b/g, 'no Sol'],
    [/\bde Sol\b/g, 'do Sol'],
  ],
  de: [
    [/\bdes ([A-Z][\wäöü-]*-Krater)(?!s)\b/g, 'des $1s'],
    [/\b(auf|von) Erde\b/g, '$1 der Erde'],
    [
      /\b(auf|von) (Mond|Sonne)\b/g,
      (m, p, w) => `${p} ${w === 'Mond' ? (p === 'auf' ? 'dem' : 'dem') : 'der'} ${w}`,
    ],
    [/\bin ([A-Z][\wäöü-]*-Krater)\b/g, 'im $1'],
  ],
  nl: [[/\bin ([A-Z][\w-]*-krater)\b/g, 'in de $1']],
};
const articles = (s) =>
  (ART[loc] ?? [])
    .reduce(
      (acc, [re, to]) =>
        acc.replace(new RegExp(re.source.replace(/\\b$/, '\\b(?!-)'), re.flags), to),
      s,
    )
    .replace(/\b(cráter|cratère|cratere|cratera|Krater|krater) \1\b/gi, '$1');
const MERCURY_PLANET =
  /(^|\/)(planets|science\/planets|orbit-regimes[^/]*|science\/transfers|science\/orbits|science\/scales-time)\/|bepicolombo|messenger|mariner-10|programs\/ariane/;
const SKIP_KEY = /(^|\.)(l|u|url|href|src|id|slug|t|key|wikidata|name|short_name|site_name)$/;
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
        if (en === 'Halley' && LATIN.has(loc)) continue;
        // "Formación Fra Mauro" holds the English key: swapping would rewrite text that already
        // names it ("Tierras Altas de Fra Mauro" → "…de Formación Fra Mauro").
        const nat = forms[loc];
        if (!nat || nat === en) continue;
        const esc = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // whole words only: "Plutone" must not count as holding "Pluto"
        if (
          LATIN.has(loc) &&
          ((/[- ]/.test(en) && nat.startsWith(en)) ||
            new RegExp(`\\b${esc.replace(/-/g, ' ')}\\b`).test(nat.replace(/-/g, ' ')))
        )
          continue;
        // ISS-RapidScat, ISS-CREAM… are instrument names
        const tail = en === 'ISS' ? '(?!-[A-Za-z])' : '';
        s = s.replace(
          new RegExp(`( ?)\\b${esc}(?:'s|’s)?\\b${tail}( ?)`, 'g'),
          (m, a, b, off, str) => {
            // Saturn / Titan / Jupiter are also rocket and missile families: leave them in
            // launcher, engine, pad and crewed-program text, and wherever a rocket word is near.
            if (
              ROCKET_FAMILY.has(en) &&
              (ROCKET_PATH.test(rel) ||
                ROCKET_WORDS.test(str.slice(Math.max(0, off - 30), off + m.length + 30)))
            )
              return m;
            const before = str[off - 1] ?? '',
              after = str[off + m.length] ?? '';
            const lead =
              a && (CJK.test(before) || /[（「『(]/.test(before)) && loc !== 'ko' ? '' : a;
            const trail =
              b && (CJK.test(after) || /[、。，：）」』)]/.test(after)) && loc !== 'ko' ? '' : b;
            return lead + nat + trail;
          },
        );
        if (loc === 'ko') s = koParticles(s, nat);
      }
      if (LATIN.has(loc) && s !== v) s = articles(s);
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
  `scripts/i18n-tools/maps/2026-10-17-translation-cleanup/glossary-edits-${loc}.json`,
  JSON.stringify(edits, null, 1),
);
console.log(loc, 'strings changed', n);
