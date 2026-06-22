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
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

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
  return readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()
    .map((f) => ({
      title: humanize(f),
      file: `${urlBase}/${f}`,
      cover: f.startsWith('_cover-'),
    }));
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
        return { title: fleetNames[id] ?? humanize(id), file: `/images/anatomy/${f}`, cover: false };
      });
  } catch {
    return [];
  }
})();

// Curated, non-previewable categories. `route` is where the graphic is
// drawn live; `where` is a human label for the surface.
const models3d = [
  {
    title: 'Apollo Lunar Module',
    what: 'Engineering-accurate descent + ascent stage, gold MLI foil and RCS quads.',
    where: 'Moon landing sites · Fly',
    route: '/moon',
  },
  {
    title: 'Mars rovers (Curiosity, Perseverance, Zhurong)',
    what: 'Rocker-bogie chassis, mast, and RTG / solar configurations per mission.',
    where: 'Mars landing sites',
    route: '/mars',
  },
  {
    title: 'Historical landers',
    what: 'Luna 9, Viking, Pathfinder + Sojourner, Beagle 2, Beresheet, Chandrayaan-3, SLIM, Schiaparelli, Mars 3.',
    where: 'Moon + Mars landing sites',
    route: '/mars',
  },
  {
    title: 'ISS proxy model',
    what: 'Truss, modules, and solar arrays built from the station module schema.',
    where: 'ISS orbital scene',
    route: '/iss',
  },
  {
    title: 'Tiangong proxy model',
    what: 'T-configuration core + lab modules and steerable arrays.',
    where: 'Tiangong orbital scene',
    route: '/tiangong',
  },
  {
    title: 'Station module geometry',
    what: 'Parametric cylinders, trusses, and panels rendered per module descriptor.',
    where: 'ISS + Tiangong detail',
    route: '/iss',
  },
  {
    title: 'Earth satellite models',
    what: 'Hubble, JWST, and generic bus + panel builds keyed to operator agency.',
    where: 'Earth orbital markers',
    route: '/earth',
  },
  {
    title: 'Earth launch facilities',
    what: 'Gantry + pad spires for Kennedy, Baikonur, Jiuquan, and others.',
    where: 'Earth surface markers',
    route: '/earth',
  },
  {
    title: 'Interplanetary spacecraft',
    what: 'Cruise-stage probe bodies with antenna + panels for trajectory scenes.',
    where: 'Fly + Explore',
    route: '/fly',
  },
  {
    title: 'Orbit overlays',
    what: 'Sphere-of-influence shells, gravity-vector arrows, and conic arcs.',
    where: 'Fly orbit lens',
    route: '/fly',
  },
  {
    title: 'Microgravity axes',
    what: 'Six labelled arrows marking the station local frame (zenith/nadir…).',
    where: 'ISS + Tiangong science lens',
    route: '/iss',
  },
  {
    title: 'Orbiter rings + marker halos',
    what: 'Inclination-tilted altitude rings and selection glow halos.',
    where: 'Earth · Moon · Mars',
    route: '/earth',
  },
  {
    title: 'Layered star fields + skydomes',
    what: 'Three-population star sampling with a squashed Milky Way band.',
    where: 'All 3D scenes',
    route: '/explore',
  },
  {
    title: 'Iconic mission trajectories',
    what: 'Voyager, Pioneer, New Horizons, Cassini, Juno, Dawn flight paths.',
    where: 'Explore',
    route: '/explore',
  },
  {
    title: 'Sun lens flare + galaxies layer',
    what: 'Screen-space flare ghosts and a distant galaxy point cloud.',
    where: 'Fly · Explore',
    route: '/explore',
  },
];

const canvas2d = [
  {
    title: '2D system map',
    what: 'Top-down orrery with shaded planets, glow, orbit rings, and Saturn’s rings.',
    where: 'Explore 2D mode',
    route: '/explore',
  },
  {
    title: 'Porkchop Δv heatmap',
    what: 'Departure × time-of-flight grid colour-mapped from a Lambert solver.',
    where: 'Plan a transfer',
    route: '/plan',
  },
  {
    title: 'Station blueprints',
    what: 'Orthographic top / side projections of every station module.',
    where: 'ISS + Tiangong',
    route: '/iss',
  },
  {
    title: 'Surface-map nation legend',
    what: 'Auto-spaced agency colour key drawn onto the flat surface maps.',
    where: 'Moon + Mars 2D',
    route: '/moon',
  },
  {
    title: '3D text-label sprites',
    what: 'Canvas-rendered name tags billboarded onto objects in every scene.',
    where: 'Earth · Moon · Mars · Explore',
    route: '/earth',
  },
];

const ui = [
  {
    title: 'Landing-page hero',
    what: 'Hand-built SVG orrery poster — sun corona gradients, orbits, two mission arcs.',
    where: 'Home',
    route: '/',
  },
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

const writing = [
  {
    title: 'Audio tour scripts',
    what: 'Every guided + extended tour episode is originally written for Orrery; only the text-to-speech voices are third-party (credited on the Credits page).',
    where: 'Take the tour',
    route: '/credits',
  },
  {
    title: 'Science encyclopedia',
    what: 'The /science explainers, captions, and figure copy are original writing.',
    where: 'Science',
    route: '/science',
  },
];

const manifest = {
  generated_by: 'scripts/build-original-work.mjs',
  anatomy_art: anatomyArt,
  diagrams_science: science,
  models3d,
  canvas2d,
  ui,
  writing,
  totals: {
    anatomy_art: anatomyArt.length,
    diagrams_science: science.length,
    models3d: models3d.length,
    canvas2d: canvas2d.length,
    ui: ui.length,
    writing: writing.length,
  },
};

writeFileSync('static/data/original-work.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('original-work.json written:', JSON.stringify(manifest.totals));
