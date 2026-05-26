import { describe, expect, it } from 'vitest';
import { groupLinksByTier, siteHasLinks } from './link-tiers';

type Link = { t: 'intro' | 'core' | 'deep'; l: string; u: string };

describe('groupLinksByTier', () => {
  it('returns empty buckets for null/undefined input', () => {
    expect(groupLinksByTier(null)).toEqual({ intro: [], core: [], deep: [] });
    expect(groupLinksByTier(undefined)).toEqual({ intro: [], core: [], deep: [] });
  });

  it('returns empty buckets for empty array', () => {
    expect(groupLinksByTier<Link>([])).toEqual({ intro: [], core: [], deep: [] });
  });

  it('partitions links into the correct tier buckets', () => {
    const links: Link[] = [
      { t: 'intro', l: 'A', u: '/a' },
      { t: 'core', l: 'B', u: '/b' },
      { t: 'deep', l: 'C', u: '/c' },
      { t: 'core', l: 'D', u: '/d' },
      { t: 'intro', l: 'E', u: '/e' },
    ];
    const out = groupLinksByTier(links);
    expect(out.intro.map((x) => x.l)).toEqual(['A', 'E']);
    expect(out.core.map((x) => x.l)).toEqual(['B', 'D']);
    expect(out.deep.map((x) => x.l)).toEqual(['C']);
  });

  it('preserves source order within each bucket', () => {
    const links: Link[] = Array.from({ length: 6 }, (_, i) => ({
      t: 'core',
      l: `link-${i}`,
      u: `/${i}`,
    }));
    expect(groupLinksByTier(links).core.map((x) => x.l)).toEqual([
      'link-0',
      'link-1',
      'link-2',
      'link-3',
      'link-4',
      'link-5',
    ]);
  });
});

describe('siteHasLinks', () => {
  it('returns false for null/undefined site', () => {
    expect(siteHasLinks(null)).toBe(false);
    expect(siteHasLinks(undefined)).toBe(false);
  });

  it('returns false when links is missing or empty', () => {
    expect(siteHasLinks({})).toBe(false);
    expect(siteHasLinks({ links: null })).toBe(false);
    expect(siteHasLinks({ links: { length: 0 } })).toBe(false);
  });

  it('returns true when links has length > 0', () => {
    expect(siteHasLinks({ links: { length: 1 } })).toBe(true);
    expect(siteHasLinks({ links: { length: 42 } })).toBe(true);
  });
});
