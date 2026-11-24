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
  'hls',
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
const fleetCategory = Object.fromEntries(
  JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8')).map((e) => [e.id, e.category]),
);
// Pencil launcher drawings (docs/anatomy-art-runbook.md §1) that have no fleet entry to say so.
const LAUNCHER_ART_WITHOUT_ENTRY = new Set(['m-v', 'pslv']);
const anatomyKind = (id) =>
  fleetCategory[id] === 'launcher' || LAUNCHER_ART_WITHOUT_ENTRY.has(id)
    ? 'launcher'
    : 'spacecraft';
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
            kind: anatomyKind(id),
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

// Mission trajectory thumbnails — one per mission, drawn in code by scripts/render-mission-thumbnails.ts
// from /fly's own trajectory code (static/images/missions/thumbnails/{id}.webp); ids from the mission
// index so a new mission shows up on the next run; the route opens that mission's panel. The label-free card
// crops in thumbnails/card/ are the same drawings, not listed separately.
const missionTrajectories = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'))
  .map((m) => m.id)
  .sort()
  .filter((id) => existsSync(`static/images/missions/thumbnails/${id}.webp`))
  .map((id) => ({
    title: missionName(id) ?? humanize(id),
    file: `/images/missions/thumbnails/${id}.webp`,
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
  ([id, title, what, whereHere]) => ({
    title,
    what,
    where: whereHere ?? where,
    route,
    thumb: `/images/colophon/${thumb}-${id}.webp`,
  });

// A showcase model shown on its craft's own /fleet/<id> page (and, where `where` says so, on /fly).
// The tuple's 4th element is the fleet id when it differs from the thumbnail id (twins share one).
const WHERE_PAGE = 'Fleet · craft page';
const WHERE_PAGE_FLY = 'Fleet · craft page + Fly';
const WHERE_PAGE_DESCENT = 'Fleet · craft page + Fly descent';
const WHERE_LINEUP_FLY = 'Fleet · line-up + Fly';
const WHERE_LINEUP_DESCENT = 'Fleet · line-up + Fly descent';
const craftPage =
  (where) =>
  ([id, title, what, fleetId]) => ({
    title,
    what,
    where,
    route: `/fleet/${fleetId ?? id}`,
    thumb: `/images/colophon/model-showcase-${id}.webp`,
  });

// Interplanetary spacecraft — built by interplanetary-spacecraft-models.ts. /fly draws the central
// model (fly-craft.ts) wherever it has one; this builder is now only reached by the missions with no
// central model: Huygens (rides the Cassini bus) and New Horizons.
const spacecraft = [
  [
    'cassini',
    'Cassini–Huygens',
    'High-gain dish, RTG booms, and the Huygens probe — Saturn orbiter.',
  ],
  [
    'new-horizons',
    'New Horizons',
    'Compact triangular bus with a single dish — the Pluto flyby probe.',
  ],
].map(mk('craft', 'Fly · launch + cruise', '/fly'));

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
  // Small-body rendezvous craft + Starship.
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

// Earth-orbit re-entry capsules — capsule-models.ts is superseded everywhere: /fly's ascent, orbit and
// descent and the /fleet line-up draw the showcase models below (Crew Dragon included).
const earthCapsules = [];

// Showcase spacecraft — the true-size models (src/lib/three/showcase/*.ts, 148 fleet ids; sister
// variants that look alike share one entry), the line-up scenes themselves and the scale sets drawn
// between the craft (lineup/scale-figures.ts, lineup/cartoon-figures.ts). Crewed and cargo craft
// stand in the /fleet line-up; every other craft is shown in the viewer on its /fleet/<id> page.
// Which of them /fly draws is set by src/lib/three/fly-craft.ts (launch payload, cruise and orbit)
// and descent-landers.ts (descents). Thumbnails: /dev/models cards `showcase-<id>` / `lineup-cast`,
// and live /fleet scenes.
const showcaseCrewed = [
  [
    'soyuz-7k-ok',
    'Soyuz 7K-OK',
    'The first-generation Soyuz at 7.95 m — orbital, descent and service modules, 9.8 m solar wings and the Igla rendezvous antennas.',
    WHERE_LINEUP_FLY,
  ],
  [
    'soyuz-ms',
    'Soyuz T / TM / TMA / MS (4 variants)',
    'The 7.48 m Soyuz across four generations — Igla antennas on the T, Kurs on the TM and TMA, Kurs-NA and a micrometeoroid shield on the MS.',
  ],
  [
    'vostok',
    'Vostok and Voskhod (2 variants)',
    'The 2.3 m sphere on its instrument module, 4.55 m tall (Voskhod 5 m) — a belt of sixteen olive gas bottles with silver straps, hatches and portholes, antenna loops on top, and on the Voskhod the retro pack.',
    WHERE_LINEUP_FLY,
  ],
  [
    'mercury-capsule',
    'Mercury capsule',
    'The 3.3 m one-seat capsule on its retropack — the trapezoid window and side hatch on the cone, three retro rockets held by straps.',
    WHERE_LINEUP_FLY,
  ],
  [
    'gemini',
    'Gemini',
    'The 5.74 m two-seat craft — the shingled black re-entry cone with its two hatches and windows over the RCS, rendezvous and recovery sections and the retro adapter.',
    WHERE_LINEUP_FLY,
  ],
  [
    'crew-dragon',
    'Crew Dragon',
    'The 8.1 m capsule-and-trunk stack — the white gumdrop capsule with its trapezoid hatch, four windows and SuperDraco bays over the dark PICA-X heat shield, on a trunk with a wrapped cell patch and two radiator fins, under the white hinged nose cone.',
    WHERE_LINEUP_FLY,
  ],
  [
    'starliner',
    'Starliner (CST-100)',
    'Boeing’s 5.03 m capsule and service module — a broad low cone in white silver with blue stripes and the NASA roundel, over a drum with four doghouse thruster pods.',
  ],
  [
    'gaganyaan',
    'Gaganyaan',
    'ISRO’s 5.58 m crew module and service module — a blunt white cone panelled in copper-brown tape with a trapezoid hatch and three portholes, over a drum in gold foil with two solar wings.',
  ],
  [
    'mengzhou',
    'Mengzhou',
    'China’s 8.8 m crewed craft for the Moon — a grey-silver conical crew module with a red band over a white service module with gold thruster frames, two long cell wings and four engine bells.',
  ],
  [
    'orion',
    'Orion',
    'The 7.9 m Artemis stack — the white tiled crew module over its dark heat shield, the European service module with four X-wing solar arrays, and the spacecraft adapter ring below.',
  ],
  [
    'new-shepard',
    'New Shepard',
    'The 19.2 m suborbital vehicle on the pad — a white booster with a black engine skirt, blue band, ring fin, three tail fins and four legs, under the crew capsule with its six large windows.',
  ],
  [
    'apollo-csm-block-ii',
    'Apollo CSM Block I / II (2 variants)',
    'The command and service module at 10.6 and 11 m — the cone in reflective silver with five windows and (Block II) the docking probe, over the polished-aluminium service module with its white radiators, RCS quads and the engine bell.',
    WHERE_LINEUP_FLY,
  ],
  [
    'apollo-lm',
    'Apollo LM (true size)',
    'The Lunar Module landed — the octagonal descent stage in crinkled gold and amber foil on four gold-wrapped legs, the faceted ascent stage with two triangular windows, RCS quads, rendezvous radar and S-band dish.',
    WHERE_LINEUP_DESCENT,
  ],
  [
    'shenzhou',
    'Shenzhou',
    'China’s 9.25 m three-module craft in the Soyuz lineage — a quilted silver orbital module, the bell-shaped re-entry module on its dark ablative base and the white service module with maroon skirt, orange thruster blocks and two wings.',
    WHERE_LINEUP_FLY,
  ],
  [
    'space-shuttle-orbiter',
    'Space Shuttle orbiter',
    'One 37.2 m orbiter drawn once for the four sisters — Atlantis, Challenger, Discovery and Endeavour — white upper fuselage with its payload-bay doors, black-tile belly, double-delta wing with reinforced carbon edges, OMS pods and three main engines, lying on the runway.',
    WHERE_LINEUP_FLY,
  ],
  [
    'columbia',
    'Space Shuttle Columbia',
    'The first orbiter — the only one with black chines on the wing tops, and the instrument pod on its tail fin.',
    WHERE_LINEUP_FLY,
  ],
  [
    'enterprise',
    'Space Shuttle Enterprise',
    'The atmospheric test orbiter — charcoal simulated tiles of foam and paint and plain white fibreglass wing edges in place of the flown tiles and carbon.',
  ],
  [
    'buran',
    'Buran',
    'The Soviet orbiter at 36.4 m — a 24 m double-delta wing and two OMS nozzles in the tail, its main engines left on the Energia core.',
  ],
  [
    'buran-ok-gli',
    'Buran OK-GLI',
    'The atmospheric test vehicle with Buran’s shape and mass, in painted white and grey with no tiles — its jet engines in a nacelle on each side of the fin base.',
  ],
  [
    'x37b',
    'X-37B',
    'The U.S. Space Force’s 8.92 m uncrewed spaceplane with its 4.55 m wingspan — black-tile underside and nose, canted tail, closed bay doors.',
    WHERE_LINEUP_FLY,
  ],
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
    'The windowless uncrewed Dragon 2 on its 8.1 m trunk — cover plates where the crew version has windows and SuperDraco bays.',
  ],
  [
    'cargo-dragon-v1',
    'Dragon 1',
    'The original 6.1 m cargo Dragon — a squat capsule 3.7 m across with four Draco quads and a white nose cone, on a 2.3 m trunk with two solar wings.',
  ],
  [
    'cygnus-enhanced',
    'Cygnus Standard / Enhanced (2 variants)',
    'Northrop Grumman’s freighter at 5.14 and 6.39 m — a bare-aluminium cargo module in pocketed panels over a gold-and-silver service module, with flat rectangular wings on the Standard and round UltraFlex arrays on the Enhanced.',
  ],
  [
    'htv',
    'HTV (Kounotori)',
    'Japan’s 9.8 m station freighter — a white propulsion module, a silver avionics section, an open pallet bay and the white pressurised carrier with dark body-mounted cells.',
  ],
  [
    'htv-x',
    'HTV-X',
    'Japan’s 8 m successor freighter — a gold-blanketed pressurised module, an open cargo-support deck, a silver service module and two long narrow arrays.',
  ],
  [
    'atv',
    'ATV',
    'ESA’s 10.3 m Automated Transfer Vehicle — a gold aft cone with four engines under the quilted white cargo carrier and its docking ring, with four copper-edged wings in an X.',
  ],
  [
    'tianzhou',
    'Tianzhou',
    'China’s 10.6 m cargo ship — a white propulsion drum with orange thruster blocks, a larger grey-white cargo module, the relay dish and two big wings.',
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

// Showcase craft with a /fleet/<id> page viewer and a model on /fly (src/lib/three/fly-craft.ts):
// the inner-solar and small-body probes, Mars and Moon orbiters and Skylab.
const flyProbes = [
  [
    'parker-solar-probe',
    'Parker Solar Probe',
    'The 3 m Sun-grazer — a 2.3 m carbon-composite heat shield on struts over a gold-blanketed bus, with two small actively cooled solar arrays and a 0.6 m dish.',
  ],
  [
    'solar-orbiter',
    'Solar Orbiter',
    'ESA’s 3.1 m Sun-watcher — a layered black heat shield with observing-port doors in front of a silver-blanketed body, six solar panels spanning 18 m, a 4.4 m instrument boom and a 1.5 m dish on the shaded rear.',
  ],
  [
    'messenger',
    'MESSENGER',
    'The Mercury orbiter behind its 2.5 m ceramic-cloth sunshade, on a blanketed box bus with its propellant tanks showing, two rotatable solar arrays and a 3.6 m magnetometer boom.',
  ],
  [
    'magellan',
    'Magellan',
    'The Venus radar mapper at 6.4 m — the Star 48B motor under a ten-sided bus, a gold-blanketed equipment module and a 3.7 m high-gain dish, with two square solar panels.',
  ],
  [
    'akatsuki',
    'Akatsuki',
    'JAXA’s 1.45 m gold-blanketed box Venus orbiter with a camera deck on the Venus-facing side, a flat phased-array antenna, white thruster cups and two arrays of two stacked panels.',
  ],
  [
    'dart',
    'DART',
    'The 2.6 m asteroid-impact spacecraft — two 8.5 × 2.4 m roll-out solar arrays, the NEXT-C ion engine, the DRACO camera, the LICIACube cubesat in its dispenser and a flat-plate antenna.',
  ],
  [
    'lucy',
    'Lucy',
    'The Trojan-asteroid explorer, 16 m tip to tip — two circular solar arrays about 7 m across, a 2 m high-gain dish and an instrument platform with the terminal tracking cameras.',
  ],
  [
    'psyche-spacecraft',
    'Psyche',
    'The metal-asteroid orbiter — a 7.3 m craft with two five-panel cruciform solar arrays (25 m deployed), four Hall thrusters in a 2 × 2 cluster and 2 m instrument booms.',
  ],
  [
    'europa-clipper',
    'Europa Clipper',
    'The 5 m Jupiter-moon orbiter — a propulsion module and radiation vault under a 3.1 m dish, 30.5 m of solar arrays carrying the REASON radar dipoles, and an 8.5 m magnetometer boom.',
  ],
  [
    'mars-express',
    'Mars Express',
    'ESA’s 1.8 m box bus with gold-blanketed corners and its instruments on the nadir face, two wings of four narrow panels and a 1.6 m high-gain dish.',
  ],
  [
    'maven',
    'MAVEN',
    'NASA’s 3.47 m Mars-atmosphere orbiter — a 2.3 m cubic bus, a payload platform on its boom, two gull-winged arrays with magnetometers at their tips and a 2 m dish.',
  ],
  [
    'mangalyaan',
    'Mangalyaan',
    'ISRO’s Mars Orbiter Mission — a 1.5 m gold-wrapped cube with its propellant-tank dome on top, a three-panel array on a boom and a 2.2 m reflector on the other side.',
  ],
  [
    'hope',
    'Hope',
    'The UAE’s Emirates Mars Mission orbiter — a 2.9 m bus with its science deck on the front face, two wings of three panels and a 1.85 m dish on a trussed bracket.',
  ],
  [
    'mariner-9',
    'Mariner 4, 9 and 10 (3 variants)',
    'NASA’s octagonal Mariner family — four panels with tip vanes on Mariner 4 and 9 (Mariner 9 under a foil-wrapped propulsion module); two panels, a sunshade and a 5.8 m magnetometer boom on Mariner 10.',
  ],
  [
    'lro',
    'Lunar Reconnaissance Orbiter',
    'NASA’s 3.9 m Moon mapper — a gold-and-silver blanketed box bus with two LROC cameras, LOLA, Diviner and Mini-RF on the nadir face, a single 10.7 m² solar array on a boom and a steerable dish.',
  ],
  [
    'skylab',
    'Skylab',
    'America’s first space station as repaired — the black-skirted Orbital Workshop with its single wing and gold parasol, the airlock and docking adapter, and the Apollo Telescope Mount swung out with its four-blade windmill of panels.',
  ],
].map(craftPage(WHERE_PAGE_FLY));
const flyEarlyProbes = [
  [
    'sputnik-1',
    'Sputnik 1',
    'The polished 58 cm sphere with its hemisphere seam, 36 bolts and four swept-back whip antennas of 2.4 and 2.9 m.',
  ],
  [
    'nova-c',
    'Nova-C (IM-1 Odysseus)',
    'Intuitive Machines’ 4.3 m lunar lander — a 1.57 m hexagonal body, six legs, the methane engine below and three solar panels. Height and width from Wikipedia; the leg splay and deck are schematic.',
  ],
].map(mk('model-probe', 'Fly', '/fly'));

// Lunar orbiters (lunar-orbiters.ts, mars-orbiters.ts hold the older Mars ones below): foil-wrapped
// bus, real array layout and dish. /fly draws them in cruise and orbit; the five Lunar Orbiters
// have no /fly mission.
const lunarOrbiters = [
  [
    'chandrayaan1',
    'Chandrayaan-1',
    'ISRO’s first Moon orbiter — a box bus with white radiator patches and gold-ringed instrument apertures, a 0.7 m dish on a gold boom and one solar panel on a two-bar yoke.',
  ],
  [
    'chandrayaan2',
    'Chandrayaan-2 orbiter',
    'The orbiter that carried Vikram — a bus with a gold drum rising from the top deck where the lander sat, white taped patches over its radiators and one two-panel solar wing.',
  ],
  [
    'change1',
    'Chang’e 1 and 2 (2 variants)',
    'China’s lunar orbiters — an engine bell under the bus, silver inset panels, two white relay dishes, a 0.8 m steerable dish on an arm and two three-panel wings on gold yokes.',
  ],
  [
    'clementine',
    'Clementine',
    'The prism-shaped lunar mapper — a sensor face with camera and lidar apertures, 12 attitude jets, a 1.07 m dish opening downward and two wings of two panels.',
  ],
  [
    'kaguya',
    'Kaguya (SELENE)',
    'JAXA’s 4.8 m lunar orbiter — the relay and VLBI sub-satellites on its front face, a high-gain dish on a tripod and mast and a solar paddle of three blue panels on a gold truss.',
  ],
  [
    'luna10',
    'Luna 10',
    'The Soviet 1.5 m orbiter — the braking-engine module in a white lattice skirt, cream propellant tanks and a polished pressurised instrument drum with four whip antennas and two mushroom sensors.',
  ],
  [
    'lunar-prospector',
    'Lunar Prospector',
    'The 1.36 m drum covered in solar cells under a white nose cone, with three 2.5 m instrument booms.',
  ],
  [
    'smart-1',
    'SMART-1',
    'ESA’s 1 m ion-drive orbiter — the PPS-1350 thruster on a gimbal arm, an instrument ring with its camera and spectrometers, a 0.3 m dish and two wings of three panels.',
  ],
].map(craftPage(WHERE_PAGE_FLY));
const lunarOrbiterOnly = [
  [
    'lunar-orbiter-1',
    'Lunar Orbiter 1–5 (5 variants)',
    'NASA’s five camera orbiters — a bright thermal shell round the camera with its 80 mm and 610 mm lenses, four propellant tanks on truss legs, four solar panels and a 1 m dish on its boom.',
  ],
].map(craftPage(WHERE_PAGE));

// Lunar landers and rovers (lunar-landers-east/west.ts, lunar-module.ts). Those the /fly descent
// draws (descent-landers.ts DETAILED) say so.
const lunarLanders = [
  [
    'luna-9',
    'Luna 9 (true size)',
    'The 58 cm landed capsule — the sealed instrument hemisphere left standing among four flopped-open petals, with the TV camera head and four rod antennas on top.',
  ],
  [
    'luna-16',
    'Luna 16 and 24 (2 variants)',
    'The sample-return lander — a gold-wrapped hull between two torus tanks with four pressure spheres on four legs, the drill rig, and the 2 m sphere-topped ascent stage on top.',
  ],
  [
    'lunokhod-1',
    'Lunokhod 1 and 2 (2 variants)',
    'The Soviet rover — a round tub on eight wire-mesh wheels under an open dome lid, with the finned polonium-210 heat source at the back, the French corner reflector and four whip antennas.',
  ],
  [
    'change-3',
    'Chang’e 3 and 4 (2 variants)',
    'The Chinese lander — a boxy gold body on four legs with the rover ramps, tilted solar wings and a camera mast carrying the steerable dish.',
  ],
  [
    'change-5',
    'Chang’e 5 and 6 (2 variants)',
    'The sample-return stack — a gold octagonal ascender on the lander, with the drill tower, the folded sampling arm and the sample container beside it.',
  ],
  [
    'vikram-cy3',
    'Vikram (Chandrayaan-2 and -3, 2 variants)',
    'ISRO’s lander in its Chandrayaan-3 configuration — four engines and solar panels on three sides and the top, with the ramp down and the Pragyan rover part-way along it.',
  ],
  [
    'slim',
    'SLIM (true size)',
    'JAXA’s Moon Sniper — a 1.5 × 1.5 × 2 m prism in crumpled gold foil with a golden dome at the engine end, one strip of solar cells down a side and five round crush pads on struts.',
  ],
  [
    'beresheet',
    'Beresheet (true size)',
    'SpaceIL’s lander, 2 m across and 1.5 m high — a black deck rimmed in gold over a silver tube-frame tub with four copper tanks, four long legs and tilted blue solar plates.',
  ],
  [
    'blue-moon-mk1',
    'Blue Moon MK1 (true size)',
    'Blue Origin’s 8.05 m lander — a hull of gold and amber foil on a pale truss base carrying the BE-7, ladder-truss legs, two tall solar-cell strips and an open octagonal cage on top.',
  ],
].map(craftPage(WHERE_PAGE_DESCENT));
const lunarRovers = [
  ['pragyan', 'Pragyan', 'The six-wheeled ISRO rover that rolls down Vikram’s ramp.'],
].map(craftPage(WHERE_PAGE_DESCENT));
const lunarRoversOnly = [
  [
    'yutu',
    'Yutu and Yutu-2 (2 variants)',
    'The Chinese rover — a rocker-bogie on each side, a gold-wrapped warm box under a tilted solar panel, a camera mast, the arm folded under the nose and a steerable dish at the rear.',
  ],
].map(craftPage(WHERE_PAGE));

// Mars landers and rovers (mars-landers.ts, mars-rovers.ts, rovers.ts), then the Mars and
// inner-planet orbiters (mars-orbiters.ts).
const marsLandersShowcase = [
  [
    'viking-1',
    'Viking landers (3 variants)',
    'The tripod-legged NASA lander — a six-sided deck alternately 1.09 and 0.56 m wide, gold terminal-descent pods of 18 nozzles, the sampler arm and cameras on the long forward side.',
  ],
  [
    'mars-3',
    'Mars 2, 3 and 6 landers (3 variants)',
    'The Soviet white sphere on four opened petals — an antenna crown of four rods, two stereo-camera ears, and the PrOP-M rover on skis tethered beside it.',
  ],
  [
    'phoenix',
    'Phoenix and Mars Polar Lander (2 variants)',
    'The solar lander on its deck — TEGA’s two ovens, MECA’s wet-chemistry cells, the robotic arm with its scoop, the stereo camera on a lattice tower and the weather mast with its lidar.',
  ],
  [
    'insight',
    'InSight (true size)',
    'The geophysics lander — the 1.8 m arm out over the ground, SEIS under its silver wind and thermal shield, and the HP3 mole deployed beside it.',
  ],
  [
    'schiaparelli',
    'Schiaparelli (true size)',
    'ESA’s entry demonstrator on the ground — a flat dark honeycomb crush disc ringed by a silver-gold band, three propellant tanks on struts and the DREAMS platform with its gold UHF coil.',
  ],
  [
    'beagle2',
    'Beagle 2 (true size)',
    'The clamshell lander opened — a gold lid dish ringed by four dark solar petals, the gold bowl base with the arm lifting out and the PAW drum of instruments.',
  ],
].map(craftPage(WHERE_PAGE_DESCENT));
const marsRoversShowcase = [
  [
    'curiosity',
    'Curiosity (true size)',
    'The MSL rover — six wheels on a rocker-bogie, the mast with the ChemCam head and Mastcam pair, the finned MMRTG between two white heat exchangers and the stowed arm across the front.',
  ],
  [
    'spirit',
    'Spirit and Opportunity (2 variants)',
    'The Mars Exploration Rover — a gold warm box under a flat blue-black solar deck with four wing panels, the Pancam mast with its camera bar, a round gold dish on a stalk and six small wheels.',
  ],
  [
    'perseverance',
    'Perseverance',
    'Curiosity’s layout with straight-cleat wheels — the Mastcam-Z and SuperCam head, the large coring turret, the caching bay under the front and Ingenuity under the belly.',
  ],
  [
    'zhurong',
    'Zhurong',
    'China’s rover — a wide silver deck with four butterfly solar wings, a tall mast with its camera box, two small dishes and ribbed wheels on tall legs.',
  ],
].map(craftPage(WHERE_PAGE_DESCENT));
const marsOther = [
  [
    'sojourner',
    'Sojourner',
    'The first Mars rover — aluminium wheels with stainless cleats on a rocker-bogie, a gold-brown warm box under a dark solar panel, the stereo camera pair and the APXS drum.',
  ],
  [
    'exomars-rosalind-franklin',
    'ExoMars Rosalind Franklin',
    'ESA’s walking-chassis rover — a wheel on every leg, two wide solar wings, the gold PanCam bar on its mast and the drill box at the front.',
  ],
  [
    'lrv-apollo',
    'Apollo Lunar Roving Vehicle',
    'The open aluminium frame on wire-mesh wheels with titanium chevrons under tan fenders — two tube seats, the T-handle and console, the umbrella dish and the tool pallet at the back.',
  ],
].map(craftPage(WHERE_PAGE));
const marsOrbitersFly = [
  [
    'mro',
    'Mars Reconnaissance Orbiter',
    'NASA’s Mars mapper — two 5.35 × 2.53 m solar arrays, the 3 m high-gain dish, the 1.6 m HiRISE barrel and the 10 m SHARAD dipole. Dish, HiRISE and SHARAD sizes from NASA; the array size from Wikipedia; the bus is schematic.',
  ],
  [
    'mariner-2',
    'Mariner 2',
    'NASA’s 3.66 m Venus flyby — the 1.04 m hexagonal bus, two solar panels (one with its solar-pressure extension, 5.05 m across), the dish on its arm and the omni antenna atop the pyramid mast. Sizes from NASA NSSDCA; the dish and mast are schematic.',
  ],
  [
    'bepicolombo',
    'BepiColombo (true size)',
    'The stacked cruise configuration at 6.4 m — the Mercury Transfer Module with four ion thrusters and two black-and-blue wings of four panels, carrying the Mercury orbiter and Mio inside its sunshield cylinder.',
  ],
].map(craftPage(WHERE_PAGE_FLY));
const marsOrbiters = [
  [
    'exomars-tgo',
    'ExoMars Trace Gas Orbiter',
    'ESA–Roscosmos orbiter — the engine bell and nadir hardware, NOMAD and ACS spectrometers on the anti-Earth face, two two-panel arrays and a 2.2 m dish on a boom.',
  ],
  [
    'mars-odyssey',
    'Mars Odyssey',
    'NASA’s orbiter — folded blanket flaps on the corners, THEMIS and the cameras on the front, a 6 m lattice boom carrying the gamma-ray spectrometer, one three-panel array and a 1.3 m dish.',
  ],
  [
    'mars2-orbiter',
    'Mars 2 and 3 orbiters (2 variants)',
    'The Soviet M-71 bus — a banded tank barrel with its spheres, a collar carrying the black aeroshell cone and the lander capsule on top, a 2.5 m shallow dish and two big rectangular solar panels.',
  ],
  [
    'phobos-2',
    'Phobos 2',
    'The Soviet probe — four white propellant spheres round the engine, a toroidal instrument belt, a central core with equipment boxes and two horizontal solar panels on outriggers.',
  ],
  [
    'tianwen-1',
    'Tianwen-1',
    'China’s Mars orbiter with the entry capsule on top — two three-panel arrays, a medium-gain dish of about 2.5 m and slender antenna rods.',
  ],
  [
    'viking1-orbiter',
    'Viking orbiter',
    'The orbiter with the lander capsule under its white domed shell — an octagonal bus ring of eight bays, four solar panels on yokes, a 1.5 m gold dish and a scan platform with two cameras.',
  ],
].map(craftPage(WHERE_PAGE));

// Space observatories (observatories.ts): each standing with arrays and sunshields deployed.
const observatories = [
  [
    'hubble',
    'Hubble (true size)',
    'The observatory — a crinkled silver light shield with the open aperture door and the two rigid solar wings.',
  ],
  [
    'jwst',
    'JWST (true size)',
    'Eighteen gold hexagonal mirror segments on their tripod over the five-layer sunshield.',
  ],
  [
    'chandra',
    'Chandra (true size)',
    'The X-ray observatory — a long tapered tube with its two solar wings.',
  ],
  [
    'spitzer',
    'Spitzer',
    'The infrared telescope — a single tilted solar panel against the cryostat tube.',
  ],
  ['kepler', 'Kepler', 'The planet hunter — an amber-wrapped barrel with its fixed solar panel.'],
  ['tess', 'TESS', 'The transit survey craft — four hooded cameras on a compact bus.'],
  [
    'gaia',
    'Gaia (true size)',
    'ESA’s astrometry observatory — a 10 m sunshield skirt round the bus.',
  ],
  ['euclid', 'Euclid', 'ESA’s dark-universe telescope — the baffle behind the solar-array shield.'],
  [
    'xmm-newton',
    'XMM-Newton (true size)',
    'ESA’s X-ray telescope — a long tube ending in the mirror-module face.',
  ],
  [
    'compton-gro',
    'Compton Gamma Ray Observatory',
    'The gamma-ray observatory — a boxy instrument deck with its detectors.',
  ],
  [
    'hitomi',
    'Hitomi',
    'JAXA’s X-ray satellite — the extended optical bench carrying the telescopes.',
  ],
  [
    'spektr-rg',
    'Spektr-RG',
    'The Russian–German X-ray observatory — the seven-module eROSITA beside the ART-XC tube.',
  ],
].map(craftPage(WHERE_PAGE));

// Outer-planet and deep-space craft (outer-probes.ts, probes.ts): /fly draws them in launch and
// cruise (fly-craft.ts), and the probes, landers and samplers in the descents too.
const outerProbes = [
  [
    'voyager-1',
    'Voyager 1 and 2 (2 variants)',
    'The Grand Tour bus — a 3.7 m dish on a ten-sided body, an RTG boom of three generators end to end, the science boom with its scan platform and the 13 m magnetometer boom.',
  ],
  [
    'pioneer-10',
    'Pioneer 10 and 11 (2 variants)',
    'The spin-stabilised pair — a 2.74 m dish over the equipment compartment, two 3 m RTG booms at 120 degrees and a 6.6 m magnetometer boom.',
  ],
  [
    'juno',
    'Juno (true size)',
    'Jupiter’s polar orbiter — the titanium radiation vault under the bus, a 2.5 m dish on top and three solar wings at 120 degrees.',
  ],
  [
    'juice',
    'JUICE (true size)',
    'ESA’s Jupiter icy-moons orbiter — a white tank skirt on the thrust cone, a fixed 2.5 m dish, two wings of three 3.9 × 2.2 m panels and a 10.6 m magnetometer boom.',
  ],
  [
    'dawn',
    'Dawn (true size)',
    'The ion-drive orbiter of Vesta and Ceres — three ion thrusters, a 1.24 m dish and two wings of five panels, 19.7 m across.',
  ],
  [
    'ulysses',
    'Ulysses (true size)',
    'The solar polar probe — a 1.65 m dish over the top, the finned GPHS-RTG on a stand at the side and an experiment boom.',
  ],
  [
    'giotto',
    'Giotto (true size)',
    'The Halley flyby — a drum of dark solar-cell strips with gold bands, the Whipple dust shield on top and the tilted 1.47 m despun dish on its white cone mount.',
  ],
].map(craftPage(WHERE_PAGE_FLY));
const descentProbes = [
  [
    'cassini',
    'Cassini–Huygens (true size)',
    'The Saturn orbiter — a gold decagon with its two main engines, the 4 m high-gain antenna, three RTGs on outriggers and the Huygens probe on its truss at the side.',
  ],
  [
    'galileo',
    'Galileo (true size)',
    'The dual-spin Jupiter orbiter — a despun section with the scan platform, the spun drum with its louvres, the umbrella high-gain antenna, two RTG booms and a 10.9 m magnetometer boom.',
  ],
  [
    'rosetta',
    'Rosetta (true size)',
    'A box bus under silver-grey foil with black and gold patches, a 2.2 m dish, two five-panel solar wings of 14 m and Philae on the back wall.',
  ],
  [
    'hayabusa',
    'Hayabusa and Hayabusa2 (2 variants)',
    'The asteroid sample-return craft — the sampler horn on its bellows, four ion engines, the return capsule and three-panel wings; Hayabusa2 adds the carry-on impactor and the MINERVA-II hoppers.',
  ],
  [
    'osiris-rex',
    'OSIRIS-REx (true size)',
    'The Bennu sample-return craft — a 1.2 m dish, a 1.9 × 2.4 m solar panel each side and the 3.35 m TAGSAM arm reaching out over the front.',
  ],
  [
    'venera-7',
    'Venera 7 and 13 (2 variants)',
    'The Soviet Venus bus — a white engine drum with rows of holes, a tank bay with its spheres showing, six struts holding the ablator-shelled descent sphere, a mesh dish on a mast and two solar wings.',
  ],
  [
    'vega-1',
    'Vega 1 and 2 (2 variants)',
    'The Venus-and-Halley bus — the Venera layout with the balloon canister on the descent sphere’s crown.',
  ],
].map(craftPage(WHERE_PAGE_FLY));

// Launch pads (G4) — src/lib/three/launch-pads.ts, drawn under the rocket in the /fly launch
// scene; one entry per pad model, from the catalogue the /dev/models gallery also reads.
const launchPads = JSON.parse(readFileSync('src/lib/launches/pad-gallery.json', 'utf8'))
  .map((p) => [p.variant, p.label, p.what])
  .map(mk('model-pad', 'Fly · launch pad', '/fly'));

const models3d = [
  ...spacecraft,
  ...launchers,
  ...showcaseCrewed,
  ...showcaseCargo,
  ...lineupLaunchers,
  ...lineupSpacecraft,
  ...flyProbes,
  ...flyEarlyProbes,
  ...lunarOrbiters,
  ...lunarOrbiterOnly,
  ...lunarLanders,
  ...lunarRovers,
  ...lunarRoversOnly,
  ...marsLandersShowcase,
  ...marsRoversShowcase,
  ...marsOther,
  ...marsOrbitersFly,
  ...marsOrbiters,
  ...observatories,
  ...outerProbes,
  ...descentProbes,
  ...launchPads,
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
  mission_trajectories: missionTrajectories,
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
    mission_trajectories: missionTrajectories.length,
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
