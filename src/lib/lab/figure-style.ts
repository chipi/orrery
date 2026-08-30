import type { Fidelity } from '$lib/physics/spec';

export const FIGURE_BG = '#04040c';
export const TEAL = '#4ecdc4';
export const GOLD = '#ffc850';
export const MARS = '#c1440e';
export const GRID = 'rgba(78,205,196,0.09)';
export const GRID_STEP = 32;

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
