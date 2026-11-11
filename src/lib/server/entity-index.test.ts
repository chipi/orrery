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
import { getEntityIndex, type EntityHub } from './entity-index';

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
});
