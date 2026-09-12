import { describe, expect, it } from 'vitest';
import { pickCardHero, type AspectProber } from './pick-card-hero';

const proberFor = (aspects: Record<string, number | null>): AspectProber => {
  return (url) => Promise.resolve(aspects[url] ?? null);
};

describe('pickCardHero', () => {
  it('skips a leading panorama and picks the first subject-shaped image', async () => {
    const hero = await pickCardHero(
      ['pano.webp', 'wheel.webp', 'wide.webp'],
      proberFor({ 'pano.webp': 7.01, 'wheel.webp': 1.78, 'wide.webp': 1.78 }),
    );
    expect(hero).toBe('wheel.webp');
  });

  it('keeps the gallery lead when it already fits the band', async () => {
    const hero = await pickCardHero(
      ['hero.webp', 'other.webp'],
      proberFor({ 'hero.webp': 1.5, 'other.webp': 1.0 }),
    );
    expect(hero).toBe('hero.webp');
  });

  it('accepts portraits, rejects ultra-tall strips', async () => {
    const hero = await pickCardHero(
      ['strip.webp', 'portrait.webp'],
      proberFor({ 'strip.webp': 0.2, 'portrait.webp': 0.75 }),
    );
    expect(hero).toBe('portrait.webp');
  });

  it('falls back to the gallery lead when nothing qualifies (all panoramas)', async () => {
    const hero = await pickCardHero(
      ['p1.webp', 'p2.webp'],
      proberFor({ 'p1.webp': 6.0, 'p2.webp': 5.5 }),
    );
    expect(hero).toBe('p1.webp');
  });

  it('treats probe failures as non-candidates', async () => {
    const hero = await pickCardHero(
      ['broken.webp', 'good.webp'],
      proberFor({ 'broken.webp': null, 'good.webp': 1.3 }),
    );
    expect(hero).toBe('good.webp');
  });

  it('returns undefined for an empty gallery', async () => {
    expect(await pickCardHero([], proberFor({}))).toBeUndefined();
  });
});
