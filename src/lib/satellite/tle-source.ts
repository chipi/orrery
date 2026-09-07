/**
 * Runtime TLE resolution for the station AR modes + the Physics Lab
 * (#404/#405 · H4c #464).
 *
 * The element sets are refreshed SERVER-SIDE into the served /data overlay
 * (static/data/station-tles.json) by fetch-station-tles.mjs — daily on main and
 * every 6h on the prod VPS, the same pipeline launches use. At runtime we fetch
 * that SAME-ORIGIN copy (no browser → Celestrak egress; there is exactly one
 * Celestrak-fetching code, and it runs server-side), memoise it for the session,
 * and fall back to the build-baked bundle (stations.ts) when the fetch fails
 * (offline). In the Capacitor build the overlay ships in the bundle, so the
 * fetch reads the packaged copy. Callers get a fresh TLE without any of them
 * knowing where it came from.
 */
import { base } from '$app/paths';
import { parseTleBlock, type Tle } from '$lib/physics/satellite/tle';
import { stationTle, stationTleBlock, type StationId } from '$lib/physics/satellite/stations';

interface StationEntry {
  name: string;
  line1: string;
  line2: string;
}

let overlay: Partial<Record<StationId, StationEntry>> | null = null;
let fetchAttempted = false;

/** Fetch the served overlay once per session; null when it can't be reached. */
async function loadOverlay(): Promise<Partial<Record<StationId, StationEntry>> | null> {
  if (overlay) return overlay;
  if (fetchAttempted) return overlay;
  fetchAttempted = true;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(`${base}/data/station-tles.json`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<Record<StationId, StationEntry>>;
    // Shape guard against a truncated / wrong body slipping into the parser.
    if (!json?.iss?.line1 || !json?.iss?.line2) return null;
    overlay = json;
    return overlay;
  } catch {
    return null;
  }
}

function blockFrom(e: StationEntry): string {
  return `${e.name}\n${e.line1}\n${e.line2}`;
}

/** Best available raw 3-line TLE block: served overlay → build-baked bundle. */
export async function resolveStationTleBlock(id: StationId): Promise<string> {
  const o = await loadOverlay();
  const entry = o?.[id];
  return entry ? blockFrom(entry) : stationTleBlock(id);
}

/**
 * Best available parsed TLE: served overlay → build-baked bundle. Never rejects.
 */
export async function resolveStationTle(id: StationId): Promise<Tle> {
  const o = await loadOverlay();
  const entry = o?.[id];
  return entry ? parseTleBlock(blockFrom(entry)) : stationTle(id);
}
