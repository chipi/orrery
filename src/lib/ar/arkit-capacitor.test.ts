// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createArkitBackend } from './arkit-capacitor';

// jsdom = Capacitor web platform → the native bridge isn't present. Exercises the
// platform-gated + local paths. Session/hit-test/anchor calls need a wrapped
// iPhone + the native plugin (Marko's dev machine + device).

describe('ARKit backend adapter (offline paths)', () => {
  it('reports the iphone-wrapped platform + arkit-capacitor name', () => {
    const be = createArkitBackend();
    expect(be.name).toBe('arkit-capacitor');
    expect(be.platform).toBe('iphone-wrapped');
  });

  it('isSupported() is false off a native iOS wrapper', async () => {
    const be = createArkitBackend();
    expect(await be.isSupported()).toBe(false);
  });

  it('getCameraPose() returns identity before any frame', () => {
    const be = createArkitBackend();
    expect(be.getCameraPose()).toEqual({ position: [0, 0, 0], rotation: [0, 0, 0, 1] });
  });

  it('on() subscribes + returns an unsubscribe', () => {
    const be = createArkitBackend();
    const h = vi.fn();
    const off = be.on('session-started', h);
    expect(typeof off).toBe('function');
    off();
  });
});
