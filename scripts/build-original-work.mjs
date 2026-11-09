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

// A width-suffixed file (`{stem}-{w}.webp`) is a responsive rung of `{stem}` —
// not an artwork of its own — when image-ladder.json lists width w for that stem
// (add-card-rungs.mjs writes 320/640 card rungs next to diagrams and Lab art).
const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8'));
const isRung = (url) => {
  const m = url.match(/^(.*)-(\d+)\.webp$/);
  return !!m && (ladder[m[1]] ?? []).includes(Number(m[2]));
};

function scanDiagrams(dir, urlBase) {
  // Enumerate one entry per unique diagram, keyed by basename. A diagram may
  // ship as hand-authored .svg, as a WIRED-blend raster .webp (2026-07 redo),
  // or as a webp-only diagram with no SVG source (the wave-2 science set) —
  // dedup so each appears once, preferring the .webp when both exist.
  const bases = new Set();
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.svg')) bases.add(f.replace(/\.svg$/, ''));
    else if (f.endsWith('.webp') && !isRung(`${urlBase}/${f}`)) bases.add(f.replace(/\.webp$/, ''));
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
const anatomyIdSet = new Set(JSON.parse(readFileSync('src/lib/anatomy-ids.json', 'utf8')));
const anatomyArt = (() => {
  try {
    return (
      readdirSync('static/images/anatomy')
        // Only the canonical base `{id}.webp` are artworks; the width-suffixed
        // responsive-ladder rungs ({id}-1280.webp …) are not (and some real ids
        // end in a number, so filter by the id set, not a numeric-suffix regex).
        .filter((f) => f.endsWith('.webp') && anatomyIdSet.has(f.replace(/\.webp$/, '')))
        .sort()
        .map((f) => {
          const id = f.replace(/\.webp$/, '');
          return {
            title: fleetNames[id] ?? humanize(id),
            file: `/images/anatomy/${f}`,
            cover: false,
          };
        })
    );
  } catch {
    return [];
  }
})();

// Exploded cutaways — launchers stage by stage, and the landers and rovers on the
// surface sites — under /images/anatomy-exploded/{id}.webp, ids from
// src/lib/anatomy-exploded-ids.json (derived from masters/anatomy-exploded).
const explodedArt = JSON.parse(readFileSync('src/lib/anatomy-exploded-ids.json', 'utf8'))
  .filter((id) => existsSync(`static/images/anatomy-exploded/${id}.webp`))
  .map((id) => ({
    title: fleetNames[id] ?? humanize(id),
    file: `/images/anatomy-exploded/${id}.webp`,
    cover: false,
  }));

// Landing-sequence sheets (#641) — one per surface site, under
// /images/landing-sequences/{site}.webp, ids from src/lib/landing-sequence-ids.json.
const siteOf = (id) => {
  for (const body of ['moon', 'mars', 'venus']) {
    const f = `i18n-src/en-US/${body}-sites/${id}.json`;
    if (existsSync(f)) return { name: JSON.parse(readFileSync(f, 'utf8')).name, route: `/${body}` };
  }
  return { name: null, route: '/moon' };
};
const landingArt = JSON.parse(readFileSync('src/lib/landing-sequence-ids.json', 'utf8'))
  .filter((id) => existsSync(`static/images/landing-sequences/${id}.webp`))
  .map((id) => ({
    title: siteOf(id).name ?? humanize(id),
    file: `/images/landing-sequences/${id}.webp`,
    route: siteOf(id).route,
    cover: false,
  }));

// Mission blueprints (#641) — one per mission, under /images/blueprints/{mission}.webp, ids from
// src/lib/blueprint-ids.json; the route opens that mission's panel.
const missionName = (id) => {
  for (const d of readdirSync('i18n-src/en-US/missions', { withFileTypes: true })) {
    const f = `i18n-src/en-US/missions/${d.name}/${id}.json`;
    if (d.isDirectory() && existsSync(f)) return JSON.parse(readFileSync(f, 'utf8')).name ?? null;
  }
  return null;
};
const blueprintArt = JSON.parse(readFileSync('src/lib/blueprint-ids.json', 'utf8'))
  .filter((id) => existsSync(`static/images/blueprints/${id}.webp`))
  .map((id) => ({
    title: missionName(id) ?? humanize(id),
    file: `/images/blueprints/${id}.webp`,
    route: `/missions?id=${id}`,
    cover: false,
  }));

// Illustrated site maps — sidecar static/data/site-illustrations.json; the route is the site's
// own page (/moon/<id>, /mars/<id>).
const siteIllustrations = JSON.parse(
  readFileSync('static/data/site-illustrations.json', 'utf8'),
).illustrations.map((i) => ({
  title: i.title,
  file: `/${i.file}`,
  route: `/${i.body}/${i.siteId}`,
  cover: false,
}));

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
  ['curiosity', 'Curiosity', 'MSL-class RTG rover with mast + arm.'],
  [
    'perseverance-rover',
    'Perseverance + Ingenuity',
    'Mars 2020 rover with Mastcam-Z mast, sample-caching bay, and the Ingenuity helicopter.',
  ],
  ['phoenix', 'Phoenix', 'Solar stationary lander with a robotic arm.'],
  [
    'insight-lander',
    'InSight',
    'Decagonal solar-panelled geophysics lander with the SEIS seismometer and HP3 mole.',
  ],
  ['mars-3', 'Mars 3', 'Soviet petal lander — first soft Mars touchdown.'],
  ['zhurong', 'Tianwen-1 Zhurong', 'Chinese rover with butterfly arrays and a mast.'],
  ['schiaparelli', 'Schiaparelli', 'ESA entry-descent-landing demonstrator capsule.'],
  ['beagle-2', 'Beagle 2', 'Clamshell ESA lander with petal solar panels.'],
].map(mk('model-mars', 'Mars landing sites', '/mars'));

// Venus surface lander — venus-lander-models.ts, shown on /venus markers.
const venusModels = [
  [
    'venera',
    'Venera / Vega lander',
    'Soviet Venus surface lander — a pressure sphere on a toroidal crush-ring.',
  ],
].map(mk('model-venus', 'Venus surface markers', '/venus'));

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
    'Tapered three-stage stack, five F-1 bells, roll-pattern livery, and the escape tower.',
  ],
  [
    'saturn-ib',
    'Saturn IB',
    'The Apollo LEO workhorse — a clustered S-IB first stage of eight H-1 engines under the same S-IVB + CSM.',
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
    'starship',
    'Starship / Super Heavy',
    'Bare-stainless fully-reusable stack — 33 Raptors on Super Heavy, 6 on Starship, forward + aft flaps, and the ogive nose.',
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
    'mercury-redstone',
    'Mercury-Redstone',
    'America’s first crewed launcher — a slim single-engine Redstone with four tail fins, the Mercury capsule and escape tower (Freedom 7).',
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
  [
    'long-march-3a',
    'Long March 3A',
    'Core and second stage hot-staged over an open truss under a cryogenic third stage and a 3.35 m fairing, no strap-ons (Chang’e 1).',
  ],
  [
    'long-march-7',
    'Long March 7',
    'CALT’s 3.35 m kerosene rocket for the Tianzhou freighters — a core, a second stage and four 2.25 m strap-on boosters.',
  ],
  [
    'delta-ii',
    'Delta II',
    'Turquoise Thor-derived first stage ringed by nine white solid boosters, under a boat-tailed 2.9 m fairing.',
  ],
  [
    'atlas-centaur',
    'Atlas-Centaur',
    'Steel-balloon Atlas stage-and-a-half under the white Centaur upper stage and nose fairing (Mariner 9 and 10, Pioneer 10 and 11).',
  ],
  [
    'atlas-agena',
    'Atlas-Agena',
    'The same Atlas under a slim Agena D upper stage and a small shroud (Mariner 4).',
  ],
  ['titan-ii-g', 'Titan II(23)G', 'Two Titan core stages under a payload fairing (Clementine).'],
  [
    'titan-iiie-centaur',
    'Titan IIIE-Centaur',
    'Titan core with two five-segment solid boosters, an interstage and the Centaur inside its shroud (Viking, Voyager).',
  ],
  [
    'titan-ivb-centaur',
    'Titan IVB-Centaur',
    'Titan core with two long solid motors under a 20 m fairing that encloses the Centaur (Cassini).',
  ],
  [
    'falcon-heavy',
    'Falcon Heavy',
    'Three Falcon 9 cores side by side — side boosters with nose cones, grid fins and legs, and a centre core carrying the upper stage and fairing.',
  ],
  [
    'athena-ii',
    'Athena II',
    'All-solid stack — two Castor 120 stages, a third stage and a tapered fairing (Lunar Prospector).',
  ],
  [
    'delta-iv-heavy',
    'Delta IV Heavy',
    'Three common booster cores abreast, the centre one carrying the cryogenic upper stage and a 19 m fairing (Parker Solar Probe).',
  ],
  [
    'new-glenn',
    'New Glenn',
    'A single 7 m stick — a seven-engine first stage with legs and strakes under a 7 m ogive fairing (Blue Moon MK1).',
  ],
  [
    'proton-m-briz-m',
    'Proton-M / Briz-M',
    'Central core ringed by six outboard fuel tanks, two more stages and a Briz-M upper stage under a 4.35 m fairing.',
  ],
  [
    'sls-block-1',
    'SLS Block 1',
    'Orange foam core stage on four RS-25s, two white five-segment boosters, the stage adapter and upper stage under Orion and its abort tower (Artemis).',
  ],
  [
    'molniya-m',
    'Molniya-M',
    'Four-stage R-7 — the Blok I on its lattice, the Blok L escape stage and the probe under a cylinder-and-cone shroud (Luna 9, Luna 10).',
  ],
  [
    'soyuz-fg-fregat',
    'Soyuz-FG / Fregat',
    'The R-7 and its upper stage topped by the squat Fregat and the probe under a wider shroud (Mars Express).',
  ],
  [
    'sputnik-8k71ps',
    'Sputnik 8K71PS',
    'The two-stage R-7 that launched Sputnik 1 — no third stage, the satellite riding under the core’s nose cone.',
  ],
  [
    'soyuz-2',
    'Soyuz-2',
    'The modernised 46.3 m R-7 — four boosters round the core, an upper stage on an open truss and a long fairing.',
  ],
  [
    'antares',
    'Antares 230+',
    'Northrop Grumman’s Cygnus launcher — a 3.9 m kerosene first stage on two RD-181s under a solid second stage and fairing.',
  ],
  [
    'ariane-6',
    'Ariane 6',
    'Europe’s 5.4 m cryogenic core and Vinci upper stage under a 20 m fairing, with four solid boosters (A64).',
  ],
  [
    'vulcan',
    'Vulcan Centaur',
    'ULA’s 5.4 m methane first stage on two BE-4s, the Centaur V and a 5.4 m fairing, with GEM 63XL solid boosters.',
  ],
  [
    'energia',
    'Energia–Buran',
    'The 7.75 m hydrogen core with four RD-170 strap-ons and the Buran orbiter riding on its flank.',
  ],
  [
    'n1',
    'N1',
    'The Soviet Moon rocket — five stages in a cone, thirty engines on the first, under the L3 shroud and escape tower.',
  ],
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
    'Orion crew capsule + European Service Module with four solar wings (Artemis IV / V).',
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
  // Small-body sample / rendezvous craft + Starship.
  [
    'hayabusa1',
    'Hayabusa cruise',
    'JAXA sample-return bus — solar wings, a sampler horn, and ion engines.',
  ],
  [
    'osiris-rex',
    'OSIRIS-REx cruise',
    'Boxy bus with V-angled solar wings and the extended TAGSAM sampler arm.',
  ],
  [
    'near-shoemaker',
    'NEAR Shoemaker',
    'Orbiter bus with four fixed solar panels in a cross and a fixed dish.',
  ],
  [
    'starship-demo',
    'Starship',
    'Stainless upper stage — nose cone, fore/aft flaps, and a Raptor cluster (Mars transit).',
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

// Earth-orbit re-entry capsules — built by capsule-models.ts, flown on the /fly
// Tier-1 orbit-coast + re-entry act (RFC-034 §13).
const earthCapsules = [
  [
    'mercury-capsule',
    'Mercury capsule',
    'Blunt ablative heat shield, shingled cone, and the recovery + antenna section (Freedom 7 … Faith 7).',
  ],
  [
    'gemini-capsule',
    'Gemini capsule',
    'Two-seat scaled-up Mercury with the rendezvous-radar nose and adapter module.',
  ],
  [
    'vostok-sphere',
    'Vostok',
    'The spherical Sharik descent module — antenna straps and equipment collar; the cosmonaut ejected and parachuted down separately.',
  ],
  [
    'voskhod-sphere',
    'Voskhod',
    'The same Sharik sphere, now carrying the solid-propellant soft-landing retro package on a strut truss — the crew rode it to the ground.',
  ],
  [
    'apollo-cm',
    'Apollo Command Module',
    'The classic steep blunt cone with the forward docking tunnel (Apollo 7/9, Skylab, ASTP).',
  ],
  [
    'soyuz-sa',
    'Soyuz descent module',
    'The "headlamp" bell — spherical base heat shield with a conical crew top.',
  ],
  [
    'dragon-capsule',
    'Crew Dragon',
    'Sleek conical body with the SuperDraco pods and the PICA-X heat shield (Inspiration4, Polaris Dawn).',
  ],
  [
    'shenzhou-reentry',
    'Shenzhou reentry module',
    'A broad Soyuz-lineage bell — its own lighter-silver hull with a grey equipment band (Shenzhou-1 onward).',
  ],
].map(mk('model-capsule', 'Earth-orbit re-entry', '/fly'));

// Showcase spacecraft — the true-size models of the /fleet line-ups (src/lib/three/showcase/*.ts,
// 34 models; sister variants that look alike share one entry), the line-up scenes themselves and
// the scale sets drawn between the craft (lineup/scale-figures.ts, lineup/cartoon-figures.ts).
// Thumbnails: /dev/models cards `showcase-<id>` / `lineup-cast`, and live /fleet scenes.
const showcaseCrewed = [
  [
    'soyuz-7k-ok',
    'Soyuz 7K-OK',
    'The first-generation Soyuz at 7.95 m — orbital, descent and service modules, 9.8 m solar wings and the Igla rendezvous antennas.',
  ],
  [
    'soyuz-ms',
    'Soyuz T / TM / TMA / MS (4 variants)',
    'The 7.48 m Soyuz across four generations — Igla antennas on the T, Kurs on the TM and TMA, Kurs-NA and a micrometeoroid shield on the MS.',
  ],
  [
    'crew-dragon',
    'Crew Dragon',
    'The 8.1 m capsule-and-trunk stack with its windows, SuperDraco pods and solar-cell trunk.',
  ],
  [
    'starliner',
    'Starliner (CST-100)',
    'Boeing’s 5.03 m capsule and service module — the blue band and the thruster pods.',
  ],
  [
    'gaganyaan',
    'Gaganyaan',
    'ISRO’s 5.58 m crew module on its service module, with deployable solar wings.',
  ],
  [
    'orion',
    'Orion',
    'The 7.9 m Artemis crew module and European service module with its solar arrays.',
  ],
  [
    'new-shepard',
    'New Shepard',
    'The 19.2 m suborbital vehicle — a 3.8 m booster under the crew capsule with its large windows.',
  ],
  [
    'apollo-csm-block-ii',
    'Apollo CSM Block I / II (2 variants)',
    'The command and service module at 10.6 and 11 m — the conical command module on the cylindrical service module and its engine bell.',
  ],
  [
    'shenzhou',
    'Shenzhou',
    'China’s 9.25 m three-module craft in the Soyuz lineage — orbital module, re-entry module and service module with its solar wings.',
  ],
  [
    'space-shuttle-orbiter',
    'Space Shuttle orbiter',
    'One 37.2 m orbiter drawn once for the four sisters — Atlantis, Challenger, Discovery and Endeavour — lying on the runway.',
  ],
  [
    'columbia',
    'Space Shuttle Columbia',
    'The first orbiter — the only one with black chines, and the instrument pod on its tail fin.',
  ],
  [
    'enterprise',
    'Space Shuttle Enterprise',
    'The atmospheric test orbiter — no main engines, no OMS pods, simulated tiles.',
  ],
  [
    'buran',
    'Buran',
    'The Soviet orbiter at 36.4 m — a 24 m double-delta wing, its main engines left on the Energia core.',
  ],
  [
    'buran-ok-gli',
    'Buran OK-GLI',
    'The atmospheric test vehicle with Buran’s shape and mass — four AL-31 turbofans at the tail.',
  ],
  ['x37b', 'X-37B', 'The U.S. Space Force’s 8.92 m uncrewed spaceplane with its 4.55 m wingspan.'],
].map(mk('model-showcase', 'Fleet · line-up', '/fleet?category=crewed-spacecraft&view=lineup'));
const showcaseCargo = [
  [
    'progress-ms',
    'Progress 7K-TG / M / MS (3 variants)',
    'The Soyuz-derived cargo ship from 7.23 to 7.94 m — service module, refuelling section and cargo module, the 7K-TG without solar wings.',
  ],
  [
    'cargo-dragon-2',
    'Cargo Dragon 2',
    'The windowless uncrewed Dragon 2 on its 8.1 m trunk — the ISS cargo ship.',
  ],
  [
    'cargo-dragon-v1',
    'Dragon 1',
    'The original 6.1 m cargo Dragon — a 3.7 m capsule on its trunk with two solar arrays.',
  ],
  [
    'cygnus-enhanced',
    'Cygnus Standard / Enhanced (2 variants)',
    'Northrop Grumman’s station freighter at 5.14 and 6.39 m — a pressurised cargo module over the service module with round solar arrays.',
  ],
  [
    'htv',
    'HTV (Kounotori)',
    'Japan’s 9.8 m station freighter — a pressurised module and an open pallet on the service section.',
  ],
  [
    'htv-x',
    'HTV-X',
    'Japan’s 8 m successor freighter — a pressurised cargo module over the service module with its solar wings.',
  ],
  [
    'atv',
    'ATV',
    'ESA’s 10.3 m Automated Transfer Vehicle — a cylindrical cargo carrier with four X-shaped solar wings.',
  ],
  [
    'tianzhou',
    'Tianzhou',
    'China’s 10.6 m cargo ship — a long cargo module over the service module and its solar wings.',
  ],
].map(mk('model-showcase', 'Fleet · line-up', '/fleet?category=cargo-spacecraft&view=lineup'));
const lineupLaunchers = [
  [
    'launchers',
    'Launcher line-up',
    'Every rocket with a model, from Starship to Mercury-Redstone, stood side by side at its real height beside a 1.75 m person.',
  ],
  [
    'landmarks',
    'Landmarks at true height',
    'Sixteen landmarks and icons hand-drawn at their sourced heights — from the Eiffel Tower and the Statue of Liberty to Michelangelo’s David, a London Routemaster and a VW Beetle.',
  ],
].map(mk('model-lineup', 'Fleet · line-up', '/fleet?category=launcher&view=lineup'));
const lineupSpacecraft = [
  [
    'spacecraft',
    'Capsule and spacecraft line-up',
    'Capsules, freighters and orbiters at true size — the orbiters lying on the runway, the capsules standing as on their rockets.',
  ],
  [
    'cast',
    'Cartoon cast',
    'A flat-coloured cast at true size — man, woman, child, dog, cat, Terracotta warrior, giant panda, brown bear, giraffe and elephant — standing between the craft.',
  ],
].map(mk('model-lineup', 'Fleet · line-up', '/fleet?category=crewed-spacecraft&view=lineup'));

// Showcase spacecraft that fly on /fly: the inner-solar, small-body and Mars/Moon orbiters, Skylab,
// and the plain builders (no fleet entry) of the early probes — src/lib/three/showcase/{inner-solar,
// small-body,orbiters,early-stations}.ts. Thumbnails: /dev/models cards `showcase-<id>` / `probe-<id>`.
const flyProbes = [
  [
    'parker-solar-probe',
    'Parker Solar Probe',
    'The 3 m Sun-grazer — a 2.3 m carbon-composite heat shield over a slim bus, with two small cooled solar arrays.',
  ],
  [
    'solar-orbiter',
    'Solar Orbiter',
    'ESA’s 3.1 m Sun-watcher — a heat shield on the Sun side, six solar panels spanning 18 m and a 4.4 m instrument boom.',
  ],
  [
    'messenger',
    'MESSENGER',
    'The Mercury orbiter behind its 2.5 m ceramic-cloth sunshade, with two solar arrays and a 3.6 m magnetometer boom.',
  ],
  [
    'magellan',
    'Magellan',
    'The Venus radar mapper at 6.4 m — a ten-sided bus, the Star 48B motor and a 3.7 m high-gain dish.',
  ],
  [
    'akatsuki',
    'Akatsuki',
    'JAXA’s 1.45 m box-shaped Venus orbiter with two solar arrays and a flat phased-array antenna.',
  ],
  [
    'dart',
    'DART',
    'The 2.6 m asteroid-impact spacecraft with two 8.5 m solar arrays, the NEXT-C ion engine and the DRACO camera.',
  ],
  [
    'lucy',
    'Lucy',
    'The Trojan-asteroid explorer, 16 m tip to tip — two circular solar arrays about 7 m across and a 2 m high-gain dish.',
  ],
  [
    'psyche-spacecraft',
    'Psyche',
    'The metal-asteroid orbiter — a 7.3 m craft with 25 m of deployed solar arrays and 2 m instrument booms.',
  ],
  [
    'europa-clipper',
    'Europa Clipper',
    'The 5 m Jupiter-moon orbiter with 30.5 m solar arrays, a 3.1 m high-gain antenna and an 8.5 m magnetometer boom.',
  ],
  [
    'mars-express',
    'Mars Express',
    'ESA’s 1.8 m box bus with two 2.5 m solar wings (about 12 m tip to tip) and a 1.6 m high-gain dish.',
  ],
  [
    'maven',
    'MAVEN',
    'NASA’s 3.47 m Mars-atmosphere orbiter — a 2.3 m cubic bus, two gull-winged arrays with magnetometers at their tips and a 2 m dish.',
  ],
  [
    'mangalyaan',
    'Mangalyaan',
    'ISRO’s Mars Orbiter Mission — a 1.5 m gold-wrapped cube with a three-panel array and a 2.2 m reflector.',
  ],
  [
    'hope',
    'Hope',
    'The UAE’s Emirates Mars Mission orbiter — a 2.9 m hexagonal bus with two solar wings and a 1.85 m dish.',
  ],
  [
    'mariner-9',
    'Mariner 4, 9 and 10 (3 variants)',
    'NASA’s octagonal Mariner family — four solar panels with tip vanes on Mariner 4 and 9; two panels, a sunshade and a 5.8 m magnetometer boom on Mariner 10.',
  ],
  [
    'lro',
    'Lunar Reconnaissance Orbiter',
    'NASA’s 3.9 m Moon mapper — a box bus with a single 10.7 m² solar array and a steerable dish.',
  ],
  [
    'skylab',
    'Skylab',
    'America’s first space station — the Orbital Workshop, airlock and docking adapter, the solar-telescope mount with its windmill of panels, and the sunshade.',
  ],
].map(mk('model-showcase', 'Fly + Explore', '/fly'));
const flyEarlyProbes = [
  [
    'clementine',
    'Clementine, SMART-1, Chang’e 1 and Chandrayaan-1 (4 variants)',
    'One box-bus builder in four sizes — Clementine’s 1.9 m bus, the 1 m SMART-1 cube, Chang’e 1 and a gold-wrapped Chandrayaan-1 — each with its own solar wings and dish.',
  ],
  [
    'lunar-prospector',
    'Lunar Prospector',
    'The 1.36 m drum covered in solar cells, with three 2.5 m instrument booms.',
  ],
  [
    'luna-10',
    'Luna 10',
    'The Soviet 1.5 m pressurised cylinder with four antenna whips and a boom — the first craft to orbit the Moon.',
  ],
  [
    'sputnik-1',
    'Sputnik 1',
    'The polished 58 cm sphere with its hemisphere seam, 36 bolts and four swept-back whip antennas of 2.4 and 2.9 m.',
  ],
].map(mk('model-probe', 'Fly + Explore', '/fly'));

const models3d = [
  ...spacecraft,
  ...launchers,
  ...showcaseCrewed,
  ...showcaseCargo,
  ...lineupLaunchers,
  ...lineupSpacecraft,
  ...flyProbes,
  ...flyEarlyProbes,
  ...moonModels,
  ...marsModels,
  ...venusModels,
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
  {
    title: 'Physics Lab formula registry',
    what: 'The Physics Lab is built on 64 original formula definitions — each with its equation, parameter ranges, fail-honest reasoning, stated assumptions, and computed-figure spec — authored in-house over real physics. The reference constants they compute from (JPL/IAU/EGM96) are cited on the Credits page.',
    where: 'Physics Lab',
    route: '/lab',
  },
  {
    title: 'Physics Lab goals',
    what: '25 original learning-goal ladders that chain the formulas into narrated journeys — from launching a rocket to touching a comet — with a written practical-connection panel for each.',
    where: 'Physics Lab',
    route: '/lab',
  },
  {
    title: 'Physics Lab interface, in 14 languages',
    what: 'Every Lab string — formula titles, parameter labels, assumptions, narration, error states — is originally authored and machine-translated across all 14 supported locales.',
    where: 'Physics Lab',
    route: '/lab',
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

// Lab goal illustrations (G · #536) — generated art behind the Lab's
// illustration register. Only APPROVED assets exist at the canonical path
// (the /dev review flow moves them there); _staging is gitignored + skipped.
const labIllustrations = (() => {
  try {
    return readdirSync('static/images/lab/goals')
      .filter((f) => f.endsWith('.webp') && !isRung(`/images/lab/goals/${f}`))
      .sort()
      .map((f) => ({
        title: humanize(f.replace(/\.webp$/, '')),
        file: `/images/lab/goals/${f}`,
        cover: false,
      }));
  } catch {
    return [];
  }
})();

const manifest = {
  generated_by: 'scripts/build-original-work.mjs',
  anatomy_art: anatomyArt,
  exploded_art: explodedArt,
  landing_art: landingArt,
  blueprint_art: blueprintArt,
  site_illustrations: siteIllustrations,
  lab_illustrations: labIllustrations,
  diagrams_science: science,
  posters,
  models3d,
  capsules: earthCapsules,
  canvas2d,
  ui,
  writing,
  totals: {
    anatomy_art: anatomyArt.length,
    exploded_art: explodedArt.length,
    landing_art: landingArt.length,
    blueprint_art: blueprintArt.length,
    site_illustrations: siteIllustrations.length,
    lab_illustrations: labIllustrations.length,
    diagrams_science: science.length,
    posters: posters.length,
    models3d: models3d.length,
    capsules: earthCapsules.length,
    canvas2d: canvas2d.length,
    ui: ui.length,
    writing: writing.length,
  },
};

writeFileSync('static/data/original-work.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('original-work.json written:', JSON.stringify(manifest.totals));
