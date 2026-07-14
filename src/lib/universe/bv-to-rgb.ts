// Real star color: Johnson B−V color index → blackbody temperature → RGB.
//
// This is the honesty contract for /explore v2 (RFC-032 C-G): star colors are
// derived from the catalogued B−V, not invented. Two well-known approximations
// composed:
//   1. Ballesteros (2012) B−V → effective temperature.
//   2. Tanner Helland's blackbody-locus temperature → sRGB approximation.
// Both are standard, cheap, and good enough for a point-sprite starfield; the
// result is a perceptual approximation, never a photometric claim.

/** RGB in the 0..1 range, one channel each. */
export type Rgb = readonly [number, number, number];

/**
 * Ballesteros' formula: main-sequence B−V color index → effective temperature (K).
 * Valid roughly over B−V ∈ [-0.4, 2.0]; the caller clamps out-of-range input.
 */
export function bvToKelvin(bv: number): number {
  return 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Blackbody temperature (K) → approximate sRGB, per Tanner Helland. Temperature
 * is clamped to [1000, 40000] K — the range the approximation is fit over.
 * Returns each channel normalized to 0..1.
 */
export function kelvinToRgb(kelvin: number): Rgb {
  const t = clamp(kelvin, 1000, 40000) / 100;

  let r: number;
  let g: number;
  let b: number;

  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }

  if (t >= 66) {
    b = 255;
  } else if (t <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  }

  return [clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255];
}

/**
 * B−V color index → approximate sRGB. `bv` is clamped to [-0.4, 2.0] before
 * conversion so pathological catalogue values still yield a sane color.
 */
export function bvToRgb(bv: number): Rgb {
  return kelvinToRgb(bvToKelvin(clamp(bv, -0.4, 2)));
}
