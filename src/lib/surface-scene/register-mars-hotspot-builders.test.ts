import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getHotspotModelBuilder } from '$lib/hotspot-lod-dispatcher';
import { registerMarsHotspotBuilders } from './register-mars-hotspot-builders';

/**
 * Join guard: every `hotspot_model` key that a Mars surface site points at in
 * surface-hotspots.json must resolve to a builder registered by
 * registerMarsHotspotBuilders(). A rename on either side (data or code) silently
 * drops the site back to the Tier-0 glyph in the live scene — this catches it.
 */

type SurfaceHotspots = {
  entries: Record<string, { hotspot_model?: string; hotspot_tier_max?: number }>;
};
type Site = { id: string };

const hotspots = JSON.parse(
  readFileSync('static/data/surface-hotspots.json', 'utf8'),
) as SurfaceHotspots;
const marsSiteIds = new Set(
  (JSON.parse(readFileSync('static/data/mars-sites.json', 'utf8')) as Site[]).map((s) => s.id),
);

describe('registerMarsHotspotBuilders', () => {
  registerMarsHotspotBuilders();

  const marsModelEntries = Object.entries(hotspots.entries).filter(
    ([id, e]) => marsSiteIds.has(id) && e.hotspot_model,
  );

  it('covers every Mars hotspot site with a tier >= 1 model', () => {
    expect(marsModelEntries.length).toBeGreaterThan(0);
  });

  it.each(marsModelEntries)('resolves the hotspot_model for %s', (_id, entry) => {
    expect(getHotspotModelBuilder(entry.hotspot_model as string)).toBeTypeOf('function');
  });

  it('points Perseverance + InSight at their bespoke builders', () => {
    expect(hotspots.entries.perseverance.hotspot_model).toBe('perseverance-rover');
    expect(hotspots.entries.insight.hotspot_model).toBe('insight-lander');
    expect(getHotspotModelBuilder('perseverance-rover')).toBeTypeOf('function');
    expect(getHotspotModelBuilder('insight-lander')).toBeTypeOf('function');
  });
});
