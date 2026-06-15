/**
 * Register the standard mouse + touch input listeners for a 3D canvas
 * route (#42).
 *
 * /moon and /mars wire the same ~10-line addEventListener block
 * before their animation loop, and the same removeEventListener
 * block in cleanup. Wraps both halves: returns a teardown function
 * the caller stows for cleanup.
 *
 * Wheel + touchmove register with `{ passive: false }` so handlers
 * can `preventDefault()` against browser zoom / scroll. Touchstart
 * stays passive (no preventDefault inside).
 *
 * The hover pair (onHover / onHoverLeave) is optional — /moon uses
 * them on the canvas; /mars wires hover under its own `handleHover`
 * elsewhere with extra preload logic.
 */
export function bindCanvasInputs({
  el,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onHover,
  onHoverLeave,
  onContextMenu,
}: {
  el: HTMLElement;
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onWheel: (e: WheelEvent) => void;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onHover?: (e: MouseEvent) => void;
  onHoverLeave?: () => void;
  /** Optional context-menu suppressor — wire when the route supports
   *  right-drag panning so the browser menu doesn't interrupt the
   *  gesture. Defaults to no-op (browser menu still shows). */
  onContextMenu?: (e: MouseEvent) => void;
}): () => void {
  el.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);
  if (onHover) el.addEventListener('mousemove', onHover);
  if (onHoverLeave) el.addEventListener('mouseleave', onHoverLeave);
  if (onContextMenu) el.addEventListener('contextmenu', onContextMenu);
  return () => {
    el.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    el.removeEventListener('touchcancel', onTouchEnd);
    if (onHover) el.removeEventListener('mousemove', onHover);
    if (onHoverLeave) el.removeEventListener('mouseleave', onHoverLeave);
    if (onContextMenu) el.removeEventListener('contextmenu', onContextMenu);
  };
}
