import { describe, expect, it } from 'vitest';
import { DESTINATIONS, MOON_MISSION_DEST_IDS } from '$lib/physics/transfer/lambert-grid.constants';
import { missionDestToHeliocentricDestinationId } from '$lib/mission-dest';
import { MOONS } from '$lib/moon-transfer.constants';
import { PLAN_DESTINATION_IDS } from './destinations';
import {
  genericPayloadLine,
  moonFlightName,
  resolvePlanFlightDestination,
} from './flight-destination';

describe('resolvePlanFlightDestination (/fly?dest= from /plan)', () => {
  it('resolves every one of the 22 plan destinations, none falls through to the demo', () => {
    for (const id of PLAN_DESTINATION_IDS) {
      expect(resolvePlanFlightDestination(id), id).not.toBeNull();
    }
  });

  it('keeps the geocentric Moon on the cislunar path, dest MOON', () => {
    expect(resolvePlanFlightDestination('moon')).toEqual({ kind: 'moon', missionDest: 'MOON' });
  });

  it('flies a heliocentric destination as itself', () => {
    expect(resolvePlanFlightDestination('mars')).toEqual({
      kind: 'planet',
      dest: 'mars',
      missionDest: 'MARS',
    });
    expect(resolvePlanFlightDestination('bennu')).toMatchObject({
      dest: 'bennu',
      missionDest: 'BENNU',
    });
    expect(resolvePlanFlightDestination('pluto')).toMatchObject({
      dest: 'pluto',
      missionDest: 'PLUTO',
    });
  });

  it.each(MOON_MISSION_DEST_IDS)('%s flies its host planet’s arc and names the moon', (id) => {
    const host = MOONS.find((m) => m.id === id)!.host;
    expect(DESTINATIONS).toHaveProperty(host);
    const r = resolvePlanFlightDestination(id);
    expect(r).toEqual({
      kind: 'planet',
      dest: host,
      missionDest: host.toUpperCase(),
      targetMoon: id,
    });
  });

  it('Europa is on the Jupiter arc', () => {
    expect(resolvePlanFlightDestination('europa')).toMatchObject({
      dest: 'jupiter',
      targetMoon: 'europa',
    });
  });

  it('every missionDest maps back to the heliocentric destination the arc flies', () => {
    for (const id of PLAN_DESTINATION_IDS) {
      const r = resolvePlanFlightDestination(id)!;
      if (r.kind === 'planet') {
        expect(missionDestToHeliocentricDestinationId(r.missionDest), id).toBe(r.dest);
      } else {
        expect(r.missionDest).toBe('MOON');
      }
    }
  });

  it('refuses what /plan does not list, case-insensitively accepting what it does', () => {
    expect(resolvePlanFlightDestination('halley')).toBeNull();
    expect(resolvePlanFlightDestination('')).toBeNull();
    expect(resolvePlanFlightDestination('EUROPA')).toMatchObject({ targetMoon: 'europa' });
  });
});

describe('moonFlightName', () => {
  it('names the moon as the target, via its host', () => {
    expect(moonFlightName('europa', 'LANDING')).toBe('EARTH → EUROPA via JUPITER · LANDING');
    expect(moonFlightName('titan', 'FLYBY')).toBe('EARTH → TITAN via SATURN · FLYBY');
  });
});

describe('genericPayloadLine', () => {
  it('labels the spacecraft with the mass the ascent integrates', () => {
    expect(genericPayloadLine('Generic spacecraft', 6065)).toBe('Generic spacecraft · 6065 kg');
    expect(genericPayloadLine('Generic spacecraft', 26500.4)).toBe('Generic spacecraft · 26500 kg');
  });
});
