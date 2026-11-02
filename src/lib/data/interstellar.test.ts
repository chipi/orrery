import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { TRAJECTORY_IDS, hasTrajectory } from './interstellar';

describe('TRAJECTORY_IDS', () => {
  it('lists exactly the trajectory files (orbiter -tour layers excluded)', () => {
    const files = readdirSync('static/data/trajectories')
      .filter((f) => f.endsWith('.json') && !f.endsWith('-tour.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    expect([...TRAJECTORY_IDS].sort()).toEqual(files);
  });
  it('every id is a mission in the index', () => {
    const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
      id: string;
    }[];
    const ids = new Set(index.map((m) => m.id));
    expect(TRAJECTORY_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });
  it('hasTrajectory answers from the list', () => {
    expect(hasTrajectory('voyager-1')).toBe(true);
    expect(hasTrajectory('apollo-11')).toBe(false);
  });
});
