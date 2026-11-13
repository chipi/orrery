import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { MANIFEST_PATH, buildEntityThumbs, serialize } from './build-entity-thumbs';

const root = mkdtempSync(join(tmpdir(), 'entity-thumbs-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const touch = (rel: string) => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), 'x');
};

// fleet: lro blessed 03 (thumb built), dawn slot 01 (thumb built), new1 slot 01 with a crop and no
// thumb, newer slot 01 with only a master, bare slot 01 with nothing. missions: an id with no thumb.
touch('static/images/fleet-galleries/lro/01.webp');
touch('static/credit-thumbs/images/fleet-galleries/lro/03.1x1.webp');
touch('static/credit-thumbs/images/fleet-galleries/lro/01.1x1.webp');
touch('static/images/fleet-galleries/dawn/01.1x1.jpg');
touch('static/credit-thumbs/images/fleet-galleries/dawn/01.1x1.webp');
touch('static/images/fleet-galleries/new1/01.1x1.jpg');
touch('static/images/fleet-galleries/newer/01.webp');
touch('masters/fleet-galleries/newer/01.jpg');
touch('static/images/fleet-galleries/bare/01.webp');
touch('static/images/fleet-galleries/not-a-gallery/readme.txt');
touch('static/images/sun/01.1x1.jpg');
touch('static/credit-thumbs/images/sun/01.1x1.webp');
mkdirSync(join(root, 'static/data'), { recursive: true });
writeFileSync(
  join(root, 'static/data/fleet-hero-overrides.json'),
  JSON.stringify({ overrides: { lro: { slot: '03.jpg' } } }),
);
for (const s of [
  'missions',
  'planets',
  'small-bodies',
  'satellites',
  'belts',
  'earth-objects',
  'moon-sites',
  'mars-sites',
  'iss-modules',
  'tiangong-modules',
])
  mkdirSync(join(root, 'static/images', s), { recursive: true });

describe('buildEntityThumbs', () => {
  const { manifest, missing } = buildEntityThumbs(root);

  it('lists the blessed slot of an entity whose thumb exists: the override, else 01', () => {
    expect(manifest.surfaces.fleet.slots).toEqual({ lro: '03', dawn: '01' });
    expect(manifest.surfaces.fleet.dir).toBe('fleet-galleries');
  });

  it('puts an entity without a blessed-slot thumb in none, not in slots', () => {
    expect(manifest.surfaces.fleet.none).toEqual(['bare', 'new1', 'newer']);
  });

  it('skips a folder with no numbered image', () => {
    expect(Object.keys(manifest.surfaces.fleet.slots)).not.toContain('not-a-gallery');
    expect(manifest.surfaces.fleet.none).not.toContain('not-a-gallery');
  });

  it('treats the Sun as a flat surface with the id of its key', () => {
    expect(manifest.surfaces.sun).toEqual({
      dir: 'sun',
      flat: true,
      slots: { sun: '01' },
      none: [],
    });
  });

  it('reports what the generators still have to build, crop first', () => {
    expect(missing.needThumb).toEqual(['/images/fleet-galleries/new1/01.1x1.jpg']);
    expect(missing.need1x1).toEqual(['masters/fleet-galleries/newer/01.jpg']);
  });
});

describe('the committed manifest', () => {
  it('is what the builder writes from the repo (rerun npx tsx scripts/build-entity-thumbs.ts)', () => {
    expect(readFileSync(MANIFEST_PATH, 'utf8')).toBe(serialize(buildEntityThumbs().manifest));
  });
});
