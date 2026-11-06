import { describe, it, expect } from 'vitest';
import { siteAnatomy } from './site-anatomy';
import type { FleetRef } from '$types/mission';

const site = (id: string, refs: Array<[string, FleetRef['role']]>) => ({
  id,
  fleet_refs: refs.map(([rid, role]) => ({ id: rid, role })),
});
const drawn = (id: string) => `/images/anatomy/${id}.webp`;
const ids = (s: ReturnType<typeof site>) => siteAnatomy(s, drawn).map((a) => a.fleetId);

describe('siteAnatomy', () => {
  it('shows what is on the surface, never the part that stayed in orbit', () => {
    expect(
      ids(
        site('apollo15', [
          ['apollo-csm-block-ii', 'spacecraft'],
          ['apollo-lm', 'spacecraft'],
          ['lrv-apollo', 'payload'],
        ]),
      ),
    ).toEqual(['apollo-lm', 'lrv-apollo']);
    expect(
      ids(
        site('mars2', [
          ['mars-2', 'spacecraft'],
          ['mars2-orbiter', 'spacecraft'],
        ]),
      ),
    ).toEqual(['mars-2']);
  });
  it('keeps the rover a lander carried', () => {
    expect(
      ids(
        site('change3', [
          ['change-3', 'spacecraft'],
          ['yutu', 'payload'],
        ]),
      ),
    ).toEqual(['change-3', 'yutu']);
  });
  it('prefers the craft named like the site over a sister craft', () => {
    expect(
      ids(
        site('luna24', [
          ['luna-16', 'spacecraft'],
          ['luna24', 'spacecraft'],
        ]),
      ),
    ).toEqual(['luna24']);
    expect(
      ids(
        site('viking2-lander', [
          ['viking-1', 'spacecraft'],
          ['viking2-lander', 'spacecraft'],
        ]),
      ),
    ).toEqual(['viking2-lander']);
  });
  it('shows nothing when only an orbiting vehicle is linked or nothing is drawn', () => {
    expect(ids(site('artemis4', [['orion', 'spacecraft']]))).toEqual([]);
    expect(siteAnatomy(site('x', [['undrawn', 'spacecraft']]), () => null)).toEqual([]);
    expect(siteAnatomy({ id: 'y', fleet_refs: null }, drawn)).toEqual([]);
  });
  it('falls back to a carried rover when the lander has no drawing', () => {
    expect(ids(site('mars-pathfinder', [['sojourner', 'payload']]))).toEqual(['sojourner']);
  });
});
