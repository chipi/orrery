// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createPanelFramer, watchPanels } from './panel-framing-host';
import { createRouteLifecycle } from './route-lifecycle';

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

  // docker-e2e 43965529959 (explore-level-card "clear of a docked planet panel"): on a GPU-less
  // runner frames come far apart, the one sample in the settle window caught the drawer mid-slide,
  // and nothing measured again, so the level card kept a cover 8 px short and touched the panel.
  it('keeps measuring until two samples agree, however far apart the frames are', () => {
    const rects = [{ left: 1240, right: 1440 }]; // the drawer half way through its slide-in
    const { framer, onCover, advance } = setup({ reduced: true, rects });
    framer.apply(0.016, true);
    expect(onCover).toHaveBeenLastCalledWith(200);
    rects[0] = { left: 1040, right: 1440 }; // the slide ends
    advance(450); // the next frame comes after the settle window
    framer.apply(0.016, true);
    expect(onCover).toHaveBeenLastCalledWith(400);
    advance(450);
    framer.apply(0.016, true); // agrees with the last sample: measuring stops
    rects[0] = { left: 0, right: 1440 };
    advance(450);
    framer.apply(0.016, true);
    expect(onCover).toHaveBeenLastCalledWith(400);
  });

  // docker-e2e 44728854768 (the same spec): the drawer sat at its start offset for two frames,
  // those two samples agreed after the settle window had closed, and its fly-in (a Svelte `in:fly`,
  // run by element.animate) ends with a non-bubbling `introend`, not an `animationend`.
  it('the end of a panel’s fly-in re-measures, though its introend does not bubble', () => {
    const lifecycle = createRouteLifecycle();
    const framer = { markDirty: vi.fn() };
    watchPanels(framer, lifecycle);
    const panel = document.createElement('aside');
    panel.className = 'panel';
    const inner = document.createElement('div');
    panel.append(inner);
    document.body.append(panel);
    framer.markDirty.mockClear();
    panel.dispatchEvent(new CustomEvent('introend'));
    expect(framer.markDirty).toHaveBeenCalledTimes(1);
    inner.dispatchEvent(new CustomEvent('introend'));
    expect(framer.markDirty).toHaveBeenCalledTimes(1);
    lifecycle.cleanup();
    panel.remove();
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
