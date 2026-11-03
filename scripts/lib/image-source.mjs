/**
 * Search NASA Images and Wikimedia Commons for a subject and fingerprint every candidate against
 * shipped images (64-bit dHash, distance ≤ 8 = same picture). Shared by image-find-source.mjs
 * (one subject by hand) and credit-placeholders-find.mjs (every placeholder credit, grouped).
 */
import { readFileSync } from 'node:fs';
import { dhash, distance, aspect } from './dhash.mjs';
import { USER_AGENT } from './link-probe.mjs';

const COMMONS = 'https://commons.wikimedia.org/w/api.php';

async function get(url) {
  // one retry: a dropped thumbnail fetch silently loses a real match (Europa, 2026-11-02)
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'user-agent': USER_AGENT },
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      return res;
    } catch (e) {
      if (attempt >= 1) throw e;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
const getJson = (url) =>
  get(url)
    .then((r) => r.json())
    .catch(() => null);

async function nasa(q, pages) {
  const found = [];
  for (let page = 1; page <= pages; page++) {
    const params = new URLSearchParams({
      q,
      media_type: 'image',
      page_size: '100',
      page: String(page),
    });
    const j = await getJson(`https://images-api.nasa.gov/search?${params}`);
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

const commonsFiles = (list) =>
  list
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
  return commonsFiles((await getJson(`${COMMONS}?${params}`))?.query?.pages ?? []);
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
    const j = await getJson(`${COMMONS}?${params}`);
    const list = j?.query?.pages ?? [];
    for (const p of list.filter((x) => x.ns === 14 && depth > 0))
      found.push(...(await commonsCategory(p.title.replace(/^Category:/, ''), depth - 1)));
    found.push(...commonsFiles(list));
    cont = j?.continue ?? null;
  } while (cont);
  return found;
}

/**
 * Best candidate per image. Returns [{path, a, best: {source, id, title, d, a}}]; d = 99 when
 * nothing was fetched. `images` are paths under static/ (`/images/…`) or files.
 */
export async function findSources({ queries = [], cats = [], pages = 3, images }) {
  const all = [
    ...(await Promise.all(queries.flatMap((q) => [nasa(q, pages), commonsSearch(q)]))).flat(),
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
          // unreachable twice: not a candidate
        }
      }),
    );
  }
  return {
    candidates: candidates.length,
    results: mine.map(({ path, a, best }) => ({ path, a, best })),
  };
}
