import { describe, it, expect } from 'vitest';
import { entityHero } from './entity-hero';
import { assetOrigin } from './asset-url';

const counts = { perseverance: 9, curiosity: 4, empty: 0 };
const overrides = { overrides: { perseverance: { slot: '03.jpg' } } };

describe('entityHero', () => {
  it('uses the reviewed override slot, extension-agnostic', () => {
    expect(entityHero('missions', 'perseverance', counts, overrides)).toBe(
      `${assetOrigin}/images/missions/perseverance/03.webp`,
    );
  });

  it('falls back to slot 01', () => {
    expect(entityHero('fleet-galleries', 'curiosity', counts, overrides)).toBe(
      `${assetOrigin}/images/fleet-galleries/curiosity/01.webp`,
    );
  });

  it('is null without a gallery', () => {
    expect(entityHero('missions', 'empty', counts, overrides)).toBeNull();
    expect(entityHero('missions', 'unknown', counts, overrides)).toBeNull();
  });
});
