import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  FLY_TRAJECTORY_IDS,
  TRAJECTORY_IDS,
  flyTrajectoryPath,
  hasTrajectory,
} from './fly-trajectory-ids';

describe('fly-trajectory-ids (pure module)', () => {
  it('has no SvelteKit or app-data imports, so tsx scripts can load it', () => {
    const src = readFileSync('src/lib/fly-trajectory-ids.ts', 'utf8');
    expect(src).not.toMatch(/^import /m);
  });
  it('flyTrajectoryPath prefers fly-trajectories, aliases Huygens, skips direct transfers', () => {
    expect(flyTrajectoryPath('voyager-2')).toBe('fly-trajectories/voyager-2.json');
    expect(flyTrajectoryPath('huygens')).toBe('fly-trajectories/cassini.json');
    expect(flyTrajectoryPath('pioneer-10')).toBeNull();
    expect(flyTrajectoryPath('perseverance')).toBeNull();
  });
  it('every path it returns exists on disk', () => {
    for (const id of [...TRAJECTORY_IDS, ...FLY_TRAJECTORY_IDS]) {
      const p = flyTrajectoryPath(id);
      if (p) expect(existsSync(`static/data/${p}`), p).toBe(true);
    }
  });
  it('hasTrajectory matches the trajectories folder', () => {
    const files = readdirSync('static/data/trajectories').filter(
      (f) => f.endsWith('.json') && !f.endsWith('-tour.json'),
    );
    for (const f of files) expect(hasTrajectory(f.replace(/\.json$/, ''))).toBe(true);
  });
});
