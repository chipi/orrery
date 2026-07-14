// Pure star-field LOD + attribute packing for the /explore v2 PointField.
// Kept free of THREE so it can be unit-tested (point-field.ts holds the WebGL
// builder). Given the tiled HYG shells and a device budget, selects the
// "N brightest within radius R" and packs GPU-ready typed arrays.

import { bvToRgb } from './bv-to-rgb';
import type { StarBudget } from './budget';

/** A distance shell as emitted by build-universe-stars: each star is [x, y, z, mag, ci]. */
export interface ShellData {
  stars: number[][];
}

/** GPU-ready attribute buffers for one THREE.Points object. */
export interface StarFieldArrays {
  count: number;
  /** xyz per point, in parsecs (the scene applies its own scale). */
  positions: Float32Array;
  /** rgb per point, 0..1, from B−V. */
  colors: Float32Array;
  /** Per-point base size (world units), brighter stars larger. */
  sizes: Float32Array;
}

/**
 * Apparent magnitude → base point size. Flux scales as 2.512^(−mag), so a
 * brighter (smaller-magnitude) star gets a larger sprite. Anchored at the
 * naked-eye limit (mag 6) and clamped to keep the faintest stars visible and
 * the brightest from blowing out.
 */
export function magnitudeToPointSize(mag: number): number {
  const REF_MAG = 6;
  const size = 0.7 * Math.pow(2.512, (REF_MAG - mag) * 0.16);
  return Math.min(3.2, Math.max(0.35, size));
}

/**
 * Select the brightest `budget.maxPoints` stars within `budget.shellRadiusPc`
 * across all shells, and pack them into position/color/size buffers.
 */
export function selectVisibleStars(shells: ShellData[], budget: StarBudget): StarFieldArrays {
  const r2 = budget.shellRadiusPc * budget.shellRadiusPc;
  const within: number[][] = [];
  for (const shell of shells) {
    for (const s of shell.stars) {
      const [x, y, z] = s;
      if (x * x + y * y + z * z <= r2) within.push(s);
    }
  }

  // Brightest first (ascending magnitude = index 3), then cap to the budget.
  within.sort((a, b) => a[3] - b[3]);
  const count = Math.min(within.length, budget.maxPoints);

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const [x, y, z, mag, ci] = within[i];
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const [r, g, b] = bvToRgb(ci);
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
    sizes[i] = magnitudeToPointSize(mag);
  }

  return { count, positions, colors, sizes };
}
