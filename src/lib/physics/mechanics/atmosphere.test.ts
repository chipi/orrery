import { describe, it, expect } from 'vitest';
import { terminalVelocityMs, SURFACE_DENSITY_KGM3 } from './atmosphere';

// A ~2 t capsule, 10 m² frontal area, Cd 1.5.
const M = 2000,
  A = 10,
  CD = 1.5;

describe('terminalVelocityMs', () => {
  it('Earth: a bare capsule terminal speed is a survivable-with-a-chute few tens of m/s', () => {
    const v = terminalVelocityMs(M, 9.81, SURFACE_DENSITY_KGM3.earth, A, CD);
    expect(v).toBeGreaterThan(30);
    expect(v).toBeLessThan(80);
  });

  it('Mars: the SAME capsule falls far faster — the thin-air lesson (hundreds of m/s)', () => {
    const v = terminalVelocityMs(M, 3.71, SURFACE_DENSITY_KGM3.mars, A, CD);
    expect(v).toBeGreaterThan(150); // way too fast to land on
    // and much faster than on Earth despite Mars' weaker gravity
    expect(v).toBeGreaterThan(terminalVelocityMs(M, 9.81, SURFACE_DENSITY_KGM3.earth, A, CD));
  });

  it('an airless world (Moon, ρ=0) has NO terminal velocity — drag cannot slow you', () => {
    expect(terminalVelocityMs(M, 1.62, SURFACE_DENSITY_KGM3.moon, A, CD)).toBe(Infinity);
  });

  it('a bigger drag area (a parachute) lowers terminal velocity', () => {
    const bare = terminalVelocityMs(M, 3.71, SURFACE_DENSITY_KGM3.mars, 10, CD);
    const chute = terminalVelocityMs(M, 3.71, SURFACE_DENSITY_KGM3.mars, 200, CD);
    expect(chute).toBeLessThan(bare);
  });
});
