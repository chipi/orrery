import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FLY_TRAJECTORY_IDS, flyTrajectoryPath } from './interstellar';
import { labelToPlanetId } from '$lib/fly-mission-apply';

const DATA = join(process.cwd(), 'static/data');

describe('/fly trajectories', () => {
  it('resolve /explore paths, /fly-only paths and aliases', () => {
    expect(flyTrajectoryPath('cassini')).toBe('trajectories/cassini.json');
    expect(flyTrajectoryPath('huygens')).toBe('trajectories/cassini.json');
    expect(flyTrajectoryPath('messenger')).toBe('fly-trajectories/messenger.json');
    expect(flyTrajectoryPath('curiosity')).toBeNull();
  });

  it('every /fly-only trajectory exists and passes its flyby bodies in date order', () => {
    for (const id of FLY_TRAJECTORY_IDS) {
      const path = join(DATA, flyTrajectoryPath(id)!);
      expect(existsSync(path), id).toBe(true);
      const { waypoints } = JSON.parse(readFileSync(path, 'utf8')) as {
        waypoints: { date: string; label?: string }[];
      };
      const dates = waypoints.map((w) => w.date);
      expect([...dates].sort(), id).toEqual(dates);
      const labelled = waypoints.filter((w) => w.label);
      expect(labelled.length, id).toBeGreaterThanOrEqual(3);
      for (const w of labelled) expect(labelToPlanetId(w.label!), `${id} ${w.label}`).not.toBeNull();
    }
  });
});
