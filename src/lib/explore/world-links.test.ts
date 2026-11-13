import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { PLANETS } from '$lib/explore-scene';
import { smallBodyById } from './small-bodies';
import { resolveBodyRef } from './body-ref';
import { WORLD_LINKS, explorePathFor, worldLinkLabel, worldPathFor } from './world-links';

const planetIds = new Set(PLANETS.map((p) => p.id));
const membership = {
  isPlanet: (id: string) => planetIds.has(id),
  isSmallBody: (id: string) => smallBodyById.has(id),
};

describe('world-links', () => {
  it('covers exactly the four world pages', () => {
    expect(Object.keys(WORLD_LINKS).sort()).toEqual(['earth', 'mars', 'moon', 'venus']);
    expect(worldPathFor('earth')).toBe('/earth');
    expect(worldPathFor('moon')).toBe('/moon');
    expect(worldPathFor('mars')).toBe('/mars');
    expect(worldPathFor('venus')).toBe('/venus');
  });

  it('has no world page for the other bodies or for nothing', () => {
    for (const id of ['jupiter', 'sun', 'mercury', 'pluto', 'io', '', null, undefined]) {
      expect(worldPathFor(id)).toBeNull();
      expect(explorePathFor(id)).toBeNull();
    }
  });

  it('every explore id resolves to the body on /explore', () => {
    for (const [id, link] of Object.entries(WORLD_LINKS)) {
      const ref = resolveBodyRef(link.explore, membership);
      expect(ref, id).not.toBeNull();
      if (id === 'moon') expect(ref).toEqual({ kind: 'moon', id: 'moon', parent: 'earth' });
      else expect(ref).toEqual({ kind: 'planet', id });
    }
  });

  it('a bare moon is not an /explore id, so the table must not use one', () => {
    expect(resolveBodyRef('moon', membership)).toBeNull();
  });

  it('the Moon is a satellite of an Explore planet', () => {
    const earth = PLANETS.find((p) => p.id === 'earth');
    expect(earth?.satellites?.some((s) => s.id === 'moon')).toBe(true);
  });

  it('the two directions are inverse', () => {
    for (const [id, link] of Object.entries(WORLD_LINKS)) {
      expect(worldPathFor(id)).toBe(link.world);
      expect(explorePathFor(id)).toBe(`/explore?id=${link.explore}`);
      const ref = resolveBodyRef(
        new URL(explorePathFor(id)!, 'http://x').searchParams.get('id'),
        membership,
      );
      const back = ref?.kind === 'moon' ? ref.id : ref?.id;
      expect(back).toBe(id);
    }
  });

  it('every world has a chip label, none for another body', () => {
    for (const id of Object.keys(WORLD_LINKS)) expect(worldLinkLabel(id).length).toBeGreaterThan(0);
    expect(worldLinkLabel('jupiter')).toBe('');
  });

  it('each world names its own body (no swapped label)', () => {
    expect(worldLinkLabel('earth')).toBe(m.panel_action_world_earth());
    expect(worldLinkLabel('moon')).toBe(m.panel_action_world_moon());
    expect(worldLinkLabel('mars')).toBe(m.panel_action_world_mars());
    expect(worldLinkLabel('venus')).toBe(m.panel_action_world_venus());
    const labels = Object.keys(WORLD_LINKS).map(worldLinkLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
