// Scale readout for /explore — turns a camera distance into the human measure
// that fits it, so zooming teaches the ladder of cosmic distance units:
// kilometres → astronomical units → light-years → parsecs. Also the light-travel
// time (how long light takes to cross the distance) and a map-style scale bar.
//
// Pure + framework-free so it can be unit-tested; the /explore HUD renders it.
// Everything is driven from a canonical distance in astronomical units (AU),
// which both the solar (AU) and neighborhood (pc) contexts convert into.

export const KM_PER_AU = 149_597_870.7;
export const AU_PER_LY = 63_241.077;
export const AU_PER_PC = 206_264.806;
export const LY_PER_PC = 3.261_563_8;
/** Light crosses 1 AU in this many seconds (≈ 8.317 light-minutes). */
export const LIGHT_SECONDS_PER_AU = 499.004_784;

/** Which rung of the distance ladder the current scale sits on. */
export type ScaleRung = 'km' | 'au' | 'ly' | 'pc';

export const RUNG_LADDER: ScaleRung[] = ['km', 'au', 'ly', 'pc'];

export interface Quantity {
  value: number;
  unit: string;
}

export interface ScaleReadout {
  /** Active ladder rung (for highlighting the unit chips). */
  rung: ScaleRung;
  /** Primary distance in the fitting unit. */
  primary: Quantity;
  /** A companion reading (pc alongside ly, or a coarse AU alongside km). */
  companion?: Quantity;
  /** How long light takes to cross this distance. */
  lightTravel: Quantity;
}

function round(value: number, sig = 3): number {
  if (value === 0) return 0;
  const mag = Math.floor(Math.log10(Math.abs(value)));
  const f = 10 ** (sig - 1 - mag);
  return Math.round(value * f) / f;
}

/** Light-travel time across `au`, in the unit that reads cleanly. */
export function lightTravel(au: number): Quantity {
  const seconds = au * LIGHT_SECONDS_PER_AU;
  if (seconds < 90) return { value: round(seconds), unit: 'light-seconds' };
  const minutes = seconds / 60;
  if (minutes < 90) return { value: round(minutes), unit: 'light-minutes' };
  const hours = minutes / 60;
  if (hours < 36) return { value: round(hours), unit: 'light-hours' };
  const days = hours / 24;
  if (days < 400) return { value: round(days), unit: 'light-days' };
  const years = au / AU_PER_LY;
  return { value: round(years), unit: 'light-years' };
}

/**
 * Describe a distance (in AU) as the human measure that fits it, with a companion
 * reading and the light-travel time. Thresholds walk the ladder: sub-solar
 * distances read in km, the planetary system in AU, interstellar in light-years
 * (with parsecs alongside — the astronomer's unit).
 */
export function describeDistanceAu(au: number): ScaleReadout {
  const light = lightTravel(au);

  if (au < 0.02) {
    // Close in — kilometres (with a coarse AU companion once it's meaningful).
    return {
      rung: 'km',
      primary: { value: round(au * KM_PER_AU), unit: 'km' },
      companion: au >= 0.001 ? { value: round(au), unit: 'AU' } : undefined,
      lightTravel: light,
    };
  }
  if (au < 0.1 * AU_PER_LY) {
    // Planetary system — astronomical units.
    return {
      rung: 'au',
      primary: { value: round(au), unit: 'AU' },
      lightTravel: light,
    };
  }
  // Interstellar — light-years primary, parsecs alongside.
  return {
    rung: 'ly',
    primary: { value: round(au / AU_PER_LY), unit: 'ly' },
    companion: { value: round(au / AU_PER_PC), unit: 'pc' },
    lightTravel: light,
  };
}

export interface ScaleBar {
  /** Round-number world length the bar spans, in AU. */
  au: number;
  /** On-screen width of the bar, in pixels. */
  px: number;
}

/**
 * A map-style scale bar: given how many AU one screen pixel covers, pick a
 * round length (1/2/5 × 10ⁿ) near `targetPx` wide and return its exact pixel
 * width. Returns null when the input isn't a usable positive number.
 */
export function niceScaleBar(auPerPixel: number, targetPx = 130): ScaleBar | null {
  if (!Number.isFinite(auPerPixel) || auPerPixel <= 0) return null;
  const rawAu = auPerPixel * targetPx;
  const mag = Math.floor(Math.log10(rawAu));
  const base = 10 ** mag;
  const mantissa = rawAu / base;
  const niceMantissa = mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1;
  const au = niceMantissa * base;
  return { au, px: au / auPerPixel };
}
