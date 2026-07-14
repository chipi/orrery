// Lightweight readout for an anonymous background star (the Hybrid tap-to-inspect
// from /explore v2 Slice 1). The point field carries only [x, y, z, mag, ci] per
// star — no name, spectrum, or catalogue id — so this derives the honest facts we
// *can* state: distance, apparent brightness, and a colour/temperature from B−V.
// Pure so it's unit-tested; the HUD renders the result.

import { bvToKelvin } from './bv-to-rgb';

const PC_TO_LY = 3.261_563_8;

export interface AnonymousStar {
  distPc: number;
  distLy: number;
  /** Apparent visual magnitude. */
  mag: number;
  /** Blackbody temperature (K) from B−V. */
  kelvin: number;
  /** Coarse colour class name for the temperature. */
  colorName: string;
}

/** Coarse star colour from blackbody temperature — the perceived tint, not a class. */
export function colorNameForKelvin(kelvin: number): string {
  if (kelvin >= 10_000) return 'blue-white';
  if (kelvin >= 7_300) return 'white';
  if (kelvin >= 5_700) return 'yellow-white';
  if (kelvin >= 4_900) return 'yellow';
  if (kelvin >= 3_700) return 'orange';
  return 'red';
}

/**
 * Describe an anonymous star from its point-field tuple values. Distance is the
 * euclidean norm of the parsec position; colour/temperature come from B−V.
 */
export function describeAnonymousStar(
  x: number,
  y: number,
  z: number,
  mag: number,
  ci: number,
): AnonymousStar {
  const distPc = Math.hypot(x, y, z);
  const kelvin = Math.round(bvToKelvin(ci));
  return {
    distPc,
    distLy: distPc * PC_TO_LY,
    mag,
    kelvin,
    colorName: colorNameForKelvin(kelvin),
  };
}
