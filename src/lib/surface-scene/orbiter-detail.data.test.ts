import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { siteAnatomy } from './site-anatomy';
import { spacecraftDiagramPath } from '$lib/spacecraft-diagrams';
import type { SurfaceSite } from '$types/surface-site';

const load = (file: string) =>
  JSON.parse(readFileSync(`static/data/${file}`, 'utf8')) as SurfaceSite[];
const orbiters = [...load('moon-sites.json'), ...load('mars-sites.json')].filter(
  (s) => s.kind === 'orbiter',
);

// An orbiter's panel has a DETAIL tab, not STORY: it never touched a
// surface. If a story file is ever written for one, the STORY tab comes back
// beside DETAIL and this test names which orbiter did it.
describe('Moon and Mars orbiter sites', () => {
  it('lists the 19 orbiters', () => {
    expect(orbiters).toHaveLength(19);
  });

  it('has no story file content for any orbiter', () => {
    for (const s of orbiters) {
      const file = `static/data/site-stories/${s.id}.json`;
      const story = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
      expect(story, `${s.id} has a story`).toBeNull();
    }
  });

  it('shows the drawing of every orbiter that has one, and none for TGO and Tianwen-1', () => {
    const without = orbiters
      .filter((s) => siteAnatomy(s).length === 0)
      .map((s) => s.id)
      .sort();
    expect(without).toEqual(['tgo', 'tianwen1-orbiter']);
    for (const s of orbiters) {
      const own = spacecraftDiagramPath(s.id);
      const refd = (s.fleet_refs ?? []).some((r) => spacecraftDiagramPath(r.id));
      if (own || refd) expect(siteAnatomy(s), s.id).not.toHaveLength(0);
    }
  });

  it('shows the five drawings the lander filter used to hide', () => {
    for (const id of ['clementine', 'mars3-orbiter', 'viking1-orbiter', 'maven', 'hope']) {
      const s = orbiters.find((o) => o.id === id)!;
      expect(siteAnatomy(s).map((a) => a.fleetId)).toEqual([id]);
    }
  });
});
