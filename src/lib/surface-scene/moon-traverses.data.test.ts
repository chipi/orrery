import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface MoonTraverse {
  rover_id: string;
  credit: string;
  points: Array<[number, number]>;
  approximate?: boolean;
  point_sols?: number[];
  last_sol?: number;
}

const DIR = 'static/data/moon-traverses';
const files = readdirSync(DIR).filter(
  (f) => f.endsWith('.json') && !f.includes('.route-patches.') && !f.includes('.route-photos.'),
);
const traverses = files.map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as MoonTraverse);

describe('Moon traverse files (UXD-044)', () => {
  it('has all eight routes', () => {
    expect(traverses.map((t) => t.rover_id).sort()).toEqual([
      'apollo15',
      'apollo16',
      'apollo17',
      'chandrayaan3',
      'change3',
      'change4',
      'luna17',
      'luna21',
    ]);
  });

  it('every route has at least two points and a credit', () => {
    for (const t of traverses) {
      expect(t.points.length, t.rover_id).toBeGreaterThanOrEqual(2);
      expect(t.credit.length, t.rover_id).toBeGreaterThan(20);
    }
  });

  it('no Moon route invents time: no sols, no last sol', () => {
    for (const t of traverses) {
      expect(t.point_sols, t.rover_id).toBeUndefined();
      expect(t.last_sol, t.rover_id).toBeUndefined();
    }
  });

  it('the 9-point polylines are flagged approximate and say so; mapped tracks are not flagged', () => {
    for (const t of traverses) {
      if (t.points.length <= 9) {
        expect(t.approximate, t.rover_id).toBe(true);
        expect(t.credit, t.rover_id).toMatch(/Approximate route/);
      } else {
        expect(t.approximate, t.rover_id).toBeUndefined();
      }
    }
  });
});
