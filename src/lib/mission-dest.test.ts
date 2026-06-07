import { describe, it, expect } from 'vitest';
import {
  isMissionDestination,
  MISSION_CATALOG_DESTS,
  missionDestToDataFolder,
  missionDestToHeliocentricDestinationId,
} from './mission-dest';

describe('mission-dest (3.0a-5)', () => {
  it('isMissionDestination recognises the extended enum', () => {
    expect(isMissionDestination('MARS')).toBe(true);
    expect(isMissionDestination('JUPITER')).toBe(true);
    // #306 A.2 — VENUS / SATURN / MERCURY / URANUS added to the
    // catalogue. VENUS still has no mission file but the enum accepts it.
    expect(isMissionDestination('VENUS')).toBe(true);
    expect(isMissionDestination('SATURN')).toBe(true);
    expect(isMissionDestination('MERCURY')).toBe(true);
    // #306 expansion (2026-06-07) — non-planetary targets for the
    // global iconic-missions roster (Rosetta + Giotto comets,
    // Hayabusa asteroid, Ulysses polar Sun).
    expect(isMissionDestination('COMET')).toBe(true);
    expect(isMissionDestination('ASTEROID')).toBe(true);
    expect(isMissionDestination('SUN')).toBe(true);
    expect(isMissionDestination('NEPHEW')).toBe(false);
  });

  it('maps every catalogue dest to a data folder slug', () => {
    for (const d of MISSION_CATALOG_DESTS) {
      expect(missionDestToDataFolder(d)).toBe(d.toLowerCase());
    }
  });

  it('maps heliocentric missions to porkchop DestinationId; Moon is null', () => {
    expect(missionDestToHeliocentricDestinationId('MARS')).toBe('mars');
    expect(missionDestToHeliocentricDestinationId('MOON')).toBeNull();
    expect(missionDestToHeliocentricDestinationId('JUPITER')).toBe('jupiter');
    expect(missionDestToHeliocentricDestinationId('NEPTUNE')).toBe('neptune');
    expect(missionDestToHeliocentricDestinationId('PLUTO')).toBe('pluto');
    expect(missionDestToHeliocentricDestinationId('CERES')).toBe('ceres');
  });
});
