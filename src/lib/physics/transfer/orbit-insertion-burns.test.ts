import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ORBIT_INSERTION_BURNS, orbitInsertionBurn } from './orbit-insertion-burns';

const MISSIONS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../static/data/missions',
);

function missionJson(
  id: string,
): { flight?: { arrival?: { orbit_insertion_dv_km_s?: number } } } | null {
  for (const dir of readdirSync(MISSIONS)) {
    const f = resolve(MISSIONS, dir, `${id}.json`);
    if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf-8'));
  }
  return null;
}

describe('orbit-insertion burns', () => {
  it.each(Object.keys(ORBIT_INSERTION_BURNS))(
    '%s is a mission with a capture Δv, so its burn plays',
    (id) => {
      const dv = missionJson(id)?.flight?.arrival?.orbit_insertion_dv_km_s;
      expect(dv).toBeGreaterThan(0);
    },
  );

  it('every burn names its engine and cites a source', () => {
    for (const b of Object.values(ORBIT_INSERTION_BURNS)) {
      expect(b.engine.length).toBeGreaterThan(0);
      expect(b.sources.length).toBeGreaterThan(0);
      if (b.durationS != null) expect(b.durationS).toBeGreaterThan(0);
    }
  });

  it('resolves unknown missions to null', () => {
    expect(orbitInsertionBurn('dawn')).toBeNull();
    expect(orbitInsertionBurn(undefined)).toBeNull();
    expect(orbitInsertionBurn('cassini')?.engine).toBe('R-4D');
  });
});
