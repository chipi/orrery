import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  THUMB_NEUTRAL_RING,
  isTealOrCyan,
  resolveSiteThumb,
  resolveThumb,
  ringColor,
  solarRowThumb,
  thumbOfSite,
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
    planets: { dir: 'planets', slots: { mars: '05' }, none: [] },
    satellites: { dir: 'satellites', slots: { io: '01' }, none: [] },
    'small-bodies': { dir: 'small-bodies', slots: { ceres: '01', halley: '02' }, none: [] },
    belts: { dir: 'belts', slots: { asteroid: '01' }, none: [] },
  },
  sites: {
    moon: { slots: { apollo15: 'missions/apollo15/02' }, none: ['luna9'] },
  },
};

describe('resolveSiteThumb', () => {
  it('builds the path of the folder the site panel resolves to, not of the site id', () => {
    expect(resolveSiteThumb(fake, 'moon', 'apollo15')).toBe(
      '/credit-thumbs/images/missions/apollo15/02.1x1.webp',
    );
  });

  it('is null for a site in none, an unknown id and an unknown body', () => {
    expect(resolveSiteThumb(fake, 'moon', 'luna9')).toBeNull();
    expect(resolveSiteThumb(fake, 'moon', 'zzz')).toBeNull();
    expect(resolveSiteThumb(fake, 'mars', 'apollo15')).toBeNull();
  });
});

describe('solarRowThumb', () => {
  it('picks the surface by row kind: sun, planet, moon, belt, small bodies', () => {
    expect(solarRowThumb({ id: 'sun', kind: 'sun' }, fake)).toBe(
      '/credit-thumbs/images/sun/01.1x1.webp',
    );
    expect(solarRowThumb({ id: 'mars', kind: 'planet' }, fake)).toContain('/planets/mars/05.');
    expect(solarRowThumb({ id: 'io', kind: 'moon' }, fake)).toContain('/satellites/io/01.');
    expect(solarRowThumb({ id: 'asteroid', kind: 'belt' }, fake)).toContain('/belts/asteroid/01.');
    for (const kind of ['dwarf', 'asteroid', 'comet', 'kbo', 'interstellar'])
      expect(solarRowThumb({ id: 'ceres', kind }, fake)).toContain('/small-bodies/ceres/01.');
  });

  it('is null for a body with no thumb, an unknown id and an unknown kind', () => {
    expect(solarRowThumb({ id: 'psyche', kind: 'asteroid' }, fake)).toBeNull();
    expect(solarRowThumb({ id: 'mars', kind: 'moon' }, fake)).toBeNull();
    expect(solarRowThumb({ id: 'mars', kind: 'star' }, fake)).toBeNull();
  });
});

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

describe('the solar-system INDEX rows on the real manifest (T2)', () => {
  const planets = rj<{ planets: { name: string }[] }>('static/data/planets.json').planets;
  const small = rj<{ bodies: { id: string; type: string }[] }>(
    'static/data/small-bodies.json',
  ).bodies;
  const sats = rj<{ satellites: { id: string }[] }>('static/data/satellites.json').satellites;
  const belts = rj<{ belts: { id: string }[] }>('static/data/belts.json').belts;
  const NO_IMAGE = [
    'psyche',
    'arrokoth',
    'didymos',
    'dimorphos',
    'donaldjohanson',
    'eurybates',
    'polymele',
    'leucus',
    'orus',
    'patroclus',
    'menoetius',
  ];

  it('the Sun, every planet, every moon and both belts have a thumb', () => {
    expect(solarRowThumb({ id: 'sun', kind: 'sun' })).toBe('/credit-thumbs/images/sun/01.1x1.webp');
    for (const p of planets)
      expect(solarRowThumb({ id: p.name.toLowerCase(), kind: 'planet' }), p.name).not.toBeNull();
    for (const s of sats) expect(solarRowThumb({ id: s.id, kind: 'moon' }), s.id).not.toBeNull();
    for (const b of belts) expect(solarRowThumb({ id: b.id, kind: 'belt' }), b.id).not.toBeNull();
  });

  it('a small body has a thumb unless it has no image at all (the 11 that keep the dot)', () => {
    const planetIds = new Set(planets.map((p) => p.name.toLowerCase()));
    for (const b of small.filter((x) => !planetIds.has(x.id)))
      expect(solarRowThumb({ id: b.id, kind: b.type }) === null, b.id).toBe(
        NO_IMAGE.includes(b.id),
      );
  });

  it('a moon thumb is on its blessed slot (Io: 01; the crop was generated in T1)', () => {
    expect(solarRowThumb({ id: 'io', kind: 'moon' })).toBe(
      '/credit-thumbs/images/satellites/io/01.1x1.webp',
    );
  });
});

describe('the Worlds INDEX sites on the real manifest (T2)', () => {
  const ids = (file: string): string[] =>
    rj<{ id: string }[]>(`static/data/${file}`).map((s) => s.id);

  it('every moon, mars and venus site and every earth object has a thumb on disk', () => {
    const cases: [string, string[]][] = [
      ['moon', ids('moon-sites.json')],
      ['mars', ids('mars-sites.json')],
      ['venus', ids('venus-sites.json')],
      ['earth-objects', ids('earth-objects.json')],
    ];
    for (const [body, list] of cases)
      for (const id of list) {
        const path = thumbOfSite(body, id);
        expect(path, `${body}/${id}`).not.toBeNull();
        expect(existsSync(join('static', path as string)), `${body}/${id}: ${path}`).toBe(true);
      }
  });

  it('a site whose panel shows its mission shows the mission photo, on the mission blessed slot', () => {
    // Apollo 16 is blessed on slot 06 in missions-hero-overrides.json
    expect(thumbOfSite('moon', 'apollo16')).toContain('missions/apollo16/06.1x1.webp');
  });

  it('every launch pad is a fleet launch-site entry with a thumb', () => {
    const dir = 'static/data/fleet/launch-site';
    const pads = readdirSync(dir).map((f) => f.replace(/\.json$/, ''));
    expect(pads.length).toBe(42);
    for (const id of pads) expect(thumbOf('fleet', id), id).not.toBeNull();
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
