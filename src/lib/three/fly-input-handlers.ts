import { gyro } from '$lib/sensory/device-orientation';
import { A_MOON_KM, R_MOON_KM } from '$lib/orbital/cislunar/cislunar-geometry';
import type { RouteLifecycle } from '$lib/three/route-lifecycle';

/**
 * `/fly` pointer/touch camera input handlers (RFC-036 WS-B/1c).
 *
 * Mouse orbit/pan + wheel zoom + one-finger orbit / two-finger pinch-zoom+pan,
 * lifted VERBATIM out of the fly/+page.svelte onMount. Every gesture drives the
 * shared camera handle (`flyCam.*`); the module owns the drag/pinch bookkeeping
 * internally and exposes `isDrag` / `touchActive` as getters (the frame loop reads
 * them each tick to suppress cinematic moves during a drag). Byte-identical to the
 * inline handlers; listeners register through the same `lifecycle` registry.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FlyInputDeps {
  el3d: HTMLElement;
  flyCam: any;
  getViewMode: () => 'heliocentric' | 'cislunar';
  scaleCislunar: number;
  lifecycle: RouteLifecycle;
}

export function createFlyInputHandlers(deps: FlyInputDeps) {
  const { el3d, flyCam, getViewMode, scaleCislunar, lifecycle } = deps;
  let isDrag = false;
  let dragMode: 'orbit' | 'pan' = 'orbit';
  let lmx = 0;
  let lmy = 0;
  const onMouseDown = (e: MouseEvent) => {
    isDrag = true;
    // Right-button (2), middle-button (1), or Shift+left-button → pan.
    // Plain left-button → orbit (existing behaviour).
    dragMode = e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : 'orbit';
    lmx = e.clientX;
    lmy = e.clientY;
    el3d.style.cursor = dragMode === 'pan' ? 'move' : 'grabbing';
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!isDrag) return;
    const dx = e.clientX - lmx;
    const dy = e.clientY - lmy;
    lmx = e.clientX;
    lmy = e.clientY;
    if (dragMode === 'pan') {
      flyCam.panActiveCamera(dx, dy);
      return;
    }
    if (getViewMode() === 'cislunar') {
      flyCam.cislunarCamT -= dx * 0.005;
      flyCam.cislunarCamP = Math.max(
        0.08,
        Math.min(Math.PI * 0.48, flyCam.cislunarCamP + dy * 0.005),
      );
      flyCam.updateCislunarCam();
    } else {
      flyCam.camT -= dx * 0.005;
      flyCam.camP = Math.max(0.08, Math.min(Math.PI * 0.48, flyCam.camP + dy * 0.005));
      flyCam.updateCam();
    }
  };
  const onMouseUp = () => {
    isDrag = false;
    el3d.style.cursor = 'grab';
  };
  // Suppress browser right-click context menu so right-drag pan
  // doesn't pop a menu after each pan stroke.
  const onContextMenu = (e: MouseEvent) => e.preventDefault();
  const onWheel = (e: WheelEvent) => {
    // Trackpad pinch on macOS dispatches a synthetic wheel event
    // with ctrlKey=true; without preventDefault the browser zooms
    // the whole page. preventDefault keeps the gesture bound to
    // the 3D camera. Listener also needs `passive: false`.
    e.preventDefault();
    if (getViewMode() === 'cislunar') {
      const minR = R_MOON_KM * scaleCislunar * 5;
      const maxR = A_MOON_KM * scaleCislunar * 6;
      flyCam.cislunarCamR = Math.max(minR, Math.min(maxR, flyCam.cislunarCamR + e.deltaY * 0.05));
      // User-initiated zoom wins over auto-zoom for the rest of this
      // phase. Next phase transition re-arms flyCam.autoZoomActive.
      flyCam.autoZoomActive = false;
      flyCam.updateCislunarCam();
    } else {
      flyCam.camR = Math.max(80, Math.min(4000, flyCam.camR + e.deltaY * 0.5));
      // User-initiated zoom wins over auto-zoom for the rest of this
      // sub-phase. Next sub-phase transition re-arms flyCam.helioAutoZoomActive.
      flyCam.helioAutoZoomActive = false;
      flyCam.updateCam();
    }
  };
  // Touch — single-finger orbit + two-finger pinch-zoom AND
  // two-finger drag pan per CLAUDE.md mobile rules. The pinch and
  // pan happen simultaneously: pinch ratio drives zoom, midpoint
  // drift drives pan.
  let touchActive = false;
  let pinchPrev = 0;
  let pinchMidX = 0;
  let pinchMidZ = 0;
  const touchDist = (a: Touch, b: Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      touchActive = true;
      lmx = e.touches[0].clientX;
      lmy = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      touchActive = false;
      pinchPrev = touchDist(e.touches[0], e.touches[1]);
      pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      pinchMidZ = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && pinchPrev > 0) {
      const dist = touchDist(e.touches[0], e.touches[1]);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Pinch → zoom (active camera).
      const ratio = pinchPrev / dist;
      if (getViewMode() === 'cislunar') {
        const minR = R_MOON_KM * scaleCislunar * 5;
        const maxR = A_MOON_KM * scaleCislunar * 6;
        flyCam.cislunarCamR = Math.max(minR, Math.min(maxR, flyCam.cislunarCamR * ratio));
        flyCam.autoZoomActive = false;
      } else {
        flyCam.camR = Math.max(80, Math.min(4000, flyCam.camR * ratio));
        flyCam.helioAutoZoomActive = false;
      }
      // Midpoint drift → pan.
      const dx = midX - pinchMidX;
      const dy = midY - pinchMidZ;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        flyCam.panActiveCamera(dx, dy);
      } else if (getViewMode() === 'cislunar') {
        flyCam.updateCislunarCam();
      } else {
        flyCam.updateCam();
      }
      pinchPrev = dist;
      pinchMidX = midX;
      pinchMidZ = midY;
      return;
    }
    if (!touchActive || e.touches.length !== 1) return;
    flyCam.camT -= (e.touches[0].clientX - lmx) * 0.005;
    flyCam.camP = Math.max(
      0.08,
      Math.min(Math.PI * 0.48, flyCam.camP + (e.touches[0].clientY - lmy) * 0.005),
    );
    lmx = e.touches[0].clientX;
    lmy = e.touches[0].clientY;
    flyCam.updateCam();
  };
  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) pinchPrev = 0;
    if (e.touches.length === 0) touchActive = false;
    // T-B: pause + re-home gyro for 200ms after a drag (RFC-020 §6).
    gyro.recordTouchEnd();
  };

  el3d.style.cursor = 'grab';
  lifecycle.on(el3d, 'mousedown', onMouseDown);
  lifecycle.on(el3d, 'contextmenu', onContextMenu);
  lifecycle.on(window, 'mousemove', onMouseMove);
  lifecycle.on(window, 'mouseup', onMouseUp);
  // passive: false so onWheel can preventDefault against trackpad
  // pinch (macOS Ctrl+wheel) hijacking browser zoom.
  lifecycle.on(el3d, 'wheel', onWheel, { passive: false });
  lifecycle.on(el3d, 'touchstart', onTouchStart, { passive: true });
  lifecycle.on(el3d, 'touchmove', onTouchMove, { passive: true });
  lifecycle.on(el3d, 'touchend', onTouchEnd);
  lifecycle.on(el3d, 'touchcancel', onTouchEnd);

  return {
    get isDrag() {
      return isDrag;
    },
    get touchActive() {
      return touchActive;
    },
  };
}
