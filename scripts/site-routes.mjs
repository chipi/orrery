/**
 * Canonical route enumeration — the single source of truth for "every
 * un-localized route the site prerenders".
 *
 * Two consumers:
 *   1. svelte.config.js — feeds `expandLocalizedRoots` to seed the
 *      per-locale prerender crawl.
 *   2. src/routes/sitemap.xml/+server.ts — emits one <loc> per
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
  '/live',
  '/credits',
  '/library',
  '/gallery',
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

/**
 * All un-localized canonical routes the site ships (no base prefix, no
 * locale prefix). e.g. `['/', '/missions', '/science/physics/kepler', ...]`.
 *
 * @returns {string[]}
 */
export function collectCanonicalRoutes() {
  return [...SEED_ROUTES, ...scienceRoutes(), ...programsRoutes(), ...essaysRoutes()];
}
