import { describe, expect, it } from 'vitest';
import { CRUISE_SHOT_BACK, cruiseCraftShot } from './helio-cruise-shot';

describe('helio cruise shot', () => {
  const craft = { x: 100, y: 0, z: 0 };
  const target = { x: 400, y: 0, z: 0 };

  it('sits behind the craft, looking past it at the target', () => {
    const s = cruiseCraftShot(craft, target)!;
    expect(s.look).toEqual(target);
    expect(s.pos.x).toBeCloseTo(craft.x - CRUISE_SHOT_BACK, 6);
    const toTarget = Math.hypot(target.x - s.pos.x, target.z - s.pos.z);
    expect(toTarget).toBeGreaterThan(Math.hypot(target.x - craft.x, target.z - craft.z));
  });

  it('puts the craft low and left: the camera is above and to its right', () => {
    const s = cruiseCraftShot(craft, target)!;
    expect(s.pos.y).toBeGreaterThan(craft.y);
    // Facing +x, right is +z (forward × up).
    expect(s.pos.z).toBeGreaterThan(craft.z);
  });

  it('hands the approach to the wide frame close to the target', () => {
    expect(cruiseCraftShot(craft, { x: 120, y: 0, z: 0 })).toBeNull();
  });
});
