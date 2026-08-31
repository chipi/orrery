import type { Fidelity } from '$lib/physics/spec';

export const FIGURE_BG = '#04040c';
export const TEAL = '#4ecdc4';
export const GOLD = '#ffc850';
export const MARS = '#c1440e';
export const GRID = 'rgba(78,205,196,0.09)';
export const GRID_STEP = 32;
// Curve-plot chrome (v0.9 renderer lift). Tick marks + labels sit brighter than the
// data-aligned gridlines, which sit brighter than the cosmetic graph-paper GRID.
export const AXIS_TICK = 'rgba(78,205,196,0.5)'; // tick marks + numeric labels
export const AXIS_GRIDLINE = 'rgba(78,205,196,0.1)'; // gridlines aligned to tick values

/**
 * "Nice" axis ticks for a [min,max] range — round decimal steps for linear, decade
 * powers for log. Pure + unit-tested (figure-style.test.ts) so the renderer stays dumb.
 * Returns the tick VALUES (data space); the renderer maps them to pixels.
 */
export function niceTicks(
  min: number,
  max: number,
  scale: 'linear' | 'log' | undefined,
  target = 5,
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (scale === 'log') {
    const lo = Math.floor(Math.log10(Math.max(min, 1e-10)));
    const hi = Math.ceil(Math.log10(Math.max(max, 1e-10)));
    const out: number[] = [];
    for (let e = lo; e <= hi; e += 1) out.push(10 ** e);
    return out;
  }
  if (min === max) return [min];
  const raw = (max - min) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out: number[] = [];
  const start = Math.ceil(min / step - 1e-9) * step;
  for (let v = start; v <= max + step * 1e-6; v += step) {
    const r = Math.round(v / step) * step;
    out.push(r === 0 ? 0 : r); // normalize -0 → 0
  }
  return out;
}

/** Format a tick value compactly — no float noise, exponent for extremes. */
export function fmtTick(v: number): string {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return v.toExponential(0).replace('e+', 'e');
  if (Number.isInteger(v)) return String(v);
  return String(Number(v.toFixed(a < 1 ? 3 : 2)));
}

export interface FidelityStyle {
  stroke: string;
  dasharray: string;
  opacity: number;
  registerClass: string;
}

// The three registers MUST be visually distinct on stroke, dasharray, AND class.
// Checked by the golden-master test; changing these is a visual contract break.
export function fidelityStyle(f: Fidelity): FidelityStyle {
  switch (f) {
    case 'computed':
      // Solid teal — kernel-emitted truth; the default register.
      return { stroke: TEAL, dasharray: 'none', opacity: 1, registerClass: 'fidelity-computed' };
    case 'geometric':
      // Dashed gold — app-side geometric producer; warm but clearly not kernel truth.
      return {
        stroke: GOLD,
        dasharray: '5 4',
        opacity: 0.72,
        registerClass: 'fidelity-geometric',
      };
    case 'replayed-published':
      // Dotted mars — historical/replayed data; explicitly distinct from live computation.
      return {
        stroke: MARS,
        dasharray: '2 5',
        opacity: 0.65,
        registerClass: 'fidelity-replayed',
      };
  }
}

export function fidelityLabel(f: Fidelity): string {
  switch (f) {
    case 'computed':
      return 'computed';
    case 'geometric':
      return 'geometric';
    case 'replayed-published':
      return 'replayed';
  }
}
