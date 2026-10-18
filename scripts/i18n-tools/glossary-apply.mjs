// Pass 2 candidate edits for ja / zh-CN / ko: English glossary terms left in body text →
// the locale's glossary form, for the given classes (body, feature, place, station).
// Vehicle names are protected; CJK spacing removed; Korean particles re-chosen.
// Writes maps/2026-10-17-translation-cleanup/glossary-edits-<loc>.json for showdiff.mjs
// (review) and apply-edits.mjs (write).
//   node scripts/i18n-tools/glossary-apply.mjs <loc> <class[,class…]>
import fs from 'node:fs';
import path from 'node:path';
import { declinePersonRu, declineRu, dropHeadIfRepeated, guessCaseRu } from './ru-case.mjs';
import { caseFromSuffix, declinePersonSr, declineSr, guessCaseSr } from './sr-case.mjs';
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
  'Vandenberg SFB': GL.facility['Vandenberg Space Force Base'],
  '1P/Halley': {
    ru: '1P/Галлея',
    ja: '1P/ハレー',
    'zh-CN': '1P/哈雷',
    ko: '1P/핼리',
    hi: '1P/हैली',
    ar: '1P/هالي',
    'sr-Cyrl': '1P/Халеј',
  },
  'Vandenberg Air Force Base': AFB,
  'Baikonur Site 1': sitePages["Baikonur Site 1/5 (Gagarin's Start)"] && {
    [loc]: sitePages["Baikonur Site 1/5 (Gagarin's Start)"][loc]
      .replace(/ ?[(（].*$/, '')
      .replace('1/5', '1'),
  },
};
// people decline by their own rules (animate accusative, -ов/-ин surnames, a woman's
// foreign surname indeclinable); _female/_slavic come from Wikidata (name-forms.mjs)
// Homonyms found by glossary-keys.mjs: the same English word names a vehicle, an engine or
// a facility in these paths or before these words
const CJK_LOCALE = new Set(['ja', 'zh-CN']);
// Names that mostly mean a spacecraft or a navigation system on this site. They are replaced only
// on the pages that mean the constellation or the person (matched on "<file>:<field>").
const ONLY = {
  Orion: /^universe\/named-stars\/|^deep-sky\.json:(euclid-horsehead|hst-orion|jwst-orion)\./,
  Kepler:
    /^messages:(lab_assume_kepler_j2|lab_f_geo_glossary|lab_f_regime_glossary|lab_goal_g10_frozen|why_)|^planets\/saturn\.json|^science\/_landing\.json:(chapters\.0|tools\.0)\.|^science\/(history|orbits|scales-time|transfers)\/|^science\/observation\/magellanic-clouds|^sun\.json/,
  Galileo:
    /^(missions\/moon|site-stories)\/apollo15\.json|^science\/history\/|^science\/planets\/moons-of-the-system/,
};
const GUARD = {
  Vega: {
    path: /missions\/venus|fleet\/(orbiter|lander|launcher)|rockets\/|venus-sites|programs\/(vega|venera)|science\/orbits\/space-debris|messages:landing_card_venus_desc|original-work\.json/,
    after:
      /^[\s-]?(\d|rocket|C\b|-C|program|probe|balloon|lander|mission|spacecraft|flyby|Secondary|VESPA|AVUM)/i,
  },
  // Sirius XM, the satellite radio company, in the Lab's frozen-orbit text
  Sirius: {
    path: /fleet\/constellation|earth-objects|messages:lab_(conn|goal)_g10_(hook|frozen)/,
    after: /^\s?(XM|FM|Satellite|-)/,
  },
  // the rocket and the Apollo 14 lunar module, not the star
  Antares: {
    path: /fleet\/|missions\/|moon-sites|programs\/|hotspot-metadata|rockets\/|original-work\.json:anatomy_art|site-stories\/apollo14/,
  },
  Castor: { path: /fleet\/|rockets\// },
  // the rockets and the NASA centre, not the astronauts; White Sands, the White House
  Shepard: { before: /New[\s-]?$/ },
  Glenn: { before: /(New[\s-]?|NASA\s?)$/, after: /^\s?(Research|Visitor)/ },
  White: { after: /^\s?(Sands|House|[Dd]warf)/, before: /Snow\s?$/ },
  Collins: { after: /^\s?Aerospace/ },
  // inside an English acronym's expansion: MOXIE (Mars OXygen …), Mars Design Reference
  // Architecture, MOI (Mars Orbit Insertion), Mars-EDL
  Mars: {
    after: /^[\s-]?(OXygen|Design Reference|Orbit Insertion|EDL)/,
    // the Soviet Mars probe series, beside Venera
    path: /site-stories\/mars3\.json:chapters\.0\.images\.1\./,
  },
  // inside SLIM's English expansion and the quoted title 'The Last Man on the Moon'
  Moon: { before: /(Investigating|on the)\s?$/ },
  // the colophon's Vega probe models; the laser and solar sail (it 'Vela'), not the stars
  Vela: { after: /^\s(laser|solare)/ },
  // a star bio's 'also called' clause names the other name on purpose
  Diphda: { path: /named-stars\/diphda/ },
  Hadar: { path: /named-stars\/hadar/ },
  Mimosa: { path: /named-stars\/mimosa/ },
  "Tycho's Supernova": { path: /deep-sky/, locs: /^nl$/ },
  // the label already reads 'ISS — محطة الفضاء الدولية'
  ISS: { path: /orbit-regimes\/LEO\.json:residents\.0\.label/, locs: /^ar$/ },
  Polaris: {
    after: /^\s?(Dawn|Program)/,
    path: /programs\/spacex|science\/life-in-space|essays\/the-body-in-the-dark|missions\//,
  },
  Deneb: { after: /^\s?(Kaitos|Algedi)/ },
  // the German satellite on Ariane 5's last flight, not the physicist
  'Heinrich Hertz': { path: /programs\/ariane|fleet\/launcher\/ariane/ },
  // dwarf galaxies listed by their Latin names alongside others that stay Latin
  'Canes Venatici I': { path: /dwarf-spheroidals/, locs: /^(de|fr|es|it|nl|pt-BR)$/ },
  'Boötes II': { path: /dwarf-spheroidals/, locs: /^(de|fr|es|it|nl|pt-BR)$/ },
  'Reticulum II': { path: /dwarf-spheroidals/, locs: /^(de|fr|es|it|nl|pt-BR)$/ },
  'Segue 1': { path: /dwarf-spheroidals/, locs: /^(de|fr|es|it|nl|pt-BR)$/ },
  // these two star names are explained as shortenings of the Latin designation
  'Alpha Trianguli Australis': { path: /named-stars\/atria/ },
  'Gamma Crucis': { path: /named-stars\/gacrux/ },
  Miranda: { path: /fleet\/(launcher|engine)|rockets\// },
  Hydra: { path: /universe\/named-stars/ },
  'Ursa Minor': { path: /science\/observation/ },
  Sextans: { path: /science\/observation/ },
  Phoebe: { after: /^\s?Regio/ },
  Peacock: { path: /universe\/named-stars\/peacock/ },
  // the museum "Space Center Houston", and the city inside the English Apollo 13 quote
  // 'hot Jupiter' (an exoplanet class), 'Sun-synchronous' (an orbit type) stay whole
  Jupiter: { before: /\bhot\s?$/i },
  Sun: { after: /^-synchronous/ },
  'Wolf-Lundmark-Melotte': { path: /messages:galaxy_name_wlm/, locs: /^ko$/ },
  Houston: { before: /Space Center\s?$/, after: /^,\s?we/ },
};
// first and middle names of the people in the glossary: a bare surname right after one
// of them is part of a fuller name
const NAME_PARTS = new Set(
  Object.keys(GL.person ?? {}).flatMap((k) =>
    k
      .split(' ')
      .slice(0, -1)
      .map((w) => w.replace(/[.,]$/, ''))
      .filter((w) => /^[A-Z]/.test(w)),
  ),
);
const PERSON = classes.split(',').includes('person') ? (GL.person ?? {}) : {};
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
const GENITIVE_S = loc === 'de' || loc === 'nl';
const SHIELD = new Set(
  Object.keys(G).filter((k) => Object.keys(G).some((j) => j !== k && k.includes(j))),
);
const VEH =
  /\b(Saturn ?(V|IB|I|1B|5)\b|Blue Moon|[Tt]rans-[A-Z][a-z]+|[A-Z][a-z]+-watching|Lunar-Earth|Mars ?(Express|Pathfinder|Global|Reconnaissance|Odyssey|Climate|Polar|Observer|Science|Orbiter|Sample|Exploration|Atmosphere|Cube|One|Society|Direct|Base|Ascent|Helicopter|Organic|Z-2|Hope|Curiosity|[0-9]+(?![.,][0-9])|-[0-9])|Mercury[- ](Magnetospher|Atlas|Redstone|Seven|program|capsule|Mark|Transfer|Planetary|[0-9]+(?![.,][0-9]))|Atlas-Mercury|Project Mercury|Venus ?(Express|Climate)|Jupiter ?(Icy|C\b|-C|IRBM|Trojan)|Europa ?(Clipper|Lander|rocket)|Pluto ?(Kuiper|Express)|Moon ?(Mineralogy|Express)|Titan ?(II|III|IV|I\b|GLV|23|rocket)|Earth ?(Observing|Return)|Near-Earth|Sub-Earth|Trans-Earth|trans-Mars|Halley ?(Armada)|Pioneer Venus|ISS-[A-Za-z]|Phobos[ -]?[0-9]|[Oo]f the (Sun|Moon|Earth)|Moon Trees?|Halley Multicolour|Polar Jupiter|Tianwen Mars|Mars (Perseverance|Curiosity|2020)|Moon[ -](Village|Sniper)|close Earth|Earth (gravity|flyby|swing)|(Sun|Earth|Moon)[ -]?(point|flyby)|Emirates Mars Mission|Starship Mars|Mars Surveyor|Mars (Sample|Science|Ascent|Base|Society|Direct|Climate|Polar|Global|Observer|Odyssey|Express|Pathfinder|Exploration)|[Nn]ear-Earth|[A-Z][a-z]+-(sized|like|class|mass|radius|watching)|Moon Impact|Mars (Relay|Oxygen))/g;
const ROCKET_FAMILY = new Set(['Saturn', 'Titan', 'Jupiter']);
const ROCKET_PATH =
  /(^|\/)fleet\/(launcher|engine|launch-site)\/|programs\/(apollo|skylab|gemini|mercury)\b|missions\/earth\/(gemini|mercury)|rockets\//;
const ROCKET_WORDS =
  /rocket|launch|booster|engine|missile|stage|Redstone|ロケット|エンジン|ミサイル|火箭|发动机|导弹|운반|로켓|엔진|미사일|ракет|двигател|ракета|रॉकेट|इंजन|صاروخ|محرك|ракет|мотор|razz|missil|misil|motor|fusée|cohete|foguete|Rakete|raket|Triebwerk|lanceur|lanzador/i;
// ru: every glossary form in every case, to carry a case across "X и Y", "X, Y", "X + Y"
const RU_FORMS = (() => {
  const m = new Map();
  for (const cls of ['body', 'feature', 'place', 'facility'])
    for (const f of Object.values(GL[cls] ?? {}))
      // indeclinable forms (Ио, Бенну) say nothing about the case of their neighbours
      if (f.ru)
        for (const c of ['gen', 'dat', 'ins', 'pre'])
          if (declineRu(f.ru, c) !== f.ru) m.set(declineRu(f.ru, c), [c, f.ru]);
  return m;
})();
const RU_NOM = new Set([...RU_FORMS.values()].map(([, n]) => n));
// Hindi: a noun before a postposition takes the oblique (व्याध तारा से → व्याध तारे से,
// काइपर घेरा में → काइपर घेरे में) and a genitive before such a noun agrees (बारनर्ड का
// तारा के → बारनर्ड के तारे के; तूफ़ानों का महासागर पर → के). Only where the swap made the
// phrase: a match the old text already had is left alone. A descriptor the text already
// had after an inserted name goes (हैली धूमकेतु धूमकेतु).
const HI_POST = '(का|की|के|को|से|में|पर|ने|तक|द्वारा)(?=[\\s,।.;)—]|$)';
function obliqueHi(s, old) {
  const fresh =
    (f) =>
    (m, ...a) =>
      old.includes(m) ? m : f(m, ...a);
  return s
    .replace(
      new RegExp(`(^|\\s)का (\\S+) ${HI_POST}`, 'g'),
      fresh((m, p, w, q) =>
        /^(तारा|घेरा|अड्डा)$/.test(w) || !/[ािीुूेैोौंँ़ृ]$/.test(w) ? `${p}के ${w} ${q}` : m,
      ),
    )
    .replace(
      new RegExp(`(^|\\s)(तारा|घेरा|अड्डा) ${HI_POST}`, 'g'),
      fresh((m, p, w, q) => `${p}${w.slice(0, -1)}े ${q}`),
    )
    .replace(
      /(^|\s)(तारामंडल|घाटी|धूमकेतु|मैदान|क्रेटर|पर्वत|सागर) \2(?=[\s,।.;)—]|$)/g,
      fresh((m, p, w) => `${p}${w}`),
    );
}
// Arabic, only where the swap made the phrase: a prefix the text kept apart before a Latin
// name joins the Arabic one (لـ كارل → لكارل, لـ المشتري → للمشتري, بـ زحل → بزحل,
// و كوبر → وكوبر); a name or descriptor said twice goes (محطة محطة الفضاء الدولية,
// حزام حزام كايبر, "لإطلاق الأقمار الصناعية" twice); the ISS's own long name before the
// inserted one goes (والمحطة الفضائية الدولية محطة الفضاء الدولية → ومحطة الفضاء الدولية).
const AR = '[\\u0621-\\u064A]';
function prefixesAr(s, old) {
  const fresh =
    (f) =>
    (m, ...a) =>
      old.includes(m) ? m : f(m, ...a);
  let prev;
  do {
    prev = s;
    s = s.replace(
      new RegExp(`(^|\\s)(${AR}+(?: ${AR}+){0,3}) \\2(?=[\\s،.؛:)—]|$)`, 'g'),
      fresh((m, p, w) => `${p}${w}`),
    );
  } while (s !== prev);
  return (
    s
      .replace(
        /(\S*)محطة محطة الفضاء الدولية/g,
        fresh((m, p) => `${p}محطة الفضاء الدولية`),
      )
      // the article goes on a construct the name made ("فالمحطة ISS" → فمحطة الفضاء الدولية)
      .replace(
        /(^|\s)(و|ف|ب)?(ال|لل)محطة الفضاء الدولية/g,
        fresh((m, p, w, a) => `${p}${w ?? ''}${a === 'لل' ? 'ل' : ''}محطة الفضاء الدولية`),
      )
      .replace(
        /(\S*)نجم نجم /g,
        fresh((m, p) => `${p}نجم `),
      )
      .replace(
        /(^|\s)(و|ب)?(لل|ال)محطة الفضائية الدولية محطة الفضاء الدولية/g,
        fresh((m, p, w, a) => `${p}${w ?? ''}${a === 'لل' ? 'ل' : ''}محطة الفضاء الدولية`),
      )
      .replace(
        new RegExp(`(^|\\s)لـ\\s?ال(${AR}+)`, 'g'),
        fresh((m, p, x) => `${p}لل${x}`),
      )
      .replace(
        new RegExp(`(^|\\s)(لـ|بـ) (${AR}+)`, 'g'),
        fresh((m, p, w, x) => `${p}${w[0]}${x}`),
      )
      .replace(
        new RegExp(`(^|\\s)و (${AR}+)`, 'g'),
        fresh((m, p, x) => `${p}و${x}`),
      )
  );
}
function coordinateRu(s) {
  let prev;
  do {
    prev = s;
    for (const [form, [c]] of RU_FORMS) {
      s = s.replace(
        new RegExp(`(${form})(\\s*(?:,|и|или|\\+)\\s+)([А-ЯЁ][а-яё]+(?: [А-ЯЁа-яё]+)?)`, 'g'),
        (m, a, sep, b) => {
          const nom = [...RU_NOM].find(
            (n) => b.startsWith(n) && (b.length === n.length || /\s/.test(b[n.length])),
          );
          if (!nom || (RU_FORMS.get(a)?.[1] === nom && declineRu(nom, c) === nom)) return m;
          return a + sep + declineRu(nom, c) + b.slice(nom.length);
        },
      );
    }
  } while (s !== prev);
  return s;
}
const SR_FORMS = (() => {
  const m = new Map();
  for (const cls of ['body', 'feature', 'place', 'facility'])
    for (const f of Object.values(GL[cls] ?? {}))
      if (f['sr-Cyrl'])
        for (const c of ['gen', 'dat', 'ins', 'loc'])
          if (declineSr(f['sr-Cyrl'], c) !== f['sr-Cyrl'])
            m.set(declineSr(f['sr-Cyrl'], c), [c, f['sr-Cyrl']]);
  return m;
})();
const SR_NOM = new Set([...SR_FORMS.values()].map(([, n]) => n));
function coordinateSr(s) {
  let prev;
  do {
    prev = s;
    for (const [form, [c]] of SR_FORMS)
      s = s.replace(
        new RegExp(
          `(${form})(\\s*(?:,|и|или|\\+|затим|а затим)\\s+)([А-ЯЂЈЉЊЋЏ][а-яђјљњћџ]+(?: [А-ЯЂЈЉЊЋЏа-яђјљњћџ]+)?)`,
          'g',
        ),
        (m, a, sep, b) => {
          const nom = [...SR_NOM].find(
            (n) => b.startsWith(n) && (b.length === n.length || /\s/.test(b[n.length])),
          );
          return nom ? a + sep + declineSr(nom, c) + b.slice(nom.length) : m;
        },
      );
  } while (s !== prev);
  return s;
}
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
    [/\b([Dd]e |[Àà] )?l'Station spatiale/g, (m, p) => `${p ?? ''}la Station spatiale`],
    [/\b([Dd])u Station spatiale/g, '$1e la Station spatiale'],
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
    [
      /\b(der|zur|einer|an der|auf der|von der|bei der|mit der|in der) Internationale Raumstation/g,
      '$1 Internationalen Raumstation',
    ],
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
// The overlays, then the UI bundle (rel "messages" = messages/<loc>.json, flat keys;
// apply-edits.mjs writes it back there), so a name is the same in pages and in the UI.
const files = [
  ...walk(`i18n-src/${loc}`).map((f) => [f, f.slice(`i18n-src/${loc}/`.length)]),
  [`messages/${loc}.json`, 'messages'],
];
for (const [f, rel] of files) {
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
        if (
          en === 'Halley' &&
          !/comet|комет|彗星|혜성|धूमकेतु|مذنب|1P\/|Giotto|Vega|Вега|Halley[- ]?(flyby|armada)|пролёт|облёт|рой|флот/i.test(
            v,
          )
        )
          continue;
        // "Formación Fra Mauro" holds the English key: swapping would rewrite text that already
        // names it ("Tierras Altas de Fra Mauro" → "…de Formación Fra Mauro").
        const nat = forms[loc];
        // a longer name with no form in this language still shields the shorter keys inside
        // it ("Linda Salzman Sagan" must not become "Linda Sagan Sagan")
        if ((!nat || nat === en) && SHIELD.has(en)) {
          s = s.replace(
            new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'),
            (m) => `\u{e000}${keep.push(m) - 1}\u{e000}`,
          );
          continue;
        }
        if (!nat || nat === en) continue;
        const esc = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // whole words only: "Plutone" must not count as holding "Pluto"
        if (
          LATIN.has(loc) &&
          ((/[- ]/.test(en) && nat.startsWith(en)) ||
            new RegExp(`\\b${esc.replace(/-/g, ' ')}\\b`).test(nat.replace(/-/g, ' ')))
        ) {
          // …and that text is not open to the shorter keys inside it either
          if (SHIELD.has(en))
            s = s.replace(
              new RegExp(`\\b${esc}\\b`, 'g'),
              (m) => `\u{e000}${keep.push(m) - 1}\u{e000}`,
            );
          continue;
        }
        // ISS-RapidScat, ISS-CREAM… are instrument names
        const tail = en === 'ISS' ? '(?!-[A-Za-z])' : '';
        s = s.replace(
          // sr-Cyrl glues case endings to Latin names after a hyphen ("Mars-а", "ISS-у")
          new RegExp(
            `( ?)\\b${esc}(?:'s|’s${GENITIVE_S && PERSON[en] && /[^s]$/.test(en) ? '|s' : ''})?\\b${tail}(-[а-яђјљњћџ]+)?( ?)`,
            'g',
          ),
          (m, a, suf, b, off, str) => {
            // Saturn / Titan / Jupiter are also rocket and missile families: leave them in
            // launcher, engine, pad and crewed-program text, and wherever a rocket word is near.
            if (
              ROCKET_FAMILY.has(en) &&
              (ROCKET_PATH.test(rel) ||
                ROCKET_WORDS.test(str.slice(Math.max(0, off - 30), off + m.length + 30)))
            )
              return m;
            // homonyms: a star, moon or person that is also a vehicle, engine or facility
            // a bare surname inside a fuller name ('Edwin "Buzz" Aldrin', "Linda Salzman Sagan")
            if (PERSON[en]?._bare) {
              const pre = str.slice(Math.max(0, off - 30), off) + a;
              const w = (pre.match(/(\S+)\s$/) ?? [])[1] ?? '';
              if (/["'”’]$/.test(w) || NAME_PARTS.has(w)) return m;
              // …or a first name before a Latin surname ("Scott Kelly", "Scott 'Kidd' Poteet")
              const post = str.slice(off + m.length - (b ? 1 : 0), off + m.length + 30);
              if (/^\s?(?:['"‘“][^'"’”]+['"’”]\s)?[A-Z][a-z]/.test(post)) return m;
            }
            // a surname limited to some pages ("Mayor" only where it is Michel Mayor)
            if (PERSON[en]?._only && !new RegExp(PERSON[en]._only).test(rel)) return m;
            if (ONLY[en] && !ONLY[en].test(`${rel}:${at}`)) return m;
            const g = GUARD[en];
            if (
              g &&
              (!g.locs || g.locs.test(loc)) &&
              // the path guard sees "<file>:<field>" ("messages:<key>" for the UI bundle)
              ((g.path && g.path.test(`${rel}:${at}`)) ||
                (g.before && g.before.test(str.slice(Math.max(0, off - 25), off) + a)) ||
                (g.after &&
                  g.after.test(str.slice(off + m.length - (b ? 1 : 0), off + m.length + 25))))
            )
              return `\u{e000}${keep.push(m) - 1}\u{e000}`;
            if (
              PERSON[en] &&
              /^\s?(Space Cent(?:er|re)|Crater|Regio|Telescope|Observatory|Base|Point|Ridge|Station|Rille|Hills?)\b/.test(
                str.slice(off + m.length - (b ? 1 : 0)),
              )
            )
              return m;
            const before = str[off - 1] ?? '',
              after = str[off + m.length] ?? '';
            const lead =
              a && (CJK.test(before) || /[（「『(]/.test(before)) && loc !== 'ko' ? '' : a;
            const trail =
              b && (CJK.test(after) || /[、。，：）」』)]/.test(after)) && loc !== 'ko' ? '' : b;
            let here = nat;
            // an English possessive left in Latin-script text ("Sergei Korolev's Team"):
            // German and Dutch take the genitive -s; the other languages are left for a hand fix
            if (LATIN.has(loc) && /^['’]?s/.test(m.trim().slice(en.length))) {
              // a body's possessive ("Earth's" → der Erde) needs rewording: left for a hand fix
              if ((loc !== 'de' && loc !== 'nl') || !PERSON[en]) return m;
              const g2 = /[sßxz]$/.test(nat)
                ? "'"
                : loc === 'nl' && /[aeiouy]$/.test(nat)
                  ? "'s"
                  : 's';
              return lead + nat + g2 + trail;
            }
            // a possessive ending glued to a person's name ("Gagarin-ов") is left alone
            if (PERSON[en] && suf && /^-ј?(ов|ев|ин)/.test(suf)) return m;
            if (loc === 'ru' && PERSON[en]) {
              const before = str.slice(Math.max(0, off - 40), off) + a;
              const p = PERSON[en];
              return lead + declinePersonRu(nat, guessCaseRu(before), p._female, p._slavic) + trail;
            }
            if (loc === 'sr-Cyrl' && PERSON[en]) {
              const before = str.slice(Math.max(0, off - 40), off) + a;
              const p = PERSON[en];
              const c = caseFromSuffix(suf, p._female) ?? guessCaseSr(before);
              return lead + declinePersonSr(nat, c, p._female) + trail;
            }
            if (loc === 'ru') {
              const before = str.slice(Math.max(0, off - 40), off) + a;
              here = dropHeadIfRepeated(nat, before) ?? declineRu(nat, guessCaseRu(before));
              // mid-sentence the generic word is lower-case (равнина Утопия); lunar seas keep Море
              if (/^(Равнин|Плато|Долин|Кратер|Пик|Формаци|Нагорь|Космодром|Мыс)/.test(here))
                here = here.charAt(0).toLowerCase() + here.slice(1);
              if (!before.trim() || /[.!?:]\s*$/.test(before))
                here = here.charAt(0).toUpperCase() + here.slice(1);
            }
            if (loc === 'sr-Cyrl') {
              const before = str.slice(Math.max(0, off - 40), off) + a;
              // an abbreviation keeps its hyphenated ending (МСС-а); a word takes the case
              if (/^[А-ЯЁЂЈЉЊЋЏ]{2,}$/.test(nat)) return lead + nat + (suf ?? '') + trail;
              // a possessive ending ("Phobos-ова") makes a possessive adjective: Фобосова,
              // Церерин; names it does not fit stay untouched for a hand fix
              const poss = suf && suf.match(/^-ј?(ов|ев)(.*)$/);
              if (poss) {
                if (nat.includes(' ')) return m;
                if (/[бвгдзклмнпрстфхцуо]$/.test(nat)) return lead + nat + 'ов' + poss[2] + trail;
                if (/[јљњћђчџшж]$/.test(nat)) return lead + nat + 'ев' + poss[2] + trail;
                if (/а$/.test(nat)) return lead + nat.slice(0, -1) + 'ин' + poss[2] + trail;
                return m;
              }
              const head = nat.split(' ')[0];
              const prev =
                (before.trimEnd().match(/([А-Яа-яЂЈЉЊЋЏђјљњћџ]+)$/) || [])[1]?.toLowerCase() ?? '';
              if (
                nat.includes(' ') &&
                /^(кратер|равница|плато|долина|планина|комета|космодром|море|океан)$/i.test(head) &&
                prev.startsWith(head.toLowerCase().slice(0, 4))
              )
                here = nat.split(' ').slice(1).join(' ');
              else {
                const fem = /а$/.test(
                  nat
                    .split(' ')
                    .find((w) =>
                      /^(кратер|равница|плато|долина|планина|комета|космодром|центар|база|море|океан)$/i.test(
                        w,
                      ),
                    ) ?? nat.split(' ')[0],
                );
                here = declineSr(nat, caseFromSuffix(suf, fem) ?? guessCaseSr(before));
              }
              if (
                /^(Равниц|Плато|Долин|Кратер|Планин|Формациј|Космодром|База)/.test(here) &&
                before.trim() &&
                !/[.!?:]\s*$/.test(before)
              )
                here = here.charAt(0).toLowerCase() + here.slice(1);
              return lead + here + trail;
            }
            return lead + here + (suf ?? '') + trail;
          },
        );
        if (loc === 'ko') s = koParticles(s, nat);
      }
      if (LATIN.has(loc) && s !== v) s = articles(s);
      // a CJK descriptor the text already had after the name (グリッグ・シェレルップ彗星 彗星,
      // わし座座): once is enough
      if (CJK_LOCALE.has(loc) && s !== v)
        s = s.replace(
          /(彗星|星雲|星团|星団|銀河|星系|座|クレーター|撞击坑|盆地|平原|峡谷|大陸|地域)\s?\1/g,
          '$1',
        );
      // a constellation said twice ("小犬座小犬座α") and a space left between CJK characters
      // where a name and its designation collapsed ("参宿三 是")
      if (CJK_LOCALE.has(loc) && s !== v)
        s = s
          .replace(/([\u4e00-\u9fff\u3040-\u30ff]{1,5}座)\s?\1/g, '$1')
          .replace(
            /([\u3040-\u30ff\u4e00-\u9fff])[ \u00a0]+(?=[\u3040-\u30ff\u4e00-\u9fff])/g,
            '$1',
          );
      if (loc === 'ko' && s !== v)
        s = s.replace(/(혜성|성운|성단|은하|자리|분화구|평원)\s\1/g, '$1');
      // the ʻokina of ʻOumuamua stays only with the Latin spelling
      if (s !== v) s = s.replace(/ʻ(?=[^A-Za-z])/g, '');
      // a name and its designation that came out the same: "Альфа Павлина (Альфа Павлина)"
      if (s !== v) s = s.replace(/([^\s(（][^()（）]{1,40}?)\s?[（(]\1[)）]/g, '$1');
      if (CJK_LOCALE.has(loc) && s !== v)
        s = s.replace(
          /([\u3040-\u30ff\u4e00-\u9fff])[ \u00a0]+(?=[\u3040-\u30ff\u4e00-\u9fff])/g,
          '$1',
        );
      // Arabic: the preposition لـ before the article ال is written لل
      if (loc === 'ar' && s !== v) s = prefixesAr(s.replace(/لـال/g, 'لل'), v);
      if (loc === 'hi' && s !== v) s = obliqueHi(s, v);
      if (loc === 'ru' && s !== v) s = coordinateRu(s);
      if (loc === 'sr-Cyrl' && s !== v) {
        s = coordinateSr(s);
        // "комете Халејева комета" → "Халејеве комете": the generic word takes the case,
        // the name keeps it; a leftover English "Comet" after it goes
        s = s
          .replace(
            /(?<![а-я])[Кк]омет(а|е|и|у|ом) Халејев(?:а|е|ој|у|ом) комет(?:а|е|и|у|ом)/g,
            (m, e) => `Халејев${{ а: 'а', е: 'е', и: 'ој', у: 'у', ом: 'ом' }[e]} комет${e}`,
          )
          .replace(/(комет[а-я]*) Comet\b/g, '$1')
          // Serbian says "на" for capes, Baikonur and plateaus; the cape's last word declines
          .replace(/Кејпа Канаверал(?![а-я])/g, 'Кејп Канаверала')
          .replace(/(^|\s)(баз[а-я]*) (?:ваздухопловна )?база Ванденберг/g, '$1$2 Ванденберг')
          .replace(/(^|\s)у (Кејп Канавералу|Бајконуру|платоу)/g, '$1на $2')
          .replace(/(^|\s)на Кејп Канаверал(?=[\s(,.;—]|$)(?! [A-Z]{2})/g, '$1на Кејп Канавералу');
      }
      // Russian says "на" for plains, plateaus, peaks, mountains and capes (на плато Оксия)
      if (loc === 'ru' && s !== v)
        s = s.replace(
          /(^|[\s(])[вВ] ((?:равнине|плато|пике|горе|мысе) [А-ЯЁ])/g,
          (m, p, w) => `${p}${m.trim()[0] === 'В' ? 'На' : 'на'} ${w}`,
        );
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
  `scripts/i18n-tools/maps/2026-10-17-translation-cleanup/glossary-edits-${loc}${process.env.PASS_TAG ? `-${process.env.PASS_TAG}` : ''}.json`,
  JSON.stringify(edits, null, 1),
);
console.log(loc, 'strings changed', n);
