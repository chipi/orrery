/**
 * One touch-gesture contract for every interactive 3D / 2D scene canvas: one finger orbits (or
 * pans a flat map), two fingers pinch to zoom AND drag to pan, both at once. The canvases keep
 * their own camera maths; this file owns what a pair of touches means so no scene re-derives it
 * (and no scene forgets the pan half, as /explore did).
 *
 * `OrbitControls` scenes (the stations) take `ORBIT_CONTROLS_TOUCHES` instead — the same contract
 * in three's own vocabulary, set explicitly so an upgrade's changed default cannot drop the pan.
 */
import { TOUCH } from 'three';

/** `controls.touches` for an OrbitControls scene: one finger rotates, two dolly AND pan. */
export const ORBIT_CONTROLS_TOUCHES = {
  ONE: TOUCH.ROTATE,
  TWO: TOUCH.DOLLY_PAN,
} as const;

export interface TouchPoint {
  clientX: number;
  clientY: number;
}

export interface TwoFingerStep {
  /** previous distance / current distance: above 1 = fingers closed (zoom out), below 1 = spread. */
  ratio: number;
  /** Midpoint movement since the previous step, client px. */
  dx: number;
  dy: number;
  /** Current midpoint, client px (the zoom anchor for a flat map). */
  midX: number;
  midY: number;
}

export interface TwoFingerTracker {
  /** True between a two-finger start and the lift of either finger. */
  readonly active: boolean;
  start(a: TouchPoint, b: TouchPoint): void;
  /** Null when no two-finger gesture is running or the fingers have not moved. */
  move(a: TouchPoint, b: TouchPoint): TwoFingerStep | null;
  end(): void;
}

export function touchDistance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function createTwoFingerTracker(): TwoFingerTracker {
  let prevDist = 0;
  let prevX = 0;
  let prevY = 0;
  return {
    get active() {
      return prevDist > 0;
    },
    start(a, b) {
      prevDist = touchDistance(a, b);
      prevX = (a.clientX + b.clientX) / 2;
      prevY = (a.clientY + b.clientY) / 2;
    },
    move(a, b) {
      if (prevDist <= 0) return null;
      const dist = touchDistance(a, b);
      const midX = (a.clientX + b.clientX) / 2;
      const midY = (a.clientY + b.clientY) / 2;
      const step: TwoFingerStep = {
        ratio: dist > 0 ? prevDist / dist : 1,
        dx: midX - prevX,
        dy: midY - prevY,
        midX,
        midY,
      };
      prevDist = dist > 0 ? dist : prevDist;
      prevX = midX;
      prevY = midY;
      return step;
    },
    end() {
      prevDist = 0;
    },
  };
}

/**
 * World units per client px at an orbit radius `camR` for a perspective camera of vertical field
 * of view `fovDeg` on a viewport `viewportH` px tall: a finger-width of drag shifts the scene by a
 * finger-width of world distance at every zoom level.
 */
export function panWorldPerPx(camR: number, fovDeg: number, viewportH: number): number {
  return (camR * 2 * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewportH);
}
