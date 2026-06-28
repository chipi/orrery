import { describe, expect, it } from 'vitest';
import { EVENT_NAMES } from './analytics';

// The event registry is the single source of truth for Umami dashboards.
// These guard against the schema drift that previously crept in (parallel
// raw names + dead helpers).
describe('analytics EVENT_NAMES registry', () => {
  it('has no duplicate event names', () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });

  it('uses lower-kebab-case names only (dashboard-stable)', () => {
    for (const name of EVENT_NAMES) {
      expect(name, `"${name}" should be lower-kebab-case`).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it('covers the funnel + popularity events the product relies on', () => {
    for (const required of [
      'mission-view',
      'mission-load',
      'mission-complete',
      'fleet-entry-view',
      'science-section-view',
      'item-click',
      'filter-change',
      'search',
      'gallery-image-open',
      'panel-tab-open',
    ] as const) {
      expect(EVENT_NAMES).toContain(required);
    }
  });
});
