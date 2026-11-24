import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
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
