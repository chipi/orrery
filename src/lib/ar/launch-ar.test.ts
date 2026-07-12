// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// createArScene is device-only, so stub it with a controllable start/stop; the
// audio singletons are stubbed too since importing them isn't the unit here.
const { start, stop, createArScene } = vi.hoisted(() => {
  const start = vi.fn();
  const stop = vi.fn();
  return { start, stop, createArScene: vi.fn(() => ({ start, stop })) };
});

vi.mock('./ar-scene', () => ({ createArScene }));
vi.mock('../audio-state.svelte', () => ({ audio: { loadEpisode: vi.fn(), play: vi.fn() } }));
vi.mock('../audio-registry.svelte', () => ({
  audioRegistry: {
    load: vi.fn().mockResolvedValue(undefined),
    byId: vi.fn(),
    forRoute: vi.fn(() => []),
  },
}));

import { launchArScene, exitArScene } from './launch-ar';

const arCanvas = () => document.querySelector('canvas.ar-canvas');

beforeEach(() => {
  start.mockReset().mockResolvedValue(true);
  stop.mockReset();
  createArScene.mockClear();
  document.body.innerHTML = '';
});

afterEach(() => {
  exitArScene(); // clear the module-level `active` between tests
  vi.unstubAllGlobals();
});

describe('launchArScene', () => {
  it('returns false under SSR (no document) without building a scene', async () => {
    vi.stubGlobal('document', undefined);
    expect(await launchArScene('explore')).toBe(false);
    expect(createArScene).not.toHaveBeenCalled();
  });

  it('starts a scene: appends the AR canvas + returns true', async () => {
    expect(await launchArScene('earth')).toBe(true);
    expect(createArScene).toHaveBeenCalledTimes(1);
    expect(arCanvas()).not.toBeNull();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('is idempotent while a scene is active (no second scene built)', async () => {
    await launchArScene('moon');
    expect(await launchArScene('moon')).toBe(false);
    expect(createArScene).toHaveBeenCalledTimes(1);
  });

  it('tears down + returns false when the session fails to start', async () => {
    start.mockResolvedValue(false);
    expect(await launchArScene('mars')).toBe(false);
    expect(stop).not.toHaveBeenCalled(); // failure path calls cleanup, not stop
    expect(arCanvas()).toBeNull(); // canvas removed on failure
    // active was cleared → a subsequent launch is allowed
    start.mockResolvedValue(true);
    expect(await launchArScene('mars')).toBe(true);
  });
});

describe('exitArScene', () => {
  it('stops the scene, removes the canvas, and clears active', async () => {
    await launchArScene('explore');
    expect(arCanvas()).not.toBeNull();
    exitArScene();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(arCanvas()).toBeNull();
    // active cleared → can launch again
    expect(await launchArScene('explore')).toBe(true);
  });

  it('is a no-op when nothing is active', () => {
    expect(() => exitArScene()).not.toThrow();
    expect(stop).not.toHaveBeenCalled();
  });
});
