// Exploded cutaways of the landed craft (#641, plan item 1d), in the launcher exploded house
// style (docs/guides/launcher-cutaway-style.md): assembled to scale at far left beside a 1.8 m
// figure, the parts pulled apart with leader lines. First reference = an existing exploded
// cutaway (style only: Soyuz, generation d2ff3ba7-5b70-4319-96ea-bfa28b3f236d); second = the
// craft's own shipped anatomy cutaway (its look). nano_banana_2, 3:2.
//
//   node scripts/anatomy/lander-exploded-2026-11.mjs            # every request
//   node scripts/anatomy/lander-exploded-2026-11.mjs <id> [...] # some
import { readFileSync } from 'node:fs';

export const STYLE_REF = 'd2ff3ba7-5b70-4319-96ea-bfa28b3f236d';

// [anatomy id, craft as named in the prompt, title, height label, [parts…], agency]
export const CRAFT = [
  [
    'luna-9',
    'the Soviet Luna 9 lander',
    'LUNA 9',
    '2.7 m',
    [
      'the spherical landing capsule with its four petals and camera mast',
      'the two inflatable cushions',
      'the cylindrical retro-rocket stage with its main engine',
      'the side compartments jettisoned before braking',
    ],
    'USSR',
  ],
  [
    'luna-16',
    'the Soviet Luna 16 sample-return lander',
    'LUNA 16',
    '4 m',
    [
      'the spherical return capsule',
      'the ascent stage with its tanks and engine',
      'the drill arm',
      'the four-legged descent stage with its spherical tanks',
    ],
    'USSR',
  ],
  [
    'lunokhod-1',
    'the Soviet Lunokhod 1 rover',
    'LUNOKHOD 1',
    '1.35 m',
    [
      'the hinged lid with solar cells on its inside',
      'the pressurised tub-shaped body',
      'the polonium-210 heater',
      'the eight wire-mesh wheels, each with its own motor',
      'the TV cameras and antennas',
    ],
    'USSR',
  ],
  [
    'lunokhod-2',
    'the Soviet Lunokhod 2 rover',
    'LUNOKHOD 2',
    '1.35 m',
    [
      'the hinged lid with solar cells',
      'the pressurised tub-shaped body',
      'the raised third TV camera',
      'the eight wire-mesh wheels',
      'the laser reflector',
    ],
    'USSR',
  ],
  [
    'luna24',
    'the Soviet Luna 24 sample-return lander',
    'LUNA 24',
    '4 m',
    [
      'the spherical return capsule',
      'the ascent stage',
      'the 2.6 m drill',
      'the four-legged descent stage',
    ],
    'USSR',
  ],
  [
    'apollo-lm',
    'the Apollo Lunar Module',
    'APOLLO LUNAR MODULE',
    '7 m',
    [
      'the ascent stage with the crew cabin, windows and docking hatch',
      'the ascent engine',
      'the octagonal gold-foil descent stage',
      'the throttleable descent engine',
      'the four landing legs with footpads and contact probes',
    ],
    'NASA',
  ],
  [
    'lrv-apollo',
    'the Apollo Lunar Roving Vehicle',
    'LUNAR ROVING VEHICLE',
    '1.1 m',
    [
      'the high-gain dish antenna and TV camera',
      'the two seats and the control console',
      'the folding aluminium chassis',
      'the four wire-mesh wheels with their hub motors',
      'the silver-zinc batteries',
    ],
    'NASA',
  ],
  [
    'change-3',
    "the Chinese Chang'e 3 lander",
    "CHANG'E 3",
    '3.4 m',
    [
      'the box-shaped lander body with its instruments',
      'the solar wings',
      'the throttleable main engine',
      'the four landing legs',
      'the ramp, folded',
    ],
    'CNSA',
  ],
  [
    'yutu',
    'the Chinese Yutu rover',
    'YUTU',
    '1.5 m',
    [
      'the two folding solar wings',
      'the mast with cameras',
      'the box-shaped body',
      'the robotic arm',
      'the six wheels on rocker-bogies',
    ],
    'CNSA',
  ],
  [
    'change-4',
    "the Chinese Chang'e 4 lander",
    "CHANG'E 4",
    '3.4 m',
    [
      'the box-shaped lander body',
      'the solar wings',
      'the main engine',
      'the four landing legs',
      'the ramp and the rover mount',
    ],
    'CNSA',
  ],
  [
    'yutu-2',
    'the Chinese Yutu-2 rover',
    'YUTU-2',
    '1.5 m',
    [
      'the two folding solar wings',
      'the mast with cameras',
      'the box-shaped body',
      'the ground-penetrating radar',
      'the six wheels on rocker-bogies',
    ],
    'CNSA',
  ],
  [
    'change-5',
    "the Chinese Chang'e 5 lander and ascender",
    "CHANG'E 5",
    '4 m',
    [
      'the boxy ascender with the sample container, mounted on top',
      'the scoop arm',
      'the drill',
      'the lander body with its main engine',
      'the four landing legs and solar wings',
    ],
    'CNSA',
  ],
  [
    'change6',
    "the Chinese Chang'e 6 lander and ascender",
    "CHANG'E 6",
    '4 m',
    [
      'the boxy ascender on top',
      'the scoop arm',
      'the drill',
      'the lander body with its main engine',
      'the four landing legs and solar wings',
    ],
    'CNSA',
  ],
  [
    'vikram-cy3',
    'the Indian Vikram lander of Chandrayaan-3',
    'VIKRAM',
    '2 m',
    [
      'the box-shaped body with its solar panel',
      'the four throttleable engines',
      'the four landing legs',
      'the ramp',
      'the Pragyan rover folded inside',
    ],
    'ISRO',
  ],
  [
    'pragyan',
    'the Indian Pragyan rover',
    'PRAGYAN',
    '0.9 m',
    [
      'the single solar panel',
      'the twin navigation cameras',
      'the box-shaped body with two spectrometers',
      'the six wheels on rocker-bogies',
    ],
    'ISRO',
  ],
  [
    'slim',
    'the Japanese SLIM lander',
    'SLIM',
    '2.4 m',
    [
      'the two main engines',
      'the propellant tanks',
      'the crushable landing legs',
      'the solar cells',
      'the two tiny rovers LEV-1 and LEV-2',
    ],
    'JAXA',
  ],
  [
    'beresheet',
    'the Israeli Beresheet lander',
    'BERESHEET',
    '1.5 m',
    [
      'the round top deck with solar panels',
      'the spherical propellant tanks',
      'the main engine',
      'the four landing legs',
      'the time-capsule disc',
    ],
    'SpaceIL / IAI',
  ],
  [
    'mars-2',
    'the Soviet Mars 2 descent capsule',
    'MARS 2',
    '1.2 m',
    [
      'the conical aeroshell',
      'the parachute container',
      'the spherical lander with its petals',
      'the PrOP-M rover on its cable',
    ],
    'USSR',
  ],
  [
    'mars-3',
    'the Soviet Mars 3 lander',
    'MARS 3',
    '1.2 m',
    [
      'the conical aeroshell',
      'the parachute container and braking rocket',
      'the spherical lander with four petals',
      'the PrOP-M rover on its cable',
    ],
    'USSR',
  ],
  [
    'mars6',
    'the Soviet Mars 6 lander',
    'MARS 6',
    '1.2 m',
    [
      'the conical aeroshell',
      'the parachute container and retro-rockets',
      'the spherical lander with its petals',
    ],
    'USSR',
  ],
  [
    'viking-1',
    'the NASA Viking 1 lander',
    'VIKING 1 LANDER',
    '2.1 m',
    [
      'the aeroshell and back shell',
      'the hexagonal body',
      'the two RTG power units',
      'the sampling arm',
      'the three legs and the three terminal descent engines',
      'the dish antenna',
    ],
    'NASA',
  ],
  [
    'viking2-lander',
    'the NASA Viking 2 lander',
    'VIKING 2 LANDER',
    '2.1 m',
    [
      'the aeroshell and back shell',
      'the hexagonal body',
      'the two RTG power units',
      'the sampling arm',
      'the three legs',
      'the dish antenna',
    ],
    'NASA',
  ],
  [
    'sojourner',
    'the Mars Pathfinder lander and its Sojourner rover',
    'MARS PATHFINDER',
    '1 m',
    [
      'the flat tetrahedral lander with its three triangular solar petals',
      'the cluster of airbags',
      'the camera mast',
      'the small six-wheeled Sojourner rover',
    ],
    'NASA JPL',
  ],
  [
    'beagle2',
    'the British Beagle 2 lander',
    'BEAGLE 2',
    '0.7 m',
    [
      'the shallow round base',
      'the lid',
      'the four round solar panels',
      'the robotic arm with its instrument head',
      'the mole',
    ],
    'ESA / UK',
  ],
  [
    'spirit',
    'the NASA Spirit rover',
    'SPIRIT',
    '1.5 m',
    [
      'the solar-cell deck',
      'the camera mast',
      'the robotic arm with its instruments',
      'the warm electronics box',
      'the six wheels on rocker-bogies',
    ],
    'NASA JPL',
  ],
  [
    'opportunity',
    'the NASA Opportunity rover',
    'OPPORTUNITY',
    '1.5 m',
    [
      'the solar-cell deck',
      'the camera mast',
      'the robotic arm with its instruments',
      'the warm electronics box',
      'the six wheels on rocker-bogies',
    ],
    'NASA JPL',
  ],
  [
    'phoenix',
    'the NASA Phoenix lander',
    'PHOENIX',
    '2.2 m',
    [
      'the two round solar arrays',
      'the deck with its science instruments',
      'the robotic arm with its scoop',
      'the meteorology mast',
      'the three legs and pulsed thrusters',
    ],
    'NASA JPL',
  ],
  [
    'curiosity',
    'the NASA Curiosity rover',
    'CURIOSITY',
    '2.2 m',
    [
      'the mast with ChemCam and cameras',
      'the robotic arm with the drill',
      'the MMRTG nuclear power unit at the rear',
      'the body with its labs',
      'the six wheels on rocker-bogies',
    ],
    'NASA JPL',
  ],
  [
    'schiaparelli',
    'the European Schiaparelli lander',
    'SCHIAPARELLI',
    '1.8 m',
    [
      'the front heat shield',
      'the back cover and parachute',
      'the crushable platform',
      'the hydrazine thrusters',
      'the small science payload',
    ],
    'ESA',
  ],
  [
    'insight',
    'the NASA InSight lander',
    'INSIGHT',
    '1 m',
    [
      'the two round solar arrays',
      'the deck',
      'the robotic arm',
      'the domed seismometer',
      'the heat probe',
      'the three legs',
    ],
    'NASA JPL',
  ],
  [
    'perseverance',
    'the NASA Perseverance rover',
    'PERSEVERANCE',
    '2.2 m',
    [
      'the mast with SuperCam and cameras',
      'the robotic arm with its turret',
      'the sample tubes',
      'the MMRTG at the rear',
      'the Ingenuity helicopter',
      'the six wheels on rocker-bogies',
    ],
    'NASA JPL',
  ],
  [
    'zhurong',
    'the Chinese Zhurong rover',
    'ZHURONG',
    '1.85 m',
    [
      'the butterfly-wing solar panels',
      'the mast with cameras',
      'the body with its instruments',
      'the six wheels on active suspension',
    ],
    'CNSA',
  ],
  [
    'exomars-rosalind-franklin',
    'the European Rosalind Franklin rover',
    'ROSALIND FRANKLIN',
    '2 m',
    [
      'the mast with its cameras',
      'the drill box that reaches 2 m',
      'the analytical lab inside',
      'the solar wings',
      'the six wheels',
    ],
    'ESA',
  ],
  [
    'venera-13',
    'the Soviet Venera 13 lander',
    'VENERA 13',
    '1.5 m',
    [
      'the heat-shield sphere halves',
      'the braking disc',
      'the pressure sphere with its windows',
      'the crushable landing ring',
      'the drill and camera',
    ],
    'USSR',
  ],
  [
    'vega-1',
    'the Soviet Vega 1 descent capsule',
    'VEGA 1',
    '2.4 m',
    [
      'the entry sphere halves',
      'the balloon with its gondola',
      'the braking disc',
      'the lander pressure sphere',
      'the crushable landing ring',
    ],
    'USSR',
  ],
  [
    'vega-2',
    'the Soviet Vega 2 descent capsule',
    'VEGA 2',
    '2.4 m',
    [
      'the entry sphere halves',
      'the balloon with its gondola',
      'the braking disc',
      'the lander pressure sphere with its drill',
      'the crushable landing ring',
    ],
    'USSR',
  ],
];

export function request([id, craft, title, height, parts, agency], generations) {
  const ref = generations[`anatomy/${id}`]?.generation_id;
  if (!ref) throw new Error(`no anatomy generation for ${id}`);
  const prompt =
    `Exploded technical cutaway illustration of ${craft}, watercolor and ink-wash on faint aged graph paper, exposed internal structure. ` +
    `At far left one single small assembled drawing of the craft to scale beside a tiny unlabelled human silhouette marked '1.8 m', with a '${height}' dimension line. ` +
    `The parts pulled apart diagonally with thin ruled leader lines: ${parts.join('; ')}. ` +
    `Handwritten title at the top left: '${title} — EXPLODED'. Short handwritten labels in English on the parts: every label written exactly once, never two labels with the same words, one drawing of each part. The only dimensions written are '${height}' and '1.8 m'. Equations in Latin letters and numbers only, no other scripts. ` +
    'No logos, stamps, seals or copyright marks on the paper or in the corners. ' +
    'Faint physics equations in the margins, ink-splatter wash clouds, warm muted metallic palette (brass, steel, copper on cream paper), ' +
    `vintage scientific sketchbook / editorial infographic aesthetic. ${agency} markings on the craft only. ` +
    (agency === 'CNSA' ? 'No Chinese characters anywhere. ' : '') +
    'The first reference shows only the style: do not copy its rocket, its words, its stamp or its markings. ' +
    'The second reference shows this craft: draw its parts as they look there. ' +
    'A warm hand-painted sketchbook cutaway — not a flat vector chart, not photorealistic.';
  return {
    id,
    params: {
      model: 'nano_banana_2',
      aspect_ratio: '3:2',
      prompt,
      medias: [
        { value: STYLE_REF, role: 'image_references' },
        { value: ref, role: 'image_references' },
      ],
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gens = JSON.parse(readFileSync('scripts/anatomy/prompts-history.json', 'utf8')).images;
  const only = process.argv.slice(2);
  console.log(
    JSON.stringify(
      CRAFT.filter((c) => !only.length || only.includes(c[0])).map((c) => request(c, gens)),
      null,
      2,
    ),
  );
}
