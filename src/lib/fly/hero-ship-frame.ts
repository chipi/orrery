/**
 * The ship in a flyby hero shot reads at one size on screen whatever the body: a world-size cap
 * of a fifth of the body's radius made Giotto fill half the frame at Earth and New Horizons a
 * speck at Pluto (flyby review call 6). And it stays inside the frame clear of the HUD panels:
 * the trajectory position put Juno, Rosetta and Galileo on the top edge.
 */

/** Share of the frame height the ship's longest dimension takes. */
export const HERO_SHIP_FRAME_FRAC = 0.18;

/** Scale that gives a model of `unitSize` (its longest dimension at scale 1) `frac` of a frame of
 *  vertical field of view `fovDeg`, seen from `dist`. */
export function heroShipScale(
  unitSize: number,
  dist: number,
  fovDeg: number,
  frac: number = HERO_SHIP_FRAME_FRAC,
): number {
  const frameH = 2 * dist * Math.tan((fovDeg * Math.PI) / 360);
  return (frac * frameH) / (unitSize || 1);
}

/** Normalised device bounds the ship's centre stays inside: clear of the side panels on desktop
 *  and of the top bar and the timeline. */
export const HERO_SHIP_NDC = { minX: -0.4, maxX: 0.35, minY: -0.45, maxY: 0.55 } as const;

/** Whether an NDC point in front of the camera lies inside `b`. */
export function inFrame(
  ndc: { x: number; y: number; z: number },
  b: { minX: number; maxX: number; minY: number; maxY: number } = HERO_SHIP_NDC,
): boolean {
  return ndc.z <= 1 && ndc.x >= b.minX && ndc.x <= b.maxX && ndc.y >= b.minY && ndc.y <= b.maxY;
}

/** The NDC point moved inside `b`, or null when it is already inside (or behind the camera). */
export function clampToFrame(
  ndc: { x: number; y: number; z: number },
  b: { minX: number; maxX: number; minY: number; maxY: number } = HERO_SHIP_NDC,
): { x: number; y: number; z: number } | null {
  if (ndc.z > 1) return null;
  const x = Math.min(b.maxX, Math.max(b.minX, ndc.x));
  const y = Math.min(b.maxY, Math.max(b.minY, ndc.y));
  if (x === ndc.x && y === ndc.y) return null;
  return { x, y, z: ndc.z };
}

/**
 * The ship's NDC point moved off a small body's disc, or null when it is already clear. A comet
 * or an asteroid is a few pixels to a few hundred across; the ship-led rig puts the ship straight
 * in front of it (Giotto hid Halley). `bodyR` and `gap` are in NDC height units; `aspect`
 * (width / height) makes the distance round on screen. The ship keeps its side of the body.
 */
export function clearOfBody(
  ship: { x: number; y: number; z: number },
  body: { x: number; y: number },
  bodyR: number,
  gap: number,
  aspect: number,
): { x: number; y: number; z: number } | null {
  const dx = (ship.x - body.x) * aspect;
  const dy = ship.y - body.y;
  const d = Math.hypot(dx, dy);
  const need = bodyR + gap;
  if (d >= need) return null;
  const [ux, uy] = d > 1e-6 ? [dx / d, dy / d] : [-0.9, 0.44];
  return { x: body.x + (ux * need) / aspect, y: body.y + uy * need, z: ship.z };
}
