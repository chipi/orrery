import { describe, expect, it } from 'vitest';
import { baseCandidates, hasLiveBase, manifestKeyLive } from './orphan-images.ts';

describe('hasLiveBase', () => {
  it('a .1x1.jpg crop beside a .webp base is live (WebP-only bases, #383)', () => {
    const disk = new Set(['static/images/missions/x/01.webp']);
    expect(hasLiveBase('static/images/missions/x/01.1x1.jpg', disk)).toBe(true);
  });
  it('a .jpg or .png base still counts', () => {
    expect(hasLiveBase('a/b.1x1.jpg', new Set(['a/b.jpg']))).toBe(true);
    expect(hasLiveBase('a/b.1x1.jpg', new Set(['a/b.png']))).toBe(true);
  });
  it('a crop with no base in any extension is dead', () => {
    expect(
      hasLiveBase(
        'static/images/rockets/h-iia.1x1.jpg',
        new Set(['static/images/rockets/other.webp']),
      ),
    ).toBe(false);
  });
  it('does not mistake a ladder rung for a base', () => {
    expect(hasLiveBase('a/b.1x1.jpg', new Set(['a/b-320.webp']))).toBe(false);
  });
  it('baseCandidates strips only the aspect token', () => {
    expect(baseCandidates('a/01.1x1.jpg')).toContain('a/01.webp');
  });
});

describe('manifestKeyLive', () => {
  const live =
    (...files: string[]) =>
    (p: string) =>
      files.includes(p);
  it('accepts the exact file, its webp twin, or the master', () => {
    expect(manifestKeyLive('/images/a/01.jpg', live('static/images/a/01.jpg'))).toBe(true);
    expect(manifestKeyLive('/images/a/01.jpg', live('static/images/a/01.webp'))).toBe(true);
    expect(manifestKeyLive('/images/a/01.jpg', live('masters/a/01.jpg'))).toBe(true);
  });
  it('rejects a key with no file anywhere', () => {
    expect(manifestKeyLive('/images/a/01.jpg', live())).toBe(false);
  });
  it('leaves non-image keys alone', () => {
    expect(manifestKeyLive('/data/x.json', live())).toBe(true);
  });
});
