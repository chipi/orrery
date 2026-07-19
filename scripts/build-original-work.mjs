/**
 * build-original-work.mjs — generates static/data/original-work.json, the
 * bill-of-materials for Orrery's ORIGINAL content (the /colophon page).
 *
 * Auto-scans the hand-authored SVG diagram directories; the 3D / canvas /
 * UI / writing categories are curated inline below (no static preview
 * exists for live-rendered geometry, so those entries link to the route
 * that draws them instead of showing a thumbnail).
 *
 * Re-run after adding diagrams:  node scripts/build-original-work.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const ACRONYMS = new Set([
  'au',
  'edl',
  'nrho',
  'tcm',
  'c3',
  'eva',
  'iva',
  'soi',
  'tli',
  'met',
  'dv',
  'csm',
  'lm',
  'iss',
  'jwst',
  'htv',
  'ms',
  'slim',
  'mer',
  'ii',
  'iii',
  'iv',
]);

function humanize(slug) {
  return slug
    .replace(/^_cover-/, '')
    .replace(/\.svg$/, '')
    .split(/[-_]/)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
}

function scanDiagrams(dir, urlBase) {
  // Enumerate one entry per unique diagram, keyed by basename. A diagram may
  // ship as hand-authored .svg, as a WIRED-blend raster .webp (2026-07 redo),
  // or as a webp-only diagram with no SVG source (the wave-2 science set) —
  // dedup so each appears once, preferring the .webp when both exist.
  const bases = new Set();
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.svg')) bases.add(f.replace(/\.svg$/, ''));
    else if (f.endsWith('.webp')) bases.add(f.replace(/\.webp$/, ''));
  }
  return [...bases].sort().map((slug) => {
    const cover = slug.startsWith('_cover-');
    const svg = `${slug}.svg`;
    const webp = `${slug}.webp`;
    const hasSvg = existsSync(`${dir}/${svg}`);
    const hasWebp = existsSync(`${dir}/${webp}`);
    // Prefer the raster webp — the live /science pages read it too. Covers
    // redone in the flat family (2026-06) live under science-covers-v2/;
    // covers we didn't redo keep their hand-authored SVG.
    let file = hasSvg ? `${urlBase}/${svg}` : `${urlBase}/${webp}`;
    if (cover) {
      if (existsSync(`static/images/science-covers-v2/${webp}`)) {
        file = `/images/science-covers-v2/${webp}`;
      }
    } else if (hasWebp) {
      file = `${urlBase}/${webp}`;
    }
    return { title: humanize(svg), file, cover };
  });
}

const science = scanDiagrams('static/diagrams/science', '/diagrams/science');
// (The legacy SVG spacecraft schematics were retired — all spacecraft anatomy
// is now generated raster art, surfaced via `anatomy_art` below.)

// Generated spacecraft anatomy ART (#367) — watercolor cutaways + pencil
// sketches under /images/anatomy/{id}.webp. Titles pulled from the fleet
// index so they read as proper names ("Mars Reconnaissance Orbiter").
const fleetNames = Object.fromEntries(
  JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8')).map((e) => [e.id, e.name]),
);
const anatomyArt = (() => {
  try {
    return readdirSync('static/images/anatomy')
      .filter((f) => f.endsWith('.webp'))
      .sort()
      .map((f) => {
        const id = f.replace(/\.webp$/, '');
        return {
          title: fleetNames[id] ?? humanize(id),
          file: `/images/anatomy/${f}`,
          cover: false,
        };
      });
  } catch {
    return [];
  }
})();

// Curated 3D-model catalogue. Every distinct hand-built mesh in the
// project gets its own entry + thumbnail; the thumbnails are captured
// from the /dev/models gallery by scripts/capture-colophon-thumbs.ts
// (one isolated, auto-framed silhouette per mesh). `route` is where the
// model is drawn live; `where` is a human label for that surface.
//
// Entries are generated from compact [thumb-id, title, what] tuples so
// the list stays maintainable as the model set grows. A trailing `*`
// after a route in the family header is not used — each family passes
// its own route/where.
const mk =
  (thumb, where, route) =>
  ([id, title, what]) => ({
    title,
    what,
    where,
    route,
    thumb: `/images/colophon/${thumb}-${id}.webp`,
  });

// Interplanetary spacecraft — built by interplanetary-spacecraft-models.ts,
// flown on /fly trajectories and shown on /explore.
const spacecraft = [
  [
    'cassini',
    'Cassini–Huygens',
    'High-gain dish, RTG booms, and the Huygens probe — Saturn orbiter.',
  ],
  ['voyager-1', 'Voyager', '3.7 m dish, magnetometer boom, and RTG truss — the Grand Tour bus.'],
  ['galileo', 'Galileo', 'Dual-spin bus with the furled high-gain umbrella antenna.'],
  [
    'new-horizons',
    'New Horizons',
    'Compact triangular bus with a single dish — the Pluto flyby probe.',
  ],
  ['pioneer-10', 'Pioneer', 'Spin-stabilised dish, RTG booms, and the engraved plaque.'],
  ['juno', 'Juno', 'Three vast solar wings around a hexagonal bus — Jupiter polar orbiter.'],
  ['bepicolombo', 'BepiColombo', 'Stacked transfer module + Mercury orbiters with ion thrusters.'],
  ['dawn', 'Dawn', 'Ion-drive bus with wide solar wings — Vesta + Ceres orbiter.'],
  ['giotto', 'Giotto', 'Drum-shaped spinner with a dust shield — Halley’s Comet flyby.'],
  ['hayabusa2', 'Hayabusa2', 'Boxy bus with solar panels and sampler horn — asteroid Ryugu.'],
  ['juice', 'JUICE', 'Cross-shaped solar arrays on a compact bus — Jupiter icy-moons orbiter.'],
  ['rosetta', 'Rosetta', '14 m solar wings around a comet-chasing bus + Philae lander.'],
  ['ulysses', 'Ulysses', 'RTG-powered solar polar probe with a single dish.'],
  ['vega-1', 'Vega', 'Soviet Venus flyby + balloon mother-craft with a steerable dish.'],
  ['venera-13', 'Venera 13', 'Soviet Venus lander — toroidal aerobrake and landing ring.'],
].map(mk('craft', 'Fly + Explore', '/fly'));

// Moon landers + rovers — Tier-1 engineering meshes (src/lib/hotspot-models).
const moonModels = [
  ['apollo-lm', 'Apollo Lunar Module', 'Descent + ascent stage, gold MLI foil, and RCS quads.'],
  [
    'apollo-lm-extended',
    'Apollo LM (J-mission + LRV)',
    'Extended-stay LM paired with the Lunar Roving Vehicle.',
  ],
  ['luna-9', 'Luna 9', 'Soviet sphere that returned the first images from the lunar surface.'],
  [
    'luna-sample-return',
    'Luna sample-return',
    'Ascent rocket atop a descent platform (Luna 16 / 20 / 24).',
  ],
  ['lunokhod', 'Lunokhod rover', 'Eight-wheeled Soviet rover with a clamshell solar lid.'],
  ['chang-e-lander', 'Chang’e lander', 'CNSA descent stage with ascent capsule (Chang’e 5 / 6).'],
  ['yutu', 'Yutu rover', 'Six-wheeled Chinese rover with folding solar panels.'],
  [
    'chandrayaan-3-vikram',
    'Chandrayaan-3 Vikram',
    'ISRO four-leg lander that delivered the Pragyan rover.',
  ],
  ['slim', 'SLIM', 'JAXA precision “Moon Sniper” two-engine descent stage.'],
  ['beresheet', 'Beresheet', 'SpaceIL’s compact four-leg lander.'],
].map(mk('model-moon', 'Moon landing sites', '/moon'));

// Mars landers + rovers — Tier-1 engineering meshes.
const marsModels = [
  ['viking', 'Viking', 'Tripod-legged NASA lander with RTG and sampling arm.'],
  [
    'pathfinder-sojourner',
    'Pathfinder + Sojourner',
    'Tetrahedral airbag lander and the first Mars rover.',
  ],
  ['mer', 'MER (Spirit / Opportunity)', 'Rocker-bogie rover with butterfly solar wings.'],
  ['curiosity', 'Curiosity / Perseverance', 'MSL-class RTG rover with mast + arm (and Ingenuity).'],
  ['phoenix', 'Phoenix / InSight', 'Solar stationary lander with a robotic arm.'],
  ['mars-3', 'Mars 3', 'Soviet petal lander — first soft Mars touchdown.'],
  ['zhurong', 'Tianwen-1 Zhurong', 'Chinese rover with butterfly arrays and a mast.'],
  ['schiaparelli', 'Schiaparelli', 'ESA entry-descent-landing demonstrator capsule.'],
  ['beagle-2', 'Beagle 2', 'Clamshell ESA lander with petal solar panels.'],
].map(mk('model-mars', 'Mars landing sites', '/mars'));

// Earth satellites — earth-satellite-models.ts, shown as orbital markers.
const satModels = [
  ['hubble', 'Hubble', 'Cylindrical observatory with aperture door and solar wings.'],
  ['jwst', 'JWST', 'Tennis-court sunshield beneath a segmented gold mirror.'],
  ['chandra', 'Chandra', 'Elongated X-ray observatory with solar wings.'],
  ['xmm', 'XMM-Newton', 'Long ESA X-ray telescope tube.'],
  ['gaia', 'Gaia', 'Sunshade-skirted ESA astrometry observatory.'],
  ['lro', 'LRO', 'Lunar Reconnaissance Orbiter bus and dish.'],
  ['geo-comsat', 'GEO comsat', 'Box bus with deployed solar wings and antennas.'],
  [
    'nav-constellation',
    'Navigation constellation',
    'GPS-class satellite cluster (GPS / Galileo / GLONASS / BeiDou).',
  ],
  [
    'generic-orbiter',
    'Generic orbiter bus',
    'Hex bus + solar wings + antenna, agency-keyed fallback build.',
  ],
].map(mk('model-sat', 'Earth orbital markers', '/earth'));

// Launch vehicles — per-vehicle ascent silhouettes (launcher-models.ts),
// flown in the /fly launch/ascent act.
const launchers = [
  [
    'generic',
    'Generic launcher',
    'Falcon-9-like two-stage body — the agency-keyed fallback silhouette.',
  ],
  [
    'saturn-v',
    'Saturn V',
    'Tapered three-stage stack, five F-1 bells, and the escape tower (also Saturn IB).',
  ],
  ['vostok-k', 'Soyuz / R-7', 'Korolev-cross core with four tapered strap-on boosters.'],
  [
    'ariane-5',
    'Ariane 5',
    'Cryogenic core between two tall solid boosters under a bulbous fairing.',
  ],
  ['h-iia', 'H-IIA', 'Japanese cryogenic core with paired solid rocket boosters.'],
  ['space-shuttle-stack', 'Space Shuttle', 'External tank, twin SRBs, and the delta-wing orbiter.'],
  [
    'falcon-9',
    'Falcon 9',
    'Slender two-stage body — an octaweb of nine engines, grid fins, and landing legs.',
  ],
  [
    'atlas-v',
    'Atlas V',
    'Wide RD-180 core with a bulbous payload fairing and optional solid strap-ons.',
  ],
  ['proton-k', 'Proton-K', 'Soviet heavy — a central core ringed by six outboard fuel tanks.'],
  [
    'titan-ii-glv',
    'Titan II GLV',
    'Slender uniform two-stage that launched the crewed Gemini capsules.',
  ],
  [
    'atlas-lv-3b',
    'Atlas LV-3B',
    'Mercury-Atlas stage-and-a-half with a booster-engine skirt and escape tower.',
  ],
  [
    'long-march-2f',
    'Long March 2F',
    'China’s crewed launcher — core, four liquid strap-ons, and a launch-escape tower (Shenzhou).',
  ],
  [
    'long-march-3b',
    'Long March 3B',
    'Chinese GTO workhorse — a core with four liquid strap-ons (Chang’e lunar missions).',
  ],
  [
    'long-march-5',
    'Long March 5',
    'China’s heavy “Fat Five” — a wide cryogenic core with four large boosters.',
  ],
  ['pslv', 'PSLV', 'ISRO’s workhorse — a slender core ringed by six solid strap-on boosters.'],
  [
    'lvm3',
    'LVM3 / GSLV Mk III',
    'ISRO heavy-lift — a core flanked by two large S200 solid boosters (Chandrayaan-3).',
  ],
  ['m-v', 'M-V', 'JAXA’s all-solid three-stage launcher (Hayabusa).'],
  ['h3', 'H3', 'JAXA’s new cryogenic core with solid strap-on boosters.'],
  ['ariane-1', 'Ariane 1', 'Europe’s first launcher — a slender three-stage 1979 design (Giotto).'],
].map(mk('model-launcher', 'Fly · launch/ascent', '/fly'));

// EDL descent stacks — entry/descent/landing hardware (descent-models.ts),
// flown in the /fly descent/landing act.
const descentModels = [
  [
    'lunar-powered',
    'Lunar powered descent',
    'Vacuum retro-descent stage — no aeroshell or parachute (Apollo / Chang’e / Luna).',
  ],
  [
    'mars-retro',
    'Mars parachute + retro',
    'Aeroshell, supersonic parachute, and terminal retro-rockets (Viking / Phoenix / InSight).',
  ],
  [
    'airbag',
    'Mars airbag bounce',
    'Tetrahedral airbag cocoon that bounces to rest (Pathfinder / Spirit / Opportunity).',
  ],
  [
    'skycrane',
    'Mars skycrane',
    'Rocket-powered descent stage that lowers the rover on tethers (Curiosity / Perseverance).',
  ],
  [
    'venus-aeroshell',
    'Venus aeroshell',
    'Sphere-cone entry capsule and braking disk for the dense atmosphere (Venera / Vega).',
  ],
  [
    'asteroid-sampler',
    'Asteroid touch-and-go',
    'Sampler bus with a collection horn — micro-gravity touch-and-go (Hayabusa / OSIRIS-REx).',
  ],
  [
    'comet-lander',
    'Comet harpoon lander',
    'Three-leg micro-gravity lander with anchoring harpoons (Philae at comet 67P).',
  ],
  [
    'jupiter-probe',
    'Jupiter atmospheric probe',
    'Sphere-cone aeroshell and parachute for a deep-atmosphere entry (Galileo probe).',
  ],
  [
    'titan-parachute',
    'Titan parachute descent',
    'Aeroshell and large parachute for a slow descent through Titan’s haze (Huygens).',
  ],
].map(mk('model-descent', 'Fly · descent/landing', '/fly'));

// Lander cruise-configuration craft — the transit stack CARRYING the lander,
// shown in the /fly cruise + approach act (lander-cruise-models.ts).
const cruiseModels = [
  [
    'curiosity',
    'Curiosity cruise stage',
    'MSL cruise-stage disk over the aeroshell enclosing the rover.',
  ],
  [
    'perseverance',
    'Perseverance cruise stage',
    'Mars 2020 cruise stage + aeroshell (rover + Ingenuity sealed inside).',
  ],
  ['insight', 'InSight cruise stage', 'Cruise-stage disk over the aeroshell carrying the lander.'],
  ['phoenix', 'Phoenix cruise stage', 'Cruise stage + aeroshell for the polar lander.'],
  [
    'mars-pathfinder',
    'Pathfinder cruise stage',
    'Cruise stage + aeroshell (airbag lander + Sojourner inside).',
  ],
  ['spirit', 'Spirit cruise stage', 'MER cruise stage + aeroshell.'],
  ['opportunity', 'Opportunity cruise stage', 'MER cruise stage + aeroshell.'],
  [
    'schiaparelli',
    'Schiaparelli + TGO',
    'ExoMars Trace Gas Orbiter carrying the Schiaparelli entry capsule.',
  ],
  ['viking1', 'Viking orbiter + lander', 'Viking orbiter with the bioshield-capsule lander below.'],
  ['mars3', 'Mars 3 bus', 'Soviet M-71 bus with the descent capsule and solar wings.'],
  ['tianwen1', 'Tianwen-1 orbiter', 'Orbiter bus carrying the entry capsule (Zhurong inside).'],
  // Moon — one entry per distinct transit stack (shared across the missions noted).
  [
    'apollo11',
    'Apollo CSM + LM',
    'Command/Service Module docked to the Lunar Module — the trans-lunar stack (Apollo 11–17).',
  ],
  [
    'artemis3',
    'Orion (Artemis)',
    'Orion crew capsule + European Service Module with four solar wings (Artemis III / IV).',
  ],
  ['luna9', 'Luna 9 direct-ascent', 'Soviet direct bus with the spherical lander capsule on top.'],
  [
    'luna16',
    'Luna sample-return',
    'Descent stage with spherical tanks, ascent stage, and return capsule (Luna 16 / 24).',
  ],
  ['luna17', 'Lunokhod carrier', 'Descent-stage bus carrying the Lunokhod rover (Luna 17 / 21).'],
  ['change3', 'Chang’e 3 / 4', 'CNSA lander descent stage with the Yutu rover stowed on top.'],
  [
    'change5',
    'Chang’e 5 / 6',
    'Four-module sample-return stack — orbiter, returner, ascender, and lander.',
  ],
  ['chandrayaan3', 'Chandrayaan-3', 'ISRO propulsion module carrying the Vikram lander.'],
  ['slim', 'SLIM', 'JAXA’s compact “Moon Sniper” cruise bus.'],
  ['beresheet', 'Beresheet', 'SpaceIL’s small round four-leg lander in transit.'],
  [
    'blue-moon-mk1',
    'Blue Moon MK1',
    'Blue Origin’s tall lander — central tank on a four-leg frame.',
  ],
].map(mk('model-cruise', 'Fly · cruise/approach', '/fly'));

// Launch facility + the two station proxies.
const facilityModels = [
  {
    title: 'Launch facility',
    what: 'Octagonal pad with four lightning towers — Kennedy, Baikonur, Jiuquan, and others.',
    where: 'Earth surface markers',
    route: '/earth',
    thumb: '/images/colophon/model-earth-launchpad.webp',
  },
  {
    title: 'ISS proxy model',
    what: 'Full truss, pressurised modules, docked visitors, and steerable arrays.',
    where: 'ISS orbital scene',
    route: '/iss',
    thumb: '/images/colophon/model-station-iss.webp',
  },
  {
    title: 'Tiangong proxy model',
    what: 'T-configuration core + lab modules, docked Shenzhou / Tianzhou, and arrays.',
    where: 'Tiangong orbital scene',
    route: '/tiangong',
    thumb: '/images/colophon/model-station-tiangong.webp',
  },
];

// Procedural overlays that frame cleanly as a still. The motion/background
// effects (star fields, sun lens flare, orbit SOI/conic overlays) are not
// catalogued here — they only read in motion on their live route.
const overlayModels = [
  {
    title: 'Microgravity axes',
    what: 'Six labelled arrows marking the station local frame (zenith/nadir…).',
    where: 'ISS + Tiangong science lens',
    route: '/iss',
    thumb: '/images/colophon/model-microgravity.webp',
  },
  {
    title: 'Orbiter rings + marker halos',
    what: 'Inclination-tilted altitude rings and selection glow halos.',
    where: 'Earth · Moon · Mars',
    route: '/earth',
    thumb: '/images/colophon/model-orbit-rings.webp',
  },
  {
    title: 'Iconic mission trajectories',
    what: 'Voyager, Pioneer, New Horizons, Cassini, Juno, Dawn flight paths.',
    where: 'Explore',
    route: '/explore',
    thumb: '/images/colophon/model-trajectories.webp',
  },
];

const models3d = [
  ...spacecraft,
  ...launchers,
  ...moonModels,
  ...marsModels,
  ...descentModels,
  ...cruiseModels,
  ...satModels,
  ...facilityModels,
  ...overlayModels,
];

const canvas2d = [
  {
    title: 'Landing-page hero',
    what: 'Flat-family orrery poster — glowing sun, tilted orbit rings, and one highlighted cyan transfer arc.',
    where: 'Home',
    route: '/',
    thumb: '/images/app-landing-hero.webp',
  },
  {
    title: '2D system map',
    what: 'Top-down orrery with shaded planets, glow, orbit rings, and Saturn’s rings.',
    where: 'Explore 2D mode',
    route: '/explore',
    thumb: '/images/colophon/viz-system-map.webp',
  },
  {
    title: 'Porkchop Δv heatmap',
    what: 'Departure × time-of-flight grid colour-mapped from a Lambert solver.',
    where: 'Plan a transfer',
    route: '/plan',
    thumb: '/images/colophon/viz-porkchop.webp',
  },
  {
    title: 'Station blueprints',
    what: 'Orthographic top / side projections of every station module.',
    where: 'ISS + Tiangong',
    route: '/iss',
    thumb: '/images/colophon/viz-blueprint.webp',
  },
  {
    title: 'Surface-map nation legend',
    what: 'Auto-spaced agency colour key drawn onto the flat surface maps.',
    where: 'Moon + Mars 2D',
    route: '/moon',
    thumb: '/images/colophon/viz-nation-legend.webp',
  },
  {
    title: '3D text-label sprites',
    what: 'Canvas-rendered name tags billboarded onto objects in every scene.',
    where: 'Earth · Moon · Mars · Explore',
    route: '/earth',
    thumb: '/images/colophon/model-textlabels.webp',
  },
];

const ui = [
  {
    title: 'Science info-chips',
    what: 'Inline “i” glyph linking any figure to its /science explainer.',
    where: 'Throughout',
    route: '/science',
  },
  {
    title: 'Panorama compass rose',
    what: 'Rotating N/E/S/W marker oriented to the panorama yaw.',
    where: 'Moon + Mars panoramas',
    route: '/moon',
  },
  {
    title: 'Conic-section icons',
    what: 'Circle / ellipse / parabola / hyperbola glyphs for the orbit overlay.',
    where: 'Fly',
    route: '/fly',
  },
  {
    title: 'Navigation + control glyphs',
    what: 'Hamburger, science-lens, contrast, quality, and fullscreen icons.',
    where: 'Every route',
    route: '/',
  },
];

// Nearly every screen in Orrery is carried by original prose. These counts
// come straight from the data files (see scripts that build them); the copy
// itself is authored in English and translated across all 14 locales.
const writing = [
  {
    title: 'Mission briefings',
    what: '114 mission narratives — launch history, spacecraft, flight profile, and results — written for the mission cards and Fly briefings.',
    where: 'Missions + Fly',
    route: '/missions',
  },
  {
    title: 'Fleet catalogue entries',
    what: '251 spacecraft, launchers, suits, pads, and station components, each with a “best known for” line and full prose profile.',
    where: 'Fleet',
    route: '/fleet',
  },
  {
    title: 'Landing-site stories',
    what: '55 multi-chapter narrative histories of lunar and Martian landing sites, with original captions on every photograph.',
    where: 'Moon + Mars sites',
    route: '/moon',
  },
  {
    title: 'Science encyclopedia',
    what: '117 original explainers across orbital mechanics, propulsion, life in space, Earth-from-space, and spaceflight history — plus every figure caption.',
    where: 'Science',
    route: '/science',
  },
  {
    title: 'World profiles',
    what: 'Descriptive copy for the 9 planets and 22 small bodies — comets, asteroids, and Kuiper-belt objects — shown on the orrery.',
    where: 'Explore',
    route: '/explore',
  },
  {
    title: 'Station module notes',
    what: 'Operational and historical notes for all 22 ISS and Tiangong modules, written for the blueprint panels.',
    where: 'ISS + Tiangong',
    route: '/iss',
  },
  {
    title: 'Surface + panorama captions',
    what: 'Hotspot labels and annotated panorama captions that name what you’re looking at on each Moon and Mars scene.',
    where: 'Moon + Mars panoramas',
    route: '/mars',
  },
  {
    title: 'Audio tour scripts',
    what: 'Every guided + extended tour episode is originally written for Orrery; only the text-to-speech voices are third-party (credited on the Credits page).',
    where: 'Take the tour',
    route: '/credits',
  },
];

// Gallery posters (/posters) — 27 ORRERY-original art prints, AI-generated,
// then captioned and wordmarked in-house. Not works of any space agency; no
// agency logos. Each
// entry carries the full-res download file + a width-700 grid thumbnail.
const posters = [
  ['solar-system-orrery', 'Solar System'],
  ['solar-system-procession', 'Solar System'],
  ['earth', 'Earth'],
  ['moon', 'Moon'],
  ['mars', 'Mars'],
  ['saturn-v', 'Saturn V'],
  ['mir', 'Mir'],
  ['sputnik', 'Sputnik'],
  ['soyuz', 'Soyuz'],
  ['voyager', 'Voyager'],
  ['sojourner', 'Sojourner'],
  ['footprints', 'Footprints'],
  ['gagarin', 'Gagarin'],
  ['rosetta', 'Rosetta'],
  ['huygens', 'Huygens'],
  ['hayabusa2', 'Hayabusa2'],
  ['artemis-ii', 'Artemis II'],
  ['iss', 'ISS'],
  ['tiangong', 'Tiangong'],
  ['perseverance', 'Perseverance'],
  ['space-shuttle', 'Space Shuttle'],
  ['solar-sail', 'Solar Sail'],
  ['nuclear-drive', 'Nuclear Drive'],
  ['jwst', 'James Webb'],
  ['hubble', 'Hubble'],
  ['cassini', 'Cassini'],
  ['starship', 'Starship'],
].map(([id, title]) => ({
  title,
  file: `/images/posters/${id}.jpg`,
  thumb: `/images/posters/${id}.thumb.jpg`,
}));

const manifest = {
  generated_by: 'scripts/build-original-work.mjs',
  anatomy_art: anatomyArt,
  diagrams_science: science,
  posters,
  models3d,
  canvas2d,
  ui,
  writing,
  totals: {
    anatomy_art: anatomyArt.length,
    diagrams_science: science.length,
    posters: posters.length,
    models3d: models3d.length,
    canvas2d: canvas2d.length,
    ui: ui.length,
    writing: writing.length,
  },
};

writeFileSync('static/data/original-work.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('original-work.json written:', JSON.stringify(manifest.totals));
