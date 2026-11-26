import { describe, expect, it } from 'vitest';
import { CRUISE_SHOT_BACK, cruiseCraftShot, smallBodyPassShot } from './helio-cruise-shot';

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

describe('small-body pass shot', () => {
  const craft = { x: 100, y: 0, z: 0 };
  // Giotto 10 days before Halley: the comet 0.38 AU (30 units) ahead, a 0.4-unit rock.
  const halley = { x: 130, y: 0, z: 0 };

  it('leads with the craft toward a fast small body, however close it is', () => {
    const s = smallBodyPassShot('approach', craft, halley, 0.4, false)!;
    expect(s.look).toEqual(halley);
    expect(s.pos.x).toBeLessThan(craft.x);
    expect(smallBodyPassShot('approach', craft, { x: 103, y: 0, z: 0 }, 0.4, false)).not.toBeNull();
  });

  it('looks back past the craft at the body it has left', () => {
    const s = smallBodyPassShot('depart', craft, { x: 70, y: 0, z: 0 }, 0.4, false)!;
    expect(s.look).toEqual({ x: 70, y: 0, z: 0 });
    expect(s.pos.x).toBeGreaterThan(craft.x);
  });

  it('leaves planets, arrivals and the establish and hero beats to the montage rigs', () => {
    expect(smallBodyPassShot('approach', craft, halley, 2.5, false)).toBeNull();
    expect(smallBodyPassShot('depart', craft, halley, 0.4, true)).toBeNull();
    expect(smallBodyPassShot('hero', craft, halley, 0.4, false)).toBeNull();
    expect(smallBodyPassShot('establish', craft, halley, 0.4, false)).toBeNull();
  });
});
