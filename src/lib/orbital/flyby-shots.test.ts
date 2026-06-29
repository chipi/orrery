import { describe, it, expect } from 'vitest';
import {
  composeShot,
  approachShot,
  establishShot,
  departShot,
  heroShot,
  type FlybyShotContext,
} from './flyby-shots';
import { projectToCameraFrame } from './flyby-camera-plan';

// Ship approaches the planet (origin) along +x at 1 unit/day, peak at 100.
// At MET 98 the ship is at x = −2 (just outside the radius-2.5 planet),
// bearing in toward closest approach.
function ctx(overrides?: Partial<FlybyShotContext>): FlybyShotContext {
  return {
    planetId: 'jupiter',
    planetPos: { x: 0, z: 0 },
    planetRadius: 2.5,
    shipPosAtMet: (met) => ({ x: met - 100, y: 0, z: 0 }),
    peakMet: 100,
    met: 98,
    ...overrides,
  };
}

type V3 = { x: number; y: number; z: number };
function depthOf(frame: { position: V3; lookAt: V3 }, pt: V3, r = 0.4) {
  return projectToCameraFrame(pt, r, frame.position, frame.lookAt);
}

describe('flyby-shots — null guards', () => {
  it('every shot returns null when the ship cannot be sampled', () => {
    const c = ctx({ shipPosAtMet: () => null });
    expect(approachShot(c)).toBeNull();
    expect(establishShot(c)).toBeNull();
    expect(departShot(c)).toBeNull();
    expect(heroShot(c)).toBeNull();
  });

  it('moving shots return null when the ship has no velocity', () => {
    const c = ctx({ shipPosAtMet: () => ({ x: 5, y: 0, z: 0 }) });
    expect(approachShot(c)).toBeNull();
    expect(establishShot(c)).toBeNull();
  });
});

describe('approach (chase) shot — ship can never be occluded', () => {
  it('places the ship in FRONT of the planet (closer to camera)', () => {
    const frame = approachShot(ctx())!;
    const ship = depthOf(frame, { x: -2, y: 0, z: 0 });
    const planet = depthOf(frame, { x: 0, y: 0, z: 0 }, 2.5);
    expect(ship).not.toBeNull();
    expect(planet).not.toBeNull();
    // Ship nearer the camera than the planet → never behind it.
    expect(ship!.depth).toBeLessThan(planet!.depth);
  });

  it('sits behind the ship along its approach direction', () => {
    const frame = approachShot(ctx())!;
    // Camera is on the −approach side of the ship (ship.x = −2, approach +x).
    expect(frame.position.x).toBeLessThan(-2);
  });
});

describe('establish shot — wide', () => {
  it('frames the planet smaller than the approach shot does', () => {
    const est = establishShot(ctx())!;
    const app = approachShot(ctx())!;
    const estPlanet = depthOf(est, { x: 0, y: 0, z: 0 }, 2.5)!;
    const appPlanet = depthOf(app, { x: 0, y: 0, z: 0 }, 2.5)!;
    expect(estPlanet.apparentRadius).toBeLessThan(appPlanet.apparentRadius);
  });
});

describe('depart shot — catapult wide', () => {
  it('keeps BOTH the planet and the departing ship inside the frame', () => {
    // Post-peak: ship well past the planet (x = +8), the two separated.
    const frame = departShot(ctx({ met: 108 }))!;
    const tanHalf = Math.tan((frame.fovDeg * Math.PI) / 360);
    const shipP = projectToCameraFrame(
      { x: 8, y: 0, z: 0 },
      0.4,
      frame.position,
      frame.lookAt,
      frame.fovDeg,
    );
    const planetP = projectToCameraFrame(
      { x: 0, y: 0, z: 0 },
      2.5,
      frame.position,
      frame.lookAt,
      frame.fovDeg,
    );
    expect(shipP).not.toBeNull();
    expect(planetP).not.toBeNull();
    expect(Math.abs(shipP!.y)).toBeLessThan(tanHalf);
    expect(Math.abs(planetP!.y)).toBeLessThan(tanHalf);
  });

  it('pulls farther back as the ship slingshots away', () => {
    const near = departShot(ctx({ met: 104 }))!;
    const far = departShot(ctx({ met: 120 }))!;
    const dist = (f: typeof near) =>
      Math.hypot(f.position.x - f.lookAt.x, f.position.y - f.lookAt.y, f.position.z - f.lookAt.z);
    expect(dist(far)).toBeGreaterThan(dist(near));
  });
});

describe('composeShot dispatch', () => {
  it('routes each kind to its rig', () => {
    expect(composeShot('approach', ctx())).toEqual(approachShot(ctx()));
    expect(composeShot('establish', ctx())).toEqual(establishShot(ctx()));
    expect(composeShot('depart', ctx())).toEqual(departShot(ctx()));
    expect(composeShot('hero', ctx())).toEqual(heroShot(ctx()));
  });
});
