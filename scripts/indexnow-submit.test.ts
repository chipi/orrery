// Tests for scripts/indexnow-submit.mjs. fetch is mocked: no network, ever.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool, no type declarations
import * as tool from './indexnow-submit.mjs';

const { run, parseSitemapIndex, parseUrlset, dedupe, filterSince, toBatches, parseArgs, findKey } =
  tool;

const BASE = 'https://www.orrerylearn.com';
const KEY = 'fixture-key-not-real';
const INDEX = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${BASE}/sitemaps/en-US.xml</loc></sitemap>
  <sitemap><loc>${BASE}/sitemaps/de.xml</loc></sitemap>
</sitemapindex>`;
const EN = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${BASE}/</loc>
    <lastmod>2026-11-10</lastmod>
    <xhtml:link rel="alternate" hreflang="de" href="${BASE}/de/"/>
  </url>
  <url><loc>${BASE}/missions/apollo11</loc><lastmod>2026-10-01</lastmod></url>
  <url><loc>${BASE}/moon?a=1&amp;b=2</loc></url>
</urlset>`;
const DE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE}/de/</loc></url>
  <url><loc>${BASE}/missions/apollo11</loc></url>
</urlset>`;

type Call = { url: string; method: string; body?: string };
function mockFetch(
  routes: Record<string, string | number>,
  post: (n: number) => number = () => 200,
) {
  const calls: Call[] = [];
  let posts = 0;
  const fn = async (url: string, init: { method?: string; body?: string } = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body });
    if (url === 'https://api.indexnow.org/indexnow') {
      const status = post(++posts);
      return { ok: status >= 200 && status < 300, status, text: async () => '' };
    }
    const r = routes[url];
    if (r === undefined) return { ok: false, status: 404, text: async () => '' };
    if (typeof r === 'number') return { ok: false, status: r, text: async () => '' };
    return { ok: true, status: 200, text: async () => r };
  };
  return { fn, calls, posts: () => calls.filter((c) => c.method === 'POST') };
}

const liveRoutes = {
  [`${BASE}/sitemap.xml`]: INDEX,
  [`${BASE}/sitemaps/en-US.xml`]: EN,
  [`${BASE}/sitemaps/de.xml`]: DE,
  [`${BASE}/${KEY}.txt`]: KEY,
};

let staticDir: string;
beforeAll(() => {
  staticDir = mkdtempSync(join(tmpdir(), 'indexnow-'));
  writeFileSync(join(staticDir, `${KEY}.txt`), KEY);
  writeFileSync(join(staticDir, 'robots.txt'), 'User-agent: *\n');
});
afterAll(() => rmSync(staticDir, { recursive: true, force: true }));

async function exec(argv: string[], m: ReturnType<typeof mockFetch>) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, {
    fetch: m.fn,
    staticDir,
    log: (s: string) => out.push(s),
    warn: (s: string) => err.push(s),
    sleep: async () => {},
  });
  return { code, out: out.join('\n'), err: err.join('\n') };
}

describe('parsing', () => {
  it('reads the sitemap index', () => {
    expect(parseSitemapIndex(INDEX)).toEqual([
      `${BASE}/sitemaps/en-US.xml`,
      `${BASE}/sitemaps/de.xml`,
    ]);
  });
  it('reads <loc> + <lastmod>, ignores hreflang hrefs, unescapes entities', () => {
    expect(parseUrlset(EN)).toEqual([
      { loc: `${BASE}/`, lastmod: '2026-11-10' },
      { loc: `${BASE}/missions/apollo11`, lastmod: '2026-10-01' },
      { loc: `${BASE}/moon?a=1&b=2` },
    ]);
  });
  it('dedupes across sitemaps and keeps a lastmod', () => {
    const d = dedupe([...parseUrlset(EN), ...parseUrlset(DE)]);
    expect(d.map((e: { loc: string }) => e.loc)).toEqual([
      `${BASE}/`,
      `${BASE}/missions/apollo11`,
      `${BASE}/moon?a=1&b=2`,
      `${BASE}/de/`,
    ]);
    expect(d[1].lastmod).toBe('2026-10-01');
  });
});

describe('--since', () => {
  it('drops older lastmod, keeps newer and URLs without lastmod', () => {
    const kept = filterSince(parseUrlset(EN), '2026-11-01').map((e: { loc: string }) => e.loc);
    expect(kept).toEqual([`${BASE}/`, `${BASE}/moon?a=1&b=2`]);
  });
  it('is a no-op without a cutoff', () => {
    expect(filterSince(parseUrlset(EN), undefined)).toHaveLength(3);
  });
});

describe('batching', () => {
  it('splits at 10,000', () => {
    const urls = Array.from({ length: 25001 }, (_, i) => `${BASE}/p${i}`);
    expect(toBatches(urls).map((b: string[]) => b.length)).toEqual([10000, 10000, 5001]);
    expect(toBatches(urls.slice(0, 10000))).toHaveLength(1);
  });
});

describe('args and key', () => {
  it('parses flags, rejects junk', () => {
    expect(
      parseArgs(['--dry-run', '--since=2026-11-01', '--base', 'http://x.test/']),
    ).toMatchObject({
      dryRun: true,
      since: '2026-11-01',
      base: 'http://x.test',
    });
    expect(() => parseArgs(['--nope'])).toThrow();
    expect(() => parseArgs(['--since', 'yesterday'])).toThrow();
    expect(() => parseArgs(['--key', 'short'])).toThrow();
  });
  it('finds the committed key file and skips robots.txt', () => {
    expect(findKey(staticDir)).toBe(KEY);
  });
});

describe('run', () => {
  it('dry run sends no POST and prints counts per locale and the batch plan', async () => {
    const m = mockFetch(liveRoutes);
    const r = await exec(['--dry-run'], m);
    expect(r.code).toBe(0);
    expect(m.posts()).toHaveLength(0);
    expect(m.calls.some((c) => c.url.includes('indexnow.org'))).toBe(false);
    expect(r.out).toContain('en-US');
    expect(r.out).toContain('total: 4 unique URLs');
    expect(r.out).toContain('1 batch(es)');
    expect(r.out).toContain('dry run: nothing sent');
  });

  it('dry run only warns when the key file is missing', async () => {
    const m = mockFetch({ ...liveRoutes, [`${BASE}/${KEY}.txt`]: 404 });
    const r = await exec(['--dry-run'], m);
    expect(r.code).toBe(0);
    expect(r.err).toContain('NOT live');
    expect(m.posts()).toHaveLength(0);
  });

  it('aborts a real run when the key file is missing', async () => {
    const m = mockFetch({ ...liveRoutes, [`${BASE}/${KEY}.txt`]: 404 });
    const r = await exec([], m);
    expect(r.code).toBe(1);
    expect(r.err).toContain('abort');
    expect(m.posts()).toHaveLength(0);
  });

  it('aborts when the key file holds a different body', async () => {
    const m = mockFetch({ ...liveRoutes, [`${BASE}/${KEY}.txt`]: '<html>spa</html>' });
    expect((await exec([], m)).code).toBe(1);
    expect(m.posts()).toHaveLength(0);
  });

  it('submits the deduped list with host, key and keyLocation', async () => {
    const m = mockFetch(liveRoutes, () => 202);
    const r = await exec([], m);
    expect(r.code).toBe(0);
    expect(m.posts()).toHaveLength(1);
    const body = JSON.parse(m.posts()[0].body as string);
    expect(body).toMatchObject({
      host: 'www.orrerylearn.com',
      key: KEY,
      keyLocation: `${BASE}/${KEY}.txt`,
    });
    expect(body.urlList).toHaveLength(4);
    expect(r.out).toContain('-> 202 ok');
  });

  it('--since limits what is submitted', async () => {
    const m = mockFetch(liveRoutes);
    await exec(['--since', '2026-11-01'], m);
    const body = JSON.parse(m.posts()[0].body as string);
    expect(body.urlList).toEqual([`${BASE}/`, `${BASE}/moon?a=1&b=2`, `${BASE}/de/`]);
  });

  it('splits a 12,000 URL list into two POSTs', async () => {
    const urls = Array.from({ length: 12000 }, (_, i) => `<url><loc>${BASE}/p${i}</loc></url>`);
    const m = mockFetch({
      ...liveRoutes,
      [`${BASE}/sitemaps/en-US.xml`]: `<urlset>${urls.join('')}</urlset>`,
    });
    const r = await exec([], m);
    expect(r.code).toBe(0);
    expect(m.posts().map((p) => JSON.parse(p.body as string).urlList.length)).toEqual([
      10000, 2002,
    ]);
  });

  it('exits non-zero on a non-2xx batch (422, no retry)', async () => {
    const m = mockFetch(liveRoutes, () => 422);
    const r = await exec([], m);
    expect(r.code).toBe(1);
    expect(m.posts()).toHaveLength(1);
    expect(r.out).toContain('422 FAIL');
  });

  it('retries 429 then succeeds', async () => {
    const m = mockFetch(liveRoutes, (n) => (n < 3 ? 429 : 200));
    const r = await exec([], m);
    expect(r.code).toBe(0);
    expect(m.posts()).toHaveLength(3);
  });

  it('gives up after repeated 5xx and exits non-zero', async () => {
    const m = mockFetch(liveRoutes, () => 503);
    const r = await exec([], m);
    expect(r.code).toBe(1);
    expect(m.posts()).toHaveLength(4);
  });

  it('exits 1 when a locale sitemap cannot be read', async () => {
    const m = mockFetch({ ...liveRoutes, [`${BASE}/sitemaps/de.xml`]: 500 });
    expect((await exec(['--dry-run'], m)).code).toBe(1);
  });

  it('exits 2 on bad arguments', async () => {
    expect((await exec(['--bogus'], mockFetch(liveRoutes))).code).toBe(2);
  });
});
