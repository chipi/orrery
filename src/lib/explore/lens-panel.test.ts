import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import type { ExploreContextId } from '$lib/three/explore-scene-host';
import { computeLensPanel, scaleNavBackTarget } from './lens-panel';

const lens = (
  contextId: ExploreContextId,
  over: Partial<Parameters<typeof computeLensPanel>[0]> = {},
) =>
  computeLensPanel({
    blackHoleActive: false,
    contextId,
    activeBodyHostId: null,
    exoplanetHostIds: new Set(['kepler-186']),
    ...over,
  });

const SHELLS: ExploreContextId[] = [
  'solar-system',
  'neighborhood',
  'milky-way',
  'local-group',
  'local-sheet',
  'virgo',
  'laniakea',
  'cosmic-web',
];

describe('computeLensPanel', () => {
  it('a black hole overrides every shell with its two physics layers', () => {
    for (const c of SHELLS) {
      const p = lens(c, { blackHoleActive: true });
      expect(p.available, c).toEqual(['bh-curvature', 'bh-time-dilation']);
      expect(p.section).toBe('black-holes');
    }
  });

  it('every scale shell has a story with a learn link', () => {
    for (const c of SHELLS) {
      const p = lens(c);
      expect(p.title, c).toBeTruthy();
      expect(p.body, c).toBeTruthy();
      expect(p.tab, c).toBeTruthy();
      expect(p.section, c).toBeTruthy();
    }
  });

  it('only the solar system carries the historical foundations', () => {
    expect(lens('solar-system').historicalFoundations).toHaveLength(2);
    for (const c of SHELLS.filter((s) => s !== 'solar-system'))
      expect(lens(c).historicalFoundations, c).toBeUndefined();
  });

  it('an exoplanet body scene gets the neighbourhood lens; a solar-system body scene none', () => {
    expect(lens('body-scene', { activeBodyHostId: 'kepler-186' })).toEqual(lens('neighborhood'));
    expect(lens('body-scene', { activeBodyHostId: 'saturn' })).toEqual({ available: [] });
    expect(lens('body-scene')).toEqual({ available: [] });
  });
});

describe('scaleNavBackTarget', () => {
  it('walks out one shell at a time and stops at the solar system', () => {
    const chain = SHELLS.slice(1).map((c) => scaleNavBackTarget(c, false, false)?.exit);
    expect(chain).toEqual(SHELLS.slice(1));
    expect(scaleNavBackTarget('solar-system', false, false)).toBeNull();
    expect(scaleNavBackTarget('neighborhood', false, false)?.label).toBe(
      m.explore_ctx_solar_system(),
    );
    expect(scaleNavBackTarget('cosmic-web', false, false)?.label).toBe(m.explore_ctx_laniakea());
  });

  it('takeovers exit first: black hole, then body scene, then deep sky', () => {
    expect(scaleNavBackTarget('body-scene', true, true)?.exit).toBe('black-hole');
    expect(scaleNavBackTarget('body-scene', false, true)?.exit).toBe('body-scene');
    expect(scaleNavBackTarget('neighborhood', false, true)?.exit).toBe('deep-sky');
    expect(scaleNavBackTarget('solar-system', true, false)?.label).toBe(m.explore_ctx_back());
  });
});
