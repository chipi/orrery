import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const galleries: Record<string, number> = read('static/data/planet-galleries.json');
const overrides: Record<string, { slot: string }> = read(
  'static/data/planets-hero-overrides.json',
).overrides;
const provenance: { path: string; title: string }[] = read(
  'static/data/image-provenance.json',
).entries;

// A guard, not a classifier: a planet hero is a picture of the planet itself (UXD-029).
const NOT_A_PLANET = /artist|concept|illustration|visuali[sz]ation|spacecraft|orbiter|lander|rover/i;

const heroSlot = (id: string) => (overrides[id]?.slot ?? '01.jpg').replace(/\.[^.]+$/, '');
// Pluto's panel is SmallBodyPanel: its hero is small-bodies/pluto/01, not planets/pluto.
const heroDir = (id: string) => (id === 'pluto' ? 'small-bodies' : 'planets');

describe('planet heroes', () => {
  it('every override names a planet in the manifest and a slot inside its gallery', () => {
    for (const [id, o] of Object.entries(overrides)) {
      expect(galleries[id], `${id} not in planet-galleries.json`).toBeGreaterThan(0);
      expect(Number(heroSlot(id)), `${id} slot ${o.slot}`).toBeLessThanOrEqual(galleries[id]!);
    }
  });

  it.each(Object.keys(galleries))('%s: the hero slot exists on disk', (id) => {
    expect(existsSync(`static/images/${heroDir(id)}/${id}/${heroSlot(id)}.webp`)).toBe(true);
  });

  // EP3: a planet gallery holds pictures of the planet; concepts and mission shots live in the
  // mission galleries (Earth 04 Apollo-Soyuz and Venus 03 Magellan concept moved there, UXD-029).
  it.each(Object.keys(galleries))('%s: no slot is an artist concept or a spacecraft shot', (id) => {
    for (let n = 1; n <= galleries[id]!; n++) {
      const path = `/images/${heroDir(id)}/${id}/${String(n).padStart(2, '0')}.webp`;
      const row = provenance.find((e) => e.path === path);
      expect(row?.title ?? '', path).not.toMatch(/artist|concept|seen from .*spacecraft/i);
    }
  });

  it.each(Object.keys(galleries))('%s: the hero title names no artwork or spacecraft', (id) => {
    const row = provenance.find(
      (e) => e.path === `/images/${heroDir(id)}/${id}/${heroSlot(id)}.webp`,
    );
    expect(row, `no provenance row for ${id}`).toBeDefined();
    expect(row!.title).not.toMatch(NOT_A_PLANET);
  });
});
