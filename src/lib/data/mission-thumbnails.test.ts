import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// MissionPanel (FLIGHT tab) and the collectible card ask for /images/missions/thumbnails/<id>.webp
// (panel) and /images/missions/thumbnails/card/<id>.webp (the card's label-free 4:3 crop) for EVERY
// mission; scripts/render-mission-thumbnails.ts draws both for each (a placeholder where there is no
// orbit data). This keeps the files equal to the mission list, so no request 404s.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) return walk(p);
    return f.endsWith('.json') && f !== 'index.json' ? [p] : [];
  });

const DIR = 'static/images/missions/thumbnails';
const ids = walk('static/data/missions')
  .map((f) => (JSON.parse(readFileSync(f, 'utf8')) as { id: string }).id)
  .sort();
const stems = (dir: string) =>
  readdirSync(dir)
    .filter((f) => f !== 'card')
    .map((f) => f.replace(/\.webp$/, ''))
    .sort();

describe('mission trajectory thumbnails', () => {
  it('exist exactly for the missions, as 736 x 414 WebP, and no stale PNG is left', () => {
    expect(readdirSync(DIR).filter((f) => f !== 'card' && !f.endsWith('.webp'))).toEqual([]);
    expect(stems(DIR)).toEqual(ids);
  });
  it('have a card crop for exactly the missions, WebP only', () => {
    expect(readdirSync(`${DIR}/card`).filter((f) => !f.endsWith('.webp'))).toEqual([]);
    expect(stems(`${DIR}/card`)).toEqual(ids);
  });
  it('are in the image ladder at their one width', () => {
    const ladder = JSON.parse(readFileSync('static/data/image-ladder.json', 'utf8')) as Record<
      string,
      number[]
    >;
    const wrong = [
      ...ids.filter((id) => (ladder[`/images/missions/thumbnails/${id}`] ?? []).join() !== '736'),
      ...ids.filter(
        (id) => (ladder[`/images/missions/thumbnails/card/${id}`] ?? []).join() !== '420',
      ),
    ];
    expect(wrong).toEqual([]);
  });
});
