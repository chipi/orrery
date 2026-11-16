/**
 * The Sun at a launch pad at a real instant (G3: a real mission takes its light from its
 * actual launch time). Pure; the NOAA low-precision solar position (about 0.01 degree in
 * declination, a minute in the equation of time), no refraction.
 *
 * Light rule (`lightFromSunElevation`), documented here because the scene's four light picks
 * are not astronomical terms:
 *   elevation < -6      night   (past civil twilight)
 *   -6 .. +6            dusk    (civil twilight and the sun on the horizon, rising or setting
 *                               alike: a dawn launch has the same red-purple look as dusk)
 *   +6 .. +15           golden  (the low warm sun)
 *   > +15               midday
 */

import type { LightId } from './ascent-director';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export interface SunPosition {
  /** Degrees above the horizon (negative below). */
  elevDeg: number;
  /** Compass bearing of the Sun, degrees clockwise from north. */
  azDeg: number;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** Julian day of a UTC instant (ms since the Unix epoch). */
function julianDay(utcMs: number): number {
  return utcMs / 86_400_000 + 2_440_587.5;
}

/**
 * Sun position at a pad. `lonDeg` east positive, as in the launch-site data
 * (Cape Canaveral is -80.6).
 */
export function sunAt(utcMs: number, latDeg: number, lonDeg: number): SunPosition {
  const T = (julianDay(utcMs) - 2_451_545) / 36_525;
  const L0 = mod(280.46646 + T * (36_000.76983 + T * 0.0003032), 360);
  const M = mod(357.52911 + T * (35_999.05029 - 0.0001537 * T), 360);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * D2R;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = (trueLong - 0.00569 - 0.00478 * Math.sin(omega * D2R)) * D2R;
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega * D2R)) * D2R;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));

  const y = Math.tan(eps / 2) ** 2;
  const L0r = L0 * D2R;
  const eqTimeMin =
    4 *
    R2D *
    (y * Math.sin(2 * L0r) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
      0.5 * y * y * Math.sin(4 * L0r) -
      1.25 * e * e * Math.sin(2 * Mr));

  const utcMin = mod(utcMs / 60_000, 1440);
  const trueSolarMin = mod(utcMin + eqTimeMin + 4 * lonDeg, 1440);
  const H = (trueSolarMin / 4 - 180) * D2R;
  const lat = latDeg * D2R;

  const sinEl = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H);
  const elevDeg = Math.asin(Math.min(1, Math.max(-1, sinEl))) * R2D;
  const azDeg = mod(
    Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) * R2D +
      180,
    360,
  );
  return { elevDeg, azDeg };
}

/** The scene's light pick for a real sun elevation (rule in the file header). */
export function lightFromSunElevation(elevDeg: number): LightId {
  if (elevDeg < -6) return 'night';
  if (elevDeg < 6) return 'dusk';
  if (elevDeg <= 15) return 'golden';
  return 'midday';
}

/**
 * Compass bearing to the scene azimuth the conditions rig uses (0 = +x downrange, 90 = +z, the
 * camera side). Downrange is taken as due east, which is where most launches go; the
 * profile data holds no launch azimuth.
 */
export function compassToSceneAz(compassDeg: number): number {
  return mod(compassDeg - 90, 360);
}

/** A launch instant with its pad, as the director takes it. */
export interface LaunchInstant {
  utcMs: number;
  latDeg: number;
  lonDeg: number;
}

export interface LaunchEntryLike {
  orrery_mission_ref?: string | null;
  orrery_launcher_ref?: string | null;
  orrery_launch_site_ref?: string | null;
  net?: string;
  net_precision?: string;
}

const hasTimeOfDay = (e: LaunchEntryLike): boolean =>
  e.net_precision === 'minute' || e.net_precision === 'second';

/**
 * The launches-dataset entry (static/data/launches-historic/*.json) that is this mission's
 * real launch, or null. Matches, in order:
 *   1. `orrery_mission_ref` equal to the mission id;
 *   2. when no entry names the mission (the Shuttle's "OV-104 IUS deploy" rows do not): the
 *      single entry on the mission's departure date (UTC) flown by the mission's launcher.
 * Only an entry with a time of day (minute or second precision) counts: a date-only mission,
 * a mission with no entry or a Plan flight has no real time, and the light is then seeded
 * rather than invented.
 */
export function findLaunchEntry<E extends LaunchEntryLike>(
  entries: Iterable<E>,
  q: { missionId?: string; departureDate?: string; launcherId?: string },
  /** true: match the entry whatever its time precision (the pad name does not need a time). */
  anyPrecision = false,
): E | null {
  if (!q.missionId || q.missionId.startsWith('plan-')) return null;
  const all = [...entries];
  const byRef = all.find((e) => e.orrery_mission_ref === q.missionId);
  if (byRef) return anyPrecision || hasTimeOfDay(byRef) ? byRef : null;
  if (!q.departureDate || !q.launcherId) return null;
  const same = all.filter(
    (e) =>
      e.orrery_launcher_ref === q.launcherId &&
      !e.orrery_mission_ref &&
      (anyPrecision || hasTimeOfDay(e)) &&
      (e.net ?? '').slice(0, 10) === q.departureDate,
  );
  return same.length === 1 ? same[0] : null;
}

/** The real launch instant (ms, UTC) of a mission, or null. See {@link findLaunchEntry}. */
export function launchUtcMsFor(
  entries: Iterable<LaunchEntryLike>,
  missionId: string | undefined,
  extra: { departureDate?: string; launcherId?: string } = {},
): number | null {
  const e = findLaunchEntry(entries, { missionId, ...extra });
  const ms = e ? Date.parse(e.net ?? '') : NaN;
  return Number.isFinite(ms) ? ms : null;
}
