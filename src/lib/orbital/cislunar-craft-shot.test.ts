import { describe, expect, it } from 'vitest';
import { craftLedCoastShot, inCraftShot } from './cislunar-craft-shot';

const DEG = Math.PI / 180;
/** Angle (deg) between the camera's look direction and the direction to `p`. */
function offAxis(
  shot: NonNullable<ReturnType<typeof craftLedCoastShot>>,
  p: { x: number; y: number; z: number },
) {
  const l = [shot.look.x - shot.pos.x, shot.look.y - shot.pos.y, shot.look.z - shot.pos.z];
  const v = [p.x - shot.pos.x, p.y - shot.pos.y, p.z - shot.pos.z];
  const dot = l[0] * v[0] + l[1] * v[1] + l[2] * v[2];
  return Math.acos(Math.min(1, dot / (Math.hypot(...l) * Math.hypot(...v)))) / DEG;
}

describe('the craft-led cislunar coast shot', () => {
  const craft = { x: 18, y: 0.5, z: -3 };
  const moon = { x: 30, y: 0, z: -24 };
  const earth = { x: 0, y: 0, z: 0 };

  it('keeps the coast ends for the diagram frame', () => {
    expect(inCraftShot(0.02)).toBe(false);
    expect(inCraftShot(0.5)).toBe(true);
    expect(inCraftShot(0.97)).toBe(false);
  });

  it('holds the craft and the body it flies to in frame, the body behind the craft', () => {
    const shot = craftLedCoastShot(craft, moon, 0.17)!;
    const half = shot.fovDeg / 2;
    expect(offAxis(shot, moon)).toBeLessThan(0.01);
    expect(offAxis(shot, craft)).toBeLessThan(half);
    expect(offAxis(shot, craft)).toBeGreaterThan(half * 0.2);
    const toCraft = Math.hypot(craft.x - shot.pos.x, craft.y - shot.pos.y, craft.z - shot.pos.z);
    const toMoon = Math.hypot(moon.x - shot.pos.x, moon.y - shot.pos.y, moon.z - shot.pos.z);
    expect(toCraft).toBeLessThan(toMoon);
  });

  it('takes a wider lens for Earth, so the craft keeps its size', () => {
    const out = craftLedCoastShot(craft, moon, 0.17)!;
    const home = craftLedCoastShot(craft, earth, 0.64)!;
    expect(home.fovDeg).toBeGreaterThan(out.fovDeg * 3);
    const frameAtCraft = (s: typeof out) =>
      Math.hypot(craft.x - s.pos.x, craft.y - s.pos.y, craft.z - s.pos.z) *
      Math.tan((s.fovDeg * DEG) / 2);
    expect(frameAtCraft(home)).toBeCloseTo(frameAtCraft(out), 1);
  });

  it('leaves the close approach to the diagram frame', () => {
    expect(craftLedCoastShot({ x: 3, y: 0, z: 0 }, earth, 0.64)).toBeNull();
    expect(craftLedCoastShot({ x: 12, y: 0, z: 0 }, earth, 0.64)).not.toBeNull();
  });

  it('waits while the camera would back into the body left behind', () => {
    const nearEarth = { x: 2, y: 0, z: 0 };
    expect(craftLedCoastShot(nearEarth, moon, 0.17, { at: earth, r: 0.64 })).toBeNull();
    expect(craftLedCoastShot(craft, moon, 0.17, { at: earth, r: 0.64 })).not.toBeNull();
  });
});
