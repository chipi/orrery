/**
 * JPL Horizons API helpers for the sky-row ephemeris (L42: the deep-sky IN THE SKY tab's best
 * months): the request URL, the CSV parser, and the fetch with retry. The API is documented at
 * https://ssd-api.jpl.nasa.gov/doc/horizons.html (served from ssd.jpl.nasa.gov/api/horizons.api).
 *
 * Network code is `fetchHorizons` only; the URL builder and the parser are pure and unit-tested
 * (scripts/lib/horizons.test.ts). Run by hand from the refresh and check scripts, never at runtime.
 */

export const HORIZONS_API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const USER_AGENT = 'orrery-sky-ephemeris (+https://github.com/chipi/orrery)';

/** The Horizons request URL for `params` (values are wrapped in the single quotes the API wants). */
export function horizonsUrl(params) {
  const qs = Object.entries({ format: 'text', ...params })
    .map(([k, v]) => `${k}=${k === 'format' ? v : encodeURIComponent(`'${v}'`)}`)
    .join('&');
  return `${HORIZONS_API}?${qs}`;
}

/** The rows between $$SOE and $$EOE of a CSV observer table, split into trimmed cells. */
export function parseHorizonsCsv(text) {
  const start = text.indexOf('$$SOE');
  const end = text.indexOf('$$EOE');
  if (start < 0 || end < 0) {
    throw new Error(`Horizons reply has no ephemeris block: ${text.slice(0, 300)}`);
  }
  return text
    .slice(start + 5, end)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(',').map((c) => c.trim()));
}

export async function fetchHorizons(params, tries = 4) {
  const url = horizonsUrl(params);
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(120_000),
      });
      if (res.ok) return { url, text: await res.text() };
      last = new Error(`${res.status} ${url}`);
    } catch (e) {
      last = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw last;
}
