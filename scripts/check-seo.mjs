/**
 * SEO gate — post-build guardrail over every prerendered page.
 *
 * Each INDEXABLE page (everything except the noindex pages below) must have:
 *   - exactly one non-empty <title>, not the bare brand, at most TITLE_MAX chars
 *   - a meta description of 1..160 chars
 *   - a self-referencing canonical on the prod origin (the page's own URL)
 *   - the full hreflang set (every locale + x-default), each target built
 *   - og:title, og:url (= canonical), og:image and a Twitter card
 *   - JSON-LD blocks that parse
 *   - exactly one <h1>
 *   - no robots noindex (a noindex leak drops a real page from search)
 *   - entity pages (/missions/<id> … /lab/<id>): at least 80 words in <main> (160
 *     characters for zh-CN and ja) — thinner is thin content, not a page
 * and the sitemaps (/sitemap.xml index + /sitemaps/<locale>.xml) must list
 * exactly the indexable pages.
 *
 * On the GitHub Pages mirror (VITE_BASE set) the rule flips: every page must be
 * noindex and carry no canonical (src/lib/seo.ts isMirrorBuild).
 *
 * Wired into `npm run build` after check-internal-links, so it runs in
 * preflight and every CI build. Exit 1 lists each failure (first 40 per rule).
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, relative } from 'node:path';
import { LOCALES as LOCALE_CODES, BASE_LOCALE } from './lib/locales.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// CHECK_SEO_BUILD_DIR lets check-seo.test.ts point the gate at a fixture build.
const BUILD_DIR = process.env.CHECK_SEO_BUILD_DIR ?? join(__dirname, '..', 'build');
const BASE = (process.env.VITE_BASE ?? '').replace(/\/+$/, '');
const ORIGIN = 'https://www.orrerylearn.com';
const DEFAULT_LOCALE = BASE_LOCALE;
// The reference-frames section titles are a "A · B · C" list with no clean cut
// (pageTitle() keeps the rest within 60); this ceiling catches real regressions.
const TITLE_MAX = 90;
const DESCRIPTION_MAX = 160;
// An entity page with less text than this in <main> is thin content (ADR-096):
// words, or characters for the locales that write without spaces.
const THIN_MIN_WORDS = 80;
const THIN_MIN_CHARS = 160;
const CHAR_COUNT_LOCALES = ['zh-CN', 'ja'];
const ENTITY_ROUTE = /^\/(missions|fleet|moon|mars|venus|explore|lab)\/([^/]+)$/;
// Index / app pages that sit under an entity prefix.
const NOT_ENTITY = new Set(['/missions/launches', '/explore/hub']);

/** Pages that are noindex by design (route without base, no locale prefix). */
function isNoindexByDesign(route) {
  return route.startsWith('/c/') || route === '/lab/callback' || route === '/404';
}

function findHtmlFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (['_app', 'audio', 'data', 'images', 'textures', 'models', 'docs'].includes(entry))
          continue;
        walk(full);
      } else if (entry.endsWith('.html')) out.push(full);
    }
  })(dir);
  return out;
}

/** build/de/missions.html → /de/missions; build/de.html → /de/; build/index.html → / */
function urlPathOf(file) {
  const rel = relative(BUILD_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');
  if (rel === 'index') return '/';
  if (LOCALE_CODES.includes(rel)) return `/${rel}/`;
  return `/${rel}`;
}

/** /de/missions → /missions (the un-localized route). */
function routeOf(urlPath) {
  const first = urlPath.split('/')[1];
  if (first !== DEFAULT_LOCALE && LOCALE_CODES.includes(first)) {
    const rest = urlPath.slice(first.length + 1);
    return rest === '/' || rest === '' ? '/' : rest;
  }
  return urlPath;
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const failures = new Map();
function fail(rule, where) {
  if (!failures.has(rule)) failures.set(rule, []);
  failures.get(rule).push(where);
}

/** The visible text of <main>: scripts, styles and comments dropped, whitespace collapsed. */
function mainText(html) {
  const start = html.search(/<main[\s>]/);
  const end = html.lastIndexOf('</main>');
  if (start < 0 || end < start) return '';
  return decode(
    html
      .slice(start, end)
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function headOf(html) {
  const end = html.indexOf('</head>');
  return end < 0 ? html : html.slice(0, end);
}

const files = findHtmlFiles(BUILD_DIR);
const builtPaths = new Set(files.map(urlPathOf));
const indexable = new Set();

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const head = headOf(html);
  const path = urlPathOf(file);
  const route = routeOf(path);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(head);
  const canonical = head.match(/<link rel="canonical" href="([^"]*)"/)?.[1];

  if (BASE) {
    // 404.html is the SPA fallback shell (no server-rendered head); Pages serves it as a 404.
    if (!noindex && route !== '/404') fail('mirror page without noindex', path);
    if (canonical) fail('mirror page with a canonical', path);
    continue;
  }
  if (isNoindexByDesign(route)) continue;
  indexable.add(path);
  const where = path;

  if (noindex) fail('noindex on an indexable page', where);

  const titles = [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]).trim());
  if (titles.length !== 1) fail(`title count is not 1`, `${where} (${titles.length})`);
  const title = titles[0] ?? '';
  if (!title || title === 'Orrery') fail('empty or bare "Orrery" title', where);
  if ([...title].length > TITLE_MAX) fail(`title over ${TITLE_MAX} chars`, `${where} — ${title}`);

  const descs = [...head.matchAll(/<meta name="description" content="([^"]*)"/g)].map((m) =>
    decode(m[1]),
  );
  if (descs.length !== 1) fail('description count is not 1', `${where} (${descs.length})`);
  else if (!descs[0].trim()) fail('empty description', where);
  else if ([...descs[0]].length > DESCRIPTION_MAX)
    fail(`description over ${DESCRIPTION_MAX} chars`, `${where} (${[...descs[0]].length})`);

  const expected = ORIGIN + path;
  if (canonical !== expected) fail('canonical is not the page itself', `${where} → ${canonical}`);

  const alts = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  const langs = new Set(alts.map((m) => m[1]));
  for (const code of [...LOCALE_CODES, 'x-default'])
    if (!langs.has(code)) fail('hreflang set incomplete', `${where} (missing ${code})`);
  for (const [, , href] of alts) {
    const target = href.startsWith(ORIGIN) ? href.slice(ORIGIN.length) : href;
    if (!builtPaths.has(target)) fail('hreflang target not built', `${where} → ${href}`);
  }
  const selfAlt = alts.find((m) => m[2] === expected);
  if (!selfAlt) fail('hreflang set does not include the page', where);

  if (!head.includes('<meta property="og:title"')) fail('no og:title', where);
  if (!head.includes('<meta property="og:image"')) fail('no og:image', where);
  if (!head.includes('<meta name="twitter:card"')) fail('no twitter:card', where);
  const ogUrl = head.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
  if (ogUrl !== expected) fail('og:url is not the canonical', `${where} → ${ogUrl}`);

  for (const m of head.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      fail('JSON-LD does not parse', where);
    }
  }

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail('h1 count is not 1', `${where} (${h1s})`);

  if (ENTITY_ROUTE.test(route) && !NOT_ENTITY.has(route)) {
    const text = mainText(html);
    const locale = LOCALE_CODES.find((l) => path.startsWith(`/${l}/`)) ?? DEFAULT_LOCALE;
    if (CHAR_COUNT_LOCALES.includes(locale)) {
      const chars = [...text.replace(/\s/g, '')].length;
      if (chars < THIN_MIN_CHARS)
        fail(`thin entity page (under ${THIN_MIN_CHARS} characters)`, `${where} (${chars})`);
    } else {
      const words = text ? text.split(' ').length : 0;
      if (words < THIN_MIN_WORDS)
        fail(`thin entity page (under ${THIN_MIN_WORDS} words)`, `${where} (${words})`);
    }
  }
}

// Sitemaps = indexable pages.
if (!BASE) {
  const index = join(BUILD_DIR, 'sitemap.xml');
  if (!existsSync(index)) fail('sitemap', 'build/sitemap.xml missing');
  else {
    const listed = new Set();
    const children = [...readFileSync(index, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (m) => m[1],
    );
    if (children.length !== LOCALE_CODES.length)
      fail('sitemap', `index lists ${children.length} sitemaps, expected ${LOCALE_CODES.length}`);
    for (const url of children) {
      const file = join(BUILD_DIR, url.slice(ORIGIN.length));
      if (!existsSync(file)) {
        fail('sitemap', `listed sitemap not built: ${url}`);
        continue;
      }
      for (const m of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
        const p = m[1].slice(ORIGIN.length);
        if (listed.has(p)) fail('sitemap lists a URL twice', p);
        listed.add(p);
      }
    }
    for (const p of indexable) if (!listed.has(p)) fail('indexable page missing from sitemaps', p);
    for (const p of listed) if (!indexable.has(p)) fail('sitemap URL is not an indexable page', p);
  }
}

const mode = BASE ? `mirror (${BASE})` : 'prod';
if (failures.size) {
  console.error(`check-seo: FAIL (${mode}, ${files.length} pages, ${indexable.size} indexable)`);
  for (const [rule, list] of failures) {
    console.error(`  ✗ ${rule}: ${list.length}`);
    for (const w of list.slice(0, 40)) console.error(`      ${w}`);
  }
  process.exit(1);
}
console.log(
  `check-seo: PASS (${mode}, ${files.length} pages${BASE ? '' : `, ${indexable.size} indexable`})`,
);
