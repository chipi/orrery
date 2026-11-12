import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

// The real static/data files, without the bundle/fetch machinery of ./core.
vi.mock('$lib/data/core', () => ({
  get: vi.fn(async (path: string) => {
    const file = `static/data/${path}`;
    if (!existsSync(file)) throw new Error(`404 ${path}`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }),
}));

import { collectCanonicalRoutes } from '../../../scripts/site-routes.mjs';
import { getEntityIndex, getScaleIndexRows, type EntityHub } from './entity-index';
import { CTX_ORDER } from '$lib/explore/scale-shell-controller';

const HUBS: EntityHub[] = ['missions', 'fleet', 'moon', 'mars', 'venus', 'explore'];

describe('getEntityIndex', () => {
  for (const hub of HUBS) {
    it(`/${hub}: one named link per prerendered entity page, sorted by locale`, async () => {
      const expected = collectCanonicalRoutes().filter(
        (r) =>
          r.startsWith(`/${hub}/`) &&
          r !== '/missions/launches' &&
          r !== '/explore/hub' &&
          !r.slice(hub.length + 2).includes('/'),
      );
      const links = await getEntityIndex(hub, 'de', fetch);
      expect(links.map((l) => `/${hub}/${l.id}`).sort()).toEqual([...expected].sort());
      expect(links.every((l) => l.name.length > 0)).toBe(true);
      const collator = new Intl.Collator('de');
      for (let i = 1; i < links.length; i++)
        expect(collator.compare(links[i - 1].name, links[i].name)).toBeLessThanOrEqual(0);
    });
  }

  it('/explore lists bodies only: no star or black-hole page, and a star id is no body', async () => {
    const ids = (await getEntityIndex('explore', 'en-US', fetch)).map((l) => l.id);
    expect(ids).toContain('mars');
    expect(ids).not.toContain('stars');
    expect(ids).not.toContain('black-holes');
    expect(ids).not.toContain('gargantua');
    expect(ids).not.toContain('sirius');
    expect(ids).not.toContain('trappist-1');
  });
});

describe('getScaleIndexRows', () => {
  it.each(['en-US', 'de'])(
    '%s: rows for all eight scales, every page linked (a deep-sky page also by its 13 twins)',
    async (locale) => {
      const rows = await getScaleIndexRows(locale, fetch);
      expect(Object.keys(rows)).toEqual([...CTX_ORDER]);
      const linked = CTX_ORDER.flatMap((s) => rows[s].flatMap((r) => (r.href ? [r.href] : [])));
      const pages = collectCanonicalRoutes().filter(
        (r) => r.startsWith('/explore/') && r !== '/explore/hub',
      );
      // A Milky Way globular or Local Group twin links the deep-sky page of its object too.
      expect([...new Set(linked)].sort()).toEqual([...pages].sort());
      expect(linked.length - new Set(linked).size).toBe(7 + 4 + 1 + 1);
      expect(CTX_ORDER.reduce((n, s) => n + rows[s].length, 0)).toBe(344);
    },
  );

  it('names a linked row as its entity page does', async () => {
    const rows = await getScaleIndexRows('de', fetch);
    const bodies = await getEntityIndex('explore', 'de', fetch);
    for (const l of bodies)
      expect(rows['solar-system'].find((r) => r.id === l.id)?.name, l.id).toBe(l.name);
    expect(rows['solar-system'].find((r) => r.id === 'io')?.meta).toBe(
      bodies.find((l) => l.id === 'jupiter')?.name,
    );
  });
});
