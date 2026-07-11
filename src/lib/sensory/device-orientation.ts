// Gyroscope "tilt to look" input (PRD-017 / RFC-020 §6).
//
// One shared service feeds all 7 3D scenes. It reads DeviceOrientation, tracks a
// calibrated "home" (G-C: tilt is measured relative to where you were when you
// enabled it), low-passes + dead-zones the signal, and exposes a per-frame
// rotation delta the scene adds to its own orbit angles — so gyro and touch-drag
// compose naturally (both nudge the same camT/camP).
//
// Touch pauses gyro (T-B): while you're dragging and for 200ms after, gyro input
// is suppressed and re-homed, so releasing a drag doesn't snap the view back.
//
// Position mapping (not rate): a fixed tilt = a fixed view offset; return the
// device to home and the view returns. Holding a tilt does not keep spinning.

import { sensory } from './state.svelte';

const SENSITIVITY = 0.015; // radians of orbit per degree of device tilt
const LOW_PASS = 0.85; // smoothed = prev·α + raw·(1−α)
const DEAD_ZONE_DEG = 2; // ignore tilt within ±2° of home (anti-jitter)
const TOUCH_PAUSE_MS = 200;

interface Delta {
  dAz: number;
  dEl: number;
}

const ZERO: Delta = { dAz: 0, dEl: 0 };

class GyroService {
  #listening = false;
  #haveHome = false;
  #homeGamma = 0; // left-right tilt at calibration
  #homeBeta = 0; // front-back tilt at calibration
  #smGamma = 0; // smoothed absolute
  #smBeta = 0;
  #appliedAz = 0; // gyro contribution already handed to the scene
  #appliedEl = 0;
  #lastTouchEnd = 0;

  // ── Touch coexistence (T-B) ──────────────────────────────────────
  recordTouchEnd(): void {
    this.#lastTouchEnd = Date.now();
  }
  #touchRecent(): boolean {
    return Date.now() - this.#lastTouchEnd < TOUCH_PAUSE_MS;
  }

  /** Re-anchor "home" to the current pose — the recalibrate gesture (#173). */
  recalibrate(): void {
    this.#haveHome = false;
    this.#appliedAz = 0;
    this.#appliedEl = 0;
  }

  /** iOS 13+ gates DeviceOrientation behind a permission prompt (P-A). */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DOE?.requestPermission === 'function') {
      try {
        return (await DOE.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return true; // non-iOS: no prompt needed
  }

  start(): void {
    if (this.#listening || typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', this.#onOrient);
    this.#listening = true;
  }

  stop(): void {
    if (!this.#listening) return;
    window.removeEventListener('deviceorientation', this.#onOrient);
    this.#listening = false;
    this.#haveHome = false;
    this.#appliedAz = 0;
    this.#appliedEl = 0;
  }

  #onOrient = (e: DeviceOrientationEvent): void => {
    if (e.beta == null || e.gamma == null) return;
    // T-B: while touching (and 200ms after), suppress gyro and drop home so it
    // re-anchors to wherever the drag left the device — no snap-back.
    if (this.#touchRecent()) {
      this.#haveHome = false;
      return;
    }
    if (!this.#haveHome) {
      this.#homeGamma = e.gamma;
      this.#homeBeta = e.beta;
      this.#smGamma = e.gamma;
      this.#smBeta = e.beta;
      this.#appliedAz = 0;
      this.#appliedEl = 0;
      this.#haveHome = true;
      return;
    }
    this.#smGamma = this.#smGamma * LOW_PASS + e.gamma * (1 - LOW_PASS);
    this.#smBeta = this.#smBeta * LOW_PASS + e.beta * (1 - LOW_PASS);
  };

  #deadZoned(offsetDeg: number): number {
    return Math.abs(offsetDeg) < DEAD_ZONE_DEG ? 0 : offsetDeg;
  }

  /**
   * Rotation to apply THIS frame (radians). The scene does:
   *   const { dAz, dEl } = gyro.consume(); camT += dAz; camP += dEl;
   * Returns {0,0} when gyro isn't active, motion is reduced, or there's no home.
   */
  consume(): Delta {
    if (!this.#haveHome || !sensory.active('gyro') || sensory.reducedMotion) return ZERO;
    // gamma (left-right) → azimuth; beta (front-back) → elevation.
    const targetAz = this.#deadZoned(this.#smGamma - this.#homeGamma) * SENSITIVITY;
    const targetEl = this.#deadZoned(this.#smBeta - this.#homeBeta) * SENSITIVITY;
    const dAz = targetAz - this.#appliedAz;
    const dEl = targetEl - this.#appliedEl;
    this.#appliedAz = targetAz;
    this.#appliedEl = targetEl;
    return { dAz, dEl };
  }
}

export const gyro = new GyroService();
