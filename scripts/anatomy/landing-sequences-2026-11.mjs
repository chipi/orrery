// Landing-sequence sheets (#641, plan item 1d): one watercolor sheet per landing site,
// four stages left to right — arrival, descent, touchdown, after landing. The look was
// set by the Curiosity anchor (operator pick, 2026-11-06): generation
// e656138c-a293-43a4-ac7b-6fd09698e7ef. Passed as is, the anchor leaked its words into
// every sheet (its title box, "Gale Crater", NASA/JPL logos on Soviet craft), so the
// reference is a text-free copy of it (generation 838caee2-b2fd-469a-9460-571902d42e91,
// title box patched out locally, uploaded as media e85b0819-443c-49cf-ad50-01b7154b4fca).
// Every sheet passes that as the first reference (layout + style) and the craft's own
// shipped cutaway as the second (its look), on nano_banana_2 at 3:2 —
// docs/anatomy-art-runbook.md golden rules.
//
//   node scripts/anatomy/landing-sequences-2026-11.mjs            # print every request
//   node scripts/anatomy/landing-sequences-2026-11.mjs <site-id>  # one request
import { readFileSync } from 'node:fs';

export const ANCHOR = 'e85b0819-443c-49cf-ad50-01b7154b4fca';

const PALETTE = { moon: 'metallic grey and silver', mars: 'rusty', venus: 'ochre-metallic' };

// [site, body, craft (as the prompt names it), arrival, [stage scenes x4], [titles x4],
//  [annotations], agency markings, anatomy id for the craft reference (null = none)]
export const SITES = [
  [
    'luna9',
    'moon',
    'the Soviet Luna 9 lander',
    'arriving at the Ocean of Storms',
    [
      'the spacecraft coming straight in toward the Moon without entering orbit, its retro-rocket firing',
      'the braking engine burning against the fall, the surface close below',
      'the small landing capsule thrown clear just before contact, bouncing on its inflated cushions',
      'the capsule at rest, its four petals open and its camera mast up, taking the first pictures from the surface of another world',
    ],
    ['approach', 'braking', 'touchdown', 'first pictures'],
    ['retro-rocket', 'airbags', 'petals'],
    'USSR',
    'luna-9',
  ],
  [
    'luna16',
    'moon',
    'the Soviet Luna 16 sample-return lander',
    'arriving at the Sea of Fertility',
    [
      'the lander in lunar orbit above grey maria',
      'the powered descent on its main engine, then small vernier thrusters near the ground',
      'standing on its four legs, the drill arm boring into the regolith',
      'the ascent stage lifting off on its own rocket with the sealed soil capsule, the descent stage left behind',
    ],
    ['lunar orbit', 'descent', 'drilling', 'return'],
    ['drill arm', 'soil capsule', 'ascent stage'],
    'USSR',
    'luna-16',
  ],
  [
    'luna17',
    'moon',
    'the Soviet Luna 17 lander carrying the Lunokhod 1 rover',
    'arriving at the Sea of Rains',
    [
      'the lander in lunar orbit',
      'the powered descent on the landing stage engine',
      'the landing stage on the surface, two ramps unfolded at each end',
      'the eight-wheeled Lunokhod 1 rover with its lid open driving down a ramp onto the surface',
    ],
    ['lunar orbit', 'descent', 'touchdown', 'Lunokhod 1'],
    ['ramps', 'rover lid', 'landing stage'],
    'USSR',
    'lunokhod-1',
  ],
  [
    'luna21',
    'moon',
    'the Soviet Luna 21 lander carrying the Lunokhod 2 rover',
    'arriving in Le Monnier crater',
    [
      'the lander in lunar orbit',
      'the powered descent on the landing stage engine toward a crater floor by the mountains',
      'the landing stage on the surface, ramps unfolded',
      'the eight-wheeled Lunokhod 2 rover driving off toward the hills, its lid open',
    ],
    ['lunar orbit', 'descent', 'touchdown', 'Lunokhod 2'],
    ['ramps', 'Lunokhod 2', 'Le Monnier'],
    'USSR',
    'lunokhod-2',
  ],
  [
    'luna24',
    'moon',
    'the Soviet Luna 24 sample-return lander',
    'arriving at the Sea of Crises',
    [
      'the lander in lunar orbit',
      'the powered descent on its main engine',
      'standing on its legs, the long drill boring about two metres into the ground',
      'the ascent stage lifting off with the soil core, the descent stage left behind',
    ],
    ['lunar orbit', 'descent', 'drilling', 'return'],
    ['drill', 'soil core'],
    'USSR',
    'luna24',
  ],
  [
    'apollo11',
    'moon',
    'the Apollo 11 Lunar Module Eagle',
    'landing at the Sea of Tranquility',
    [
      'the Lunar Module alone in lunar orbit, legs extended, starting its descent',
      'the powered descent, the descent engine firing, the craft pitching upright for the final approach',
      'touchdown in a cloud of dust, the long contact probes under the footpads',
      'two astronauts beside the Lunar Module with a flag and experiments, the ascent stage later lifting off from the descent stage',
    ],
    ['undocking', 'powered descent', 'touchdown', 'on the surface'],
    ['descent engine', 'contact probe', 'ascent stage'],
    'NASA',
    'apollo-lm',
  ],
  [
    'apollo12',
    'moon',
    'the Apollo 12 Lunar Module Intrepid',
    'landing in the Ocean of Storms',
    [
      'the Lunar Module in lunar orbit, starting its descent',
      'the powered descent, the craft pitching upright for the final approach',
      'touchdown in dust beside a small crater',
      'the same single Lunar Module standing behind while two astronauts walk to the small three-legged Surveyor 3 robot lander in its crater nearby',
    ],
    ['undocking', 'powered descent', 'touchdown', 'Surveyor 3'],
    ['descent engine', 'Surveyor 3', 'crater'],
    'NASA',
    'apollo-lm',
  ],
  [
    'apollo14',
    'moon',
    'the Apollo 14 Lunar Module Antares',
    'landing at Fra Mauro',
    [
      'the Lunar Module in lunar orbit, starting its descent',
      'the powered descent over hilly ground',
      'touchdown in dust',
      'two astronauts pulling a two-wheeled equipment cart up a hill toward a crater rim',
    ],
    ['undocking', 'powered descent', 'touchdown', 'on the surface'],
    ['descent engine', 'equipment cart', 'Fra Mauro'],
    'NASA',
    'apollo-lm',
  ],
  [
    'apollo15',
    'moon',
    'the Apollo 15 Lunar Module Falcon and its Lunar Roving Vehicle',
    'landing at Hadley-Apennine',
    [
      'the Lunar Module in lunar orbit, starting its descent',
      'the powered descent between tall mountains and a winding valley',
      'touchdown on the plain below the mountains',
      'two astronauts driving the one Lunar Roving Vehicle away from the Lunar Module toward the rille',
    ],
    ['undocking', 'powered descent', 'touchdown', 'the rover'],
    ['descent engine', 'Hadley Rille'],
    'NASA',
    'lrv-apollo',
  ],
  [
    'apollo16',
    'moon',
    'the Apollo 16 Lunar Module Orion and its Lunar Roving Vehicle',
    'landing in the Descartes highlands',
    [
      'the Lunar Module in lunar orbit, starting its descent',
      'the powered descent over bright cratered highlands',
      'touchdown in the highlands',
      'two astronauts driving the Lunar Roving Vehicle across the highlands away from the Lunar Module',
    ],
    ['undocking', 'powered descent', 'touchdown', 'the rover'],
    ['descent engine', 'Lunar Roving Vehicle', 'highlands'],
    'NASA',
    'lrv-apollo',
  ],
  [
    'apollo17',
    'moon',
    'the Apollo 17 Lunar Module Challenger and its Lunar Roving Vehicle',
    'landing in the Taurus-Littrow valley',
    [
      'the Lunar Module in lunar orbit, starting its descent',
      'the powered descent into a broad flat valley floor between tall rounded mountains on both sides',
      'touchdown on the valley floor',
      'two astronauts with the Lunar Roving Vehicle beside a large boulder, a patch of orange soil at their feet',
    ],
    ['undocking', 'powered descent', 'touchdown', 'the rover'],
    ['descent engine'],
    'NASA',
    'lrv-apollo',
  ],
  [
    'change3',
    'moon',
    "the Chinese Chang'e 3 lander and its Yutu rover",
    'arriving in the Sea of Rains',
    [
      'the lander in lunar orbit',
      'the powered descent on its throttled engine',
      'hovering about 100 metres up to pick a safe spot, then touching down on four legs',
      'the same single lander standing on the ground while the small six-wheeled Yutu rover rolls down its ramp onto the surface, the two craft photographing each other',
    ],
    ['lunar orbit', 'descent', 'hover', 'Yutu'],
    ['throttled engine', 'ramp', 'Yutu'],
    'CNSA',
    'change-3',
  ],
  [
    'change4',
    'moon',
    "the Chinese Chang'e 4 lander and its Yutu-2 rover",
    'arriving on the far side of the Moon in Von Kármán crater',
    [
      'the lander in lunar orbit over the far side, a relay satellite beyond the Moon passing its signals to Earth',
      'the steep powered descent into the crater',
      'hovering to pick a safe spot, then touching down on four legs',
      'the Yutu-2 rover rolling down a ramp onto the far side, its tracks behind it',
    ],
    ['lunar orbit', 'descent', 'hover', 'Yutu-2'],
    ['relay link', 'ramp', 'Yutu-2'],
    'CNSA',
    'change-4',
  ],
  [
    'change5',
    'moon',
    "the Chinese Chang'e 5 sample-return lander",
    'arriving near Mons Rümker in the Ocean of Storms',
    [
      'the lander and its ascender in lunar orbit',
      'the powered descent on its throttled engine',
      'standing on its legs, a scoop arm and a drill collecting soil',
      'the small boxy ascender, which has no solar wings, lifting off from the top of the lander with the samples, a Chinese flag left on the lander',
    ],
    ['lunar orbit', 'descent', 'sampling', 'liftoff'],
    ['scoop arm', 'drill', 'ascender'],
    'CNSA',
    'change-5',
  ],
  [
    'change6',
    'moon',
    "the Chinese Chang'e 6 sample-return lander",
    'arriving in Apollo crater on the far side of the Moon',
    [
      'the lander in lunar orbit over the far side, a relay satellite passing its signals to Earth',
      'the powered descent into the crater',
      'standing on its legs, a scoop arm and a drill collecting far-side soil',
      'the small ascender lifting off from the top of the lander with the first samples from the far side',
    ],
    ['lunar orbit', 'descent', 'sampling', 'liftoff'],
    ['relay link', 'drill', 'ascender'],
    'CNSA',
    'change6',
  ],
  [
    'chandrayaan3',
    'moon',
    'the Indian Chandrayaan-3 lander Vikram and its rover Pragyan',
    'arriving in the south polar region of the Moon',
    [
      'the lander in lunar orbit',
      'the braking descent on four throttled engines',
      'hovering to check the ground, then touching down on four legs',
      'the six-wheeled Pragyan rover rolling down a ramp onto the surface, its tracks behind it',
    ],
    ['lunar orbit', 'braking', 'touchdown', 'Pragyan'],
    ['throttled engines', 'ramp', 'Pragyan'],
    'ISRO',
    'vikram-cy3',
  ],
  [
    'slim',
    'moon',
    'the Japanese SLIM lander',
    'arriving beside Shioli crater',
    [
      'the lander descending while matching camera images of craters to its map, aiming within 100 metres',
      'one of its two main engines losing its nozzle in the last metres',
      'the lander coming to rest on its nose, tipped over on the slope',
      'a tiny released rover photographing the upside-down lander from the ground',
    ],
    ['vision navigation', 'engine lost', 'touchdown', 'on its nose'],
    ['crater map', 'tiny rover', 'Shioli crater'],
    'JAXA',
    'slim',
  ],
  [
    'change7',
    'moon',
    "the planned Chinese Chang'e 7 lander, rover and hopping probe",
    'arriving at the rim of Shackleton crater at the lunar south pole',
    [
      'the orbiter and lander in lunar orbit over the south pole, long shadows',
      'the powered descent toward a sunlit crater rim',
      'touchdown on the rim beside the dark crater, a rover rolling off',
      'a small hopping probe jumping down into the permanently shadowed crater to look for water ice',
    ],
    ['lunar orbit', 'descent', 'touchdown', 'into the shadow'],
    ['crater rim', 'hopper', 'water ice?'],
    'CNSA',
    null,
  ],
  [
    'artemis4',
    'moon',
    'the planned Artemis IV crewed landing with a tall Starship lander',
    'at the lunar south pole',
    [
      'the tall stainless-steel Starship lander in lunar orbit above the south pole, long shadows',
      'the powered descent on thrusters high on its side, the surface close below',
      'touchdown on its landing legs in low sunlight',
      'two astronauts coming down in the elevator from the crew cabin high above to the surface',
    ],
    ['lunar orbit', 'descent', 'touchdown', 'on the surface'],
    ['crew elevator', 'landing legs', 'south pole'],
    // Starship: SpaceX is the main mark, NASA only as the commissioning agency — or none
    // (operator 2026-11-06). The model painted NASA alone, so this sheet carries no logos.
    null,
    null,
  ],
  [
    'beresheet',
    'moon',
    'the Israeli Beresheet lander',
    'arriving at the Sea of Serenity',
    [
      'the small lander in lunar orbit',
      'the braking descent low over the grey plain, its main engine firing, the Earth small in the black sky',
      'the main engine cutting out a few kilometres up after a guidance fault',
      'the lander smashed to pieces on the ground, bent legs and broken panels scattered around a dark impact scar',
    ],
    ['lunar orbit', 'descent', 'engine cut-out', 'impact'],
    ['main engine'],
    'SpaceIL / IAI',
    'beresheet',
  ],
  [
    'mars2',
    'mars',
    'the Soviet Mars 2 descent capsule',
    'arriving at Mars',
    [
      'the capsule separating from the Mars 2 orbiter, a cylindrical spacecraft with two flat solar panels and a large dish antenna',
      'entering the atmosphere too steeply, heat shield glowing',
      'the parachute failing to open in time',
      'the capsule striking the surface, the first human-made object on Mars, the orbiter still overhead',
    ],
    ['separation', 'steep entry', 'parachute failure', 'impact'],
    ['heat shield', 'parachute', 'orbiter'],
    'USSR',
    'mars-2',
  ],
  [
    'mars3',
    'mars',
    'the Soviet Mars 3 lander',
    'arriving in Ptolemaeus crater',
    [
      'the capsule entering the Martian atmosphere heat shield first, a dust storm on the planet',
      'the parachute open',
      'the parachute cut away just above the ground while a small braking rocket fires beneath the spherical lander, which drops the last metres',
      'the lander with its four petals open, the tiny PrOP-M rover beside it on a cable, sending a signal that stopped after about 20 seconds',
    ],
    ['entry', 'parachute', 'retro-rocket', 'petals open'],
    ['PrOP-M', '20 seconds'],
    'USSR',
    'mars-3',
  ],
  [
    'mars6',
    'mars',
    'the Soviet Mars 6 lander',
    'arriving in Margaritifer Terra',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, the lander radioing measurements of the atmosphere on the way down',
      'retro-rockets firing just above the ground',
      'the signal lost at the moment of landing, a question mark over the lander',
    ],
    ['entry', 'parachute', 'retro-rocket', 'signal lost'],
    ['parachute', 'radio link', 'retro-rocket'],
    'USSR',
    'mars6',
  ],
  [
    'viking1-lander',
    'mars',
    'the NASA Viking 1 lander',
    'landing in Chryse Planitia',
    [
      'the lander inside its aeroshell entering the Martian atmosphere',
      'the parachute open, the aeroshell dropped away, the legs swinging down',
      'three terminal descent engines firing just above the ground, then touchdown on three footpads',
      'the lander on the rocky plain, its first picture of its own footpad, the sampling arm out',
    ],
    ['entry', 'parachute', 'touchdown', 'first picture'],
    ['aeroshell', 'terminal engines', 'sampling arm'],
    'NASA',
    'viking-1',
  ],
  [
    'viking2-lander',
    'mars',
    'the NASA Viking 2 lander',
    'landing in Utopia Planitia',
    [
      'the lander inside its aeroshell entering the Martian atmosphere',
      'the parachute open, the aeroshell dropped away, the legs swinging down',
      'three terminal descent engines firing just above the ground, then touchdown on three footpads',
      'the lander on the rocky plain, thin white frost on the ground around it in winter',
    ],
    ['entry', 'parachute', 'touchdown', 'winter frost'],
    ['terminal engines'],
    'NASA',
    'viking2-lander',
  ],
  [
    'mars-pathfinder',
    'mars',
    'the NASA Mars Pathfinder lander and its Sojourner rover',
    'landing in Ares Vallis',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, rockets in the back shell firing as a cluster of airbags inflates around the lander',
      'the airbag ball bouncing many times across the rocky plain',
      'the airbags pulled in and the flat tetrahedral lander, which has no wheels, opened like a flower with three triangular petals lying flat on the ground; the small six-wheeled Sojourner rover, the only thing with wheels, rolling down a ramp to a rock',
    ],
    ['entry', 'parachute', 'airbags', 'Sojourner'],
    ['airbags', 'petals', 'Sojourner'],
    'NASA JPL',
    'sojourner',
  ],
  [
    'beagle2',
    'mars',
    'the British Beagle 2 lander',
    'landing in Isidis Planitia',
    [
      'the small capsule entering the Martian atmosphere',
      'the parachutes open, airbags inflating',
      'the airbag ball bouncing onto the plain, then released',
      'the round lander with its lid lifted like a pocket watch, but only two round solar panels spread out on one side while the other two lie stacked shut on top of the lid, covering the radio antenna, so it could not call home',
    ],
    ['entry', 'parachutes', 'airbags', 'not unfolded'],
    ['pocket watch'],
    'ESA / UK',
    'beagle2',
  ],
  [
    'spirit',
    'mars',
    'the NASA Spirit rover',
    'landing in Gusev crater',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, the lander lowered on a long tether, airbags inflating, back-shell rockets firing',
      'the airbag ball bouncing across the crater floor',
      'the lander petals open and the six-wheeled rover driving off onto the plain',
    ],
    ['entry', 'parachute', 'airbags', 'drive-off'],
    ['tether', 'airbags', 'petals'],
    'NASA JPL',
    'spirit',
  ],
  [
    'opportunity',
    'mars',
    'the NASA Opportunity rover',
    'landing in Meridiani Planum',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, the lander lowered on a long tether, airbags inflating, back-shell rockets firing',
      'the airbag ball bouncing and rolling into a small crater, a hole in one',
      'the six-wheeled rover driving off the lander inside the small crater, layered bedrock in its wall',
    ],
    ['entry', 'parachute', 'airbags', 'hole in one'],
    ['tether', 'airbags', 'Eagle crater'],
    'NASA JPL',
    'opportunity',
  ],
  [
    'phoenix',
    'mars',
    'the NASA Phoenix lander',
    'landing on the northern plains of Mars',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, seen from orbit by a camera far above',
      'pulsed descent thrusters firing, then touchdown on three legs on patterned polar ground',
      'the lander with its round solar arrays open, its robotic arm digging a trench to white ice below the soil',
    ],
    ['entry', 'parachute', 'touchdown', 'ice'],
    ['pulsed thrusters', 'robotic arm', 'ice'],
    'NASA JPL',
    'phoenix',
  ],
  [
    'curiosity',
    'mars',
    "NASA's Curiosity Mars rover",
    'arriving at Gale Crater',
    [
      'the capsule entering the thin Martian atmosphere heat shield first, a glowing plasma trail',
      'the supersonic parachute open above the back shell, the round heat shield dropping away below with its label arrow pointing at that falling disc',
      'the rocket-powered descent stage hovering, lowering the rover beneath it on three cables, dust blown from the ground',
      'the rover standing on its six wheels on the crater floor, the descent stage flying off to crash far away, Mount Sharp on the horizon',
    ],
    ['entry', 'parachute', 'sky crane', 'touchdown'],
    ['21.5 m parachute', 'heat shield', 'cables', 'Mount Sharp'],
    'NASA JPL',
    'curiosity',
  ],
  [
    'schiaparelli',
    'mars',
    'the European Schiaparelli lander',
    'arriving in Meridiani Planum',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, then released far too early after a sensor fault',
      'its thrusters firing only for a moment, the lander falling free',
      'the lander smashed to pieces on impact, broken parts scattered around a dark scar in the ground',
    ],
    ['entry', 'parachute', 'free fall', 'impact'],
    [],
    'ESA',
    'schiaparelli',
  ],
  [
    'insight',
    'mars',
    'the NASA InSight lander',
    'landing in Elysium Planitia',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'the parachute open, the legs swinging down',
      'pulsed descent thrusters firing, then touchdown on three legs on a smooth plain',
      'the lander with its two round solar arrays open, its arm setting a domed seismometer on the ground beside it',
    ],
    ['entry', 'parachute', 'touchdown', 'seismometer'],
    ['pulsed thrusters', 'robotic arm', 'seismometer'],
    'NASA JPL',
    'insight',
  ],
  [
    'perseverance',
    'mars',
    "NASA's Perseverance Mars rover",
    'arriving in Jezero crater',
    [
      'the capsule entering the Martian atmosphere heat shield first, a glowing plasma trail',
      'the parachute open, a camera matching the ground below to its map to choose a safe spot',
      'the rocket-powered descent stage lowering the rover on three cables, dust blown from the ground',
      'the rover on the crater floor near an old river delta, the small Ingenuity helicopter flying nearby',
    ],
    ['entry', 'parachute', 'sky crane', 'Jezero'],
    ['terrain map', 'cables', 'Ingenuity'],
    'NASA JPL',
    'perseverance',
  ],
  [
    'zhurong',
    'mars',
    'the Chinese Tianwen-1 lander and its Zhurong rover',
    'landing in Utopia Planitia',
    [
      'the entry capsule entering the Martian atmosphere heat shield first',
      'the parachute open, the heat shield dropping away',
      'the landing platform hovering on its engine to pick a safe spot, then touching down on four legs',
      'the six-wheeled Zhurong rover with its butterfly-wing solar panels rolling down a ramp onto the plain',
    ],
    ['entry', 'parachute', 'hover', 'Zhurong'],
    ['parachute', 'landing platform', 'Zhurong'],
    'CNSA',
    'zhurong',
  ],
  [
    'exomars-rosalind-franklin',
    'mars',
    'the planned European Rosalind Franklin rover',
    'arriving at Oxia Planum',
    [
      'the capsule entering the Martian atmosphere heat shield first',
      'large parachutes open, the heat shield dropping away',
      'the squat four-legged landing platform with the rover riding folded on top of it, firing throttled engines just above the ground, then touching down on its legs',
      'the six-wheeled rover driving down a ramp off the platform, its drill ready to reach two metres below the surface',
    ],
    ['entry', 'parachutes', 'touchdown', 'drive-off'],
    ['parachutes', 'landing platform', '2 m drill'],
    'ESA',
    'exomars-rosalind-franklin',
  ],
  [
    'venera-13',
    'venus',
    'the Soviet Venera 13 lander',
    'arriving on Venus',
    [
      'the round entry sphere plunging into the thick yellow clouds of Venus, heat shield glowing',
      'parachutes open high up, then dropped; the lander falling through the dense air braked by a metal disc around it',
      'touchdown on its crushable ring on flat rocks, at a heat that melts lead',
      'the lander taking a colour panorama through its windows and drilling a soil sample, working for 127 minutes',
    ],
    ['entry', 'braking disc', 'touchdown', '127 minutes'],
    [],
    'USSR',
    'venera-13',
  ],
  [
    'vega-1',
    'venus',
    'the Soviet Vega 1 lander and balloon',
    'arriving at Venus',
    [
      "the descent capsule separating from the spacecraft, which flies on toward Halley's comet",
      'a small balloon released in the clouds about 54 km up, drifting with the wind',
      'the lander falling through the thick air below the clouds, braked by a metal disc',
      'the lander on the surface, the balloon still drifting high above',
    ],
    ['separation', 'balloon', 'descent', 'touchdown'],
    ['to Halley'],
    'USSR',
    'vega-1',
  ],
  [
    'vega-2',
    'venus',
    'the Soviet Vega 2 lander and balloon',
    'arriving at Venus',
    [
      "the descent capsule separating from the spacecraft, which flies on toward Halley's comet",
      'a small balloon released in the clouds about 54 km up, drifting with the wind',
      'the lander falling through the thick air below the clouds, braked by a metal disc',
      'the lander on the surface drilling a soil sample, the balloon still drifting high above',
    ],
    ['separation', 'balloon', 'descent', 'drilling'],
    ['to Halley'],
    'USSR',
    'vega-2',
  ],
];

export function request(
  [site, body, craft, arrival, stages, titles, allNotes, agency, anatomy],
  generations,
) {
  // A note that repeats a stage title gets written twice (2026-11-06 Opportunity sheet).
  const said = titles.join(' ').toLowerCase();
  const notes = allNotes.filter(
    (n) =>
      !said.includes(n.toLowerCase()) &&
      !titles.some((t) => n.toLowerCase().includes(t.toLowerCase())),
  );
  const ref = anatomy && generations[`anatomy/${anatomy}`]?.generation_id;
  const prompt =
    `Technical landing-sequence illustration of ${craft} ${arrival}, four stages left to right joined by one dotted descent trajectory, watercolor and ink-wash on faint graph paper — ` +
    stages.map((s, i) => `${['first', 'then', 'next', 'finally'][i]} ${s}`).join('; ') +
    `. Four handwritten titles in one row along the top edge, one above each stage, each written once: ${titles.join(', ')}. ` +
    (notes.length
      ? `Few annotations, each written only once: ${notes.map((n) => `'${n}'`).join(', ')}. `
      : 'No annotations. ') +
    'Write only these words, each exactly once; no other words, no date, no coordinates, no logos, no title box, no second row of titles, no title repeated inside the scene. ' +
    'Each stage shows the craft once: never two copies of the same craft side by side in one stage. ' +
    'Equations in Latin letters and numbers only, no other scripts. ' +
    'A few faint physics equations in the margins, ink-splatter wash clouds, ' +
    `warm muted ${PALETTE[body]} palette, vintage scientific sketchbook / editorial infographic aesthetic. ` +
    (agency
      ? `${agency} markings painted on the craft itself only. `
      : 'No logos, no flags, no agency marks and no lettering anywhere, on the craft or on the paper. ') +
    (agency === 'CNSA'
      ? 'No Chinese characters anywhere, no written mission name on the craft: only the logo and the flag. '
      : '') +
    (stages.some((x) => /cables|sky crane/.test(x))
      ? ''
      : 'no sky crane lowering anything on cables. ') +
    (body === 'moon'
      ? 'The Moon has no air: no parachute, no entry glow, no clouds in the sky. One continuous scene on a single sheet, no separate boxed panels: a band of black sky only above the grey lunar horizon, the faint graph paper showing above it. '
      : '') +
    (stages.some((x) => /mountain|Mount |massif|hill|Mons/.test(x))
      ? ''
      : 'no large mountain on the horizon. ') +
    (ref
      ? "The first reference is a wordless guide to the layout and the style; the second shows the craft — draw this craft as it looks there, but do not copy that drawing's layout or text."
      : 'The reference is a wordless guide to the layout and the style; do not copy its craft.');
  const medias = [{ value: ANCHOR, role: 'image_references' }];
  if (ref) medias.push({ value: ref, role: 'image_references' });
  return { site, body, params: { model: 'nano_banana_2', aspect_ratio: '3:2', prompt, medias } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gens = JSON.parse(readFileSync('scripts/anatomy/prompts-history.json', 'utf8')).images;
  const only = process.argv[2];
  const out = SITES.filter((s) => !only || s[0] === only).map((s) => request(s, gens));
  console.log(JSON.stringify(out, null, 2));
}
