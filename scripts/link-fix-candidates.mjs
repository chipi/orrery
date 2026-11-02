/**
 * Replacement candidates for the dead outbound links check-external-links.mjs
 * found — input for fixing them by hand (runbook: orrery-link-health).
 *
 * For each dead URL (status "dead" in .cache/external-links.json, still linked
 * from the site) it records:
 *   - wayback: the closest Wayback Machine snapshot (archive.org availability
 *     API), the honest fallback when the page is gone;
 *   - wiki: for a Wikipedia/Commons page that does not exist, the top search
 *     hits on the same wiki (MediaWiki API), to find the article meant;
 *   - files: every file that holds the URL.
 * Nothing is edited. A person decides each replacement and writes it into a
 * fix map for apply-link-fixes.mjs.
 *
 * Usage: node scripts/link-fix-candidates.mjs [--out=.cache/link-fix-candidates.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { collect } from './check-external-links.mjs';
import { USER_AGENT, wikiTitle } from './lib/link-probe.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const OUT = args.out ?? '.cache/link-fix-candidates.json';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
      if (res.ok) return await res.json();
      if (res.status !== 429 && res.status < 500) return null;
    } catch {
      // retried
    }
    await sleep(3000 * (attempt + 1));
  }
  return null;
}

async function wayback(url) {
  const j = await getJson(`https://archive.org/wayback/available?${new URLSearchParams({ url })}`);
  const s = j?.archived_snapshots?.closest;
  return s?.available && s.status === '200'
    ? { url: s.url.replace(/^http:/, 'https:'), at: s.timestamp }
    : null;
}

async function wikiSearch(url) {
  const title = wikiTitle(url);
  if (title === null) return null;
  const host = new URL(url).host;
  const ns = host === 'commons.wikimedia.org' && title.startsWith('File:') ? '6' : '0';
  const q = title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '');
  const j = await getJson(
    `https://${host}/w/api.php?${new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: q,
      srnamespace: ns,
      srlimit: '5',
      format: 'json',
      formatversion: '2',
    })}`,
  );
  return (j?.query?.search ?? []).map(
    (h) => `https://${host}/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
  );
}

const cache = JSON.parse(readFileSync('.cache/external-links.json', 'utf8'));
const { found } = collect();
const dead = [...found.keys()].filter((u) => cache[u]?.status === 'dead');
console.log(`→ ${dead.length} dead URLs; looking up candidates`);
const out = [];
for (const [i, url] of dead.entries()) {
  const [wb, wiki] = await Promise.all([wayback(url), wikiSearch(url)]);
  out.push({ url, http: cache[url].http_status, files: [...found.get(url)], wayback: wb, wiki });
  if ((i + 1) % 25 === 0) console.log(`  · ${i + 1}/${dead.length}`);
  await sleep(300);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(
  `✓ ${out.length} candidates (${out.filter((o) => o.wayback).length} with a snapshot, ${out.filter((o) => o.wiki?.length).length} with wiki hits) → ${OUT}`,
);
