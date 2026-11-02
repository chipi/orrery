import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// MissionPanel shows the FLIGHT-tab trajectory thumbnail only when the mission has flight
// data; this keeps that equal to the thumbnails fetch-assets renders, so no mission asks for
// a thumbnail that is not there (the request 404ed for 41 missions on prod).
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    if (statSync(p).isDirectory()) return walk(p);
    return f.endsWith('.json') && f !== 'index.json' ? [p] : [];
  });

describe('mission trajectory thumbnails', () => {
  it('exist exactly for the missions with flight data', () => {
    const withFlight = walk('static/data/missions')
      .map((f) => JSON.parse(readFileSync(f, 'utf8')) as { id: string; flight?: unknown })
      .filter((m) => m.flight != null)
      .map((m) => m.id)
      .sort();
    const thumbs = readdirSync('static/images/missions/thumbnails')
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, ''))
      .sort();
    expect(thumbs).toEqual(withFlight);
  });
});
