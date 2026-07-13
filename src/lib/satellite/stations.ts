/**
 * Bundled station element sets (#404).
 *
 * ⚠ SAMPLE TLEs — placeholders with a recent-ish epoch so the engine + tests
 * work offline. TLEs go stale within days, so the shipped feature must REFRESH
 * these from Celestrak (a scheduled fetch, mirroring the launches-manifest
 * refresh) before the sky positions are trustworthy. The parser/propagator are
 * validated independently of these exact values.
 */
import { parseTle, type Tle } from './tle';

export type StationId = 'iss' | 'tiangong';

interface StationDef {
  id: StationId;
  name: string;
  line1: string;
  line2: string;
}

const RAW: Record<StationId, StationDef> = {
  iss: {
    id: 'iss',
    name: 'ISS (ZARYA)',
    line1: '1 25544U 98067A   24280.50000000  .00016717  00000-0  30074-3 0  9993',
    line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.50377579 20000',
  },
  tiangong: {
    id: 'tiangong',
    name: 'CSS (TIANHE)',
    line1: '1 48274U 21035A   24280.50000000  .00025000  00000-0  28000-3 0  9990',
    line2: '2 48274  41.4700 100.0000 0004500  50.0000 310.0000 15.60000000 10000',
  },
};

export const STATION_IDS: StationId[] = ['iss', 'tiangong'];

/** Parsed TLE for a station. */
export function stationTle(id: StationId): Tle {
  const s = RAW[id];
  return parseTle(s.line1, s.line2, s.name);
}
