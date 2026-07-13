/**
 * NORAD Two-Line Element (TLE) parsing for the station AR modes (#404).
 *
 * Fixed-column format. Angles are stored in radians; mean motion in rad/min.
 * The epoch is converted to a Julian Day so it plugs into the same time base as
 * $lib/astronomy.
 */
import { julianDay } from '../astronomy/time';

const DEG = Math.PI / 180;

export interface Tle {
  name: string;
  /** NORAD catalogue number. */
  noradId: number;
  /** Julian Day of the element-set epoch. */
  epochJd: number;
  /** Inclination, radians. */
  inclRad: number;
  /** Right ascension of ascending node, radians. */
  raanRad: number;
  eccentricity: number;
  /** Argument of perigee, radians. */
  argpRad: number;
  /** Mean anomaly at epoch, radians. */
  meanAnomalyRad: number;
  /** Mean motion, radians per minute. */
  meanMotionRadPerMin: number;
  /** Mean motion (revolutions per day) — as given. */
  revsPerDay: number;
}

function epochToJd(yy: number, dayOfYear: number): number {
  const year = yy < 57 ? 2000 + yy : 1900 + yy;
  const ms = Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86_400_000;
  return julianDay(new Date(ms));
}

/** Parse a TLE (name optional; 2 element lines required). */
export function parseTle(line1: string, line2: string, name = ''): Tle {
  const yy = parseInt(line1.slice(18, 20), 10);
  const doy = parseFloat(line1.slice(20, 32));
  const revsPerDay = parseFloat(line2.slice(52, 63));
  return {
    name: name.trim(),
    noradId: parseInt(line2.slice(2, 7), 10),
    epochJd: epochToJd(yy, doy),
    inclRad: parseFloat(line2.slice(8, 16)) * DEG,
    raanRad: parseFloat(line2.slice(17, 25)) * DEG,
    eccentricity: parseFloat('0.' + line2.slice(26, 33).trim()),
    argpRad: parseFloat(line2.slice(34, 42)) * DEG,
    meanAnomalyRad: parseFloat(line2.slice(43, 51)) * DEG,
    meanMotionRadPerMin: (revsPerDay * 2 * Math.PI) / 1440,
    revsPerDay,
  };
}

/** Parse a 3-line TLE block ("name\nline1\nline2"). */
export function parseTleBlock(block: string): Tle {
  const lines = block.trim().split('\n');
  if (lines.length >= 3) return parseTle(lines[1], lines[2], lines[0]);
  return parseTle(lines[0], lines[1]);
}
