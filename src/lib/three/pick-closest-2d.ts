/**
 * Pick the closest 2D-projected marker within a pixel tolerance (#42).
 *
 * /moon and /mars's flat-view click handler both run the same nearest-
 * neighbour scan over their `sitePos2d` map (id → canvas-space
 * position computed in their per-frame `draw2d()` pass). Tolerances
 * differ — 22 px for /moon (smaller markers), 18 px for /mars (denser
 * marker field).
 *
 * Returns the matched site id, or null when nothing falls within
 * tolerance.
 */
export function pickClosest2d({
  canvas,
  clientX,
  clientY,
  positions,
  tolerance,
}: {
  canvas: HTMLCanvasElement;
  clientX: number;
  clientY: number;
  positions: Map<string, { x: number; y: number }>;
  tolerance: number;
}): string | null {
  const rect = canvas.getBoundingClientRect();
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;
  let bestId: string | null = null;
  let bestD = tolerance;
  for (const [id, p] of positions) {
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < bestD) {
      bestD = d;
      bestId = id;
    }
  }
  return bestId;
}
