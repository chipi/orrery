/**
 * Left edge (px) of a stop's label pill beside its marker at `anchorX`: right of it when the pill
 * fits there, else left of it, else slid to stay on screen. The flat view drew every pill to the
 * right, so a stop near the right edge cut its label ("Ingenuity Flight 1 · Sol", operator
 * 2026-11-23); the globe's route labels follow the same order.
 */
export function pillLeft(
  anchorX: number,
  width: number,
  viewW: number,
  gap = 14,
  margin = 8,
): number {
  const right = anchorX + gap;
  if (right + width <= viewW - margin) return right;
  const left = anchorX - gap - width;
  if (left >= margin) return left;
  return Math.max(margin, Math.min(viewW - margin - width, anchorX - width / 2));
}
