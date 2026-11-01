/**
 * Outbound-link probe shared by scripts/check-learn-links.ts and
 * scripts/check-external-links.mjs (ADR-051 §responsible-fetching).
 *
 * HEAD first; some hosts answer HEAD with 405, or with 403/404 while GET is
 * 200 (Wikipedia, Gunter's Space Page — #369), so those retry as GET and a
 * conclusive GET verdict wins. Bodies are never read.
 */

export const USER_AGENT =
  'Orrery-LinkChecker/1.0 (+https://github.com/chipi/orrery; outbound-link health under ADR-051)';
export const TIMEOUT_MS = 8_000;

/** @typedef {'ok' | 'redirect' | 'dead' | 'forbidden' | 'timeout' | 'error'} HealthStatus */
/** @typedef {{ status: HealthStatus, http_status: number | null, final_url: string | null, detail: string | null }} ProbeResult */

/** @param {Response} res @returns {HealthStatus} */
export function classifyResponse(res) {
  if (res.ok) return 'ok';
  // Rate-limited says nothing about the link; report it as inconclusive.
  if (res.status === 429) return 'timeout';
  if (res.status >= 300 && res.status < 400) return 'redirect';
  if (res.status === 401 || res.status === 403) return 'forbidden';
  return 'dead';
}

/** @param {string} url @param {'HEAD' | 'GET'} method @returns {Promise<ProbeResult>} */
async function request(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      signal: ctrl.signal,
    });
    // Release the connection without reading the body.
    await res.body?.cancel().catch(() => {});
    return {
      status: classifyResponse(res),
      http_status: res.status,
      final_url: res.url || url,
      detail: res.status === 429 ? 'rate-limited' : null,
      retry_after: res.headers.get('retry-after'),
    };
  } catch (err) {
    const e = /** @type {Error} */ (err);
    if (e.name === 'AbortError')
      return { status: 'timeout', http_status: null, final_url: null, detail: null };
    return {
      status: 'error',
      http_status: null,
      final_url: null,
      detail: e.cause ? String(/** @type {any} */ (e.cause).code ?? e.cause) : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} url @returns {Promise<ProbeResult>} */
export async function probeUrl(url) {
  let head = await request(url, 'HEAD');
  if (head.http_status === 429) {
    // One retry after the host's Retry-After (seconds), capped at 30 s.
    await sleep(Math.min(30, Number(head.retry_after) || 5) * 1000);
    head = await request(url, 'HEAD');
  }
  if (head.http_status === 405 || head.http_status === 404 || head.http_status === 403) {
    const get = await request(url, 'GET');
    if (get.status !== 'error' && get.status !== 'timeout') return get;
  }
  return head;
}

// Wikipedia and Wikimedia Commons rate-limit page requests (a run of 1,600 HEADs
// came back 429). Their API answers "does this page exist" for 50 titles per
// request, with normalisation and redirects resolved.
const WIKI_HOST = /^([a-z-]+\.wikipedia\.org|commons\.wikimedia\.org|www\.wikidata\.org)$/;
const WIKI_BATCH = 50;

/** The page title a /wiki/<title> URL names, or null for any other URL shape. */
export function wikiTitle(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  // Tracking parameters (utm_*) don't change the page; any other query does.
  const onlyTracking = [...u.searchParams.keys()].every((k) => k.startsWith('utm_'));
  if (!WIKI_HOST.test(u.host) || !u.pathname.startsWith('/wiki/') || !onlyTracking) return null;
  try {
    return decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/**
 * @param {string} host
 * @param {string[]} urls  all on `host`, all with a wikiTitle
 * @returns {Promise<Map<string, ProbeResult>>}
 */
async function probeWikiHost(host, urls) {
  const out = new Map();
  for (let i = 0; i < urls.length; i += WIKI_BATCH) {
    const chunk = urls.slice(i, i + WIKI_BATCH);
    const titles = chunk.map(wikiTitle);
    const api = `https://${host}/w/api.php?${new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      redirects: '1',
      maxlag: '5',
      titles: titles.join('|'),
    })}`;
    let json = null;
    for (let attempt = 0; attempt < 3 && !json; attempt++) {
      if (attempt) await sleep(5000 * attempt);
      try {
        const res = await fetch(api, { headers: { 'user-agent': USER_AGENT } });
        if (res.ok) json = await res.json();
      } catch {
        // retried below
      }
    }
    if (!json?.query) {
      for (const u of chunk)
        out.set(u, { status: 'error', http_status: null, final_url: null, detail: 'wiki API' });
      continue;
    }
    const norm = new Map((json.query.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((json.query.redirects ?? []).map((r) => [r.from, r]));
    const pages = new Map((json.query.pages ?? []).map((p) => [p.title, p]));
    chunk.forEach((u, k) => {
      const t1 = norm.get(titles[k]) ?? titles[k];
      const r = redir.get(t1);
      const t2 = r ? r.to : t1;
      const page = pages.get(t2);
      const missing = !page || page.missing || page.invalid;
      // A page can be "missing" locally yet "known" (a Commons file shown on a
      // Wikipedia) — that still opens.
      const dead = missing && !page?.known;
      const final = r
        ? `https://${host}/wiki/${encodeURIComponent(t2.replace(/ /g, '_'))}${r.tofragment ? '#' + r.tofragment : ''}`
        : u;
      out.set(u, {
        status: dead ? 'dead' : 'ok',
        http_status: dead ? 404 : 200,
        final_url: final,
        detail: dead ? 'no such page (wiki API)' : null,
      });
    });
    await sleep(200);
  }
  return out;
}

/**
 * Probe many URLs with bounded concurrency overall and per host, so a run over
 * hundreds of links on one site never sends it more than `perHost` at once.
 * @param {string[]} urls
 * @param {{ concurrency?: number, perHost?: number, onProgress?: (done: number, total: number, url: string, result: ProbeResult) => void }} [opts]
 * @returns {Promise<Map<string, ProbeResult>>}
 */
export async function probeAll(urls, opts = {}) {
  const concurrency = opts.concurrency ?? 8;
  const perHost = opts.perHost ?? 2;
  const hostOf = (u) => {
    try {
      return new URL(u).host;
    } catch {
      return u;
    }
  };
  const results = new Map();
  let done = 0;

  // Wiki pages go through the API, one host at a time.
  const wikiByHost = new Map();
  for (const u of urls)
    if (wikiTitle(u) !== null) wikiByHost.set(hostOf(u), [...(wikiByHost.get(hostOf(u)) ?? []), u]);
  for (const [host, list] of wikiByHost) {
    for (const [u, r] of await probeWikiHost(host, list)) {
      results.set(u, r);
      done++;
      opts.onProgress?.(done, urls.length, u, r);
    }
  }

  const queue = urls.filter((u) => !results.has(u));
  const inflight = new Map();
  await new Promise((resolve) => {
    let active = 0;
    const pump = () => {
      if (queue.length === 0 && active === 0) return resolve(undefined);
      while (active < concurrency) {
        const i = queue.findIndex((u) => (inflight.get(hostOf(u)) ?? 0) < perHost);
        if (i < 0) break;
        const [url] = queue.splice(i, 1);
        const host = hostOf(url);
        inflight.set(host, (inflight.get(host) ?? 0) + 1);
        active++;
        probeUrl(url).then((r) => {
          results.set(url, r);
          inflight.set(host, inflight.get(host) - 1);
          active--;
          done++;
          opts.onProgress?.(done, urls.length, url, r);
          pump();
        });
      }
    };
    pump();
  });
  return results;
}
