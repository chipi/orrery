/**
 * Pure visual/placement math for the /explore v2 deep-sky layer (Slice 4).
 *
 * The WebGL builder (`deep-sky-scene.ts`, coverage-excluded) consumes these;
 * keeping the maths here makes colour, glint sizing, and sky-sphere placement
 * unit-testable in jsdom without a GPU.
 */
import type { DeepSkyCategory } from '$lib/data';

/** Radius (pc) of the celestial sphere the deep-sky glints sit on. Well beyond
 *  the named stars (≤ ~150 pc) yet inside the neighborhood far plane (1500 pc),
 *  so the deep sky reads as a distant backdrop, never tangled with the stars. */
export const DEEP_SKY_RADIUS = 900;

/** Per-category glint colour. Follows conventional astrophotography psychology
 *  (emission red-pink, reflection/planetary teal-cyan, galaxies cool blue-white,
 *  old stellar populations gold) so a category reads at a glance. */
export function categoryColor(category: DeepSkyCategory): string {
  switch (category) {
    case 'galaxy':
      return '#bcd0ff'; // cool blue-white — starlight of a whole galaxy
    case 'galaxy-cluster':
      return '#d8c8ff'; // pale violet — remote cluster haze
    case 'star-forming-region':
      return '#ff9bb0'; // hydrogen pink — HII emission
    case 'nebula':
      return '#ff9bb0'; // emission pink (generic nebula)
    case 'planetary-nebula':
      return '#7ff0e0'; // teal-cyan — [OIII] planetary shells
    case 'supernova-remnant':
      return '#9ad0ff'; // ionised blue-white filaments
    case 'dark-nebula':
      return '#c8a68a'; // dusty brown — obscuring dust
    case 'globular-cluster':
      return '#ffe6a8'; // warm gold — old stellar population
    case 'star-cluster':
      return '#dbe8ff'; // young blue-white cluster
    case 'star':
      return '#fff2d0'; // single bright star
    case 'other':
    default:
      return '#cdd4e6';
  }
}

/** Relative glint-size multiplier from real angular size (arcmin). Log-compressed
 *  and bounded so a 180′ giant (Andromeda, Cygnus Loop) reads clearly bigger than
 *  a 2′ planetary nebula without dwarfing the field 90×. Unknown size → 1. */
export function angularSizeFactor(sizeArcmin: number | null | undefined): number {
  if (!sizeArcmin || sizeArcmin <= 0) return 1;
  // log2 maps [1′ … 256′] → [0 … 8]; centre on ~10′ and scale gently.
  const f = 0.62 + 0.19 * Math.log2(sizeArcmin);
  return Math.min(2.4, Math.max(0.6, +f.toFixed(3)));
}

/** Unit sky direction (x,y,z on the unit sphere) → scene position on the
 *  deep-sky celestial sphere. */
export function directionToPosition(
  x: number,
  y: number,
  z: number,
  radius: number = DEEP_SKY_RADIUS,
): [number, number, number] {
  return [x * radius, y * radius, z * radius];
}

/** Whether a category can act as a "forming-system" gateway (young stars → an
 *  exoplanet BodyScene). Only star-forming regions qualify (Slice 4 Part 4). */
export function isGatewayCategory(category: DeepSkyCategory): boolean {
  return category === 'star-forming-region';
}
