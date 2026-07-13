/**
 * Fresh TLE resolution for the station AR modes (#404/#405).
 *
 * A station's real sky position needs a CURRENT element set (TLEs stale in days),
 * so we fetch the latest from Celestrak at runtime — cached in localStorage for a
 * day so we hit the network at most once daily — and fall back to the bundled
 * sample TLE if the fetch fails (offline / CORS). Celestrak's gp.php sends
 * `Access-Control-Allow-Origin: *`, so the browser fetch works; in the Capacitor
 * WKWebView it's a native request either way.
 */
import { parseTleBlock, type Tle } from './tle';
import { stationTle, type StationId } from './stations';

const CATNR: Record<StationId, number> = { iss: 25544, tiangong: 48274 };
const CACHE_MS = 24 * 3600 * 1000;

const memo = new Map<StationId, Tle>();

function cacheKey(id: StationId): string {
  return `orrery.tle.${id}`;
}

/** Try localStorage for a recent cached TLE block. */
function readCache(id: StationId): Tle | null {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(cacheKey(id));
    if (!raw) return null;
    const { at, block } = JSON.parse(raw) as { at: number; block: string };
    if (Date.now() - at > CACHE_MS) return null;
    return parseTleBlock(block);
  } catch {
    return null;
  }
}

function writeCache(id: StationId, block: string): void {
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(cacheKey(id), JSON.stringify({ at: Date.now(), block }));
  } catch {
    /* private mode / quota — ignore */
  }
}

async function fetchTle(id: StationId): Promise<Tle | null> {
  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${CATNR[id]}&FORMAT=TLE`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    // Require the actual TLE line structure (guards against rate-limit HTML or a
    // truncated body slipping through into the parser).
    if (!/^1 \d{5}/m.test(text) || !/^2 \d{5}/m.test(text)) return null;
    writeCache(id, text);
    return parseTleBlock(text);
  } catch {
    return null;
  }
}

/**
 * Best available TLE: in-memory → localStorage (≤1 day) → Celestrak → bundled
 * sample. Always resolves (never rejects).
 */
export async function resolveStationTle(id: StationId): Promise<Tle> {
  const cached = memo.get(id) ?? readCache(id);
  if (cached) {
    memo.set(id, cached);
    return cached;
  }
  const fetched = await fetchTle(id);
  const tle = fetched ?? stationTle(id);
  memo.set(id, tle);
  return tle;
}
