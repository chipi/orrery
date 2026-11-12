#!/usr/bin/env node
/**
 * build-route-lastmod.mjs — write src/lib/generated/route-lastmod.json, the
 * per-route, per-locale `<lastmod>` the sitemaps (src/lib/sitemap.ts) emit.
 *
 *   npm run route-lastmod   # regenerate (release PR step)
 *
 * WHY a committed manifest: CI builds from a depth-1 checkout and the prod web
 * image is built from a Docker context without .git, so the build cannot ask git
 * when a page last changed, and a build-date lastmod is worse than none (Google
 * ignores a lastmod that does not track real change). So the dates are computed
 * HERE, on a full-history checkout, and committed. This script REFUSES a
 * shallow clone. CI cannot verify freshness (it is shallow); the gate there is
 * src/lib/route-lastmod.test.ts (every canonical route has a valid entry).
 *
 * lastmod(route, locale) = the latest commit date (committer date, UTC,
 * YYYY-MM-DD) among the files the page's CONTENT comes from, one `git log
 * --name-only` pass over the whole history:
 *
 *   entity page   its own base record under static/data (e.g. missions/<dest>/<id>.json);
 *                 for entries that live in a shared list file (moon/mars/venus
 *                 sites, planets, satellites, small bodies) the date the ENTRY's
 *                 own JSON last changed (blob-by-blob comparison, so a neighbour's
 *                 edit does not move it); its locale overlay i18n-src/<locale>/…
 *                 (the en-US overlay when that locale has none, as the loaders do);
 *                 its site story (+ overlay); the route's own src/routes/<route>/
 *                 files; /lab pages: the formula's registry file + the locale's Lab
 *                 message table.
 *   index page    the route's own files + the data index/list file it renders.
 *   other pages   the route's own files only.
 *
 * "Route's own files" = files directly in src/routes/<route>/ plus helper
 * folders under it, NOT folders that are routes themselves (hold a +page file),
 * and not +layout*, +error*, tests or README. NOT counted, on purpose, so the
 * date means "this page's content changed": messages/<locale>.json (one shared
 * file every UI string lands in), +layout, and imported $lib components. A page
 * whose only change was one of those keeps its older lastmod; the cost is an
 * understated date on those pages, never an invented one.
 *
 * Output shape: { "<route>": "YYYY-MM-DD" | { "*": "<most common>", "<locale>": "…" } }.
 * A route with no resolvable input is an ERROR (add a mapping), never a guess.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { collectCanonicalRoutes } from './site-routes.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const OUT = 'src/lib/generated/route-lastmod.json';
const DEFAULT_LOCALE = 'en-US';

/** Pages built from a shared data file / list that is not an entity of its own. */
const SEED_DATA = {
  '/explore': [
    'static/data/planets.json',
    'static/data/satellites.json',
    'static/data/small-bodies.json',
  ],
  '/explore/hub': [
    'static/data/planets.json',
    'static/data/satellites.json',
    'static/data/small-bodies.json',
  ],
  '/explore/stars': [
    'static/data/universe/named-stars.json',
    'static/data/universe/exoplanet-systems.json',
  ],
  '/explore/black-holes': ['static/data/universe/black-holes.json'],
  '/worlds': [
    'static/data/planets.json',
    'static/data/satellites.json',
    'static/data/small-bodies.json',
  ],
  '/missions': ['static/data/missions/index.json'],
  '/missions/launches': ['static/data/launches.json'],
  '/fleet': ['static/data/fleet/index.json'],
  '/moon': ['static/data/moon-sites.json'],
  '/mars': ['static/data/mars-sites.json'],
  '/venus': ['static/data/venus-sites.json'],
  '/iss': ['static/data/iss-modules.json'],
  '/tiangong': ['static/data/tiangong-modules.json'],
  '/lab': ['static/data/lab-formulas.json'],
  '/gallery/deep-sky': ['static/data/deep-sky.json'],
  '/programs': ['static/data/programs/index.json'],
  '/essays': ['static/data/essays/index.json'],
};

/** Shared list files whose entries get their own date: file -> [entries accessor]. */
const ENTRY_FILES = {
  'static/data/moon-sites.json': (j) => j.map((e) => [e.id, e]),
  'static/data/mars-sites.json': (j) => j.map((e) => [e.id, e]),
  'static/data/venus-sites.json': (j) => j.map((e) => [e.id, e]),
  'static/data/planets.json': (j) => (j.planets ?? []).map((e) => [e.name.toLowerCase(), e]),
  'static/data/satellites.json': (j) => (j.satellites ?? []).map((e) => [e.id, e]),
  'static/data/small-bodies.json': (j) => (j.bodies ?? []).map((e) => [e.id, e]),
  'static/data/universe/named-stars.json': (j) => (j.stars ?? []).map((e) => [e.id, e]),
  'static/data/universe/exoplanet-systems.json': (j) => (j.systems ?? []).map((e) => [e.hostId, e]),
  'static/data/universe/black-holes.json': (j) => (j.objects ?? []).map((e) => [e.id, e]),
};

const isoDay = (ts) => new Date(ts * 1000).toISOString().slice(0, 10);

/** `git log --name-only --format=%x01%ct` output -> Map(path -> newest ts). */
export function parseNameLog(text) {
  const latest = new Map();
  let ts = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('\x01')) ts = Number(line.slice(1));
    else if (line && ts > (latest.get(line) ?? 0)) latest.set(line, ts);
  }
  return latest;
}

/** Order-independent key of a parsed JSON value (formatting-only edits don't move it). */
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

/**
 * Per-entry change dates of a shared list file. `versions` is oldest -> newest
 * [{ts, json}]; an entry's date is the ts of the newest version whose content
 * for that entry differs from the version before it.
 * @returns {Map<string, number>}
 */
export function entryDatesFromVersions(versions, entries) {
  const prev = new Map();
  const dates = new Map();
  for (const { ts, json } of versions) {
    for (const [id, e] of entries(json)) {
      const h = createHash('sha1').update(canon(e)).digest('hex');
      if (prev.get(id) !== h) dates.set(id, Math.max(ts, dates.get(id) ?? 0));
      prev.set(id, h);
    }
  }
  return dates;
}

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 29, ...opts });
}

function fileVersions(file) {
  const commits = git(['log', '--no-renames', '--format=%H %ct', '--', file])
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(' '))
    .reverse();
  const r = spawnSync('git', ['cat-file', '--batch'], {
    cwd: ROOT,
    input: commits.map(([sha]) => `${sha}:${file}\n`).join(''),
    maxBuffer: 1 << 29,
  });
  let buf = r.stdout;
  const out = [];
  for (const [, ts] of commits) {
    const nl = buf.indexOf(10);
    const [, type, size] = buf.subarray(0, nl).toString().split(' ');
    if (type !== 'blob') {
      buf = buf.subarray(nl + 1);
      continue;
    }
    const end = nl + 1 + Number(size);
    try {
      out.push({ ts: Number(ts), json: JSON.parse(buf.subarray(nl + 1, end).toString()) });
    } catch {
      /* a commit that left the file unparsable carries no per-entry signal */
    }
    buf = buf.subarray(end + 1);
  }
  return out;
}

const readJson = (p) => JSON.parse(readFileSync(`${ROOT}${p}`, 'utf8'));
const stripBase = (r) => r.replace(/^\/+/, '');

/** Build the lookup context from git (full history required). */
export function gitContext() {
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error(
      'build-route-lastmod: this is a shallow clone, so git dates are wrong. Run on a full-history checkout (git fetch --unshallow).',
    );
  }
  const paths = [
    'static/data',
    'i18n-src',
    'src/routes',
    'src/lib/lab/messages',
    'src/lib/physics/registry',
  ];
  const latest = parseNameLog(
    git(['log', '--no-renames', '--name-only', '--format=%x01%ct', '--', ...paths]),
  );
  const tracked = new Set(
    git(['ls-files', '--', ...paths])
      .split('\n')
      .filter(Boolean),
  );
  const dirty = git(['status', '--porcelain', '--', ...paths])
    .split('\n')
    .filter((l) => l.trim());
  const entryDates = new Map();
  for (const [file, entries] of Object.entries(ENTRY_FILES)) {
    for (const [id, ts] of entryDatesFromVersions(fileVersions(file), entries))
      entryDates.set(`${file}#${id}`, ts);
  }
  return { latest, tracked, entryDates, dirty, locales: localeCodes() };
}

function localeCodes() {
  return readdirSync(`${ROOT}messages`)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5))
    .sort();
}

/** Files under src/routes/<dir>/ that belong to that route's own page. */
export function routeFiles(ctx, dir) {
  const prefix = `src/routes/${dir ? `${dir}/` : ''}`;
  const routable = new Set(
    [...ctx.tracked]
      .filter((f) => /\/\+page\.[^/]+$/.test(f))
      .map((f) => f.slice(0, f.lastIndexOf('/') + 1)),
  );
  return [...ctx.tracked].filter((f) => {
    if (!f.startsWith(prefix)) return false;
    const rest = f.slice(prefix.length);
    const base = rest.slice(rest.lastIndexOf('/') + 1);
    if (/^\+(layout|error)/.test(base) || /\.(test|spec)\./.test(base) || /^README/i.test(base))
      return false;
    const segs = rest.split('/').slice(0, -1);
    if (!dir && segs.length) return false;
    for (let i = 1; i <= segs.length; i++) {
      if (routable.has(`${prefix}${segs.slice(0, i).join('/')}/`)) return false;
    }
    return true;
  });
}

/**
 * What a route's page is built from.
 * @returns {{ files: string[], entries: string[], overlays: string[], localeFiles: ((l: string) => string)[] }}
 */
export function inputsFor(route, ctx, data) {
  const files = [];
  const entries = [];
  const overlays = [];
  const localeFiles = [];
  const addDir = (d) => files.push(...routeFiles(ctx, d));
  const seg = stripBase(route).split('/');

  const entry = (file, id) => {
    if (ctx.entryDates.has(`${file}#${id}`)) entries.push(`${file}#${id}`);
  };

  if (seg[0] === 'missions' && seg.length === 2 && seg[1] !== 'launches') {
    const dest = data.missions.get(seg[1]).toLowerCase();
    files.push(`static/data/missions/${dest}/${seg[1]}.json`);
    overlays.push(`missions/${dest}/${seg[1]}.json`);
    addDir('missions/[id]');
  } else if (seg[0] === 'fleet' && seg.length === 2) {
    const cat = data.fleet.get(seg[1]);
    files.push(`static/data/fleet/${cat}/${seg[1]}.json`);
    overlays.push(`fleet/${cat}/${seg[1]}.json`);
    addDir('fleet/[id]');
  } else if (['moon', 'mars', 'venus'].includes(seg[0]) && seg.length === 2) {
    entry(`static/data/${seg[0]}-sites.json`, seg[1]);
    overlays.push(`${seg[0]}-sites/${seg[1]}.json`, `site-stories/${seg[1]}.json`);
    files.push(`static/data/site-stories/${seg[1]}.json`);
    addDir(`${seg[0]}/[id]`);
  } else if (seg[0] === 'explore' && seg[1] === 'stars' && seg.length === 3) {
    // A star page: the named-star record or the host's system record, the star's overlay, its
    // planets' overlays, and the culture doors on the star or its planets (+ their blurbs).
    entry('static/data/universe/named-stars.json', seg[2]);
    entry('static/data/universe/exoplanet-systems.json', seg[2]);
    overlays.push(`universe/named-stars/${seg[2]}.json`);
    const planets = data.hostPlanets.get(seg[2]) ?? [];
    for (const planet of planets) overlays.push(`universe/exoplanets/${planet}.json`);
    const objects = new Set([seg[2], ...planets]);
    for (const door of data.doors.filter((d) => objects.has(d.objectId))) {
      files.push('static/data/culture-doors.json');
      overlays.push(`culture-doors/${door.id}.json`);
    }
    addDir('explore/stars/[id]');
  } else if (seg[0] === 'explore' && seg[1] === 'black-holes' && seg.length === 3) {
    // A black-hole page: its record in the shared list, its overlay, and its culture door (+ blurb).
    entry('static/data/universe/black-holes.json', seg[2]);
    overlays.push(`universe/black-holes/${seg[2]}.json`);
    for (const door of data.doors.filter((d) => d.objectId === seg[2])) {
      files.push('static/data/culture-doors.json');
      overlays.push(`culture-doors/${door.id}.json`);
    }
    addDir('explore/black-holes/[id]');
  } else if (
    seg[0] === 'explore' &&
    seg.length === 2 &&
    seg[1] !== 'hub' &&
    seg[1] !== 'stars' &&
    seg[1] !== 'black-holes'
  ) {
    for (const f of Object.keys(ENTRY_FILES)) {
      if (/(planets|satellites|small-bodies)\.json$/.test(f)) entry(f, seg[1]);
    }
    for (const d of ['planets', 'satellites', 'small-bodies']) overlays.push(`${d}/${seg[1]}.json`);
    addDir('explore/[id]');
  } else if (seg[0] === 'lab' && seg.length === 2) {
    const defs = data.labFiles.filter((f) => f.ids.has(seg[1])).map((f) => f.path);
    files.push(...defs);
    localeFiles.push((l) => `src/lib/lab/messages/${l}.ts`);
    addDir('lab/[id]');
  } else if (seg[0] === 'science' && seg.length === 2) {
    files.push(`static/data/science/${seg[1]}/_index.json`);
    addDir('science/[tab]');
  } else if (seg[0] === 'science' && seg.length === 3) {
    files.push(`static/data/science/${seg[1]}/${seg[2]}.json`);
    overlays.push(`science/${seg[1]}/${seg[2]}.json`);
    addDir('science/[tab]/[section]');
  } else if (seg[0] === 'programs' && seg.length === 2) {
    files.push(`static/data/programs/${seg[1]}.json`);
    overlays.push(`programs/${seg[1]}.json`);
    addDir('programs/[id]');
  } else if (seg[0] === 'essays' && seg.length === 2) {
    files.push(`static/data/essays/${seg[1]}.json`);
    overlays.push(`essays/${seg[1]}.json`);
    addDir('essays/[slug]');
  } else {
    files.push(...(SEED_DATA[route] ?? []));
    addDir(route === '/' ? '' : seg.join('/'));
  }
  return { files, entries, overlays, localeFiles };
}

/** Newest date (ts) of the inputs for one locale, or 0 when none resolve. */
export function newestTs(inputs, locale, ctx) {
  let best = 0;
  const take = (path) => {
    if (ctx.tracked.has(path)) best = Math.max(best, ctx.latest.get(path) ?? 0);
  };
  inputs.files.forEach(take);
  for (const k of inputs.entries) best = Math.max(best, ctx.entryDates.get(k) ?? 0);
  for (const rel of inputs.overlays) {
    const own = `i18n-src/${locale}/${rel}`;
    take(ctx.tracked.has(own) ? own : `i18n-src/${DEFAULT_LOCALE}/${rel}`);
  }
  for (const f of inputs.localeFiles) take(f(locale));
  return best;
}

function dataIndexes() {
  const mission = new Map(readJson('static/data/missions/index.json').map((m) => [m.id, m.dest]));
  const fleet = new Map(readJson('static/data/fleet/index.json').map((f) => [f.id, f.category]));
  const labFiles = readdirSync(`${ROOT}src/lib/physics/registry`)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => {
      const path = `src/lib/physics/registry/${f}`;
      const ids = new Set(
        [...readFileSync(`${ROOT}${path}`, 'utf8').matchAll(/\bid: '([a-z0-9-]+)'/g)].map(
          (m) => m[1],
        ),
      );
      return { path, ids };
    });
  const hostPlanets = new Map(
    readJson('static/data/universe/exoplanet-systems.json').systems.map((sys) => [
      sys.hostId,
      sys.planets.map((pl) => pl.id),
    ]),
  );
  const doors = readJson('static/data/culture-doors.json').doors;
  return { missions: mission, fleet, labFiles, hostPlanets, doors };
}

/** Collapse a per-locale map to a string (all equal) or { '*': mode, ...exceptions }. */
export function compact(perLocale) {
  const counts = new Map();
  for (const d of Object.values(perLocale)) counts.set(d, (counts.get(d) ?? 0) + 1);
  if (counts.size === 1) return [...counts.keys()][0];
  const mode = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : -1))[0][0];
  const out = { '*': mode };
  for (const [l, d] of Object.entries(perLocale)) if (d !== mode) out[l] = d;
  return out;
}

/** One route per line: small diffs, no prettier needed (the file is in .prettierignore). */
export function serialize(manifest) {
  const lines = Object.keys(manifest)
    .sort()
    .map((r) => `${JSON.stringify(r)}: ${JSON.stringify(manifest[r])}`);
  return `{\n${lines.join(',\n')}\n}\n`;
}

export function buildManifest() {
  const ctx = gitContext();
  if (ctx.dirty.length) {
    console.warn(
      `route-lastmod: ${ctx.dirty.length} uncommitted file(s) under the input paths; their dates are those of the last COMMIT. Commit content first, then regenerate.`,
    );
  }
  const data = dataIndexes();
  const manifest = {};
  const empty = [];
  for (const route of collectCanonicalRoutes()) {
    const inputs = inputsFor(route, ctx, data);
    const perLocale = {};
    for (const l of ctx.locales) {
      const ts = newestTs(inputs, l, ctx);
      if (ts) perLocale[l] = isoDay(ts);
    }
    if (Object.keys(perLocale).length !== ctx.locales.length) empty.push(route);
    else manifest[route] = compact(perLocale);
  }
  if (empty.length) {
    throw new Error(
      `build-route-lastmod: no git date for ${empty.length} route(s), add a mapping in inputsFor/SEED_DATA:\n  ${empty.slice(0, 20).join('\n  ')}`,
    );
  }
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const text = serialize(buildManifest());
    mkdirSync(dirname(`${ROOT}${OUT}`), { recursive: true });
    writeFileSync(`${ROOT}${OUT}`, text);
    console.log(`route-lastmod: wrote ${OUT} (${text.split('\n').length - 3} routes)`);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
