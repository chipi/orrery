/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLayer } from '$lib/science-layers';
import { toggleScienceLens } from '$lib/science-lens';
import { watchExploreLayers, type ExploreLayerTargets } from './layer-watchers';

const flush = () => new Promise((r) => setTimeout(r, 0));

function targets() {
  const state = { hr: false, causality: false };
  const t = {
    setConstellations: vi.fn(),
    setDeepSky: vi.fn(),
    hrOpen: () => state.hr,
    toggleHr: vi.fn(() => {
      state.hr = !state.hr;
    }),
    causalityOpen: () => state.causality,
    setCausalityOpen: vi.fn((on: boolean) => {
      state.causality = on;
    }),
    openCausality: vi.fn(),
    setMwLens: vi.fn(),
    setMassPeriodOpen: vi.fn(),
    setBhCurvature: vi.fn(),
    setBhTimeLens: vi.fn(),
  } satisfies ExploreLayerTargets;
  return { t, state };
}

let stops: Array<() => void> = [];

beforeEach(() => {
  const root = document.documentElement;
  for (const a of [...root.attributes]) {
    if (a.name.startsWith('data-science-')) root.removeAttribute(a.name);
  }
  stops = [];
});
afterEach(() => {
  for (const s of stops) s();
});

describe('watchExploreLayers', () => {
  // onLayerChange emits on subscribe, and so does the lens watch inside it.
  it('registers 10 watches and emits on subscribe (lens off -> all off)', () => {
    const { t } = targets();
    watchExploreLayers(t, (s) => stops.push(s));
    expect(stops).toHaveLength(10);
    expect(t.setConstellations.mock.calls).toEqual([[false], [false]]);
    expect(t.setMwLens.mock.calls).toEqual([
      ['rotation-curve', false],
      ['rotation-curve', false],
      ['dark-matter-halo', false],
      ['dark-matter-halo', false],
      ['stellar-populations', false],
      ['stellar-populations', false],
    ]);
    expect(t.toggleHr).not.toHaveBeenCalled();
    expect(t.setCausalityOpen).not.toHaveBeenCalled();
  });

  it('HR toggles only when the layer differs from the open state', async () => {
    const { t, state } = targets();
    toggleScienceLens();
    watchExploreLayers(t, (s) => stops.push(s));
    setLayer('hr-diagram', true);
    await flush();
    expect(t.toggleHr).toHaveBeenCalledTimes(1);
    expect(state.hr).toBe(true);
    setLayer('hr-diagram', true);
    await flush();
    expect(t.toggleHr).toHaveBeenCalledTimes(1);
  });

  it('light-cones opens the map on, closes state without re-opening on off', async () => {
    const { t, state } = targets();
    toggleScienceLens();
    watchExploreLayers(t, (s) => stops.push(s));
    setLayer('light-cones', true);
    await flush();
    expect(state.causality).toBe(true);
    expect(t.openCausality).toHaveBeenCalledTimes(1);
    setLayer('light-cones', false);
    await flush();
    expect(state.causality).toBe(false);
    expect(t.openCausality).toHaveBeenCalledTimes(1);
  });

  it('stopping the watches ends delivery', async () => {
    const { t } = targets();
    toggleScienceLens();
    watchExploreLayers(t, (s) => stops.push(s));
    for (const s of stops) s();
    stops = [];
    t.setBhTimeLens.mockClear();
    setLayer('bh-time-dilation', true);
    await flush();
    expect(t.setBhTimeLens).not.toHaveBeenCalled();
  });
});
