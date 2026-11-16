/**
 * Panel-aware framing for a 3D scene host (UXD-019, UXD-030): the focus point sits in the middle of
 * the space the open side panel leaves, not under its edge. The projection shifts by half the
 * panel's cover (camera.setViewOffset), so the look-at point, picking and every scale keep one
 * camera. A bottom sheet (touch portrait) covers the scene and shifts nothing. The panels are
 * measured only in the 400 ms after one opened or closed (the 220 ms fly-in moves its rect), the
 * window resized or the view changed; the shift is eased every frame (instant under reduced
 * motion). Shared by /explore (explore-scene-host) and the Worlds (SurfaceScene).
 */
import type * as THREE from 'three';
import type { createRouteLifecycle } from '$lib/three/route-lifecycle';
import { easeShift, framingShiftPx, panelCoverPx, type PanelRect } from '$lib/three/panel-framing';

const FRAMING_SETTLE_MS = 400;

export interface PanelFramerDeps {
  camera: Pick<THREE.PerspectiveCamera, 'setViewOffset' | 'clearViewOffset'> & {
    view: { enabled: boolean } | null;
  };
  getReducedMotion: () => boolean;
  getRects: () => PanelRect[];
  getViewportW: () => number;
  /** The canvas box the view offset is expressed against. */
  getSize: () => { w: number; h: number };
  now?: () => number;
  /** Called when the measured cover changes (px of the right edge the panels cover). */
  onCover?: (coverPx: number) => void;
}

export interface PanelFramer {
  /** Re-measure for the next 400 ms (a panel opened or closed, the window resized). */
  markDirty: () => void;
  /** Once per frame. `wanted` is false where a shift makes no sense (2D, an immersive view). */
  apply: (dtSeconds: number, wanted: boolean) => void;
  /** The current eased shift in px (0 when none). */
  shift: () => number;
}

export function createPanelFramer(deps: PanelFramerDeps): PanelFramer {
  const now = deps.now ?? (() => performance.now());
  let shift = 0;
  let target = 0;
  let measureUntil = now() + FRAMING_SETTLE_MS;
  let wasWanted = false;
  let lastCover = 0;
  const markDirty = (): void => {
    measureUntil = now() + FRAMING_SETTLE_MS;
  };
  function apply(dt: number, wanted: boolean): void {
    if (wanted !== wasWanted) {
      wasWanted = wanted;
      markDirty();
    }
    if (now() < measureUntil) {
      const cover = panelCoverPx(wanted ? deps.getRects() : [], deps.getViewportW());
      target = framingShiftPx(cover);
      if (cover !== lastCover) {
        lastCover = cover;
        deps.onCover?.(cover);
      }
    }
    shift = deps.getReducedMotion() ? target : easeShift(shift, target, dt);
    if (shift === 0) {
      if (deps.camera.view?.enabled) deps.camera.clearViewOffset();
      return;
    }
    const { w, h } = deps.getSize();
    deps.camera.setViewOffset(w, h, shift, 0, w, h);
  }
  return { markDirty, apply, shift: () => shift };
}

/** Wires a framer to the DOM: a panel node added or removed, or a window resize, re-measures. */
export function watchPanels(
  framer: Pick<PanelFramer, 'markDirty'>,
  lifecycle: ReturnType<typeof createRouteLifecycle>,
): void {
  const isPanelNode = (n: Node): boolean => n instanceof Element && n.matches('aside.panel');
  const watch = new MutationObserver((records) => {
    if (records.some((r) => [...r.addedNodes, ...r.removedNodes].some(isPanelNode)))
      framer.markDirty();
  });
  watch.observe(document.body, { childList: true, subtree: true });
  lifecycle.add(() => watch.disconnect());
  lifecycle.on(window, 'resize', framer.markDirty);
}

/** The measured rects of every open `aside.panel`. */
export function openPanelRects(): PanelRect[] {
  return Array.from(document.querySelectorAll('aside.panel'), (el) => el.getBoundingClientRect());
}
