/**
 * Links that refuse scripts even in a browser (Cloudflare challenge, CloudFront
 * bot rules — science.org, jpl.nasa.gov, sciencedirect.com …) are checked from a
 * second source instead (runbook: orrery-link-health):
 *   - a DOI URL (doi.org, science.org/doi, annualreviews.org/doi, wiley /doi …):
 *     Crossref knows the DOI → the article exists;
 *   - anything else: the Wayback Machine captured it with HTTP 200 within the
 *     last --days (default 365) → the page is live behind the bot wall.
 * Verified links are recorded as ok in .cache/external-links.json with the
 * evidence in `detail`; the rest stay forbidden. Re-run check-external-links.mjs
 * to rewrite the report.
 *
 * Usage: node scripts/verify-blocked-links.mjs [--days=365] [--status=forbidden,timeout,error]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { collect } from './check-external-links.mjs';
import { USER_AGENT } from './lib/link-probe.mjs';

const CACHE = '.cache/external-links.json';
const days = Number(process.argv.find((a) => a.startsWith('--days='))?.split('=')[1] ?? 365);
const cache = JSON.parse(readFileSync(CACHE, 'utf8'));
const { found } = collect();
// --status=forbidden,timeout,error widens it to links unreachable from this machine.
const want = String(
  process.argv.find((a) => a.startsWith('--status='))?.split('=')[1] ?? 'forbidden',
).split(',');
const urls = [...found.keys()].filter((u) => want.includes(cache[u]?.status));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch {
      // retried
    }
    await sleep(3000 * (a + 1));
  }
  return undefined;
}

const DOI = /\b(10\.\d{4,9}\/[^\s?#]+)/;
async function viaCrossref(url) {
  const m = decodeURIComponent(url).match(DOI);
  if (!m) return null;
  const doi = m[1].replace(/\/(abstract|full|pdf|epdf)$/i, '');
  const j = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (j === undefined) return null;
  return j?.message?.DOI
    ? `verified: Crossref has DOI ${j.message.DOI}`
    : `dead: Crossref has no DOI ${doi}`;
}

async function viaArchive(url) {
  const since = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  const q = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp,statuscode',
    filter: 'statuscode:200',
    from: since,
    limit: '-1',
  });
  const rows = await getJson(`https://web.archive.org/cdx/search/cdx?${q}`);
  if (!Array.isArray(rows)) return null;
  const last = rows.at(-1);
  return rows.length > 1 && last
    ? `verified: Wayback captured HTTP 200 on ${last[0].slice(0, 8)}`
    : null;
}

let ok = 0;
let dead = 0;
for (const url of urls) {
  const verdict = (await viaCrossref(url)) ?? (await viaArchive(url));
  if (verdict?.startsWith('verified')) {
    cache[url] = {
      ...cache[url],
      status: 'ok',
      detail: `${verdict} (site blocks scripts)`,
      checked_at: new Date().toISOString(),
    };
    ok++;
  } else if (verdict?.startsWith('dead')) {
    cache[url] = {
      ...cache[url],
      status: 'dead',
      detail: verdict,
      checked_at: new Date().toISOString(),
    };
    dead++;
    console.log(`  dead  ${url}  ${verdict}`);
  } else console.log(`  still blocked  ${url}`);
  await sleep(500);
}
writeFileSync(CACHE, JSON.stringify(cache));
console.log(
  `${urls.length} blocked: ${ok} verified live elsewhere, ${dead} dead, ${urls.length - ok - dead} unverified`,
);
