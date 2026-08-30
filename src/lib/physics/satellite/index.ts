/**
 * Satellite orbit engine (#404) — public API for the station AR modes.
 *
 * `stationLookAngle` says where the ISS/Tiangong appear in the observer's sky
 * now; `nextVisiblePass` predicts the next overhead pass that's actually visible
 * (station sunlit, observer in twilight/dark). Shares the time base + Sun
 * position with $lib/astronomy.
 */
import { julianDay, skyPosition } from '../ephemeris';
import { propagate, type EciVec } from './propagate';
import { lookAngle, type LookAngle } from './look-angles';
import { stationTle, type StationId } from './stations';
import type { Tle } from './tle';

export type { StationId } from './stations';
export { STATION_IDS } from './stations';

const RE = 6378.137;
const DEG = Math.PI / 180;

/** Where a satellite (given its TLE) appears in the sky for an observer. */
export function lookAngleForTle(tle: Tle, date: Date, latDeg: number, lonDeg: number): LookAngle {
  const jd = julianDay(date);
  return lookAngle(propagate(tle, jd), jd, latDeg * DEG, lonDeg * DEG);
}

/** Where a station appears in the sky (using the bundled TLE — prefer the
 *  fetched one via lookAngleForTle + resolveStationTle for accuracy). */
export function stationLookAngle(
  id: StationId,
  date: Date,
  latDeg: number,
  lonDeg: number,
): LookAngle {
  return lookAngleForTle(stationTle(id), date, latDeg, lonDeg);
}

/** Equatorial unit vector to the Sun (compatible with the satellite ECI frame). */
function sunUnitEci(date: Date): EciVec {
  const s = skyPosition('sun', date, 0, 0);
  const ra = s.raHours * 15 * DEG;
  const dec = s.decDeg * DEG;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.cos(dec) * Math.sin(ra), z: Math.sin(dec) };
}

/** Is the satellite in sunlight (not inside Earth's cylindrical shadow)? */
function isSunlit(satEci: EciVec, sunHat: EciVec): boolean {
  const proj = satEci.x * sunHat.x + satEci.y * sunHat.y + satEci.z * sunHat.z;
  if (proj > 0) return true; // sun-facing side
  const perp = Math.hypot(
    satEci.x - proj * sunHat.x,
    satEci.y - proj * sunHat.y,
    satEci.z - proj * sunHat.z,
  );
  return perp > RE;
}

export interface Pass {
  start: Date;
  culmination: Date;
  end: Date;
  maxAltitudeDeg: number;
  /** Compass azimuth (deg) where the station rises. */
  startAzimuthDeg: number;
  /** Station sunlit + observer dark at culmination → naked-eye visible. */
  visible: boolean;
}

/**
 * Next pass (max elevation ≥ `minMaxAltDeg`) within `hoursAhead`. Coarse 30 s
 * scan, refined by the min-alt gate. `visible` marks passes you could actually
 * see (station lit, sky dark). Returns null if none.
 */
export function nextPass(
  id: StationId,
  from: Date,
  latDeg: number,
  lonDeg: number,
  opts: { hoursAhead?: number; minMaxAltDeg?: number } = {},
): Pass | null {
  return nextPassForTle(stationTle(id), from, latDeg, lonDeg, opts);
}

/** Next pass for a satellite given its TLE (prefer the fetched one). */
export function nextPassForTle(
  tle: Tle,
  from: Date,
  latDeg: number,
  lonDeg: number,
  opts: { hoursAhead?: number; minMaxAltDeg?: number } = {},
): Pass | null {
  const latRad = latDeg * DEG;
  const lonRad = lonDeg * DEG;
  const hours = opts.hoursAhead ?? 24;
  const minMax = opts.minMaxAltDeg ?? 10;
  const stepMs = 30_000;
  const steps = Math.ceil((hours * 3600_000) / stepMs);

  let inPass = false;
  let startT = 0;
  let maxAlt = -90;
  let maxT = 0;
  let startAz = 0;

  for (let i = 0; i <= steps; i++) {
    const t = from.getTime() + i * stepMs;
    const jd = julianDay(new Date(t));
    const la = lookAngle(propagate(tle, jd), jd, latRad, lonRad);
    if (la.aboveHorizon) {
      if (!inPass) {
        inPass = true;
        startT = t;
        maxAlt = la.altitudeDeg;
        maxT = t;
        startAz = la.azimuthDeg;
      } else if (la.altitudeDeg > maxAlt) {
        maxAlt = la.altitudeDeg;
        maxT = t;
      }
    } else if (inPass) {
      inPass = false;
      const p = buildPass(t);
      if (p) return p;
    }
  }
  // A qualifying pass may still be in progress at the scan-window end — emit it
  // rather than dropping it.
  if (inPass) {
    const p = buildPass(from.getTime() + steps * stepMs);
    if (p) return p;
  }
  return null;

  function buildPass(endT: number): Pass | null {
    if (maxAlt < minMax) return null;
    const culM = new Date(maxT);
    const sunHat = sunUnitEci(culM);
    const satAtCul = propagate(tle, julianDay(culM));
    const obsSunAlt = skyPosition('sun', culM, latDeg, lonDeg).altitudeDeg;
    return {
      start: new Date(startT),
      culmination: culM,
      end: new Date(endT),
      maxAltitudeDeg: maxAlt,
      startAzimuthDeg: startAz,
      visible: isSunlit(satAtCul, sunHat) && obsSunAlt < -6,
    };
  }
}

export { stationTle };
export type { Tle, LookAngle };
