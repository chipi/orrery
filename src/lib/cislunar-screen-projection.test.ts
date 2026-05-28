import { describe, it, expect } from 'vitest';
import {
  SCALE_CISLUNAR,
  eciKmToSceneUnits,
  sceneToScreenPx,
  eciKmToScreenPx,
  eciKmToCanvas2dPx,
  type MinimalCamera,
  type MinimalProjector,
} from './cislunar-screen-projection';

// Tiny camera + Vector3-shape stub so we can unit-test
// sceneToScreenPx without importing Three.js or instantiating a
// renderer. project() takes a `(sceneNdc) => void` mock per test;
// scenarios cover in-frustum centre, behind-camera, off-edge.
function mockVec(x: number, y: number, z: number, onProject?: (v: MinimalProjector) => void) {
  const v: MinimalProjector & { x: number; y: number; z: number } = {
    x,
    y,
    z,
    project(_: MinimalCamera) {
      if (onProject) onProject(v);
      return v;
    },
  };
  return v;
}
const stubCamera: MinimalCamera = { type: 'StubCamera' };

describe('SCALE_CISLUNAR + eciKmToSceneUnits', () => {
  it('Earth radius (~6378 km) maps to ~0.638 scene units', () => {
    const u = eciKmToSceneUnits({ x: 6378, y: 0, z: 0 });
    expect(u.x).toBeCloseTo(0.6378, 3);
    expect(u.y).toBe(0);
    expect(u.z).toBe(0);
  });

  it('Earth-Moon distance (384,400 km) maps to ~38.44 scene units', () => {
    const u = eciKmToSceneUnits({ x: 384400, y: 0, z: 0 });
    expect(u.x).toBeCloseTo(38.44, 2);
  });

  it('SCALE_CISLUNAR is the documented 1/10000', () => {
    expect(SCALE_CISLUNAR).toBe(1 / 10000);
  });
});

describe('sceneToScreenPx — NDC → CSS px conversion', () => {
  it('NDC (0, 0, 0) maps to canvas centre', () => {
    const v = mockVec(0, 0, 0);
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.x).toBe(400);
    expect(r.y).toBe(300);
    expect(r.onScreen).toBe(true);
  });

  it('NDC (1, 1, 0) maps to top-right corner', () => {
    const v = mockVec(1, 1, 0);
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.x).toBe(800);
    expect(r.y).toBe(0);
    expect(r.onScreen).toBe(true);
  });

  it('NDC (-1, -1, 0) maps to bottom-left corner', () => {
    const v = mockVec(-1, -1, 0);
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.x).toBe(0);
    expect(r.y).toBe(600);
    expect(r.onScreen).toBe(true);
  });

  it('flags onScreen=false when behind camera (NDC.z > 1)', () => {
    const v = mockVec(0, 0, 1.5);
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.onScreen).toBe(false);
  });

  it('flags onScreen=false when NDC.z < -1', () => {
    const v = mockVec(0, 0, -1.5);
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.onScreen).toBe(false);
  });

  it('flags onScreen=false when pixel falls outside canvas', () => {
    const v = mockVec(1.5, 0, 0); // x past right edge
    const r = sceneToScreenPx(v, stubCamera, 800, 600);
    expect(r.onScreen).toBe(false);
  });
});

describe('eciKmToScreenPx — one-shot wrapper', () => {
  it('walks ECI km → scene → NDC → px', () => {
    // Mock projector that just identity-passes the input as NDC.
    // Earth-radius scene units (0.6378, 0, 0) → if the projector
    // treats scene == NDC, pixel = (0.6378 + 1)/2 × 800 = 655.12.
    const factory = (x: number, y: number, z: number) => mockVec(x, y, z);
    const r = eciKmToScreenPx({ x: 6378, y: 0, z: 0 }, factory, stubCamera, 800, 600);
    expect(r.x).toBeCloseTo(655.12, 1);
    expect(r.y).toBe(300);
    expect(r.onScreen).toBe(true);
  });
});

describe('eciKmToCanvas2dPx — Earth-centred Moon-mode 2D projection', () => {
  // Mars-mode BASE_SCALE_2D = min(W, H) / 4 = 150 for 800×600. Moon-mode
  // multiplies by 6 internally → 900 px per AU.
  const view = { canvasWidth: 800, canvasHeight: 600, baseScale2dPerAu: 150 };

  it('Earth (ECI origin) maps to canvas centre', () => {
    const r = eciKmToCanvas2dPx({ x: 0, y: 0, z: 0 }, view);
    expect(r.x).toBe(400);
    expect(r.y).toBe(300);
    expect(r.onScreen).toBe(true);
  });

  it('Moon distance (384,400 km on +x) maps ~2.32 px from centre at this scale', () => {
    // AU = 384400 / 149_597_870.7 ≈ 0.002570 AU.
    // px = 0.002570 × 900 ≈ 2.31 from centre.
    const r = eciKmToCanvas2dPx({ x: 384400, y: 0, z: 0 }, view);
    expect(r.x).toBeCloseTo(402.31, 1);
    expect(r.y).toBe(300);
  });

  it('treats x and z axes as the plan-view (y is ecliptic-north out of screen)', () => {
    const r = eciKmToCanvas2dPx({ x: 0, y: 999999, z: 100000 }, view);
    expect(r.x).toBe(400);
    expect(r.y).toBeGreaterThan(300); // +z translates to +y on canvas
  });

  it('flags onScreen=false when point projects outside the canvas', () => {
    // A point so far away its pixel falls past the right edge.
    const farKm = (view.canvasWidth / 2 / (view.baseScale2dPerAu * 6)) * 1.5 * 149_597_870.7;
    const r = eciKmToCanvas2dPx({ x: farKm, y: 0, z: 0 }, view);
    expect(r.onScreen).toBe(false);
  });
});
