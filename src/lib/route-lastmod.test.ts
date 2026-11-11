import { describe, it, expect } from 'vitest';
import manifest from './generated/route-lastmod.json';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';
import { SUPPORTED_LOCALES } from '$lib/locale';

/**
 * CI is a depth-1 checkout, so it cannot recompute the dates. What it CAN
 * enforce: a route added without regenerating (npm run route-lastmod) fails
 * here, and every date is a real calendar day that is not in the future.
 * Freshness is the release PR's job (AGENTS.md, release steps).
 */
const entries = manifest as Record<string, string | Record<string, string>>;
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const dates = (v: string | Record<string, string>) =>
  typeof v === 'string' ? [v] : Object.values(v);

describe('route-lastmod manifest', () => {
  it('has an entry for every canonical route (regenerate: npm run route-lastmod)', () => {
    const missing = collectCanonicalRoutes().filter((r: string) => !(r in entries));
    expect(missing).toEqual([]);
  });

  it('has no entry for a route that no longer exists', () => {
    const live = new Set<string>(collectCanonicalRoutes());
    expect(Object.keys(entries).filter((r) => !live.has(r))).toEqual([]);
  });

  it('holds only real, non-future YYYY-MM-DD dates', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const [route, v] of Object.entries(entries)) {
      for (const d of dates(v)) {
        expect(d, route).toMatch(isoDay);
        expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), route).toBe(d);
        expect(d <= today, `${route} ${d} is in the future`).toBe(true);
      }
    }
  });

  it('keys per-locale exceptions by supported locale, with a "*" default', () => {
    const codes = new Set<string>(SUPPORTED_LOCALES.map((l) => l.code));
    for (const [route, v] of Object.entries(entries)) {
      if (typeof v === 'string') continue;
      expect(v['*'], route).toMatch(isoDay);
      for (const k of Object.keys(v)) expect(k === '*' || codes.has(k), `${route} ${k}`).toBe(true);
    }
  });
});
