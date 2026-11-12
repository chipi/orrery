/**
 * Panel-aware framing (UXD-019): the point a camera looks at sits in the middle of the space the
 * open panel leaves, not under the panel's edge. Pure maths over measured rects; the scene host
 * turns the result into `camera.setViewOffset`. Written for /explore and shared with the Worlds'
 * orbiter framing (D1), which asks for the same shift.
 */

export interface PanelRect {
  left: number;
  right: number;
}

/** Widest share of the viewport a docked side panel may cover before it counts as a sheet. */
const SHEET_SHARE = 0.7;

/**
 * Pixels of the viewport's right edge the open panels cover. A side drawer (desktop, touch
 * landscape) docks at the right edge and covers `viewportW - left`; a full-width bottom sheet
 * (touch portrait) hides the scene altogether and moves nothing.
 */
export function panelCoverPx(rects: readonly PanelRect[], viewportW: number): number {
  let cover = 0;
  for (const r of rects) {
    const docked = r.right >= viewportW - 1;
    const width = viewportW - r.left;
    if (docked && width > 0 && width <= viewportW * SHEET_SHARE) cover = Math.max(cover, width);
  }
  return cover;
}

/** The view offset in pixels: half the cover moves the look-at point to the middle of the rest. */
export function framingShiftPx(coverPx: number): number {
  return coverPx / 2;
}

/** One frame of the ease towards `target`: exponential, `rate` per second, snapping when near. */
export function easeShift(current: number, target: number, dtSeconds: number, rate = 14): number {
  const next = current + (target - current) * (1 - Math.exp(-rate * Math.max(0, dtSeconds)));
  return Math.abs(target - next) < 0.5 ? target : next;
}
