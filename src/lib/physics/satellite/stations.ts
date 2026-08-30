/**
 * Bundled station element sets (#404).
 *
 * The TLEs live in station-tles.json, refreshed daily from Celestrak by the
 * `Refresh station TLEs` workflow (npm run fetch:tles) so the bundled fallback
 * is never more than ~a day stale. At runtime, `resolveStationTle` (tle-source.ts)
 * still prefers a live fetch; this bundle is the offline/CORS fallback. The
 * parser/propagator are validated independently of these exact values.
 */
import { parseTle, type Tle } from './tle';
import bundled from './station-tles.json';

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
