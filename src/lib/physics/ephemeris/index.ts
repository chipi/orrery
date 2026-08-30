/**
 * Sky-pointing astronomy (#393) — public API.
 *
 * `skyPosition(body, date, lat, lon)` returns where a Solar-System body appears
 * in the observer's sky: altitude/azimuth (from true North), plus RA/Dec and
 * distance. `skyDirectionENU` turns that into a unit direction vector matching
 * ARKit's gravity-and-heading world frame (x=East, y=Up, z=South), so a marker
 * can be placed straight along it.
 */
import { julianDay, DEG } from './time';
import { geocentricPlanet, geocentricSun, type PlanetId, type Vec3 } from './planets';
import { geocentricMoon } from './moon';
import {
  eclipticToEquatorial,
  equatorialToHorizontal,
  precessEclipticJ2000ToDate,
  type Horizontal,
} from './horizontal';

export type SkyBody = 'sun' | 'moon' | Exclude<PlanetId, 'earth'>;

/** The bodies the sky mode can point to (Earth is the observer). */
export const SKY_BODIES: SkyBody[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
];

export interface SkyPosition extends Horizontal {
  body: SkyBody;
  /** Right ascension, hours [0, 24). */
  raHours: number;
  /** Declination, degrees. */
  decDeg: number;
  /** Geocentric distance, AU. */
  distanceAu: number;
  /** True when the body is above the horizon. */
  aboveHorizon: boolean;
}

function geocentricEcliptic(body: SkyBody, jd: number): Vec3 {
  // Sun + planets come from the Standish elements referenced to the J2000
  // equinox, so precess them onto the equinox OF DATE (M1) before the of-date
  // obliquity + of-date sidereal-time steps downstream — otherwise the frames
  // are mixed and the sky pointing carries a ~0.36°-in-2026 precession error.
  // The Moon (Schlyter) is already ecliptic-of-date and must NOT be precessed.
  if (body === 'sun') return precessEclipticJ2000ToDate(geocentricSun(jd), jd);
  if (body === 'moon') return geocentricMoon(jd).pos;
  return precessEclipticJ2000ToDate(geocentricPlanet(body, jd), jd);
}

/**
 * Where `body` appears in the sky for an observer at `latDeg`/`lonDeg`
 * (east longitude positive) at `date`.
 */
export function skyPosition(
  body: SkyBody,
  date: Date,
  latDeg: number,
  lonDeg: number,
): SkyPosition {
  const jd = julianDay(date);
  const eq = eclipticToEquatorial(geocentricEcliptic(body, jd), jd);
  const hor = equatorialToHorizontal(eq, jd, latDeg * DEG, lonDeg * DEG);
  return {
    body,
    ...hor,
    raHours: ((eq.raRad * 12) / Math.PI + 24) % 24,
    decDeg: (eq.decRad * 180) / Math.PI,
    distanceAu: eq.distanceAu,
    aboveHorizon: hor.altRad > 0,
  };
}

/** All bodies' sky positions for one observer + time (convenience). */
export function skyPositions(date: Date, latDeg: number, lonDeg: number): SkyPosition[] {
  return SKY_BODIES.map((b) => skyPosition(b, date, latDeg, lonDeg));
}

/**
 * Unit direction to a body in ARKit's gravity-and-heading world frame:
 * x = East, y = Up, z = South (so North = −z). Multiply by a large radius to
 * place a marker "at infinity" along the line of sight.
 */
export function skyDirectionENU(
  pos: Pick<SkyPosition, 'altRad' | 'azRad'>,
): [number, number, number] {
  const ca = Math.cos(pos.altRad);
  const east = ca * Math.sin(pos.azRad);
  const north = ca * Math.cos(pos.azRad);
  const up = Math.sin(pos.altRad);
  return [east, up, -north];
}

export { julianDay } from './time';
