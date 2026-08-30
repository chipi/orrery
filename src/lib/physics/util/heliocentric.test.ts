import { describe, it, expect } from 'vitest';
import { helioModel, synodicPeriodS } from './heliocentric';

const DAY = 86_400;

describe('helioModel', () => {
  it('Earth orbits the Sun in ~365 days', () => {
    expect(helioModel('earth')!.orbitalPeriodS / DAY).toBeCloseTo(365, 0);
  });

  it('Mars orbits in ~687 days (1.88 years)', () => {
    expect(helioModel('mars')!.orbitalPeriodS / DAY).toBeCloseTo(687, -1);
  });

  it('an untabulated body resolves to undefined (caller fails honest)', () => {
    expect(helioModel('pluto')).toBeUndefined();
    expect(helioModel('moon')).toBeUndefined();
  });
});

describe('synodicPeriodS — the launch-window recurrence', () => {
  it('Earth ↔ Mars line up every ~780 days (~26 months)', () => {
    const earth = helioModel('earth')!.orbitalPeriodS;
    const mars = helioModel('mars')!.orbitalPeriodS;
    expect(synodicPeriodS(earth, mars) / DAY).toBeCloseTo(780, -1);
  });

  it('equal periods never realign (infinite synodic)', () => {
    expect(synodicPeriodS(1000, 1000)).toBe(Infinity);
  });
});
