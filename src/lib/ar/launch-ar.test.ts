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

import { launchArScene, exitArScene, compass8, formatPass } from './launch-ar';
import type { Pass } from '../satellite';

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
    // #51 review M2: failure now also stop()s the handle so the WebGL context +
    // any appended overlay layer are disposed, not leaked.
    expect(stop).toHaveBeenCalledTimes(1);
    expect(arCanvas()).toBeNull(); // canvas removed on failure
    // active was cleared → a subsequent launch is allowed
    start.mockResolvedValue(true);
    expect(await launchArScene('mars')).toBe(true);
  });

  it('#51 M1: a REJECTED start() is caught — returns false, tears down, no throw', async () => {
    start.mockRejectedValue(new Error('permission denied'));
    // Must not propagate: an uncaught reject would strand `.ar-active` (whole app
    // hidden) with a dead exit button.
    expect(await launchArScene('mars')).toBe(false);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(arCanvas()).toBeNull();
    // Recovered cleanly → a subsequent launch still works.
    start.mockResolvedValue(true);
    expect(await launchArScene('mars')).toBe(true);
  });

  it('#51 M3: a second launch DURING an in-flight start builds only one scene', async () => {
    let releaseStart: (v: boolean) => void = () => {};
    start.mockReturnValueOnce(new Promise<boolean>((res) => (releaseStart = res)));
    const first = launchArScene('mars'); // sets `launching` synchronously, parks on start()
    const second = await launchArScene('mars'); // fires during the await window
    expect(second).toBe(false); // guarded by `launching` — no second scene
    releaseStart(true);
    expect(await first).toBe(true);
    expect(createArScene).toHaveBeenCalledTimes(1); // exactly one scene ever built
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

describe('compass8', () => {
  it('maps degrees to the nearest 8-point label, wrapping at 360', () => {
    expect(compass8(0)).toBe('N');
    expect(compass8(45)).toBe('NE');
    expect(compass8(90)).toBe('E');
    expect(compass8(180)).toBe('S');
    expect(compass8(270)).toBe('W');
    expect(compass8(360)).toBe('N'); // wraps
    expect(compass8(361)).toBe('N'); // rounds to nearest sector
    expect(compass8(-45)).toBe('NW'); // negative normalises
  });
});

describe('formatPass', () => {
  const pass = (over: Partial<Pass>): Pass => ({
    start: new Date(Date.now() + 30 * 60_000),
    culmination: new Date(Date.now() + 33 * 60_000),
    end: new Date(Date.now() + 36 * 60_000),
    maxAltitudeDeg: 42,
    startAzimuthDeg: 90,
    visible: true,
    ...over,
  });

  it('reports no pass when null', () => {
    expect(formatPass('iss', null)).toBe('ISS: no pass in 24 h');
    expect(formatPass('tiangong', null)).toBe('Tiangong: no pass in 24 h');
  });
  it('labels a visible upcoming pass with direction + max altitude', () => {
    const s = formatPass('iss', pass({ startAzimuthDeg: 270, maxAltitudeDeg: 55 }));
    expect(s).toContain('ISS: visible pass in 30 min');
    expect(s).toContain('W');
    expect(s).toContain('max 55°');
  });
  it('says "now" when the pass has already started', () => {
    expect(formatPass('iss', pass({ start: new Date(Date.now() - 1000) }))).toContain('now');
  });
  it('distinguishes a daytime (non-visible) pass', () => {
    expect(formatPass('tiangong', pass({ visible: false }))).toContain('daytime pass');
  });
});
