/**
 * Internal links held in data — every locale.
 *
 * scripts/check-internal-links.mjs checks the `<a href>`s of the prerendered
 * HTML. Most in-app links never reach that HTML: panels, program editorials,
 * science chips and overlays render them on click from JSON. This check reads
 * those links where they live — static/data (not the generated i18n bundles),
 * i18n-src/<locale>/ and messages/<locale>.json — and fails on any that
 *   - names a path no route in src/routes serves,
 *   - carries a query parameter the target route does not read (ROUTE_PARAMS), or
 *   - selects an id that does not exist (missions, fleet).
 *
 * Found on first run (2026-11-01): 989 `/fleet?focus=<id>` links in program
 * pages that opened /fleet with nothing selected; the route reads `id`.
 *
 * Usage: node scripts/check-data-links.mjs        (exit 1 on any broken link)
 *        node scripts/check-data-links.mjs --json (machine-readable list)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

// Query parameters each route reads from a link. A link that carries any other
// parameter selects nothing; add a row only with the code that reads it.
const ROUTE_PARAMS = {
  '/missions': ['id', 'from'],
  '/fleet': ['id', 'from'],
};

// Where the ids a parameter selects are listed.
const ID_SOURCES = {
  '/missions?id': 'static/data/missions/index.json',
  '/fleet?id': 'static/data/fleet/index.json',
};

// Tooling records, not site content: image-sourcing dry runs and curation logs
// list candidate paths that were never downloaded. Only /dev/slice-a-review
// reads them. (Top-level static/data entries no code in src/ names are skipped
// too — see appReads below.)
const TOOLING_RECORD =
  /^static\/data\/(slice-a-[^/]*|image-curation|source-fetch-provenance|bodies-salvage-result)\.json$/;

// Static files linked from data are checked against static/; routes are not files.
const FILE_PREFIX = /^\/(images|audio|data|logos|textures|fonts|models)\//;

// Asset paths held as JSON values ("src": "/images/…"), whatever the field is
// called. Keys are skipped: image-alt-text and image-ladder are keyed by path.
const ASSET_VALUE_RE = /"(\/(?:images|audio|textures|logos|fonts|models)\/[^"\\]+)"(?!\s*:)/g;

// Files in static/ the build removes (scripts/prune-build-staging.mjs): present
// on disk, 404 on the site. image-provenance credits them on purpose; /credits
// shows their served 1:1 sibling (creditDisplayPath, guarded by its test).
const PRUNED = /^\/textures\/.+\.(4x3|16x9)\.jpg$/;
const CREDITS_PRUNED_OK = 'static/data/image-provenance.json';

// Lookup tables keyed by image path: an entry is read only when a page shows
// that image, and never puts its path on screen by itself. Stale rows for
// deleted images (image-vision) and thumbnail lists (credit-thumbs) are not
// broken links.
const PATH_LOOKUP = new Set(['static/data/image-vision.json', 'static/data/credit-thumbs.json']);

// Outbound links carry no tracking parameters unless the target is one of the
// operator's own sites (operator, 2026-11-01): readers should not pass on
// anyone else's campaign tags.
const OUTBOUND_TRACKING = /"(https?:\/\/[^"]*[?&](utm_[a-z]+)=[^"]*)"/g;
const OWN_SITES =
  /(^|\.)(orrerylearn\.com|humancopilot\.eu|airandspacehistory\.com|devwhateverops\.com|markodragoljevic\.com|closelistening\.app)$/;

// href="…" in HTML strings, ](…) in markdown, and link-valued JSON fields.
const LINK_RE =
  /(?:href=\\?"|\]\(|"(?:href|link|url|path|route|science_link|to)"\s*:\s*")(\/[^"\\)\s]*)/g;

function walkJson(dir, skip = () => false) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skip(p)) continue;
    if (statSync(p).isDirectory()) out.push(...walkJson(p, skip));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

function walkSrc(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    // /dev/* tooling pages never ship (src/routes/dev/+layout.ts); what only
    // they read is not site data.
    if (p === join(ROOT, 'src/routes/dev')) continue;
    if (statSync(p).isDirectory()) out.push(...walkSrc(p));
    else if (/\.(svelte|ts|js)$/.test(name) && !/\.test\.ts$/.test(name))
      out.push(readFileSync(p, 'utf8'));
  }
  return out;
}

/** Route patterns from src/routes: one entry per directory holding a page or endpoint. */
function loadRoutes() {
  const routes = [];
  const base = join(ROOT, 'src/routes');
  const walk = (dir, segs) => {
    const names = readdirSync(dir);
    if (names.some((n) => /^\+(page\.svelte|page\.ts|server\.ts)$/.test(n))) routes.push(segs);
    for (const n of names) {
      const p = join(dir, n);
      if (!statSync(p).isDirectory()) continue;
      // (group) directories do not appear in the URL.
      walk(p, /^\(.*\)$/.test(n) ? segs : [...segs, n]);
    }
  };
  walk(base, []);
  return routes;
}

function routeMatches(pattern, parts) {
  for (let i = 0; i < pattern.length; i++) {
    const seg = pattern[i];
    if (/^\[\.\.\.[^\]]+\]$/.test(seg)) return true; // [...rest]
    if (i >= parts.length) return false;
    if (/^\[[^\]]+\]$/.test(seg)) continue; // [param]
    if (seg !== parts[i]) return false;
  }
  return pattern.length === parts.length;
}

export function checkDataLinks() {
  const locales = readdirSync(join(ROOT, 'i18n-src')).filter((n) =>
    statSync(join(ROOT, 'i18n-src', n)).isDirectory(),
  );
  const localeRe = new RegExp(`^/(${locales.join('|')})(?=/|$)`);
  const routes = loadRoutes();
  const ids = Object.fromEntries(
    Object.entries(ID_SOURCES).map(([k, f]) => [
      k,
      new Set(JSON.parse(readFileSync(join(ROOT, f), 'utf8')).map((e) => e.id)),
    ]),
  );

  // A top-level static/data file or folder counts as site data only when code in
  // src/ names it; the rest are pipeline records the site never fetches.
  const srcText = walkSrc(join(ROOT, 'src')).join('\n');
  const appReads = (p) => {
    const top = relative(join(ROOT, 'static/data'), p)
      .split('/')[0]
      .replace(/\.json$/, '');
    return srcText.includes(top);
  };
  const files = [
    ...walkJson(
      join(ROOT, 'static/data'),
      (p) => p === join(ROOT, 'static/data/i18n') || !appReads(p),
    ),
    ...walkJson(join(ROOT, 'i18n-src')),
    ...walkJson(join(ROOT, 'messages')),
  ];

  const broken = [];
  let checked = 0;
  for (const file of files) {
    if (TOOLING_RECORD.test(relative(ROOT, file))) continue;
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    const seen = new Set();
    for (const m of PATH_LOOKUP.has(rel) ? [] : text.matchAll(ASSET_VALUE_RE)) {
      const asset = m[1].split(/[?#]/)[0];
      if (seen.has(asset)) continue;
      seen.add(asset);
      checked++;
      if (!existsSync(join(ROOT, 'static', decodeURIComponent(asset))))
        broken.push({ file: rel, link: asset, reason: 'no such file' });
      else if (PRUNED.test(asset) && rel !== CREDITS_PRUNED_OK)
        broken.push({ file: rel, link: asset, reason: 'pruned from the build (404 on the site)' });
    }
    for (const m of text.matchAll(OUTBOUND_TRACKING)) {
      checked++;
      let host = '';
      try {
        host = new URL(m[1]).host;
      } catch {
        // unparseable → reported below
      }
      if (OWN_SITES.test(host)) continue;
      broken.push({ file: rel, link: m[1].slice(0, 90), reason: `outbound link carries ${m[2]}` });
    }
    for (const m of text.matchAll(LINK_RE)) {
      const link = m[1].replace(/&amp;/g, '&');
      if (link.startsWith('//')) continue; // protocol-relative = external
      const [beforeHash] = link.split('#');
      const [rawPath, query = ''] = beforeHash.split('?');
      if (seen.has(rawPath)) continue; // already checked as an asset value
      checked++;
      const fail = (reason) => broken.push({ file: rel, link, reason });

      if (FILE_PREFIX.test(rawPath)) {
        if (!existsSync(join(ROOT, 'static', decodeURIComponent(rawPath)))) fail('no such file');
        continue;
      }
      const path = rawPath.replace(localeRe, '').replace(/\/$/, '') || '/';
      const parts = path.split('/').filter(Boolean);
      if (!routes.some((r) => routeMatches(r, parts))) {
        fail('no route serves this path');
        continue;
      }
      if (!query) continue;
      const allowed = ROUTE_PARAMS[path];
      for (const kv of query.split('&')) {
        const [key, value = ''] = kv.split('=');
        if (!allowed || !allowed.includes(key)) {
          fail(`${path} does not read ?${key}=`);
          continue;
        }
        const known = ids[`${path}?${key}`];
        if (known && !known.has(decodeURIComponent(value)))
          fail(`no ${path.slice(1)} entry "${value}"`);
      }
    }
  }
  // A list that holds the same link twice: pages render link lists in a keyed
  // {#each … (link.u)}, and a duplicate key throws, so the page never renders
  // (/science/propulsion/tsiolkovsky, 2026-11-01). The site data only — tooling
  // records and generated manifests may repeat URLs on purpose.
  const DUP_EXEMPT = /^static\/data\/(tech-bom|link-provenance|image-provenance)\.json$/;
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (TOOLING_RECORD.test(rel) || DUP_EXEMPT.test(rel)) continue;
    let data;
    try {
      data = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const visit = (v, at) => {
      if (Array.isArray(v)) {
        const seen = new Set();
        for (const x of v) {
          const u = x && typeof x === 'object' ? (x.u ?? x.url ?? x.href) : undefined;
          if (typeof u !== 'string') continue;
          if (seen.has(u))
            broken.push({ file: rel, link: u, reason: `listed twice in ${at || '/'}` });
          seen.add(u);
        }
        v.forEach((x, i) => visit(x, `${at}[${i}]`));
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) visit(x, `${at}.${k}`);
      }
    };
    visit(data, '');
  }
  return { checked, files: files.length, broken };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { checked, files, broken } = checkDataLinks();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(broken, null, 2));
  } else {
    // One line per distinct link + reason, with how many files hold it.
    const grouped = new Map();
    for (const b of broken) {
      const k = `${b.link}  — ${b.reason}`;
      grouped.set(k, [...(grouped.get(k) ?? []), b.file]);
    }
    for (const [k, fs] of grouped) console.log(`✗ ${k}  (${fs.length}× e.g. ${fs[0]})`);
    console.log(
      `${broken.length === 0 ? '✓' : '✗'} data links: ${checked} checked in ${files} files, ${broken.length} broken (${grouped.size} distinct)`,
    );
  }
  process.exit(broken.length === 0 ? 0 : 1);
}
