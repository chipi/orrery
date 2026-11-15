import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EPOCH_BANDS } from './epoch-bands';
import { ERA_FLAGSHIP } from './era-flagships';

const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
  id: string;
}[];
const overrides = (
  JSON.parse(readFileSync('static/data/missions-hero-overrides.json', 'utf8')) as {
    overrides: Record<string, { slot: string }>;
  }
).overrides;

describe('era flagship photos', () => {
  it('names one mission for each of the nine eras', () => {
    expect(Object.keys(ERA_FLAGSHIP).sort()).toEqual(EPOCH_BANDS.map((b) => b.id).sort());
  });

  it.each(Object.entries(ERA_FLAGSHIP))(
    '%s: %s is a mission with a shipped hero image',
    (_, id) => {
      expect(index.some((m) => m.id === id)).toBe(true);
      const slot = (overrides[id]?.slot ?? '01.jpg').replace(/\.\w+$/, '');
      expect(existsSync(`static/images/missions/${id}/${slot}.webp`)).toBe(true);
    },
  );
});
