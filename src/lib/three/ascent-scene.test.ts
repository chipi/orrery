// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAscentScene, recoveredParts, stageDropRotation } from './ascent-scene';
import {
  recoveryFor,
  type AscentEvent,
  type AscentState,
  type LaunchProfile,
} from '$lib/physics/ascent/ascent-physics';

const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  );

/** The world direction of a dropped stage's body axis (+Y, nose up) at drop progress `p`. */
function bodyAxis(p: number, fromVertical: number, recovered: boolean): THREE.Vector3 {
  const vehicle = new THREE.Group();
  vehicle.rotation.z = -fromVertical; // as setState orients the vehicle along its thrust
  const stage = new THREE.Group();
  stage.rotation.set(...stageDropRotation(p, fromVertical, recovered));
  vehicle.add(stage);
  vehicle.updateMatrixWorld(true);
  return new THREE.Vector3(0, 1, 0).applyQuaternion(
    stage.getWorldQuaternion(new THREE.Quaternion()),
  );
}

describe('a booster that lands drops away upright, tail-down (operator 2026-11-19)', () => {
  it('ends with its body axis straight up in the world, whatever the vehicle pitch', () => {
    for (const deg of [20, 55, 80]) {
      const up = bodyAxis(1, (deg * Math.PI) / 180, true);
      expect(up.y).toBeCloseTo(1, 6);
    }
  });

  it('a spent stage still tumbles off the vertical', () => {
    expect(bodyAxis(1, (55 * Math.PI) / 180, false).y).toBeLessThan(0.9);
  });

  it('what lands is per flight (0.9.11 F2): Hera and Europa Clipper expend theirs', () => {
    const at = (id: string, mission?: string) => recoveredParts(recoveryFor(load(id), mission));
    expect(at('falcon-9', 'dart')).toEqual({ booster: true, strapOns: false });
    expect(at('falcon-9', 'hera')).toEqual({ booster: false, strapOns: false });
    expect(at('falcon-heavy', 'psyche-mission')).toEqual({ booster: false, strapOns: true });
    expect(at('falcon-heavy', 'europa-clipper')).toEqual({ booster: false, strapOns: false });
    expect(at('new-glenn', 'blue-moon-mk1')).toEqual({ booster: true, strapOns: false });
    expect(at('starship', 'starship-demo')).toEqual({ booster: true, strapOns: false });
    expect(at('atlas-v')).toEqual({ booster: false, strapOns: false });
  });
});

describe('Starship is its own spacecraft (operator 2026-11-23: Flight 5 after SECO framed empty space)', () => {
  const state = (t: number) =>
    ({
      t,
      altKm: 200,
      downrangeKm: 1000,
      speedKms: 7.7,
      velUpKms: 0,
      massKg: 1e5,
      stageIndex: 1,
      qPa: 0,
      twr: 0,
      thrustN: 0,
      dragN: 0,
      pitchRad: Math.PI / 2, // nose straight up: the body axis is the world's +y
      propRemainingKg: 0,
      boosterPropRemainingKg: 0,
    }) as AscentState;
  const events = [
    { type: 'staging', t: 160, altKm: 70, speedKms: 2.4, massKg: 1e6 },
    { type: 'seco', t: 480, altKm: 200, speedKms: 7.7, massKg: 1e5 },
  ] as AscentEvent[];

  it('after SECO the camera holds the ship, not a payload flying off its nose', () => {
    const vehLen = 1.2;
    const sc = createAscentScene({
      aspect: 1,
      vehicleLengthKm: vehLen,
      launcherId: 'starship',
      spacecraftId: 'starship-flight-5',
      events,
    });
    for (const t of [481, 490, 540]) {
      sc.setState(state(t));
      const along = sc.focus!.y - 200;
      // The ship spans about 0.58–0.90 of the stack (buildStarship).
      expect(along).toBeGreaterThan(0.55 * vehLen);
      expect(along).toBeLessThan(0.92 * vehLen);
    }
  });

  it('a launcher with a real payload still follows the payload once it is free', () => {
    const vehLen = 1.2;
    const sc = createAscentScene({
      aspect: 1,
      vehicleLengthKm: vehLen,
      launcherId: 'falcon-9',
      events,
    });
    sc.setState(state(540));
    expect(sc.focus!.y - 200).toBeGreaterThan(vehLen);
  });
});

describe('the camera keeps both pieces in frame for the first seconds after staging (operator 2026-11-23)', () => {
  it('then narrows to the stage still flying', () => {
    const vehLen = 1.2;
    const sc = createAscentScene({
      aspect: 1,
      vehicleLengthKm: vehLen,
      launcherId: 'falcon-9',
      events: [
        { type: 'staging', t: 160, altKm: 70, speedKms: 2.4, massKg: 1e6 },
        { type: 'seco', t: 480, altKm: 200, speedKms: 7.7, massKg: 1e5 },
      ] as AscentEvent[],
    });
    const at = (t: number) => {
      sc.setState({
        t,
        altKm: 80,
        downrangeKm: 60,
        speedKms: 2.5,
        velUpKms: 1,
        massKg: 1e5,
        stageIndex: 1,
        qPa: 0,
        twr: 1,
        thrustN: 1,
        dragN: 0,
        pitchRad: 1,
        propRemainingKg: 1,
        boosterPropRemainingKg: 0,
      } as AscentState);
      return sc.stackSpan;
    };
    expect(at(150)).toEqual([0, vehLen]);
    const [lo1] = at(161);
    expect(lo1).toBeLessThan(0); // reaches down to the falling booster
    const [lo2, hi2] = at(170);
    expect(lo2).toBeGreaterThan(0.3 * vehLen); // the upper stage only
    expect(hi2).toBe(vehLen);
  });
});
