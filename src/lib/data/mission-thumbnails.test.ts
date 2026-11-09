import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// MissionPanel (FLIGHT tab) and the collectible card ask for /images/missions/thumbnails/<id>.webp
// for EVERY mission; scripts/render-mission-thumbnails.ts draws one for each (a labelled placeholder
// where there is no orbit data). This keeps the files equal to the mission list, so no request 404s.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) return walk(p);
    return f.endsWith('.json') && f !== 'index.json' ? [p] : [];
  });

describe('mission trajectory thumbnails', () => {
  it('exist exactly for the missions, as 736 x 414 WebP, and no stale PNG is left', () => {
    const ids = walk('static/data/missions')
      .map((f) => (JSON.parse(readFileSync(f, 'utf8')) as { id: string }).id)
      .sort();
    const files = readdirSync('static/images/missions/thumbnails');
    expect(files.filter((f) => !f.endsWith('.webp'))).toEqual([]);
    expect(files.map((f) => f.replace(/\.webp$/, '')).sort()).toEqual(ids);
  });
  it('are in the image ladder at their one width', () => {
    const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8')) as Record<
      string,
      number[]
    >;
    const ids = readdirSync('static/images/missions/thumbnails').map((f) => f.replace(/\.webp$/, ''));
    const wrong = ids.filter(
      (id) => (ladder[`/images/missions/thumbnails/${id}`] ?? []).join() !== '736',
    );
    expect(wrong).toEqual([]);
  });
});
