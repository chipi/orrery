import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS, epochForYear } from './epoch-bands';
import {
  ERA_PHOTO,
  ERA_SUBJECT_AT,
  ERA_TILE_HEIGHT,
  eraPhotoPath,
  eraPhotoPlacement,
} from './era-flagships';

const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
  id: string;
  year: number;
}[];

// Picks that are not a mission of the era's own years: a station photo, a Starship photo (the
// only mission of Mars Era is a render), and the Artemis I pad at night (the strongest SLS image).
const NOT_BY_YEAR = ['iss-assembly', 'mars-era', 'lunar-return'];

describe('era tile photos', () => {
  it('names one image for each of the nine eras', () => {
    expect(Object.keys(ERA_PHOTO).sort()).toEqual(EPOCH_BANDS.map((b) => b.id).sort());
  });

  it.each(Object.entries(ERA_PHOTO))('%s: the ladder rung of %o exists', (_, p) => {
    expect(existsSync(`static${eraPhotoPath(p)}`)).toBe(true);
  });

  it.each(Object.entries(ERA_PHOTO))(
    '%s: the subject lands on the end side and the picture is tall enough to fill the tile',
    (_, p) => {
      const place = eraPhotoPlacement(p);
      expect(parseFloat(place.height)).toBeGreaterThanOrEqual(ERA_TILE_HEIGHT);
      // the picture covers the tile's full height: no empty band above or below it
      const top = parseFloat(place.top);
      expect(top).toBeLessThanOrEqual(0);
      expect(top + parseFloat(place.height)).toBeGreaterThanOrEqual(ERA_TILE_HEIGHT);
      expect(place.leftLtr).toContain(`${(ERA_SUBJECT_AT[0] * 100).toFixed(1)}%`);
    },
  );

  it.each(Object.entries(ERA_PHOTO).filter(([, p]) => p.dir === 'missions'))(
    '%s: a mission of the index',
    (_, p) => {
      expect(index.some((m) => m.id === p.id)).toBe(true);
    },
  );

  it.each(Object.entries(ERA_PHOTO).filter(([era]) => !NOT_BY_YEAR.includes(era)))(
    '%s: the mission sits inside the era by the bucketing the strip counts with',
    (era, p) => {
      const m = index.find((x) => x.id === p.id)!;
      expect(epochForYear(m.year)).toBe(era);
    },
  );
});
