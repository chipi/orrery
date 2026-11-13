import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  THUMB_NEUTRAL_RING,
  isTealOrCyan,
  resolveThumb,
  ringColor,
  thumbOf,
  thumbOfRef,
  type EntityThumbManifest,
} from './entity-thumb';

const rj = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const manifest = rj<EntityThumbManifest>('static/data/entity-thumbs.json');

const fake: EntityThumbManifest = {
  surfaces: {
    fleet: { dir: 'fleet-galleries', slots: { lro: '03', dawn: '01' }, none: ['nope'] },
    sun: { dir: 'sun', flat: true, slots: { sun: '01' }, none: [] },
  },
};

describe('resolveThumb', () => {
  it('builds the 192 px WebP path of the blessed slot', () => {
    expect(resolveThumb(fake, 'fleet', 'lro')).toBe(
      '/credit-thumbs/images/fleet-galleries/lro/03.1x1.webp',
    );
    expect(resolveThumb(fake, 'fleet', 'dawn')).toBe(
      '/credit-thumbs/images/fleet-galleries/dawn/01.1x1.webp',
    );
  });

  it('has no id folder for a flat surface (the Sun)', () => {
    expect(resolveThumb(fake, 'sun', 'sun')).toBe('/credit-thumbs/images/sun/01.1x1.webp');
  });

  it('is null for an entity without a thumb, an unknown id and an unknown surface', () => {
    expect(resolveThumb(fake, 'fleet', 'nope')).toBeNull();
    expect(resolveThumb(fake, 'fleet', 'unknown')).toBeNull();
    expect(resolveThumb(fake, 'missions', 'lro')).toBeNull();
  });
});

describe('thumbOf / thumbOfRef on the real manifest', () => {
  it('honours the hero override: LRO, Hope and Earth are not on slot 01', () => {
    expect(thumbOf('fleet', 'lro')).toBe('/credit-thumbs/images/fleet-galleries/lro/03.1x1.webp');
    expect(thumbOf('fleet', 'hope')).toContain('/hope/03.');
    expect(thumbOf('planets', 'earth')).toContain('/earth/05.');
  });

  it('a moon whose blessed slot had no 1x1 has a thumb now', () => {
    expect(thumbOf('satellites', 'io')).toBe('/credit-thumbs/images/satellites/io/01.1x1.webp');
  });

  it('thumbOfRef reads a <surface>/<id> reference and tolerates junk', () => {
    expect(thumbOfRef('fleet/lro')).toBe(thumbOf('fleet', 'lro'));
    expect(thumbOfRef('sun/sun')).toBe('/credit-thumbs/images/sun/01.1x1.webp');
    expect(thumbOfRef(undefined)).toBeNull();
    expect(thumbOfRef('')).toBeNull();
    expect(thumbOfRef('lro')).toBeNull();
    expect(thumbOfRef('fleet/not-an-entity')).toBeNull();
  });

  it('every thumb is on disk and is the slot of the hero override, else 01', () => {
    for (const [key, s] of Object.entries(manifest.surfaces)) {
      const file = `static/data/${key}-hero-overrides.json`;
      const overrides = existsSync(file)
        ? rj<{ overrides: Record<string, { slot: string }> }>(file)
        : null;
      for (const [id, slot] of Object.entries(s.slots)) {
        const path = resolveThumb(manifest, key, id) as string;
        expect(existsSync(join('static', path)), `${key}/${id}: ${path}`).toBe(true);
        expect(slot, `${key}/${id}`).toBe(overrides?.overrides[id]?.slot.slice(0, 2) ?? '01');
      }
    }
  });

  it('every gallery entity has a thumb: nothing is listed as without one', () => {
    for (const [key, s] of Object.entries(manifest.surfaces)) expect(s.none, key).toEqual([]);
  });
});

describe('ringColor', () => {
  it('keeps an identity colour', () => {
    for (const c of ['#3b82f6', '#ef4444', '#1d4ed8', '#00732F', '#f97316', '#889fe7']) {
      expect(ringColor(c), c).toBe(c);
    }
  });

  it('is the neutral when the row has no identity colour', () => {
    expect(ringColor(null)).toBe(THUMB_NEUTRAL_RING);
    expect(ringColor(undefined)).toBe(THUMB_NEUTRAL_RING);
    expect(ringColor('')).toBe(THUMB_NEUTRAL_RING);
  });

  it('is the neutral for a teal or cyan identity colour (UXD-001)', () => {
    // #4ecdc4 the old accent and Voyager 2's path, #7de8e8 Uranus, #00A6A6 New Zealand
    for (const c of ['#4ecdc4', '#7de8e8', '#00A6A6', '#0ff', '#4ECDC4']) {
      expect(ringColor(c), c).toBe(THUMB_NEUTRAL_RING);
    }
  });

  it('does not take a non-hex colour for teal', () => {
    expect(isTealOrCyan('rgba(255,255,255,0.5)')).toBe(false);
    expect(isTealOrCyan('#888')).toBe(false);
    expect(isTealOrCyan('#ffffff')).toBe(false);
    expect(isTealOrCyan('#ff0000')).toBe(false);
  });
});
