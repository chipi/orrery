import { describe, expect, it, vi } from 'vitest';
import { createPanelFramer } from './panel-framing-host';

function setup(opts: { reduced?: boolean; rects?: { left: number; right: number }[] } = {}) {
  let t = 1000;
  const camera = {
    view: null as { enabled: boolean } | null,
    setViewOffset: vi.fn((_fw: number, _fh: number, x: number) => {
      camera.view = { enabled: x !== 0 };
    }),
    clearViewOffset: vi.fn(() => {
      camera.view = null;
    }),
  };
  const onCover = vi.fn();
  const rects = opts.rects ?? [{ left: 1040, right: 1440 }];
  const framer = createPanelFramer({
    camera,
    getReducedMotion: () => !!opts.reduced,
    getRects: () => rects,
    getViewportW: () => 1440,
    getSize: () => ({ w: 1440, h: 900 }),
    now: () => t,
    onCover,
  });
  return { framer, camera, onCover, advance: (ms: number) => (t += ms) };
}

describe('createPanelFramer', () => {
  it('a 400 px drawer shifts the view 200 px (reduced motion: at once)', () => {
    const { framer, camera, onCover } = setup({ reduced: true });
    framer.apply(0.016, true);
    expect(camera.setViewOffset).toHaveBeenLastCalledWith(1440, 900, 200, 0, 1440, 900);
    expect(onCover).toHaveBeenCalledWith(400);
  });

  it('eases towards the shift over frames, not at once', () => {
    const { framer, camera } = setup();
    framer.apply(0.016, true);
    const first = camera.setViewOffset.mock.calls.at(-1)![2];
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(200);
    for (let i = 0; i < 60; i++) framer.apply(0.016, true);
    expect(framer.shift()).toBe(200);
  });

  it('a bottom sheet (full width) shifts nothing and clears any offset', () => {
    const { framer, camera } = setup({ reduced: true, rects: [{ left: 0, right: 1440 }] });
    framer.apply(0.016, true);
    expect(camera.setViewOffset).not.toHaveBeenCalled();
    expect(framer.shift()).toBe(0);
  });

  it('measures only inside the settle window; markDirty reopens it', () => {
    const { framer, camera, advance } = setup({ reduced: true });
    framer.apply(0.016, true);
    advance(500);
    framer.apply(0.016, false);
    expect(camera.setViewOffset).toHaveBeenCalledTimes(1);
    framer.markDirty();
    framer.apply(0.016, false);
    expect(camera.clearViewOffset).toHaveBeenCalled();
    expect(framer.shift()).toBe(0);
  });

  it('not wanted (2D, an immersive view) takes the shift off', () => {
    const { framer, camera } = setup({ reduced: true });
    framer.apply(0.016, true);
    expect(framer.shift()).toBe(200);
    framer.apply(0.016, false);
    expect(framer.shift()).toBe(0);
    expect(camera.clearViewOffset).toHaveBeenCalled();
  });
});
