// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createWebXrBackend } from './webxr';

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
