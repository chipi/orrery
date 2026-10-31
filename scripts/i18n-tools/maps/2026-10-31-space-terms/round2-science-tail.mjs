// Round 2, science tail (2026-10-31): the 66 misses left after the second opinion on the
// low-confidence bindings. Writes term-apply edit files and a keep list per locale, and
// widens stems for correct variants. Run from the repo root:
//   node scripts/i18n-tools/maps/2026-10-31-space-terms/round2-science-tail.mjs <outdir>
// then term-apply.mjs <loc> <outdir>/<loc>.json, then term-keep.mjs <outdir>/keeps.json.
import fs from 'node:fs';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const c = (rel, at, term, find, replace, why) => ({
  rel,
  at,
  term,
  decision: 'change',
  find,
  replace,
  why,
});
const k = (loc, rel, at, term, why) => ({ loc, rel, at, term, why });

const L = 'science/_landing.json';
const EDITS = {
  // nl: the noun "brand" is a fire; an engine burn is an ontsteking (ESA NL, nl.wikipedia).
  nl: [
    c(
      L,
      'intro_paragraphs.0',
      'burn',
      'elke brandmarkering op de baan',
      'elke ontstekingsmarkering op de baan',
      'brand = fire',
    ),
    c(
      L,
      'chapters.1.paragraphs.3',
      'burn',
      'haar grote vertrekbrand bij perigeum',
      'haar grote vertrekontsteking bij perigeum',
      'brand = fire',
    ),
    c(
      L,
      'chapters.2.diagram_caption',
      'burn',
      'Twee branden, één ellips.',
      'Twee ontstekingen, één ellips.',
      'brand = fire',
    ),
    c(
      L,
      'chapters.2.paragraphs.1',
      'burn',
      'Twee branden, geen verspilde brandstof.',
      'Twee ontstekingen, geen verspilde brandstof.',
      'brand = fire',
    ),
    c(
      'science/history/apollo-11-1969.json',
      'body_paragraphs.1',
      'burn',
      'Als de motorbrand voor',
      'Als de motorontsteking voor',
      'motorbrand = engine fire',
    ),
    c(
      'science/propulsion/v-infinity.json',
      'body_paragraphs.1',
      'burn',
      'hoe groot de aankomstbrand moet zijn',
      'hoe groot de ontsteking bij aankomst moet zijn',
      'brand = fire',
    ),
    c(
      'science/scales-time/frames.json',
      'narrative_101.1',
      'burn',
      'kader voor aankomstbranden en werk',
      'kader voor ontstekingen bij aankomst en werk',
      'brand = fire',
    ),
    c(
      'science/transfers/_intro.json',
      'paragraphs.0',
      'burn',
      'De trans-Mars-injectiebrand voegt',
      'De ontsteking voor de trans-Mars-injectie voegt',
      'brand = fire',
    ),
    c(
      'science/transfers/_intro.json',
      'paragraphs.1',
      'burn',
      'twee branden, acht maanden',
      'twee ontstekingen, acht maanden',
      'brand = fire',
    ),
  ],
  // ar: flyby is التحليق (القريب); الاقتراب is approach, عبور reads as a transit.
  ar: [
    c(
      'science/orbits/apsides.json',
      'body_paragraphs.2',
      'flyby',
      'عمليات الاقتراب العابر التي',
      'عمليات التحليق القريب التي',
      'approach ≠ flyby',
    ),
    c(
      'science/orbits/eccentricity.json',
      'body_paragraphs.1',
      'flyby',
      'عبورًا قريبًا لا يعود',
      'تحليقًا قريبًا لا يعود',
      'عبور = transit',
    ),
    c(
      'science/planets/kuiper-belt.json',
      'body_paragraphs.2',
      'flyby',
      'فقد أعاد عبورها بالقرب من',
      'فقد أعاد تحليقها بالقرب من',
      'عبور = transit',
    ),
    c(
      'science/propulsion/fusion-propulsion.json',
      'body_paragraphs.1',
      'flyby',
      'في عبور خاطف دون تباطؤ',
      'في تحليق خاطف دون تباطؤ',
      'عبور = transit',
    ),
    c(
      'science/transfers/free-return.json',
      'narrative_101.2',
      'flyby',
      'عبور قريب من المريخ',
      'تحليق قريب من المريخ',
      'عبور = transit',
    ),
  ],
  // ko: 스윙바이 is the gravity-assist word; a flyby is 플라이바이.
  ko: [
    c(
      'science/transfers/free-return.json',
      'narrative_101.2',
      'flyby',
      '지구 → 화성 스윙바이 → 지구',
      '지구 → 화성 플라이바이 → 지구',
      '스윙바이 = gravity assist',
    ),
    c(
      'science/transfers/free-return.json',
      'body_paragraphs.2',
      'flyby',
      '유인 화성 스윙바이 가운데',
      '유인 화성 플라이바이 가운데',
      '스윙바이 = gravity assist',
    ),
    c(
      'science/transfers/free-return.json',
      'diagram_caption',
      'flyby',
      '지구 → 화성 스윙바이 → 지구.',
      '지구 → 화성 플라이바이 → 지구.',
      '스윙바이 = gravity assist',
    ),
  ],
};
const COMB = 'combustion / fire, not an engine firing';
const KEEPS = [
  ...[
    [L, 'chapters.1.diagram_caption'],
    ['science/history/_intro.json', 'paragraphs.0'],
    ['science/history/_intro.json', 'paragraphs.1'],
    ['science/observation/hertzsprung-russell.json', 'body_paragraphs.0'],
    ['science/observation/hertzsprung-russell.json', 'body_paragraphs.4'],
    ['science/propulsion/expander-cycle.json', 'body_paragraphs.0'],
    ['science/propulsion/fuels-and-oxidizers.json', 'body_paragraphs.4'],
    ['science/propulsion/gas-generator.json', 'intro_sentence'],
    ['science/propulsion/gas-generator.json', 'body_paragraphs.0'],
    ['science/propulsion/ion-drive.json', 'intro_sentence'],
    ['science/propulsion/nuclear-thermal.json', 'body_paragraphs.0'],
    ['science/propulsion/oberth-effect.json', 'narrative_101.0'],
    ['science/propulsion/specific-impulse.json', 'narrative_101.1'],
    ['science/propulsion/specific-impulse.json', 'body_paragraphs.0'],
    ['science/propulsion/staged-combustion.json', 'intro_sentence'],
    ['science/propulsion/staged-combustion.json', 'diagram_caption'],
    ['science/propulsion/throttling-and-gimbaling.json', 'body_paragraphs.0'],
    ['science/life-in-space/crew-dynamics-psychology.json', 'body_paragraphs.1'],
    ['science/mission-phases/deorbit-corridor.json', 'intro_sentence'],
  ].map(([rel, at]) => k('nl', rel, at, 'burn', COMB)),
  k(
    'nl',
    'science/orbits/disposal-end-of-life.json',
    'diagram_caption',
    'burn',
    'burn perigee down = laat het perigeum zakken, natural',
  ),
  k(
    'nl',
    'science/orbits/hill-sphere.json',
    'narrative_101.1',
    'burn',
    'station-keeping burns = baancorrecties',
  ),
  k(
    'nl',
    'science/orbits/lagrange-points.json',
    'body_paragraphs.1',
    'burn',
    'station-keeping burns = koerscorrecties',
  ),
  k(
    'nl',
    'science/transfers/free-return.json',
    'intro_sentence',
    'burn',
    'verb: de motor hoeft te branden (ESA NL usage)',
  ),
  k(
    'nl',
    'science/transfers/free-return.json',
    'narrative_101.2',
    'burn',
    'mid-course burns = koerscorrecties',
  ),
  k(
    'nl',
    'science/transfers/free-return.json',
    'body_paragraphs.1',
    'burn',
    'return burn = de terugkeermotor, natural',
  ),
  k(
    'nl',
    'science/transfers/hohmann-transfer.json',
    'narrative_101.2',
    'burn',
    'braking burn = remming',
  ),
  ...[
    [L, 'chapters.1.diagram_caption'],
    ['science/life-in-space/crew-dynamics-psychology.json', 'body_paragraphs.1'],
    ['science/mission-phases/deorbit-corridor.json', 'intro_sentence'],
    ['science/observation/hertzsprung-russell.json', 'body_paragraphs.0'],
    ['science/observation/hertzsprung-russell.json', 'body_paragraphs.4'],
    ['science/propulsion/ion-drive.json', 'intro_sentence'],
  ].map(([rel, at]) => k('ko', rel, at, 'burn', COMB)),
  k(
    'ko',
    'science/orbits/disposal-end-of-life.json',
    'diagram_caption',
    'burn',
    'burn perigee down = 근지점을 낮춤, natural',
  ),
  k(
    'ko',
    'science/propulsion/dv-budget.json',
    'body_paragraphs.0',
    'burn',
    'every engine burn = 엔진을 켤 때마다, natural',
  ),
  k(
    'ko',
    'science/propulsion/solar-sail.json',
    'body_paragraphs.1',
    'flyby',
    'verb: 태양을 가까이 스친 뒤',
  ),
  k(
    'ko',
    'science/transfers/conic-sections.json',
    'narrative_101.2',
    'flyby',
    'verb: 스치고 지나가는 것',
  ),
  k(
    'ko',
    'science/transfers/conic-sections.json',
    'body_paragraphs.2',
    'flyby',
    'verb: 스쳐 지나가고',
  ),
  k(
    'ar',
    'science/transfers/conic-sections.json',
    'body_paragraphs.2',
    'flyby',
    'verb: يمرّون قرب كوكب',
  ),
  k(
    'nl',
    'science/mission-phases/gravity-turn.json',
    'diagram_caption',
    'orbit insertion',
    'launch: tegen de tijd dat de baan bereikt is',
  ),
  k(
    'nl',
    'science/scales-time/frames.json',
    'narrative_101.1',
    'orbit',
    'verb: omheen draait (re-kept after the burn edit)',
  ),
  k(
    'es',
    'science/propulsion/fuels-and-oxidizers.json',
    'body_paragraphs.1',
    'booster',
    'booster scale = escala de primera etapa',
  ),
  k(
    'pt-BR',
    'science/propulsion/thrust-and-twr.json',
    'body_paragraphs.3',
    'booster',
    'Super Heavy named, word omitted naturally',
  ),
];
for (const [loc, e] of Object.entries(EDITS))
  fs.writeFileSync(`${OUT}/${loc}.json`, JSON.stringify(e, null, 1));
fs.writeFileSync(`${OUT}/keeps.json`, JSON.stringify(KEEPS, null, 1));

const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('flyby', 'ar', [
  'مرور\\S*(?: \\S+){0,5} (?:قرب|بالقرب|بمحاذاة)',
  'مرور بال',
  'تحل(?:ي)?ق\\p{L}* قريب',
]);
add('flyby', 'nl', ['voorbij ?vlieg\\p{L}*', 'vloog \\p{L}+ voorbij']);
add('orbit insertion', 'nl', ['in een baan (?:te )?komen']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log(
  'edits:',
  Object.fromEntries(Object.entries(EDITS).map(([l, e]) => [l, e.length])),
  'keeps:',
  KEEPS.length,
);
