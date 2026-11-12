/**
 * Canonical route enumeration — the single source of truth for "every
 * un-localized route the site prerenders".
 *
 * Two consumers:
 *   1. svelte.config.js — feeds `expandLocalizedRoots` to seed the
 *      per-locale prerender crawl.
 *   2. src/lib/sitemap.ts (/sitemaps/<locale>.xml) — emits one <loc> per
 *      locale × route for search engines.
 *
 * Keeping the list here (not inline in svelte.config.js) means the
 * sitemap can never silently drift from what actually gets built.
 *
 * All functions read the same `static/data/*` index files the build
 * already generates (build-science-index etc. run BEFORE `vite build`
 * in the npm `build` script, so the indices exist by config-load and
 * by prerender time). cwd is the project root in both contexts.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// Top-level routes + the enumerable sub-routes the per-locale crawler
// doesn't reliably follow (conditionally-rendered content links). Listed
// explicitly so the per-locale prerender — and the sitemap — stay complete.
const SEED_ROUTES = [
  '/',
  '/explore',
  '/explore/hub',
  '/explore/stars',
  '/worlds',
  '/catalog',
  '/learn',
  '/missions',
  '/missions/launches',
  '/fleet',
  '/plan',
  '/fly',
  '/earth',
  '/moon',
  '/mars',
  '/venus',
  '/iss',
  '/tiangong',
  '/science',
  '/lab',
  '/live',
  '/credits',
  '/privacy',
  '/library',
  '/gallery',
  '/gallery/deep-sky',
  '/library/episodes',
  '/colophon',
  '/posters',
  '/patches',
  '/sourcing',
];

/** Every /science tab + section route, read from the section indexes. */
function scienceRoutes() {
  const root = 'static/data/science';
  /** @type {string[]} */
  const routes = [];
  if (!existsSync(root)) return routes;
  for (const tab of readdirSync(root, { withFileTypes: true })) {
    if (!tab.isDirectory()) continue;
    const idx = `${root}/${tab.name}/_index.json`;
    if (!existsSync(idx)) continue;
    routes.push(`/science/${tab.name}`);
    const { ids } = JSON.parse(readFileSync(idx, 'utf8'));
    for (const id of ids ?? []) routes.push(`/science/${tab.name}/${id}`);
  }
  return routes;
}

/** /programs index + one route per program. */
function programsRoutes() {
  const idxPath = 'static/data/programs/index.json';
  if (!existsSync(idxPath)) return [];
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  const routes = ['/programs'];
  for (const p of idx) routes.push(`/programs/${p.id}`);
  return routes;
}

/** The Long View essays — index + one route per published essay slug. */
function essaysRoutes() {
  const idxPath = 'static/data/essays/index.json';
  if (!existsSync(idxPath)) return [];
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  const routes = ['/essays'];
  for (const e of idx) if (e.status === 'published') routes.push(`/essays/${e.slug}`);
  return routes;
}

/** One indexable page per mission (/missions/<id>, 0.9.8 SEO). */
function missionRoutes() {
  const idxPath = 'static/data/missions/index.json';
  if (!existsSync(idxPath)) return [];
  /** @type {{ id: string }[]} */
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  return idx.map((m) => `/missions/${m.id}`);
}

/** One indexable page per fleet entry (/fleet/<id>, 0.9.8 SEO). */
function fleetRoutes() {
  const idxPath = 'static/data/fleet/index.json';
  if (!existsSync(idxPath)) return [];
  /** @type {{ id: string }[]} */
  const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
  return idx.map((f) => `/fleet/${f.id}`);
}

/** One indexable page per Moon / Mars / Venus site (/<body>/<id>, 0.9.8 SEO). */
function siteRoutes() {
  /** @type {string[]} */
  const routes = [];
  for (const body of ['moon', 'mars', 'venus']) {
    const path = `static/data/${body}-sites.json`;
    if (!existsSync(path)) continue;
    /** @type {{ id: string }[]} */
    const sites = JSON.parse(readFileSync(path, 'utf8'));
    for (const s of sites) routes.push(`/${body}/${s.id}`);
  }
  return routes;
}

/** One indexable page per planet, moon and small body (/explore/<id>, 0.9.8 SEO). */
function bodyRoutes() {
  /** @param {string} p */
  const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
  /** @type {Set<string>} — a Set: Pluto is in planets.json and small-bodies.json */
  const ids = new Set();
  for (const p of read('static/data/planets.json')?.planets ?? []) ids.add(p.name.toLowerCase());
  for (const s of read('static/data/satellites.json')?.satellites ?? []) ids.add(s.id);
  for (const b of read('static/data/small-bodies.json')?.bodies ?? []) ids.add(b.id);
  return [...ids].map((id) => `/explore/${id}`);
}

/**
 * Every id with a star page (/explore/stars/<id>): the named stars plus the exoplanet
 * hosts. Seven hosts are named stars; trappist-1, 51-pegasi, toi-700 and kepler-16 are
 * not, and get a page built from the system record. The one id list that the page's
 * `entries` generator, the mobile prune and the route-list test share.
 *
 * @returns {string[]}
 */
export function starPageIds() {
  /** @param {string} p */
  const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
  const ids = new Set();
  for (const s of read('static/data/universe/named-stars.json')?.stars ?? []) ids.add(s.id);
  for (const s of read('static/data/universe/exoplanet-systems.json')?.systems ?? [])
    ids.add(s.hostId);
  return [...ids];
}

/** One indexable page per named star and exoplanet host (/explore/stars/<id>). */
function starRoutes() {
  return starPageIds().map((id) => `/explore/stars/${id}`);
}

/** One indexable page per Lab formula (/lab/<id>, 0.9.8 SEO). The id list is
 *  guarded against the TS registry by lab-formulas-json.test.ts. */
function labRoutes() {
  const path = 'static/data/lab-formulas.json';
  if (!existsSync(path)) return [];
  /** @type {{ ids: string[] }} */
  const { ids } = JSON.parse(readFileSync(path, 'utf8'));
  return ids.map((id) => `/lab/${id}`);
}

/**
 * All un-localized canonical routes the site ships (no base prefix, no
 * locale prefix). e.g. `['/', '/missions', '/science/physics/kepler', ...]`.
 *
 * @returns {string[]}
 */
export function collectCanonicalRoutes() {
  return [
    ...SEED_ROUTES,
    ...scienceRoutes(),
    ...programsRoutes(),
    ...essaysRoutes(),
    ...missionRoutes(),
    ...fleetRoutes(),
    ...siteRoutes(),
    ...bodyRoutes(),
    ...starRoutes(),
    ...labRoutes(),
  ];
}
