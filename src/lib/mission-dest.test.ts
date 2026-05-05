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
    expect(isMissionDestination('VENUS')).toBe(false);
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
