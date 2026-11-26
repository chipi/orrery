import { describe, expect, it } from 'vitest';
import { trajectoryType } from './trajectory-type';

const base = { isMoonMission: false, isFreeReturn: false, activeDestination: 'mars' };

describe('trajectoryType', () => {
  it('an Earth flight with a coast entry: Earth orbit, or suborbital', () => {
    expect(trajectoryType({ ...base, earthCoast: {}, dest: 'EARTH', isMoonMission: true })).toBe(
      'earth-orbit',
    );
    expect(
      trajectoryType({
        ...base,
        earthCoast: { suborbital: true },
        dest: 'EARTH',
        isMoonMission: true,
      }),
    ).toBe('suborbital');
  });

  // Sputnik 1 and STS-107 have no coast entry; the Earth-centred scene set isMoonMission and the
  // HUD called them a cislunar transfer.
  it('an Earth flight with no coast entry is still Earth orbit, not cislunar', () => {
    expect(trajectoryType({ ...base, earthCoast: null, dest: 'EARTH', isMoonMission: true })).toBe(
      'earth-orbit',
    );
  });

  it('Moon and interplanetary flights keep their regimes', () => {
    expect(trajectoryType({ ...base, earthCoast: null, dest: 'MOON', isMoonMission: true })).toBe(
      'cislunar',
    );
    expect(
      trajectoryType({
        ...base,
        earthCoast: null,
        dest: 'MOON',
        isMoonMission: true,
        isFreeReturn: true,
      }),
    ).toBe('cislunar-free-return');
    expect(
      trajectoryType({ ...base, earthCoast: null, dest: 'JUPITER', activeDestination: 'jupiter' }),
    ).toBe('helio-flyby');
    expect(trajectoryType({ ...base, earthCoast: null, dest: 'MARS' })).toBe('helio-hohmann');
    expect(trajectoryType({ ...base, earthCoast: null, dest: 'MARS', isFreeReturn: true })).toBe(
      'helio-free-return',
    );
    // Sun missions fly their own orbit (Parker, Solar Orbiter, the Roadster); Ulysses aims at Jupiter.
    expect(
      trajectoryType({ ...base, earthCoast: null, dest: 'SUN', activeDestination: 'mars' }),
    ).toBe('helio-orbit');
    expect(
      trajectoryType({ ...base, earthCoast: null, dest: 'SUN', activeDestination: 'jupiter' }),
    ).toBe('helio-flyby');
  });
});
