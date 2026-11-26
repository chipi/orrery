import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  CAR_LENGTH_M,
  ROADSTER_HEIGHT_M,
  SHOWCASE,
  buildRoadster,
  buildRoadsterCar,
} from './roadster';

describe('Roadster showcase model', () => {
  it('draws the height it declares, base on y = 0', () => {
    const bb = new THREE.Box3().setFromObject(buildRoadster());
    expect(bb.min.y).toBeCloseTo(0, 6);
    expect(Math.abs(bb.max.y - ROADSTER_HEIGHT_M) / ROADSTER_HEIGHT_M).toBeLessThan(0.01);
    expect(SHOWCASE['tesla-roadster'].heightM).toBe(ROADSTER_HEIGHT_M);
  });

  it('keeps the production car length nose to tail (bumpers, not the mirrors)', () => {
    const car = buildRoadsterCar();
    const body = car.getObjectByName('body') as THREE.Mesh;
    body.geometry.computeBoundingBox();
    const bb = body.geometry.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(CAR_LENGTH_M, 2);
  });

  it('sits Starman inside the car with his helmet above the windscreen header', () => {
    const car = buildRoadsterCar();
    const bb = new THREE.Box3().setFromObject(car);
    // Windscreen header at 1.10 m; the helmet top is the car's highest point.
    expect(bb.max.y).toBeGreaterThan(1.1);
    expect(bb.max.y).toBeLessThan(1.45);
  });
});
