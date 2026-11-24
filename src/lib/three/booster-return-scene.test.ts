import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ENTRY_BURN_LEN_S,
  FOOT_DROP_M,
  LANDING_BURN_ALT_M,
  RETURN_HOLD_S,
  RETURN_LEAD_S,
  boosterReturnPose,
  createBoosterReturn,
  returnAltitude,
  returnCamera,
  returnWindow,
  RETURN_SPECS,
  type BoosterReturnLanding,
} from './booster-return-scene';

const i4: BoosterReturnLanding = {
  part: 'booster',
  outcome: 'landed',
  site: 'droneship',
  entryBurnS: 450,
  landingBurnS: 544,
  touchdownS: 571,
};

describe('booster return pose (Inspiration4)', () => {
  it('opens before the entry burn and closes after touchdown', () => {
    expect(returnWindow(i4)).toEqual([450 - RETURN_LEAD_S, 571 + RETURN_HOLD_S]);
    expect(boosterReturnPose(441, i4).visible).toBe(false);
    expect(boosterReturnPose(442, i4).visible).toBe(true);
    expect(boosterReturnPose(575, i4).visible).toBe(true);
    expect(boosterReturnPose(576, i4).visible).toBe(false);
  });

  it('altitude only falls, continuous at the burn seams, and rests at touchdown', () => {
    let prev = Infinity;
    for (let t = 442; t <= 575; t += 0.25) {
      const h = returnAltitude(t, i4);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
    for (const seam of [450, 450 + ENTRY_BURN_LEN_S, 544, 571]) {
      expect(
        Math.abs(returnAltitude(seam - 1e-4, i4) - returnAltitude(seam + 1e-4, i4)),
      ).toBeLessThan(0.5);
    }
    expect(returnAltitude(544, i4)).toBeCloseTo(LANDING_BURN_ALT_M, 0);
    expect(boosterReturnPose(571, i4).altM).toBe(FOOT_DROP_M);
  });

  it('three engines in the entry burn, one in the landing burn, none in between', () => {
    expect(boosterReturnPose(449, i4).entryPlumes).toBe(0);
    expect(boosterReturnPose(460, i4).entryPlumes).toBe(3);
    expect(boosterReturnPose(460, i4).landingPlumes).toBe(0);
    expect(boosterReturnPose(500, i4).entryPlumes + boosterReturnPose(500, i4).landingPlumes).toBe(
      0,
    );
    expect(boosterReturnPose(560, i4).landingPlumes).toBe(1);
    expect(boosterReturnPose(560, i4).entryPlumes).toBe(0);
    expect(boosterReturnPose(571, i4).landingPlumes).toBe(0);
  });

  it('legs stowed before the last seconds, out at touchdown; fins out throughout', () => {
    expect(boosterReturnPose(542, i4).legs).toBe(0);
    expect(boosterReturnPose(569.5, i4).legs).toBeGreaterThan(0);
    expect(boosterReturnPose(570, i4).legs).toBe(1);
    expect(boosterReturnPose(571, i4).legs).toBe(1);
    expect(boosterReturnPose(450, i4).fins).toBe(1);
  });

  it('RCS puffs only in the coast and just before the entry burn; upright at touchdown', () => {
    const lit = (t0: number, t1: number) => {
      let n = 0;
      for (let t = t0; t < t1; t += 0.1) n += boosterReturnPose(t, i4).rcs.filter(Boolean).length;
      return n;
    };
    expect(lit(485, 540)).toBeGreaterThan(0);
    expect(lit(444, 450)).toBeGreaterThan(0);
    expect(lit(455, 475)).toBe(0);
    expect(lit(550, 570)).toBe(0);
    const p = boosterReturnPose(571, i4);
    expect(p.tiltX).toBeCloseTo(0, 9);
    expect(p.tiltZ).toBeCloseTo(0, 9);
    expect(boosterReturnPose(500, i4)).toEqual(boosterReturnPose(500, i4));
  });

  it('camera stays above the sea and outside the booster; the ship is on screen at the end', () => {
    for (let t = 442; t <= 575; t += 0.5) {
      const pose = boosterReturnPose(t, i4);
      for (const aspect of [1.6, 0.46]) {
        const c = returnCamera(t, i4, pose.altM, aspect);
        expect(c.pos.y).toBeGreaterThan(2);
        expect(Math.hypot(c.pos.x - 8, c.pos.z)).toBeGreaterThan(20);
      }
    }
    const end = returnCamera(570, i4, FOOT_DROP_M, 1.6);
    expect(Math.hypot(end.pos.x - 8, end.pos.z)).toBeLessThan(150);
  });
});

describe('booster return pose (New Glenn, ESCAPADE)', () => {
  const ng: BoosterReturnLanding = {
    part: 'booster',
    outcome: 'landed',
    site: 'droneship',
    entryBurnS: 420,
    landingBurnS: 515,
    touchdownS: 540,
    timeClass: 'approx',
  };
  const spec = RETURN_SPECS['new-glenn'];

  it('relights three BE-4 in the entry burn, one in the landing burn', () => {
    expect(boosterReturnPose(430, ng, spec).entryPlumes).toBe(3);
    expect(boosterReturnPose(430, ng, spec).landingPlumes).toBe(0);
    expect(boosterReturnPose(530, ng, spec).landingPlumes).toBe(1);
    expect(spec.entryEngines).toHaveLength(3);
  });

  it('falls monotonically to the deck, feet a spec footDrop under the bells', () => {
    let prev = Infinity;
    for (let t = 412; t <= 545; t += 0.25) {
      const h = returnAltitude(t, ng, spec);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
    expect(boosterReturnPose(540, ng, spec).altM).toBe(spec.footDropM);
  });

  it('backs the camera off for the taller booster', () => {
    const f9 = returnCamera(500, ng, 300, 1.6);
    const big = returnCamera(500, ng, 300, 1.6, spec);
    expect(big.pos.distanceTo(big.look)).toBeGreaterThan(f9.pos.distanceTo(f9.look));
  });
});

describe('booster return (IM-1, return to launch site)', () => {
  const im1: BoosterReturnLanding = {
    part: 'booster',
    outcome: 'landed',
    site: 'landing-zone',
    entryBurnS: 371,
    entryBurnEndS: 382,
    landingBurnS: 437,
    touchdownS: 454,
    timeClass: 'sourced',
  };

  it('lights the entry plumes only inside the sourced 11 s burn', () => {
    expect(boosterReturnPose(370.9, im1).entryPlumes).toBe(0);
    expect(boosterReturnPose(371, im1).entryPlumes).toBe(3);
    expect(boosterReturnPose(381.9, im1).entryPlumes).toBe(3);
    expect(boosterReturnPose(382, im1).entryPlumes).toBe(0);
    expect(boosterReturnPose(440, im1).landingPlumes).toBe(1);
  });

  it('falls monotonically, continuous at the seams, and rests at touchdown', () => {
    let prev = Infinity;
    for (let t = 363; t <= 458; t += 0.25) {
      const h = returnAltitude(t, im1);
      expect(h).toBeLessThanOrEqual(prev + 1e-9);
      prev = h;
    }
    for (const seam of [371, 382, 437, 454]) {
      expect(
        Math.abs(returnAltitude(seam - 1e-4, im1) - returnAltitude(seam + 1e-4, im1)),
      ).toBeLessThan(0.5);
    }
    expect(boosterReturnPose(454, im1).altM).toBe(FOOT_DROP_M);
  });

  it('builds the land pad, not the drone ship, and stands the feet on it at touchdown', () => {
    const r = createBoosterReturn(im1);
    expect(r.scene.getObjectByName('landing-zone-1')).toBeTruthy();
    expect(r.scene.getObjectByName('drone-ship')).toBeUndefined();
    expect(r.update(456, 1.6)).toBe(true);
    r.scene.updateMatrixWorld(true);
    const feet = new THREE.Box3();
    r.scene.traverse((o) => {
      if (o.name.startsWith('leg') || o.name.startsWith('foot')) feet.expandByObject(o);
    });
    expect(feet.isEmpty()).toBe(false);
    expect(Math.abs(feet.min.y)).toBeLessThan(0.5);
  });

  it('keeps the drone ship for a droneship landing', () => {
    const r = createBoosterReturn(i4);
    expect(r.scene.getObjectByName('drone-ship')).toBeTruthy();
    expect(r.scene.getObjectByName('landing-zone-1')).toBeUndefined();
  });
});
