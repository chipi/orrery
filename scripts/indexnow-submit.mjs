/**
 * IndexNow submission — tell Bing, Yandex and the other IndexNow engines which
 * URLs exist, right after a verified prod deploy.
 *
 * Reads the LIVE sitemap index (<base>/sitemap.xml), follows it to every locale
 * sitemap, collects each <loc> (+ <lastmod> when present), dedupes, and POSTs
 * the list to https://api.indexnow.org/indexnow in batches of at most 10,000.
 *
 *   node scripts/indexnow-submit.mjs --dry-run      # fetch + count + batch plan, NO POST
 *   node scripts/indexnow-submit.mjs                # real submission (operator's go)
 *   node scripts/indexnow-submit.mjs --since 2026-11-01
 *   node scripts/indexnow-submit.mjs --base https://www.orrerylearn.com --key <key>
 *
 * The key is public by design: static/<key>.txt holds exactly the key and the
 * engines fetch it from the site to verify ownership. Before a real submission
 * the file must be live at <base>/<key>.txt (else abort); a dry run only warns.
 *
 * --since filters by <lastmod> (src/lib/sitemap.ts, from the committed
 * route-lastmod.json). A URL without one is KEPT: unknown is not "old".
 *
 * Exit 0: dry run finished, or every batch answered 200/202. Exit 1: key file
 * not live, a sitemap unreadable, or any batch non-2xx. Exit 2: bad arguments.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

export const DEFAULT_BASE = 'https://www.orrerylearn.com';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const BATCH_SIZE = 10000;
const USER_AGENT = 'orrery-indexnow/1.0 (https://github.com/chipi/orrery)';
const TIMEOUT_MS = 30000;
const MAX_ATTEMPTS = 4;
const KEY_RE = /^[a-zA-Z0-9-]{8,128}$/;

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`));
  return m ? unescapeXml(m[1]) : undefined;
};

/** <sitemap> entries of a sitemap index -> [loc]. */
export function parseSitemapIndex(xml) {
  return [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)]
    .map((m) => tag(m[1], 'loc'))
    .filter(Boolean);
}

/** <url> entries of a urlset -> [{loc, lastmod?}]. Ignores xhtml:link hreflang hrefs. */
export function parseUrlset(xml) {
  const out = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = tag(m[1], 'loc');
    if (!loc) continue;
    const lastmod = tag(m[1], 'lastmod');
    out.push(lastmod ? { loc, lastmod } : { loc });
  }
  return out;
}

/** Dedupe by loc (first occurrence wins; a later lastmod fills a missing one). */
export function dedupe(entries) {
  const seen = new Map();
  for (const e of entries) {
    const prev = seen.get(e.loc);
    if (!prev) seen.set(e.loc, { ...e });
    else if (!prev.lastmod && e.lastmod) prev.lastmod = e.lastmod;
  }
  return [...seen.values()];
}

/** Keep entries modified on/after `since` (YYYY-MM-DD); no lastmod = keep. */
export function filterSince(entries, since) {
  if (!since) return entries;
  const cutoff = Date.parse(since);
  return entries.filter((e) => {
    if (!e.lastmod) return true;
    const t = Date.parse(e.lastmod);
    return Number.isNaN(t) || t >= cutoff;
  });
}

export function toBatches(urls, size = BATCH_SIZE) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}

export function parseArgs(argv) {
  const opts = { base: DEFAULT_BASE, dryRun: false, since: undefined, key: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const [flag, inline] = a.startsWith('--') && a.includes('=') ? a.split(/=(.*)/s) : [a];
    const val = () => inline ?? argv[++i];
    if (flag === '--dry-run') opts.dryRun = true;
    else if (flag === '--base') opts.base = val();
    else if (flag === '--since') opts.since = val();
    else if (flag === '--key') opts.key = val();
    else throw new Error(`unknown argument: ${a}`);
  }
  if (!opts.base || !/^https?:\/\//.test(opts.base)) throw new Error('--base needs an http(s) URL');
  opts.base = opts.base.replace(/\/+$/, '');
  if (opts.since !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(opts.since))
    throw new Error('--since needs YYYY-MM-DD');
  if (opts.key !== undefined && !KEY_RE.test(opts.key))
    throw new Error('--key must be 8-128 chars of [a-zA-Z0-9-]');
  return opts;
}

/** The committed key: the one static/<key>.txt whose content is its own file name. */
export function findKey(staticDir) {
  for (const f of readdirSync(staticDir)) {
    const m = f.match(/^(.+)\.txt$/);
    if (!m || !KEY_RE.test(m[1])) continue;
    if (readFileSync(join(staticDir, f), 'utf8').trim() === m[1]) return m[1];
  }
  return undefined;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function run(argv, deps = {}) {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const log = deps.log ?? ((s) => console.log(s));
  const warn = deps.warn ?? ((s) => console.warn(s));
  const wait = deps.sleep ?? sleep;
  const staticDir = deps.staticDir ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'static');

  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    warn(`indexnow: ${e.message}`);
    return 2;
  }
  const key = opts.key ?? findKey(staticDir);
  if (!key) {
    warn(`indexnow: no key: pass --key or commit static/<key>.txt containing the key`);
    return 2;
  }
  const host = new URL(opts.base).host;
  const keyLocation = `${opts.base}/${key}.txt`;
  const get = (url) =>
    fetchFn(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  // 1. sitemaps
  const perLocale = [];
  try {
    const idx = await get(`${opts.base}/sitemap.xml`);
    if (!idx.ok) throw new Error(`${opts.base}/sitemap.xml answered ${idx.status}`);
    for (const loc of parseSitemapIndex(await idx.text())) {
      const res = await get(loc);
      if (!res.ok) throw new Error(`${loc} answered ${res.status}`);
      const name = loc.replace(/^.*\//, '').replace(/\.xml$/, '');
      perLocale.push({ name, entries: parseUrlset(await res.text()) });
    }
  } catch (e) {
    warn(`indexnow: could not read the sitemaps: ${e.message}`);
    return 1;
  }
  if (perLocale.length === 0) {
    warn('indexnow: the sitemap index lists no sitemaps');
    return 1;
  }

  const all = dedupe(perLocale.flatMap((l) => l.entries));
  const since = filterSince(all, opts.since);
  const urls = since.map((e) => e.loc).filter((u) => new URL(u).host === host);
  const foreign = since.length - urls.length;

  log(`sitemap index: ${perLocale.length} sitemaps from ${opts.base}/sitemap.xml`);
  for (const l of perLocale) log(`  ${l.name.padEnd(8)} ${l.entries.length} URLs`);
  log(`total: ${all.length} unique URLs`);
  if (opts.since) log(`--since ${opts.since}: ${since.length} URLs kept`);
  if (foreign > 0) warn(`warning: ${foreign} URLs are not on host ${host} and are skipped`);
  const batches = toBatches(urls);
  log(`to submit: ${urls.length} URLs in ${batches.length} batch(es) of <= ${BATCH_SIZE}`);

  // 2. key file must be live
  let keyProblem;
  try {
    const kr = await get(keyLocation);
    if (!kr.ok) keyProblem = `answered ${kr.status}`;
    else if ((await kr.text()).trim() !== key) keyProblem = 'does not contain the key';
  } catch (e) {
    keyProblem = `unreachable (${e.message})`;
  }
  if (keyProblem) {
    if (opts.dryRun) warn(`warning: key file ${keyLocation} is NOT live: ${keyProblem}`);
    else {
      warn(`indexnow: abort: key file ${keyLocation} is not live: ${keyProblem}`);
      return 1;
    }
  } else log(`key file live: ${keyLocation}`);

  if (opts.dryRun) {
    batches.forEach((b, i) => log(`  batch ${i + 1}/${batches.length}: ${b.length} URLs`));
    log('dry run: nothing sent to IndexNow');
    return 0;
  }
  if (urls.length === 0) {
    log('nothing to submit');
    return 0;
  }

  // 3. submit
  let failed = false;
  for (const [i, batch] of batches.entries()) {
    const body = JSON.stringify({ host, key, keyLocation, urlList: batch });
    let status;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetchFn(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': USER_AGENT },
          body,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        status = res.status;
      } catch (e) {
        status = `error (${e.message})`;
        break;
      }
      if (status !== 429 && status < 500) break;
      if (attempt < MAX_ATTEMPTS) await wait(1000 * 2 ** (attempt - 1));
    }
    const ok = status === 200 || status === 202;
    log(
      `  batch ${i + 1}/${batches.length}: ${batch.length} URLs -> ${status} ${ok ? 'ok' : 'FAIL'}`,
    );
    if (!ok) failed = true;
  }
  log(failed ? 'indexnow: FAIL' : 'indexnow: done');
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
