// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createWebXrBackend, rotateY } from './webxr';

/** Rotate the unit +Y (0,1,0) by a quaternion — the hit-surface-normal math.
 *  Device-only in situ, so these lock the sign convention (a sign flip here
 *  silently yields wrong surface normals; regression guard for #150). */
describe('rotateY (hit-normal from quaternion)', () => {
  const close = (got: number[], want: number[]) =>
    got.forEach((g, i) => expect(g).toBeCloseTo(want[i], 6));

  it('identity quaternion leaves +Y unchanged', () => {
    close(rotateY(0, 0, 0, 1), [0, 1, 0]);
  });

  it('+90° about X maps +Y → +Z (right-hand rule)', () => {
    const s = Math.SQRT1_2; // sin/cos 45°
    close(rotateY(s, 0, 0, s), [0, 0, 1]);
  });

  it('+90° about Z maps +Y → −X', () => {
    const s = Math.SQRT1_2;
    close(rotateY(0, 0, s, s), [-1, 0, 0]);
  });

  it('180° about X flips +Y → −Y', () => {
    close(rotateY(1, 0, 0, 0), [0, -1, 0]);
  });

  it('returns a unit vector for an arbitrary unit quaternion', () => {
    const w = Math.sqrt(1 - 0.09 - 0.25 - 0.04); // makes (0.3, 0.5, −0.2, w) unit-norm
    const [x, y, z] = rotateY(0.3, 0.5, -0.2, w);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
  });
});

// jsdom has no WebXR (navigator.xr undefined) — exercises the no-session paths.
// The live session / hit-test / camera-pose paths need an ARCore device (Marko).

describe('WebXR backend (offline paths)', () => {
  it('reports the android-web platform + webxr name', () => {
    const be = createWebXrBackend();
    expect(be.name).toBe('webxr');
    expect(be.platform).toBe('android-web');
  });

  it('isSupported() is false when navigator.xr is absent', async () => {
    const be = createWebXrBackend();
    expect(await be.isSupported()).toBe(false);
  });

  it('getCameraPose() returns identity before a session starts', () => {
    const be = createWebXrBackend();
    expect(be.getCameraPose()).toEqual({ position: [0, 0, 0], rotation: [0, 0, 0, 1] });
  });

  it('hitTest() returns null before a session', async () => {
    const be = createWebXrBackend();
    expect(await be.hitTest(0, 0)).toBeNull();
  });

  it('add/removeAnchor round-trip returns an id', async () => {
    const be = createWebXrBackend();
    const id = await be.addAnchor([1, 2, 3]);
    expect(id).toMatch(/^anchor-\d+$/);
    await expect(be.removeAnchor(id)).resolves.toBeUndefined();
  });

  it('on() subscribes + returns an unsubscribe', () => {
    const be = createWebXrBackend();
    const h = vi.fn();
    const off = be.on('frame', h);
    expect(typeof off).toBe('function');
    off();
  });

  it('endSession() resolves cleanly with no active session', async () => {
    const be = createWebXrBackend();
    await expect(be.endSession()).resolves.toBeUndefined();
  });
});
