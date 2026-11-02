/**
 * Find where a shipped image really comes from: search NASA Images and Wikimedia Commons for a
 * subject, fingerprint every candidate (64-bit dHash) and keep the closest per image. A distance
 * of 8 or less is the same picture; look at every match before you credit it (a crop or a
 * re-render can land at 6–8 and still be a different picture).
 *
 * Usage:
 *   node scripts/image-find-source.mjs --q "Galileo spacecraft" [--q …] [--cat "Galileo (spacecraft)" …]
 *        [--pages 3] [--max 8] [--out map.json] <image> [<image> …]
 *
 *   <image>  a path under static/ (`/images/fleet-galleries/galileo/01.webp`) or a file.
 *   --q      NASA Images search (up to --pages × 100 hits) and Commons file search (50 hits).
 *   --cat    Commons category; its files and one level of subcategories.
 *   --out    write {path: {source, id, title, d}} for every match ≤ --max: NASA ids go to
 *            `apply-provenance-nasa.mjs`, Commons titles to `backfill-provenance-commons.ts`.
 *
 * Runbook: the orrery-link-health skill (credits). One-candidate check: image-match.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dhash, distance, aspect } from './lib/dhash.mjs';
import { USER_AGENT } from './lib/link-probe.mjs';

const args = process.argv.slice(2);
const opt = (name) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));
const queries = opt('q');
const cats = opt('cat');
const pages = Number(opt('pages')[0] ?? 3);
const max = Number(opt('max')[0] ?? 8);
const out = opt('out')[0];
const images = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'));
if (!images.length || (!queries.length && !cats.length)) {
  console.error(
    'usage: node scripts/image-find-source.mjs --q "<subject>" [--cat "<category>"] <image> …',
  );
  process.exit(2);
}

const get = async (url) => {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res;
};
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

async function nasa(q) {
  const found = [];
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      q,
      media_type: 'image',
      page_size: '100',
      page: String(page),
    });
    const j = await get(`https://images-api.nasa.gov/search?${params}`)
      .then((r) => r.json())
      .catch(() => null);
    const items = j?.collection?.items ?? [];
    for (const it of items) {
      const thumb = it.links?.find((l) => l.rel === 'preview')?.href;
      const d = it.data?.[0];
      if (thumb && d?.nasa_id) found.push({ source: 'nasa', id: d.nasa_id, title: d.title, thumb });
    }
    if (items.length < 100) break;
  }
  return found;
}

const commonsFiles = (pagesList) =>
  pagesList
    .filter((p) => p.imageinfo?.[0]?.thumburl)
    .map((p) => ({
      source: 'commons',
      id: p.title.replace(/^File:/, ''),
      title: p.title,
      thumb: p.imageinfo[0].thumburl,
    }));

async function commonsSearch(q) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: q,
    gsrnamespace: '6',
    gsrlimit: '50',
    prop: 'imageinfo',
    iiprop: 'url',
    iiurlwidth: '320',
  });
  const j = await get(`${COMMONS}?${params}`)
    .then((r) => r.json())
    .catch(() => null);
  return commonsFiles(j?.query?.pages ?? []);
}

async function commonsCategory(cat, depth = 1) {
  const found = [];
  let cont = {};
  do {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'categorymembers',
      gcmtitle: `Category:${cat}`,
      gcmtype: 'file|subcat',
      gcmlimit: '500',
      prop: 'imageinfo',
      iiprop: 'url',
      iiurlwidth: '320',
      ...cont,
    });
    const j = await get(`${COMMONS}?${params}`)
      .then((r) => r.json())
      .catch(() => null);
    const list = j?.query?.pages ?? [];
    for (const p of list.filter((x) => x.ns === 14 && depth > 0))
      found.push(...(await commonsCategory(p.title.replace(/^Category:/, ''), depth - 1)));
    found.push(...commonsFiles(list));
    cont = j?.continue ?? null;
  } while (cont);
  return found;
}

const all = [
  ...(await Promise.all(queries.flatMap((q) => [nasa(q), commonsSearch(q)]))).flat(),
  ...(await Promise.all(cats.map((c) => commonsCategory(c)))).flat(),
];
const candidates = [...new Map(all.map((c) => [c.thumb, c])).values()];

const mine = await Promise.all(
  images.map(async (p) => {
    const buf = readFileSync(p.startsWith('/images/') ? `static${p}` : p);
    return { path: p, h: await dhash(buf), a: await aspect(buf), best: { d: 99 } };
  }),
);
for (let i = 0; i < candidates.length; i += 16) {
  await Promise.all(
    candidates.slice(i, i + 16).map(async (c) => {
      try {
        const buf = Buffer.from(await (await get(c.thumb)).arrayBuffer());
        const h = await dhash(buf);
        for (const m of mine) {
          const d = distance(m.h, h);
          if (d < m.best.d) m.best = { ...c, d, a: await aspect(buf) };
        }
      } catch {
        // an unreachable thumbnail is just not a candidate
      }
    }),
  );
}

const map = {};
console.log(`${candidates.length} candidates`);
for (const m of mine) {
  const b = m.best;
  const hit = b.d <= max;
  if (hit) map[m.path] = { source: b.source, id: b.id, title: b.title, d: b.d };
  console.log(
    `${hit ? 'MATCH' : 'none '} d=${String(b.d).padStart(2)} aspect ${m.a.toFixed(2)}/${(b.a ?? 0).toFixed(2)}  ${m.path}  ${b.source ?? ''} ${b.id ?? ''}`,
  );
}
if (out) writeFileSync(out, JSON.stringify(map, null, 2) + '\n');
