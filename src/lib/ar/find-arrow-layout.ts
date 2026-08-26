// Pure geometry for the AR "find" arrows (#51) — the off-screen indicators that
// point toward sky bodies outside the current field of view. Kept free of THREE /
// DOM so the direction + declutter maths are unit-testable in isolation (they were
// the two on-device bugs: the vertical axis was double-negated so "up" pointed
// down, and clustered arrows had no spacing so their labels stacked).

/**
 * Screen-space angle (radians, x-right / y-DOWN, CW positive) from the screen
 * centre toward a body at camera-space position (vx right, vy up, −vz forward,
 * the Three.js convention). Camera-up (+vy) maps to screen-up (−y). A body BEHIND
 * the camera (vz > 0) is reflected through the centre so the arrow points toward
 * the shorter turn to bring it on-screen.
 */
export function arrowScreenAngle(vx: number, vy: number, vz: number): number {
  const behind = vz > 0;
  const sdx = behind ? -vx : vx; // screen x, right positive
  const sdy = behind ? vy : -vy; // screen y, down positive (camera-up → screen-up)
  return Math.atan2(sdy, sdx);
}

export interface ArrowPlacement {
  /** Anchor x (px) on the screen-edge rounded rectangle. */
  px: number;
  /** Anchor y (px) on the screen-edge rounded rectangle. */
  py: number;
  /** Rotation (deg) for a ▲ glyph that points up at 0°, so it aims at the body. */
  rotDeg: number;
  /** True when the arrow sits on the right half — the caller grows the label left. */
  rightSide: boolean;
}

/**
 * Clamp a screen-space angle onto the rounded rectangle `margin` px inside a
 * `w`×`h` viewport, returning the arrow anchor + the ▲ rotation.
 */
export function arrowEdgePlacement(
  ang: number,
  w: number,
  h: number,
  margin: number,
): ArrowPlacement {
  const cx = w / 2;
  const cy = h / 2;
  const rx = cx - margin;
  const ry = cy - margin;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = Math.min(rx / Math.max(Math.abs(c), 1e-3), ry / Math.max(Math.abs(s), 1e-3));
  return {
    px: cx + t * c,
    py: cy + t * s, // ang is already screen-space (y down) — no extra negation
    rotDeg: (ang * 180) / Math.PI + 90,
    rightSide: c >= 0,
  };
}

/**
 * Spread clustered arrows so their labels don't overlap: sort ascending by angle,
 * then push each at least `minGap` rad past its neighbour. Mutates the items'
 * `ang` in the returned (sorted) array; the input array is not reordered.
 */
export function spreadByAngle<T extends { ang: number }>(items: readonly T[], minGap: number): T[] {
  const sorted = [...items].sort((a, b) => a.ang - b.ang);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].ang - sorted[i - 1].ang < minGap) {
      sorted[i].ang = sorted[i - 1].ang + minGap;
    }
  }
  return sorted;
}
