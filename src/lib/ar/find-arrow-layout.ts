// Pure geometry for the AR "find" arrows (#51) — the off-screen indicators that
// point toward sky bodies outside the current field of view. Kept free of THREE /
// DOM so the direction + declutter maths are unit-testable in isolation (they were
// the two on-device bugs: the vertical axis was double-negated so "up" pointed
// down, and clustered arrows had no spacing so their labels stacked).

/**
 * Screen-space angle (radians, x-right / y-DOWN, CW positive) from the screen
 * centre toward a body at camera-space position (vx right, vy up, −z forward, the
 * Three.js convention). The direction is the body's TRANSVERSE component `(vx, vy)`
 * — which points toward the shortest turn to bring it on-axis whether it is in
 * front OR behind the camera — mapped to screen space (camera-up +vy → screen-up
 * −y). (An earlier version reflected behind-camera bodies through the centre; that
 * sent the arrow the long way round and flipped 180° at the 90°-off boundary.)
 * A body exactly on the view axis (`vx ≈ vy ≈ 0`) is degenerate — any direction is
 * fine, and `atan2(0, 0)` returns 0.
 */
export function arrowScreenAngle(vx: number, vy: number): number {
  return Math.atan2(-vy, vx);
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
