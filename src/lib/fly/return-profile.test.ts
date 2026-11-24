import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  descentDue,
  expandReturnProfile,
  formatGet,
  hasReturnProfile,
  isValidReturnProfile,
  parseGet,
  type ReturnProfileRaw,
} from './return-profile';

const DIR = resolve(process.cwd(), 'static/data/return-profiles');
const load = (f: string): ReturnProfileRaw => JSON.parse(readFileSync(resolve(DIR, f), 'utf-8'));

describe('parseGet / formatGet', () => {
  it('reads the mission report GET notation', () => {
    expect(parseGet('124:22:00.8')).toBeCloseTo(124 * 3600 + 22 * 60 + 0.8, 6);
    expect(parseGet('128:03:00')).toBe(128 * 3600 + 180);
    expect(parseGet('12:3:00')).toBeNull();
    expect(parseGet('124:60:00')).toBeNull();
    expect(parseGet(5)).toBeNull();
  });
  it('round-trips through the HUD clock', () => {
    expect(formatGet(parseGet('135:23:42.3')!)).toBe('135:23:42.3');
    expect(formatGet(parseGet('124:22:00.8')!)).toBe('124:22:00.8');
  });
});

describe('every shipped return profile', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
  it('has at least Apollo 11', () => expect(files).toContain('apollo11.json'));
  it.each(files)('%s validates, and is registered by its file name', (f) => {
    const raw = load(f);
    expect(isValidReturnProfile(raw)).toBe(true);
    expect(f).toBe(`${raw.missionId}.json`);
    expect(hasReturnProfile(raw.missionId)).toBe(true);
    expect(raw.provenance.length).toBeGreaterThan(0);
    expect(raw.provenance.every((p) => p.u.startsWith('https://'))).toBe(true);
  });
});

describe('Apollo 11 figures (Mission Report MSC-00171)', () => {
  const p = expandReturnProfile(load('apollo11.json'));
  it('carries the sourced times and burns', () => {
    expect(p.liftoffS).toBeCloseTo(447720.8, 3);
    expect(p.dockingS).toBe(128 * 3600 + 180);
    expect(p.jettisonS).toBeCloseTo(130 * 3600 + 9 * 60 + 31.2, 3);
    expect(p.tei.burnS).toBe(151.4);
    expect(p.tei.dvFts).toBe(3279.0);
    expect(p.ascentBurnS).toBe(434.9);
    expect(p.insertionS - p.liftoffS).toBeCloseTo(434.9, 0);
  });
  it('resumes the cruise at TEI = 5.64 d, the mission file TEI event', () => {
    expect(p.teiMetDays).toBeCloseTo(5.64, 2);
  });
  it('range zero is 13:32:00 UTC, 16 July 1969', () => {
    expect(p.launchZeroUtc).toBe('1969-07-16T13:32:00Z');
  });
});

describe('isValidReturnProfile fails closed', () => {
  const good = load('apollo11.json');
  it('rejects non-objects and missing fields', () => {
    expect(isValidReturnProfile(null)).toBe(false);
    expect(isValidReturnProfile({})).toBe(false);
    expect(isValidReturnProfile({ ...good, tei: undefined })).toBe(false);
  });
  it('rejects a GET that is not in flight order', () => {
    expect(isValidReturnProfile({ ...good, docking: '120:00:00' })).toBe(false);
  });
  it('rejects a malformed GET and a wrong rendezvous list', () => {
    expect(isValidReturnProfile({ ...good, liftoff: 'noon' })).toBe(false);
    expect(isValidReturnProfile({ ...good, rendezvous: good.rendezvous.slice(1) })).toBe(false);
  });
});

describe('descentDue: which descent act the cruise is at the gate of', () => {
  const base = { landingDay: 5.2, arrDay: 8.13, wayHomeDone: false, hasSplashdown: true };
  it('a mission without a way home lands at its landing day, exactly as before', () => {
    expect(descentDue({ ...base, simDay: 5.19, hasSplashdown: false })).toBeNull();
    expect(descentDue({ ...base, simDay: 5.2, hasSplashdown: false })).toBe('landing');
    expect(descentDue({ ...base, simDay: 6, hasSplashdown: false })).toBe('landing');
  });
  it('before the way home is done only the lunar landing is due, never the splashdown', () => {
    expect(descentDue({ ...base, simDay: 8.2 })).toBe('landing');
  });
  it('after the way home the cruise runs on to the Earth return, then splashes down', () => {
    expect(descentDue({ ...base, simDay: 5.64, wayHomeDone: true })).toBeNull();
    expect(descentDue({ ...base, simDay: 8.12, wayHomeDone: true })).toBeNull();
    expect(descentDue({ ...base, simDay: 8.13, wayHomeDone: true })).toBe('splashdown');
    expect(descentDue({ ...base, simDay: 9, wayHomeDone: true })).toBe('splashdown');
  });
  it('a way home with no splashdown profile ends at arrival, as it did', () => {
    expect(
      descentDue({ ...base, simDay: 8.13, wayHomeDone: true, hasSplashdown: false }),
    ).toBeNull();
  });
  it('scrubbing back to the landing re-arms it, even after the way home was done', () => {
    expect(descentDue({ ...base, simDay: 5.2, wayHomeDone: true })).toBe('landing');
    expect(descentDue({ ...base, simDay: 5.1, wayHomeDone: true })).toBeNull();
  });
  it('an Earth-return capsule (landing day == arrival) lands, never splashes down twice', () => {
    expect(
      descentDue({ simDay: 3, landingDay: 3, arrDay: 3, wayHomeDone: false, hasSplashdown: false }),
    ).toBe('landing');
  });
});

describe('the Apollo 11 splashdown link', () => {
  const raw = load('apollo11.json');
  const sp = JSON.parse(
    readFileSync(
      resolve(process.cwd(), 'static/data/descent-profiles/apollo11-splashdown.json'),
      'utf-8',
    ),
  );
  it('names a splashdown profile that exists, is Earth, and is not its own mission landing', () => {
    expect(raw.splashdownProfile).toBe('apollo11-splashdown');
    expect(sp.body).toBe('earth');
    expect(sp.missionId).toBe('apollo11');
    expect(sp.siteId).toBe('apollo11-splashdown'); // apollo11 stays the lunar landing's site id
  });
  it('carries the Mission Report entry state', () => {
    expect(sp.entryState.altitudeM).toBe(122000);
    expect(sp.entryState.velocityMs).toBeCloseTo(36194.4 * 0.3048, 0);
    expect(sp.entryState.flightPathAngleDeg).toBe(6.48);
    expect(sp.entryMassKg).toBeCloseTo(12095.5 * 0.45359237, -1);
    expect(sp.landingSite).toEqual({ lat: 13.3, lon: -169.15 });
  });
});
