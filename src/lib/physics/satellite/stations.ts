/**
 * Station element sets (#404 · H4c #464).
 *
 * The TLEs live in the served /data overlay `static/data/station-tles.json`,
 * refreshed by fetch-station-tles.mjs — daily on main (refresh-station-tles.yml)
 * and every 6h on the prod VPS (refresh-prod-data.sh), the SAME pipeline
 * launches use. This module imports it as the BUILD-BAKED baseline (the MCP
 * image and the app bundle carry it); at runtime the app prefers the fresh
 * served copy via `resolveStationTle` (tle-source.ts), falling back here when
 * offline. No code fetches Celestrak from the browser — one server-side fetcher.
 */
import { parseTle, type Tle } from './tle';
import bundled from '$data/station-tles.json';

export type StationId = 'iss' | 'tiangong';

interface StationDef {
  name: string;
  line1: string;
  line2: string;
}

const RAW = bundled as Record<StationId, StationDef>;

export const STATION_IDS: StationId[] = ['iss', 'tiangong'];

/** Parsed TLE for a station (from the bundled, daily-refreshed set). */
export function stationTle(id: StationId): Tle {
  const s = RAW[id];
  return parseTle(s.line1, s.line2, s.name);
}

/**
 * Raw 3-line TLE block for a station, the form `parseTleBlock` (and the Lab's
 * injected `tle` input) consume. Sourced from the bundled set here; H4c swaps
 * the app-side resolver to the served /data overlay without changing callers.
 */
export function stationTleBlock(id: StationId): string {
  const s = RAW[id];
  return `${s.name}\n${s.line1}\n${s.line2}`;
}
