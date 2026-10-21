import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { hotspotTileTexture } from './image-vision';

/** Every tier-2 tile path the hotspot sidecar references. */
function tier2Sources(): string[] {
  const out = new Set<string>();
  const walk = (o: unknown): void => {
    if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === 'object')
      for (const [k, v] of Object.entries(o)) {
        if (typeof v === 'string' && /tier2.*source$/.test(k)) out.add(v);
        else walk(v);
      }
  };
  walk(JSON.parse(readFileSync('static/data/surface-hotspots.json', 'utf8')));
  return [...out];
}

describe('surface hotspot tiles (#482)', () => {
  it('every referenced tier-2 tile has the 512 px .1x1.jpg sibling the scene loads', () => {
    const sources = tier2Sources();
    expect(sources.length).toBeGreaterThan(100);
    const missing = sources.filter((s) => !existsSync('static' + hotspotTileTexture(s, undefined)));
    expect(missing).toEqual([]);
  });

  it('prefers the vision manifest variant, else the sibling — never the full-size tile', () => {
    const src = '/images/hotspots/moon/luna9/tier2-regional.jpg';
    expect(hotspotTileTexture(src, undefined)).toBe(
      '/images/hotspots/moon/luna9/tier2-regional.1x1.jpg',
    );
    const entry = { variants: { '1x1': '/images/x.1x1.jpg' } } as unknown as Parameters<
      typeof hotspotTileTexture
    >[1];
    expect(hotspotTileTexture(src, entry)).toBe('/images/x.1x1.jpg');
  });
});
