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

describe('Apollo 12 and 14 figures (mission reports, SP-4029)', () => {
  const a12 = expandReturnProfile(load('apollo12.json'));
  const a14 = expandReturnProfile(load('apollo14.json'));
  it('Apollo 12 flew the Apollo 11 sequence: CSI, CDH, TPI, TPF', () => {
    expect(a12.rendezvous.map((r) => r.id)).toEqual(['csi', 'cdh', 'tpi', 'tpf']);
    expect(a12.liftoffS).toBe(142 * 3600 + 3 * 60 + 48);
    expect(a12.dockingS).toBe(145 * 3600 + 36 * 60 + 20);
    expect(a12.tei.dvFts).toBe(3042.0);
    expect(a12.teiMetDays).toBeCloseTo(7.186, 2); // the mission file's tei event
  });
  it('Apollo 14 flew a direct rendezvous (vernier, TPI by APS, TPF), on the Mission Report clock', () => {
    expect(a14.rendezvous.map((r) => r.id)).toEqual(['vernier', 'tpi', 'tpf']);
    expect(a14.rendezvous.find((r) => r.id === 'tpi')?.engine).toBe('aps');
    expect(a14.liftoffS).toBe(141 * 3600 + 45 * 60 + 40);
    expect(a14.dockingS).toBeCloseTo(143 * 3600 + 32 * 60 + 50.5, 3);
    expect(a14.tei.burnS).toBe(149.2);
    expect(a14.teiMetDays).toBeCloseTo(6.192, 2); // the mission file's tei event, not the Journal clock (+40:03)
  });
  it('names a splashdown profile that exists, is Earth and carries the SP-4029 L/D and range', () => {
    const read = (id: string) =>
      JSON.parse(
        readFileSync(resolve(process.cwd(), `static/data/descent-profiles/${id}.json`), 'utf-8'),
      );
    for (const [p, ld, nmi, fpa] of [
      [a12, 0.309, 1250, 6.48],
      [a14, 0.28, 1234, 6.37],
    ] as const) {
      const sp = read(p.splashdownProfile!);
      expect(sp.body).toBe('earth');
      expect(sp.siteId).toBe(p.splashdownProfile);
      expect(sp.missionId).toBe(p.missionId);
      expect(sp.liftToDragRatio).toBe(ld);
      expect(sp.targetDownrangeKm).toBeCloseTo(nmi * 1.852, 0);
      expect(sp.entryState.flightPathAngleDeg).toBe(fpa);
    }
  });
});

describe('Apollo 15, 16 and 17 figures (mission reports, SP-4029)', () => {
  const read = (path: string) =>
    JSON.parse(readFileSync(resolve(process.cwd(), `static/data/${path}.json`), 'utf-8'));
  const missionEvents = (id: string) => read(`missions/moon/${id}`).flight.events;
  const a15 = expandReturnProfile(load('apollo15.json'));
  const a16 = expandReturnProfile(load('apollo16.json'));
  const a17 = expandReturnProfile(load('apollo17.json'));
  it('record the burns each flew: a bare direct rendezvous, one with a vernier, one preceded by two CSM burns', () => {
    expect(a15.rendezvous.map((r) => r.id)).toEqual(['tpi', 'tpf']);
    expect(a16.rendezvous.map((r) => r.id)).toEqual(['vernier', 'tpi', 'tpf']);
    expect(a17.rendezvous.map((r) => r.id)).toEqual(['trim', 'plane', 'vernier', 'tpi', 'tpf']);
    expect(a15.rendezvous[0]).toMatchObject({ burnS: 2.6, dvFts: 72.7, engine: 'aps' });
    expect(a16.rendezvous[1]).toMatchObject({ burnS: 2.5, dvFts: 78, engine: 'aps' });
    expect(a17.rendezvous[0]).toMatchObject({ burnS: 37, dvFts: 9.2 });
    expect(a17.rendezvous[1]).toMatchObject({ dvFts: 366, engine: 'sps' }); // SPS, not RCS
    expect(a17.rendezvous[2]).toMatchObject({ burnS: 10, dvFts: 10 });
    expect(a17.rendezvous[3]).toMatchObject({ burnS: 3.2, dvFts: 53.8, engine: 'aps' });
    expect(a17.csmOrbitNmi).toEqual([62.8, 62.5]);
    expect(a17.rendezvousS.trim!).toBeLessThan(a17.liftoffS);
    expect(a17.rendezvousS.plane!).toBeLessThan(a17.liftoffS);
  });
  it('carry the sourced liftoff, docking, jettison, subsatellite and TEI times', () => {
    expect(a15.liftoffS).toBeCloseTo(171 * 3600 + 37 * 60 + 23.2, 3);
    expect(a15.dockingS).toBeCloseTo(173 * 3600 + 36 * 60 + 25.5, 3);
    expect(a15.jettisonS).toBeCloseTo(179 * 3600 + 30 * 60 + 1.4, 3);
    expect(a15.subsatS).toBeCloseTo(222 * 3600 + 39 * 60 + 29.1, 3);
    expect(a15.tei).toEqual({ get: '223:48:45.84', burnS: 140.9, dvFts: 3046.8 });
    expect(a16.liftoffS).toBeCloseTo(175 * 3600 + 31 * 60 + 47.9, 3);
    expect(a16.subsatS).toBe(196 * 3600 + 2 * 60 + 9);
    expect(a16.tei).toEqual({ get: '200:21:33.07', burnS: 162.29, dvFts: 3370.9 });
    expect(a16.jMission?.jettisonTumble).toBe(true);
    expect(a17.liftoffS).toBe(185 * 3600 + 21 * 60 + 37);
    expect(a17.jettisonS).toBe(191 * 3600 + 18 * 60 + 31);
    expect(a17.tei).toEqual({ get: '234:02:09.18', burnS: 143.69, dvFts: 3046.3 });
    expect(a17.subsatS).toBeUndefined();
  });
  it('agree with the mission files: ascent, TEI and Earth return events', () => {
    for (const p of [a15, a16, a17, expandReturnProfile(load('apollo14.json'))]) {
      const ev = missionEvents(p.missionId) as {
        type: string;
        met_days: number;
      }[];
      const day = (type: string) => ev.find((e) => e.type === type)!.met_days;
      expect(day('ascent')).toBeCloseTo(p.liftoffS / 86400, 2);
      expect(day('tei')).toBeCloseTo(p.teiMetDays, 2);
    }
  });
  it('name a splashdown profile with the SP-4029 L/D and range', () => {
    for (const [p, ld, nmi, fpa] of [
      [a15, 0.29, 1184, 6.51],
      [a16, 0.286, 1190, 6.55],
      [a17, 0.29, 1190, 6.49],
    ] as const) {
      const sp = read(`descent-profiles/${p.splashdownProfile}`);
      expect(sp.body).toBe('earth');
      expect(sp.siteId).toBe(p.splashdownProfile);
      expect(sp.missionId).toBe(p.missionId);
      expect(sp.liftToDragRatio).toBe(ld);
      expect(sp.targetDownrangeKm).toBeCloseTo(nmi * 1.852, 0);
      expect(sp.entryState.flightPathAngleDeg).toBe(fpa);
    }
  });
  it('the Earth return events land at the SP-4029 splashdown GET', () => {
    for (const [id, get] of [
      ['apollo15', 295 * 3600 + 11 * 60 + 53],
      ['apollo16', 265 * 3600 + 51 * 60 + 5],
      ['apollo17', 301 * 3600 + 51 * 60 + 59],
    ] as const) {
      const ev = missionEvents(id) as { type: string; met_days: number }[];
      expect(ev.find((e) => e.type === 'earth_return')!.met_days).toBeCloseTo(get / 86400, 2);
    }
  });
});

describe('the allowed rendezvous burn sequences', () => {
  const good = load('apollo17.json');
  it('accepts the CSM prefix only before a known LM sequence, in order', () => {
    expect(isValidReturnProfile(good)).toBe(true);
    const drop = (ids: string[]) =>
      good.rendezvous.filter((r) => ids.includes(r.id)) as typeof good.rendezvous;
    expect(isValidReturnProfile({ ...good, rendezvous: drop(['vernier', 'tpi', 'tpf']) })).toBe(
      true,
    );
    expect(
      isValidReturnProfile({ ...good, rendezvous: drop(['plane', 'vernier', 'tpi', 'tpf']) }),
    ).toBe(true);
    expect(isValidReturnProfile({ ...good, rendezvous: drop(['trim', 'vernier', 'tpi']) })).toBe(
      false,
    );
    expect(isValidReturnProfile({ ...good, rendezvous: [...good.rendezvous].reverse() })).toBe(
      false,
    );
    expect(isValidReturnProfile({ ...good, rendezvous: drop(['tpf']) })).toBe(false);
  });
  it('wants a CSM burn before liftoff and an LM burn after insertion', () => {
    const r = good.rendezvous.map((b) => (b.id === 'trim' ? { ...b, get: '186:00:00' } : b));
    expect(isValidReturnProfile({ ...good, rendezvous: r })).toBe(false);
  });
  it('keeps the subsatellite between the jettison and the TEI, and rejects a bad J block', () => {
    const a15 = load('apollo15.json');
    expect(isValidReturnProfile(a15)).toBe(true);
    const jm = a15.jMission!;
    expect(isValidReturnProfile({ ...a15, jMission: { ...jm, subsatellite: '230:00:00' } })).toBe(
      false,
    );
    expect(isValidReturnProfile({ ...a15, jMission: { ...jm, subsatellite: '170:00:00' } })).toBe(
      false,
    );
    expect(isValidReturnProfile({ ...a15, jMission: { ...jm, tv: 'zoom' } })).toBe(false);
    expect(isValidReturnProfile({ ...a15, jMission: { ...jm, mission: 14 } })).toBe(false);
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
  it('rejects a malformed camera style', () => {
    expect(isValidReturnProfile({ ...good, camera: { shots: { liftoff: 3 } } })).toBe(false);
    expect(isValidReturnProfile({ ...good, camera: 'wide' })).toBe(false);
    expect(isValidReturnProfile({ ...good, camera: { shots: { liftoff: 'ground_low' } } })).toBe(
      true,
    );
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
