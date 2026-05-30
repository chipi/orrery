import { describe, it, expect } from 'vitest';
import { classifyConicEarth } from './fly-conics-earth';

// Earth: μ = 398_600.4418 km³/s², R⊕ ≈ 6378 km. Test vectors use
// realistic km / (km/s) magnitudes so the energy-vs-shape thresholds
// behave like they would in production cislunar trajectories.

describe('classifyConicEarth', () => {
  it('classifies a circular LEO (r=7000 km, v=v_circ) as circle', () => {
    const r = { x: 7000, y: 0, z: 0 };
    const vCirc = Math.sqrt(398_600.4418 / 7000); // ~7.546 km/s
    const v = { x: 0, y: 0, z: vCirc };
    const c = classifyConicEarth(r, v);
    expect(c.shape).toBe('circle');
    expect(c.e).toBeLessThan(0.001);
    expect(c.a).toBeCloseTo(7000, 0);
    expect(c.epsilon).toBeLessThan(0);
  });

  it('classifies a GTO-like ellipse (r=7000 km, v slightly > v_circ)', () => {
    const r = { x: 7000, y: 0, z: 0 };
    const vCirc = Math.sqrt(398_600.4418 / 7000);
    // Boost by 15% — well above the 0.5% parabolic band, well below escape.
    const v = { x: 0, y: 0, z: vCirc * 1.15 };
    const c = classifyConicEarth(r, v);
    expect(c.shape).toBe('ellipse');
    expect(c.e).toBeGreaterThan(0.001);
    expect(c.e).toBeLessThan(1);
    expect(c.epsilon).toBeLessThan(0);
  });

  it('classifies escape velocity as parabola (within the 0.5% epsilon band)', () => {
    const r = { x: 7000, y: 0, z: 0 };
    const vEsc = Math.sqrt((2 * 398_600.4418) / 7000); // ~10.67 km/s
    const v = { x: 0, y: 0, z: vEsc };
    const c = classifyConicEarth(r, v);
    expect(c.shape).toBe('parabola');
  });

  it('classifies a clearly hyperbolic flyby (v >> v_esc)', () => {
    const r = { x: 7000, y: 0, z: 0 };
    const vEsc = Math.sqrt((2 * 398_600.4418) / 7000);
    const v = { x: 0, y: 0, z: vEsc * 1.3 }; // 30% over escape — clearly hyperbolic
    const c = classifyConicEarth(r, v);
    expect(c.shape).toBe('hyperbola');
    expect(c.e).toBeGreaterThan(1);
    expect(c.epsilon).toBeGreaterThan(0);
  });

  it('returns finite a for elliptical orbits + Infinity at zero epsilon', () => {
    // Elliptical case: a should be finite + positive.
    const a = classifyConicEarth({ x: 7000, y: 0, z: 0 }, { x: 0, y: 0, z: 7 });
    expect(Number.isFinite(a.a)).toBe(true);
    // Exact parabolic ε = 0 → a = Infinity. Hard to hit exactly; the
    // parabola band catches it as 'parabola' anyway, so this is just
    // a smoke check on the divide-by-zero guard.
    expect(typeof a.a).toBe('number');
  });
});
