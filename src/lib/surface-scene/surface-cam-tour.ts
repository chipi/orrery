/**
 * Audio-tour camera demos for SurfaceScene (PRD-016 §S11 / RFC-019 §12).
 * Dispatched by the audio executor when narration says "Drag to rotate" /
 * "Rotate the sphere" / "Zoom in to Curiosity". Drives camT (azimuth) and
 * camRTarget (smooth-zoom) over the requested duration. Anchored to the
 * .surface container so all three rocky-body routes share the same handler.
 *
 * Extracted from SurfaceScene's onMount closure; the camera scalars live in
 * the closure and change every frame, so they are read / written through
 * getters and setters rather than captured.
 */

export function easeInOutTour(t: number): number {
  return t * t * (3 - 2 * t);
}

export function animateCamTour(
  get: () => number,
  set: (v: number) => void,
  to: number,
  durationMs: number,
): void {
  const start = get();
  const startTime = performance.now();
  const step = (): void => {
    const t = Math.min(1, (performance.now() - startTime) / durationMs);
    set(start + (to - start) * easeInOutTour(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export interface SurfaceCamTourContext {
  container: HTMLElement | undefined;
  getCamT: () => number;
  setCamT: (v: number) => void;
  getCamR: () => number;
  getCamRTarget: () => number;
  setCamRTarget: (v: number) => void;
}

/** Wire the `audio-stage-drag` / `audio-stage-zoom` listeners; returns the teardown. */
export function bindSurfaceCamTour(ctx: SurfaceCamTourContext): () => void {
  const { container } = ctx;
  const onTourDragSurface = (e: Event): void => {
    const d = (e as CustomEvent).detail as { durationMs?: number; rotateRad?: number } | undefined;
    const rotate = d?.rotateRad ?? Math.PI / 3;
    animateCamTour(ctx.getCamT, ctx.setCamT, ctx.getCamT() + rotate, d?.durationMs ?? 1500);
  };
  const onTourZoomSurface = (e: Event): void => {
    const d = (e as CustomEvent).detail as { durationMs?: number; factor?: number } | undefined;
    const factor = d?.factor ?? 0.55;
    const target = Math.max(10, Math.min(800, ctx.getCamR() * factor));
    animateCamTour(ctx.getCamRTarget, ctx.setCamRTarget, target, d?.durationMs ?? 1500);
  };
  container?.addEventListener('audio-stage-drag', onTourDragSurface);
  container?.addEventListener('audio-stage-zoom', onTourZoomSurface);
  return () => {
    container?.removeEventListener('audio-stage-drag', onTourDragSurface);
    container?.removeEventListener('audio-stage-zoom', onTourZoomSurface);
  };
}
