/**
 * Writes scripts/anatomy/batch-2026-10-23.json — the 62 cutaways generated on
 * 2026-10-23 (4 pencil anatomy, 41 watercolor anatomy, 17 exploded launchers).
 *
 *   node scripts/anatomy/build-batch-2026-10-23.mjs
 *
 * Every prompt is one of the house templates copied verbatim from the shipped set
 * (scripts/anatomy/prompts-history.json) with only the bracketed parts swapped:
 * - pencil: the 2026-08-02 backfill prompts (atlas-lv-3b …), 2:3, 2k, the same
 *   style reference image they used (media 1191305d…).
 * - watercolor: the 2026-06-22 prompts (voyager-2, cassini …), 3:2. The shipped
 *   set used no reference; here a shipped watercolor of the SAME LAYOUT is passed
 *   as a style reference, with a closing clause to copy only its style.
 * - exploded: the 2026-08-02 recipe (docs/guides/launcher-cutaway-style.md): the
 *   structural sketch as reference for tandem stacks; for the manual exceptions the
 *   closest shipped exploded cutaway of the same family plus the prose structure.
 *
 * Pilot 2026-10-23: a reference passes on CONTENT, not just style. Falcon Heavy on
 * the Saturn V anchor drew S-IC / J-2 / LH2 / a Lunar Module; Giotto on Rosetta grew
 * Rosetta's solar wings. Hence same-layout references and "style only" clauses.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { EXPLODED_SPECS } from './exploded-specs.mjs';

const history = JSON.parse(readFileSync('scripts/anatomy/prompts-history.json', 'utf8')).images;
const job = (path) => {
  const g = history[path];
  if (!g) throw new Error(`no shipped generation for ${path}`);
  return g.generation_id;
};

const PENCIL_REF = '1191305d-f91f-41fc-b5ac-8b1f1966a646';
// Manual exceptions: the closest shipped exploded cutaway of the same family.
const MANUAL_REF = {
  'atlas-slv-3d': 'anatomy-exploded/atlas-lv-3b',
  energia: 'anatomy-exploded/space-shuttle-stack',
  'falcon-heavy': 'anatomy-exploded/falcon-9',
  n1: 'anatomy-exploded/saturn-v',
  'proton-m': 'anatomy-exploded/proton-k',
  'r-7-vostok': 'anatomy-exploded/soyuz',
  'sls-block-1': 'anatomy-exploded/space-shuttle-stack',
  'soyuz-2': 'anatomy-exploded/soyuz',
  'soyuz-fg': 'anatomy-exploded/soyuz',
  'soyuz-u': 'anatomy-exploded/soyuz',
};
// The structural sketches below, uploaded to Higgsfield 2026-10-23.
const SKETCH_MEDIA = {
  antares: '663e9d46-b805-47a1-a554-d3a444b9f4a2',
  'ariane-6': '9792dacc-a59a-4985-8529-0421fde144cb',
  'delta-ii': '9dceb42c-edbe-4d80-bf57-bb3aae8391ea',
  'long-march-7': '65036f51-cc9f-4cbf-a0a1-651cb9147cb0',
  'new-glenn': '117a089a-beca-40b8-acd5-173e65e2ba84',
  'pslv-xl': 'd9bacb0a-384c-462c-9240-3cf95eb2f63b',
  vulcan: '32340966-81ff-4ba1-a385-d72e80843691',
};

// ── pencil anatomy (launchers) ──────────────────────────────────────────────
const pencil = (craft, structure) =>
  `Loose hand-drawn pencil sketch of the ${craft} rocket, vertical, on white sketchbook paper. Graphite shading, expressive cross-hatching, rough artistic linework, monochrome grey, engineering concept sketch. ${structure} A few sketchy handwritten labels.`;

const PENCIL = {
  'atlas-slv-3d': pencil(
    'Atlas SLV-3D Centaur',
    'Stage-and-a-half stainless-steel balloon-tank Atlas booster: two outboard LR89 booster engines in a jettisonable skirt at the base, a central LR105 sustainer engine, two small vernier thrusters — a single slim cylinder with no strap-on boosters (the booster engines sit in a short skirt flush around its base) — topped by the slimmer Centaur D upper stage with two RL10 engines, capped by a tall bulbous payload fairing.',
  ),
  'r-7-vostok': pencil(
    'original R-7 Semyorka (8K71PS, the Sputnik launcher)',
    'A central core stage (Blok-A) surrounded at its base by four tapering conical strap-on boosters forming the classic Korolev cross, each booster and the core ending in multi-nozzle engines, with no upper stage at all: a small conical nose fairing sits directly on the core, with the polished Sputnik 1 sphere and its four whip antennas.',
  ),
  'soyuz-fg': pencil(
    'Soyuz-FG',
    'A central core stage (Blok-A) surrounded at its base by four tapering conical strap-on boosters forming the classic Korolev cross, each booster and the core ending in multi-nozzle engines, a cylindrical Blok-I upper stage above, capped by the crewed Soyuz spacecraft shroud with its slender launch-escape tower on top.',
  ),
  'soyuz-u': pencil(
    'Soyuz-U',
    'A central core stage (Blok-A) surrounded at its base by four tapering conical strap-on boosters forming the classic Korolev cross, each booster and the core ending in multi-nozzle engines, a cylindrical Blok-I upper stage above, capped by a payload shroud over a Progress cargo ship.',
  ),
};

// ── watercolor anatomy (payload craft) ──────────────────────────────────────
// Sister craft of the shipped reference (same airframe or bus family): keep its
// layout. Everything else: take only the style (see the pilot note above).
const SISTER = new Set([
  'atlantis',
  'challenger',
  'columbia',
  'discovery',
  'endeavour',
  'enterprise',
  'buran-ok-gli',
  'soyuz-7k-ok',
  'soyuz-t',
  'soyuz-tm',
  'voskhod',
  'apollo-csm-block-i',
  'progress-7k-tg',
  'mars-2',
  'mars6',
  'vikram-cy2',
  'luna24',
  'change6',
  'viking2-lander',
  // salyut-2 is NOT a sister here: on Salyut 1 as a sister reference it kept the
  // docked Soyuz twice (QC 2026-10-23), though no crew ever reached it.
  'salyut-3',
  'salyut-4',
  'salyut-5',
]);
const styleClause = (craft, sister) =>
  sister
    ? `Match the reference image's art style and overall layout exactly (paper, ink-wash, palette, annotation hand) — it shows a sister craft of the same family; change only the details described above and the name, so the drawing is ${craft}.`
    : `Match the reference image's art style exactly (paper, ink-wash, palette, annotation hand), but the reference shows a different craft: do NOT copy its shape, parts, text or markings — draw only ${craft}, exactly as described.`;
const watercolor = (
  craft,
  parts,
  markings,
  refPath,
  palette = 'warm muted metallic palette',
  sister = false,
) =>
  `Technical cutaway illustration of ${craft}, watercolor and ink-wash on faint graph paper, exposed internal structure — ${parts}. Handwritten engineering annotations, dimension lines, faint physics equations in the margins, ink-splatter wash clouds, ${palette}, vintage scientific sketchbook / editorial infographic aesthetic. ${markings} markings. ${styleClause(craft, sister)}`;

const shuttleParts = (extra) =>
  `payload bay${extra.bay ? ` ${extra.bay}` : ''}, ${extra.engines ?? 'three main engines'}, OMS pods, crew flight deck, RCS thrusters, delta wing spars${extra.more ? `, ${extra.more}` : ''}`;

const W = {
  atlantis: [
    'the NASA Space Shuttle orbiter Atlantis (OV-104)',
    shuttleParts({
      bay: 'with the external airlock and orbiter docking system',
      more: "black and white thermal tiles, 'ATLANTIS' lettering on the fuselage",
    }),
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  challenger: [
    'the NASA Space Shuttle orbiter Challenger (OV-099)',
    shuttleParts({
      bay: 'with a Spacelab module',
      more: "black and white thermal tiles, 'CHALLENGER' lettering on the fuselage",
    }),
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  columbia: [
    'the NASA Space Shuttle orbiter Columbia (OV-102)',
    shuttleParts({
      more: "the SILTS infrared camera pod on top of the vertical tail, black wing-root chines, the heavier original airframe, 'COLUMBIA' lettering on the fuselage",
    }),
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  discovery: [
    'the NASA Space Shuttle orbiter Discovery (OV-103)',
    shuttleParts({
      bay: 'carrying the Hubble Space Telescope',
      more: "black and white thermal tiles, 'DISCOVERY' lettering on the fuselage",
    }),
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  endeavour: [
    'the NASA Space Shuttle orbiter Endeavour (OV-105)',
    shuttleParts({
      bay: 'carrying the Unity node',
      more: "the drag-chute housing at the base of the vertical tail, black and white thermal tiles, 'ENDEAVOUR' lettering on the fuselage",
    }),
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  enterprise: [
    'the NASA Space Shuttle orbiter Enterprise (OV-101), the atmospheric test prototype',
    "an empty payload bay, a streamlined tail-cone fairing covering the engine section in place of main engines, dummy OMS pods, mock-up thermal panels instead of real tiles, crew flight deck with ejection seats, landing gear down, a small vignette of it riding on the back of the Boeing 747 Shuttle Carrier Aircraft for the 1977 approach and landing tests, 'ENTERPRISE' lettering on the fuselage",
    "'United States' and NASA",
    'anatomy/space-shuttle-orbiter',
  ],
  'buran-ok-gli': [
    'the Soviet Buran OK-GLI (BTS-002) atmospheric test orbiter',
    'delta-winged spaceplane airframe like Buran but built to fly in the atmosphere: four AL-31 turbojet engines in nacelles at the tail so it could take off under its own power, crew cockpit, empty payload bay, instrumentation racks, landing gear down',
    'Soviet CCCP / Buran',
    'anatomy/buran',
  ],
  'soyuz-7k-ok': [
    'the Soviet Soyuz 7K-OK spacecraft (first-generation Soyuz)',
    'three modules in a line: a spherical orbital module at the front with the pin-type docking probe and Igla rendezvous antennas, a bell-shaped descent module with cosmonaut seats in the middle, and a cylindrical service module at the rear with two solar-panel wings',
    'Soviet CCCP',
    'anatomy/soyuz-ms',
  ],
  'soyuz-t': [
    'the Soviet Soyuz T spacecraft',
    'three modules in a line: a spherical orbital module at the front with a docking probe, a bell-shaped descent module with three cosmonauts in Sokol pressure suits in the middle, and a cylindrical service module at the rear with two solar-panel wings and a unified propulsion system',
    'Soviet CCCP',
    'anatomy/soyuz-ms',
  ],
  'soyuz-tm': [
    'the Soviet Soyuz TM spacecraft',
    'three modules in a line: a spherical orbital module at the front with a docking probe and Kurs rendezvous antennas, a bell-shaped descent module with three cosmonaut seats in the middle, and a cylindrical service module at the rear with two solar-panel wings',
    'Soviet CCCP',
    'anatomy/soyuz-ms',
  ],
  voskhod: [
    'the Soviet Voskhod spacecraft',
    'a spherical descent capsule derived from Vostok with three cosmonauts seated side by side without ejection seats, a backup solid retro-rocket pack on top of the sphere, the inflatable Volga airlock of Voskhod 2 attached to the side, joined to a conical instrument module with gas bottles and the main retrorocket',
    'Soviet CCCP',
    'anatomy/vostok',
  ],
  'apollo-csm-block-i': [
    'the Apollo Command and Service Module (Block I)',
    'a conical command module with three crew couches, the original two-piece inward-opening plug hatch, no docking tunnel or probe, a heat shield, joined to a long cylindrical service module with the big SPS engine bell at the rear, RCS thruster quads, fuel cells and tanks, no high-gain antenna',
    'NASA',
    'anatomy/apollo-csm-block-ii',
  ],
  'progress-7k-tg': [
    'the Soviet Progress 7K-TG cargo spacecraft (the first robotic cargo ship)',
    'three modules: a pressurized cargo module at the front with a docking probe, a refuelling module with UDMH and nitrogen tetroxide tanks in place of the descent module, and a cylindrical service module without solar panels (battery powered); resupplied the Salyut 6 station',
    'Soviet CCCP',
    'anatomy/progress-ms',
  ],
  // orbiters
  'change-2': [
    "China's Chang'e 2 lunar orbiter",
    'a box-shaped bus, a single solar array wing, a steerable high-gain dish antenna, a CCD stereo camera, a laser altimeter, gamma and X-ray spectrometers, the main engine at the base',
    'CNSA',
    'anatomy/chandrayaan1',
  ],
  change1: [
    "China's Chang'e 1 lunar orbiter",
    'a box-shaped bus, a single solar array wing, a steerable high-gain dish antenna, a CCD stereo camera, a laser altimeter, an interference imaging spectrometer, the main engine at the base',
    'CNSA',
    'anatomy/chandrayaan1',
  ],
  clementine: [
    'the Clementine lunar orbiter',
    'an octagonal prism bus, two solar panels, a high-gain dish antenna on top, star tracker cameras, the UV/visible, near-infrared and LIDAR camera suite, and the interstage adapter solid motor stage below',
    'NASA / BMDO',
    'anatomy/mars-express',
  ],
  giotto: [
    "ESA's Giotto comet probe",
    'a spin-stabilised drum-shaped body covered in solar cells, a tilted despun high-gain dish antenna on top, the two-sheet Whipple bumper dust shield at the base, the solid kick motor in the centre, the Halley multicolour camera, with the solar cells covering the drum itself and no deployable solar wings',
    'ESA',
    'anatomy/lunar-prospector',
  ],
  'phobos-2': [
    'the Soviet Phobos 2 Mars probe',
    'a toroidal propulsion unit with spherical propellant tanks, two square solar panels, a large high-gain dish antenna, the instrument bay, the DAS long-duration lander and the hopping lander attached for release onto Phobos',
    'Soviet CCCP',
    'anatomy/mars-express',
    'warm muted rusty-metallic palette',
  ],
  'vega-1': [
    'the Soviet Vega 1 probe',
    "a Venera-derived bus with two large square solar panels, a high-gain dish antenna, a two-axis scan platform with the camera for Halley's Comet, a dual-sheet dust shield, and the spherical Venus descent module (lander and balloon) on top",
    'Soviet CCCP',
    'anatomy/mars-express',
  ],
  'vega-2': [
    'the Soviet Vega 2 probe',
    "a Venera-derived bus with two large square solar panels, a high-gain dish antenna, a two-axis scan platform with the camera for Halley's Comet, a dual-sheet dust shield, and the spherical Venus descent module (lander and balloon) on top",
    'Soviet CCCP',
    'anatomy/mars-express',
  ],
  luna10: [
    'the Soviet Luna 10 lunar orbiter (the first spacecraft to orbit the Moon)',
    'a sealed cylindrical instrument container with a magnetometer boom and antennas, separated from the Ye-6 bus with its spherical propellant tanks and retro-engine',
    'Soviet CCCP',
    'anatomy/lunar-prospector',
  ],
  'viking1-orbiter': [
    "NASA's Viking 1 Orbiter",
    'an octagonal bus, four solar-panel wings in a cross, the large bipropellant main engine, a high-gain dish antenna, a scan platform with two vidicon cameras, and the lander inside its aeroshell capsule mounted on top before separation',
    'NASA',
    'anatomy/mariner-4',
    'warm muted rusty-metallic palette',
  ],
  'mars2-orbiter': [
    'the Soviet Mars 2 Orbiter',
    'a cylindrical propulsion tank at the base, two large solar-panel wings, a high-gain dish antenna, thermal radiators, instruments, and the conical aeroshell descent module mounted on top',
    'Soviet CCCP',
    'anatomy/mars-express',
    'warm muted rusty-metallic palette',
  ],
  'mars3-orbiter': [
    'the Soviet Mars 3 Orbiter',
    'a cylindrical propulsion tank at the base, two large solar-panel wings, a high-gain dish antenna, thermal radiators, instruments, and the conical aeroshell descent module mounted on top',
    'Soviet CCCP',
    'anatomy/mars-express',
    'warm muted rusty-metallic palette',
  ],
  ...Object.fromEntries(
    [1, 2, 3, 4, 5].map((n) => [
      `lunar-orbiter-${n}`,
      [
        `NASA's Lunar Orbiter ${n}`,
        'a truncated-cone frame, four solar panels, a high-gain dish antenna on a boom, a low-gain antenna boom, the Kodak dual-lens film camera with onboard film developing and scanning, the velocity-control engine on top',
        'NASA',
        'anatomy/mariner-4',
      ],
    ]),
  ),
  // landers
  'mars-2': [
    'the Mars 2 lander',
    'bowl-shaped opening petals, parachute, retro-rockets, small PrOP-M tethered rover, antenna',
    'Soviet space program',
    'anatomy/mars-3',
  ],
  'mars-polar-lander': [
    "NASA's Mars Polar Lander",
    'a hexagonal deck on three landing legs, twelve pulsed descent engines, solar panels, a robotic arm with scoop, a meteorology mast, and the two Deep Space 2 penetrator microprobes on the cruise stage',
    'NASA',
    'anatomy/phoenix',
    'warm muted rusty-metallic palette',
  ],
  'vikram-cy2': [
    'the Vikram Chandrayaan-2 lunar lander',
    'four-legged lander, five throttleable engines (four at the corners and one central), side solar panels, Pragyan rover ramp, instrument deck',
    'ISRO',
    'anatomy/vikram-cy3',
  ],
  luna24: [
    'the Luna 24 sample-return craft',
    'descent stage with landing legs, a long drill that cored 2 metres deep into a flexible tube, ascent stage with return capsule, antennas',
    'Soviet space program',
    'anatomy/luna-16',
  ],
  change6: [
    "the Chang'e 6 sample-return lander",
    'sample-return lander on the lunar far side, ascent vehicle on top, robotic sampling arm with scoop, drill, twin solar panels, a small deployable rover camera',
    'CNSA',
    'anatomy/change-5',
  ],
  'viking2-lander': [
    "NASA's Viking 2 Mars lander",
    'hexagonal lander body on three landing legs, two RTG generator covers on top, a robotic soil-sampling arm, high-gain dish antenna and a meteorology boom, descent engine nozzles underneath, sitting on the frosty Utopia Planitia surface',
    'NASA',
    'anatomy/viking-1',
    'warm muted rusty palette',
  ],
  mars6: [
    'the Mars 6 lander',
    'bowl-shaped opening petals, parachute, retro-rockets, mass spectrometer, antenna',
    'Soviet space program',
    'anatomy/mars-3',
  ],
  beagle2: [
    'the UK/ESA Beagle 2 Mars lander',
    'a small clam-shell disk lander with four round petal-like solar panels unfolded, the robotic arm with the PAW instrument head, the PLUTO mole, the gas analysis package inside, carried on Mars Express',
    'ESA / UK',
    'anatomy/schiaparelli',
    'warm muted rusty-metallic palette',
  ],
  // stations
  'salyut-2': [
    'the Soviet Salyut 2 (OPS-1, Almaz) military space station',
    'stepped-cylinder Almaz station, two solar-panel wings at the rear, a docking port at the aft end, the large Agat-1 reconnaissance camera in the floor, a small film-return capsule; the station flies alone with no Soyuz or any other spacecraft attached (it failed before any crew arrived)',
    'Soviet CCCP',
    'anatomy/salyut-1',
  ],
  'salyut-3': [
    'the Soviet Salyut 3 (OPS-2, Almaz) military space station',
    'stepped-cylinder Almaz station, two solar-panel wings, a docking port at the aft end with a docked Soyuz, the Agat-1 reconnaissance camera, the Rikhter R-23M rapid-fire cannon, the film-return capsule',
    'Soviet CCCP',
    'anatomy/salyut-1',
  ],
  'salyut-4': [
    'the Soviet Salyut 4 (DOS-4) space station',
    'cylindrical station of stepped-diameter sections, three large steerable solar panels, the OST-1 solar telescope, X-ray telescopes, a front docking port',
    'Soviet CCCP',
    'anatomy/salyut-7',
  ],
  'salyut-5': [
    'the Soviet Salyut 5 (OPS-3, Almaz) military space station',
    'stepped-cylinder Almaz station, two solar-panel wings, a docking port at the aft end, the Agat-1 reconnaissance camera, the film-return capsule',
    'Soviet CCCP',
    'anatomy/salyut-1',
  ],
};

// ── exploded launchers ──────────────────────────────────────────────────────
const EXPLODED = {
  antares: {
    h: 42,
    mk: 'Orbital / Northrop Grumman',
    counts: 'two RD-181 at Stage 1, one Castor 30XL solid motor at Stage 2',
    prop: 'LOX / RP-1',
    labels: ['Stage 1', 'Stage 2 (Castor 30XL)', 'FAIRING', 'PAYLOAD'],
  },
  'ariane-6': {
    h: 63,
    mk: 'ESA and Arianespace',
    counts: 'one Vulcain 2.1 on the core, one Vinci on the upper stage, two P120C solid boosters',
    prop: 'LOX / LH2',
    boosters: true,
    labels: ['Core (LLPM)', 'Upper (ULPM)', 'P120C BOOSTER ×2', 'FAIRING', 'PAYLOAD'],
  },
  'delta-ii': {
    h: 39,
    mk: 'NASA',
    counts:
      'one RS-27A plus two verniers at Stage 1, one AJ10-118K at Stage 2, one Star 48B at Stage 3, nine GEM-40 strap-ons',
    prop: 'LOX / RP-1',
    boosters: true,
    labels: ['Stage 1', 'Stage 2', 'Stage 3 (PAM-D)', 'GEM-40 ×9', 'FAIRING', 'PAYLOAD'],
  },
  'long-march-7': {
    h: 53,
    mk: 'CASC and Chinese flag',
    counts: 'two YF-100 on the core, one YF-100 on each of four boosters, four YF-115 at Stage 2',
    prop: 'LOX / RP-1',
    boosters: true,
    labels: ['Core stage', 'Stage 2', 'BOOSTER ×4', 'FAIRING', 'PAYLOAD'],
  },
  'new-glenn': {
    h: 98,
    mk: 'Blue Origin',
    counts: 'seven BE-4 at Stage 1, two BE-3U at Stage 2',
    prop: 'LOX / LNG and LOX / LH2',
    labels: ['Stage 1 (GS1)', 'Stage 2 (GS2)', 'FAIRING', 'PAYLOAD'],
  },
  'pslv-xl': {
    h: 44,
    mk: 'ISRO',
    counts:
      'S139 solid PS1, one Vikas at PS2, solid PS3, two PS-4 engines at PS4, six PSOM-XL strap-ons',
    prop: 'solid and N2O4 / UDMH',
    boosters: true,
    labels: ['PS1', 'PS2', 'PS3', 'PS4', 'PSOM-XL ×6', 'FAIRING', 'PAYLOAD'],
  },
  vulcan: {
    h: 62,
    mk: 'ULA',
    counts: 'two BE-4 at the booster stage, two RL10C-X on Centaur V, two GEM 63XL strap-ons',
    prop: 'LOX / LNG and LOX / LH2',
    boosters: true,
    labels: ['Booster stage', 'Centaur V', 'GEM 63XL ×2', 'FAIRING', 'PAYLOAD'],
  },
  // manual exceptions (prose, Saturn V anchor)
  'atlas-slv-3d': {
    h: 36,
    mk: 'NASA',
    manual: true,
    labels: ['Atlas booster section', 'Atlas sustainer', 'Centaur D', 'FAIRING'],
  },
  energia: {
    h: 59,
    mk: 'Soviet CCCP',
    manual: true,
    labels: ['Core (Blok Ts)', 'Blok A booster ×4', 'BURAN'],
  },
  'falcon-heavy': {
    h: 70,
    mk: 'SpaceX',
    manual: true,
    labels: ['Center core', 'Side booster ×2', 'Stage 2', 'FAIRING'],
  },
  n1: {
    h: 105,
    mk: 'Soviet CCCP',
    manual: true,
    labels: ['Blok A', 'Blok B', 'Blok V', 'L3 lunar complex'],
  },
  'proton-m': {
    h: 58,
    mk: 'Roscosmos / Khrunichev',
    manual: true,
    labels: ['Stage 1', 'Stage 2', 'Stage 3', 'Briz-M', 'FAIRING'],
  },
  'r-7-vostok': {
    h: 29,
    mk: 'Soviet CCCP',
    manual: true,
    labels: ['Core (Blok-A)', '4x conical booster (Korolev cross)', 'SPUTNIK 1'],
  },
  'sls-block-1': {
    h: 98,
    mk: 'NASA (worm)',
    manual: true,
    labels: ['Core stage', 'SRB ×2', 'ICPS', 'ORION'],
  },
  'soyuz-2': {
    h: 46,
    mk: 'Roscosmos',
    manual: true,
    labels: ['Core (Blok-A)', '4x conical booster (Korolev cross)', 'Blok-I', 'FAIRING'],
    // QC 2026-10-23: the first render kept the reference's 'SOYUZ (11A511)' title,
    // drew the assembled rocket as a black silhouette and added a NASA logo.
    extra:
      "The title reads exactly 'SOYUZ-2.1B — EXPLODED'. Draw the assembled reference as a detailed painted rocket, not a silhouette. Roscosmos markings only, no NASA logo.",
  },
  'soyuz-fg': {
    h: 50,
    mk: 'Roscosmos',
    manual: true,
    labels: [
      'Core (Blok-A)',
      '4x conical booster (Korolev cross)',
      'Blok-I',
      'SOYUZ',
      'ESCAPE TOWER',
    ],
  },
  'soyuz-u': {
    h: 51,
    mk: 'Soviet CCCP',
    manual: true,
    labels: ['Core (Blok-A)', '4x conical booster (Korolev cross)', 'Blok-I', 'SHROUD'],
  },
};

const q = (l) => `'${l}'`;
// Manual exceptions whose reference is a sister rocket (same core layout).
const EXPLODED_SISTER = new Set([
  'soyuz-2',
  'soyuz-fg',
  'soyuz-u',
  'r-7-vostok',
  'proton-m',
  'atlas-slv-3d',
]);
function explodedPrompt(id) {
  const e = EXPLODED[id];
  const spec = EXPLODED_SPECS[id];
  const title = `${spec.name.toUpperCase()} — EXPLODED`;
  const labels = [q(title), ...e.labels.map(q), q(`${e.h} m`), q('1.8 m')].join(', ');
  if (e.manual)
    return `Exploded technical cutaway illustration of the ${spec.name} rocket, watercolor and ink-wash on faint aged graph paper, matching the reference image's art style (warm muted metallic palette, ink-splatter wash, handwritten annotations, faint physics equations in the margins), preserving tall slender proportions. ${EXPLODED_SISTER.has(id) ? 'The reference shows a sister rocket of the same family: keep its art style, page layout and shared structure, and change the details to match the description below.' : 'The reference shows a DIFFERENT rocket: take only its art style and page layout — do NOT copy its stages, engines, tank labels, payload or text.'} IMPORTANT vehicle layout: ${spec.manual}. Show the pieces exploded apart with leader lines, each piece cut open to reveal its ${spec.propellant} tanks with the engines drawn at the base in the exact counts given. At far left a small assembled scale-reference of the whole vehicle in its true silhouette, a tiny 1.8 m human figure, and a '${e.h} m' dimension line. Vintage ${e.mk} markings (retro logo, flag, stencilled serials). Keep labels legible: ${labels}.${e.extra ? ` ${e.extra}` : ''} A warm hand-painted sketchbook cutaway — not a flat vector chart, not photorealistic.`;
  return `Exploded technical cutaway illustration of the ${spec.name} rocket, watercolor and ink-wash on faint aged graph paper, exposed internal structure. Follow the reference layout EXACTLY, preserving the tall-and-narrow proportions of every stage (do NOT make them short or fat): at far left a small assembled scale-reference rocket in correct proportion with a tiny human figure beside it and a '${e.h} m' dimension line; the stages exploded apart in two columns, each stage a TALL SLENDER cylinder cut open to reveal its tanks with the engines drawn at the base. Exposed internals: propellant tanks, turbopumps, engine bells${e.boosters ? ', strap-on boosters' : ''}. Handwritten engineering annotations, thin ruled leader lines, dimension lines, faint physics equations in the margins, ink-splatter wash clouds, warm muted metallic palette (brass, steel, copper on cream paper), vintage scientific sketchbook / editorial infographic aesthetic. Vintage ${e.mk} markings (retro logo, flag, stencilled serials). KEEP the engine counts exact (${e.counts}), the cut-open ${e.prop} tanks, and every label legible and in place: ${labels}. A warm hand-painted sketchbook cutaway — not a flat vector chart, not photorealistic.`;
}

const requests = [];
for (const [id, prompt] of Object.entries(PENCIL))
  requests.push({
    path: `anatomy/${id}`,
    kind: 'pencil',
    model: 'nano_banana_2',
    aspect_ratio: '2:3',
    resolution: '2k',
    reference: { media: PENCIL_REF, why: 'house pencil style reference (2026-08-02 backfills)' },
    prompt,
  });
for (const [id, [craft, parts, markings, refPath, palette]] of Object.entries(W)) {
  const prompt = watercolor(craft, parts, markings, refPath, palette, SISTER.has(id));
  requests.push({
    path: `anatomy/${id}`,
    kind: 'watercolor',
    model: 'nano_banana_2',
    aspect_ratio: '3:2',
    resolution: '2k',
    reference: { generation: job(refPath), why: `style reference: shipped ${refPath}` },
    prompt,
  });
}
for (const id of Object.keys(EXPLODED))
  requests.push({
    path: `anatomy-exploded/${id}`,
    kind: EXPLODED[id].manual ? 'exploded-manual' : 'exploded',
    model: 'nano_banana_2',
    aspect_ratio: '3:2',
    resolution: '2k',
    reference: EXPLODED[id].manual
      ? {
          generation: job(MANUAL_REF[id]),
          why: `style reference: shipped ${MANUAL_REF[id]} (manual exception, launcher-cutaway-style.md §5)`,
        }
      : {
          sketch: `docs/wip/essay-diagram-sources/launcher-cutaways/${id}.png`,
          media: SKETCH_MEDIA[id],
          why: 'structural layout sketch (build-cutaway-sketches.mjs)',
        },
    prompt: explodedPrompt(id),
  });

writeFileSync(
  'scripts/anatomy/batch-2026-10-23.json',
  JSON.stringify({ built_by: 'scripts/anatomy/build-batch-2026-10-23.mjs', requests }, null, 2) +
    '\n',
);
console.log(
  `${requests.length} requests:`,
  Object.entries(requests.reduce((c, r) => ((c[r.kind] = (c[r.kind] || 0) + 1), c), {}))
    .map(([k, v]) => `${k} ${v}`)
    .join(', '),
);
