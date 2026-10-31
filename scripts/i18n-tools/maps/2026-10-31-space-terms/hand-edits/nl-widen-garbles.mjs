// nl strings that passed the term check only through the open -baan / -trap stems
// (found by term-widen-check.mjs, 2026-10-31): typos and machine garble. Two fleet
// descriptions retranslated from the English; the rest are word fixes.
//   node scripts/i18n-tools/maps/2026-10-31-space-terms/hand-edits/nl-widen-garbles.mjs <out.json>
import fs from 'node:fs';
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
const doc = (rel) => JSON.parse(fs.readFileSync(`i18n-src/nl/${rel}`, 'utf8'));
const edits = [];
const sub = (rel, at, pairs) => {
  const old = get(doc(rel), at);
  let nu = old;
  for (const [a, b] of pairs) {
    if (!nu.includes(a)) throw new Error(`${rel} ${at}: ${a}`);
    nu = nu.replace(a, b);
  }
  edits.push({ rel, at, old, new: nu });
};
const full = (rel, at, nu) => edits.push({ rel, at, old: get(doc(rel), at), new: nu });

sub('essays/going-to-the-moon.json', 'body.20.md', [['in een haloaanbaan', 'in een halobaan']]);
sub('missions/earth/apollo9.json', 'events.5.note', [
  [
    'Spider-afdaalingstrap uit baan gebracht (hertoetrad maart 1969, Indische Oceaan)',
    'Daaltrap van Spider uit de baan gebracht (in maart 1969 in de atmosfeer verbrand boven de Indische Oceaan)',
  ],
  [
    'opstijgingstrap werd tot uitputting afgevuurd en opgestoten naar een hoge baan — deze verviel in 1981',
    'de opstijgtrap brandde tot de brandstof op was en werd naar een hoge baan gestuwd, die in 1981 verviel',
  ],
]);
sub('missions/earth/vostok-1.json', 'events.1.note', [
  [
    'Enkelbaan op 169 × 327 km, 65° inclinatie.',
    'Eén omloop in een baan van 169 × 327 km, inclinatie 65°.',
  ],
]);
sub('missions/earth/vostok-2.json', 'events.3.note', [
  ['Capsule ontbaan gebracht;', 'Capsule uit de baan gebracht;'],
]);
sub('missions/mercury/bepicolombo.json', 'events.5.label', [
  ['MERCURIUS-INBAAN', 'INSERTIE IN BAAN OM MERCURIUS'],
]);
sub('missions/moon/luna10.json', 'events.1.note', [
  ['Block-L bovenbouwtrap stuurt', 'De Block-L-boventrap stuurt'],
]);
sub('fleet/crewed-spacecraft/apollo-csm-block-i.json', 'dispatch', [
  ['een vonk op de lanchbaan', 'een vonk op het lanceerplatform'],
]);
full(
  'fleet/orbiter/clementine.json',
  'description',
  'Officieel het Deep Space Program Science Experiment (DSPSE). Bedacht door de Ballistic Missile Defense Organization om lichte sensoren onder omstandigheden in de diepe ruimte te kwalificeren, met NASA als partner voor de maan- en planetoïdewetenschap. Gelanceerd op 1994-01-25 met een Titan IIG, op 1994-02-19 in een polaire baan om de Maan gebracht voor 71 dagen kartering. Fotografeerde elke vierkante kilometer van de Maan met 100–300 m resolutie in 11 golflengten — de eerste volledige wereldkaart van de Maan. Het bistatische radarexperiment, met de zender van Clementine en grondantennes van het DSN, ving sterkere echo’s op bij de krater Shackleton aan de zuidpool, passend bij waterijs, 15 jaar vóór LCROSS. Een mislukte ontsteking van een stuwraketje maakte de geplande flyby van planetoïde Geographos onmogelijk en beëindigde de missie.',
);
full(
  'fleet/orbiter/lunar-prospector.json',
  'description',
  'De derde missie uit NASA’s Discovery-klasse (en de eerste die via competitie werd gekozen) en de eerste NASA-wetenschapsmissie die geheel aan de Maan was gewijd sinds Explorer 49 (1973). Gelanceerd op 1998-01-07 met een Athena II vanaf Cape Canaveral; Lunar Prospector kwam in een cirkelvormige polaire baan op 100 km. Zijn neutronenspectrometer mat boven beide maanpolen een scherp tekort aan neutronen (Feldman e.a., 1998 / 1999) — passend bij ~2 × 10⁹ ton waterstofrijk materiaal (vrijwel zeker waterijs) in permanent beschaduwde poolkraters. De gravimeter, magnetometer en gammastraal- en alfadeeltjesspectrometers leverden ook wereldkaarten van de samenstelling van de korst en van het restmagnetisme. Einde van de missie op 1999-07-31: doelbewust neergestort bij de krater Shackleton, in de hoop een waarneembare pluim waterdamp vrij te maken; die werd niet gezien (het lithium-7-fluorescentie-experiment dat hem had moeten zien, was een gok). De waterstofvondst bleef staan tot LCROSS (2009) en Chandrayaan-1 / M3 (2009) haar onafhankelijk bevestigden.',
);
fs.writeFileSync(process.argv[2], JSON.stringify(edits, null, 1));
console.log(edits.length, 'edits');
