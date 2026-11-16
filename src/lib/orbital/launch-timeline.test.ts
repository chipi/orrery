import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  type LaunchProfile,
  type AscentEvent,
} from '$lib/physics/ascent/ascent-physics';
import { buildAscentBeats } from './ascent-hud';

/**
 * Staging timeline of every launcher against its real nominal flight (2026-11-15 audit,
 * docs/wip/2026-11-15-launcher-timeline-audit.md). Each row is one event: the model time
 * must land within `tol` seconds of `real`. Tolerances: booster / stage separation and
 * MECO ±10 s, fairing ±10 s, SECO / orbit ±30 s. The source of each `real` is in the
 * comment on its row; "secondary" = Wikipedia or spaceflight101, not an agency document.
 */
const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const first = (events: AscentEvent[], type: AscentEvent['type'], nth = 0): number | undefined =>
  events.filter((e) => e.type === type)[nth]?.t;

interface Row {
  event: string;
  type: AscentEvent['type'];
  /** Which occurrence of that event type (0 = first). */
  nth?: number;
  real: number;
  tol: number;
}

const TIMELINES: Record<string, Row[]> = {
  'space-shuttle-stack': [
    // SRBs jettisoned ~2 min after launch at ~45 km, burn 123 s (secondary: Wikipedia
    // "Space Shuttle Solid Rocket Booster", "Space Shuttle").
    { event: 'SRB sep', type: 'staging', nth: 0, real: 123, tol: 10 },
    // MECO at T+8:30 (secondary: Wikipedia "Space Shuttle external tank").
    { event: 'MECO', type: 'meco', real: 510, tol: 10 },
    // ET separated 18 s after MECO (secondary: Wikipedia "Space Shuttle").
    { event: 'ET sep', type: 'staging', nth: 1, real: 528, tol: 10 },
  ],
  'atlas-v': [
    // Atlas V Launch Services User's Guide Rev 11 (March 2010), Table 2.4.1-1, the 521/531-class
    // columns (the 541 is not tabulated): SRB jettison 116-118, PLF 206-212, BECO 249-252,
    // Atlas booster / Centaur separation 257-260.
    { event: 'AJ-60A jettison', type: 'staging', nth: 0, real: 117, tol: 10 },
    { event: 'PLF jettison', type: 'fairing_jettison', real: 210, tol: 10 },
    { event: 'BECO', type: 'meco', real: 251, tol: 10 },
    { event: 'Centaur separation', type: 'staging', nth: 1, real: 259, tol: 10 },
  ],
  'delta-ii': [
    // Delta II Payload Planners Guide (Dec 2006), Table 2-1, 7925, eastern range:
    // ground-lit solids sep T+66, air-lit sep T+132, MECO T+264, stage I/II sep M+8,
    // fairing M+39 (T+303), SECO-1 M+353 (T+617, Figure 2-5).
    { event: 'ground-lit GEM sep', type: 'staging', nth: 0, real: 66, tol: 10 },
    { event: 'air-lit GEM sep', type: 'staging', nth: 1, real: 132, tol: 10 },
    { event: 'MECO', type: 'meco', real: 264, tol: 10 },
    { event: 'stage I/II sep', type: 'staging', nth: 2, real: 272, tol: 10 },
    { event: 'fairing sep', type: 'fairing_jettison', real: 303, tol: 10 },
    { event: 'SECO-1', type: 'seco', real: 617, tol: 30 },
  ],
  'saturn-v': [
    // Apollo 8 / SA-503 Saturn V Flight Manual MSFC-MAN-503, Critical Event Sequence:
    // S-IC outboard cutoff 2:31.0, LET jettison 3:07.2, S-II cutoff / S-II-S-IVB separation
    // 8:40.1 / 8:41.0, S-IVB first-burn cutoff 11:21.7.
    { event: 'S-IC cutoff', type: 'meco', real: 151, tol: 10 },
    { event: 'LET jettison', type: 'fairing_jettison', real: 187, tol: 10 },
    { event: 'S-II sep', type: 'staging', nth: 1, real: 521, tol: 10 },
    { event: 'S-IVB cutoff (first burn)', type: 'seco', real: 682, tol: 30 },
  ],
  pslv: [
    // ISRO PSLV-C25 flight events: PSOM-XL ground-lit sep 69.94, air-lit sep 92.04, PS1 sep
    // 112.75, fairing 117.95, PS2 sep 264.74 (PS1 burn time 103 s).
    { event: 'PSOM-XL ground-lit sep', type: 'staging', nth: 0, real: 70, tol: 10 },
    { event: 'PSOM-XL air-lit sep', type: 'staging', nth: 1, real: 92, tol: 10 },
    { event: 'PS1 burnout', type: 'meco', real: 103, tol: 10 },
    { event: 'PS1 sep', type: 'staging', nth: 2, real: 112.75, tol: 10 },
    { event: 'fairing sep', type: 'fairing_jettison', real: 118, tol: 10 },
    { event: 'PS2 sep', type: 'staging', nth: 3, real: 264.74, tol: 10 },
  ],
  'delta-iv-heavy': [
    // ULA Delta IV Heavy Parker Solar Probe mission booklet: port and starboard booster
    // jettison T+3:57.6, first stage separation 5:42.4, fairing jettison 6:05.4, MECO-1 10:37.1.
    { event: 'booster jettison', type: 'staging', nth: 0, real: 237.6, tol: 10 },
    { event: 'core separation', type: 'staging', nth: 1, real: 342.4, tol: 10 },
    { event: 'fairing jettison', type: 'fairing_jettison', real: 365.4, tol: 10 },
    { event: 'MECO-1', type: 'seco', real: 637.1, tol: 30 },
  ],
  'ariane-5': [
    // EAP jettisoned 143 s into the mission (secondary: spaceflight101, Ariane 5 ECA).
    { event: 'EAP jettison', type: 'staging', nth: 0, real: 143, tol: 10 },
  ],
  'ariane-5g': [
    // Rosetta (Ariane 5 G+): the boosters burnt ~139 s before being jettisoned (ESA).
    { event: 'EAP jettison', type: 'staging', nth: 0, real: 139, tol: 10 },
  ],
  'proton-m-briz-m': [
    // ExoMars 2016 launch timeline (secondary: spaceflight101): stage 1 shutdown and
    // separation T+1:59.7, stage 2 separation 5:27, stage 3 cutoff 9:31.
    { event: 'stage 1 sep', type: 'staging', nth: 0, real: 119.7, tol: 10 },
    { event: 'stage 2 sep', type: 'staging', nth: 1, real: 327, tol: 10 },
    { event: 'stage 3 cutoff', type: 'staging', nth: 2, real: 571, tol: 10 },
  ],
  'long-march-2f': [
    // Strap-ons jettisoned at T+126 s, first stage burn 166 s (secondary: spaceflight101).
    { event: 'booster jettison', type: 'staging', nth: 0, real: 126, tol: 10 },
    { event: 'core burnout', type: 'meco', real: 166, tol: 10 },
  ],
  'sls-block-1': [
    // NASA SLS reference guide: boosters fire "approximately two minutes"; the core stage
    // depletes "approximately six more minutes" after.
    { event: 'SRB sep', type: 'staging', nth: 0, real: 120, tol: 10 },
    { event: 'core MECO', type: 'meco', real: 480, tol: 10 },
  ],
};

describe('launcher staging timelines vs the real nominal flight', () => {
  for (const [id, rows] of Object.entries(TIMELINES)) {
    describe(id, () => {
      const sum = integrateAscent(load(id));
      for (const r of rows) {
        it(`${r.event} at ~T+${r.real} s (±${r.tol})`, () => {
          const t = first(sum.events, r.type, r.nth ?? 0);
          expect(t).toBeDefined();
          expect(Math.abs((t as number) - r.real)).toBeLessThanOrEqual(r.tol);
        });
      }
    });
  }

  // Known gaps (docs/wip/2026-11-15-launcher-timeline-audit.md): the model cannot hold the
  // real time without losing the orbit, or the real time is unsourced.
  it.todo('h-iia: SRB-A jettison T+110 s (burn 100 s + 10 s; spaceflight101); model 73 s');
  it.todo('proton-m-briz-m: fairing T+345 s (ExoMars 2016); model 174 s');
  it.todo('long-march-5: stage-2 shutdown T+752 s (Chang e-5, everydayastronaut); model 720 s');
});

describe('Space Shuttle ascent: no SECO, the tank leaves 18 s after MECO', () => {
  const sum = integrateAscent(load('space-shuttle-stack'));

  it('the SRBs burn a real 123 s on a burn-average thrust, not 94 s at peak thrust', () => {
    const srb = load('space-shuttle-stack').boosters!;
    expect(srb.thrustSlKN).toBeLessThan(12000); // average, not the 12 MN liftoff figure
    expect(first(sum.events, 'staging', 0)).toBeGreaterThan(115);
  });

  it('ET separation trails MECO by the stage separationDelayS', () => {
    const meco = first(sum.events, 'meco')!;
    const et = first(sum.events, 'staging', 1)!;
    expect(et - meco).toBeGreaterThanOrEqual(18);
    expect(et - meco).toBeLessThan(18.5);
  });

  it('the ET stays on the orbiter between MECO and its separation (no thrust, tank mass kept)', () => {
    const meco = first(sum.events, 'meco')!;
    const mid = sum.states.find((s) => s.t >= meco + 5)!;
    expect(mid.thrustN).toBe(0);
    expect(mid.stageIndex).toBe(0);
  });

  it('the beat list has MECO, a STAGE SEP for the tank 18 s later, ORBIT, and no SECO', () => {
    const beats = buildAscentBeats(sum);
    const labels = beats.map((b) => b.label);
    expect(labels).not.toContain('SECO');
    expect(labels.filter((l) => l === 'MECO')).toHaveLength(1);
    expect(labels.at(-1)).toBe('ORBIT');
    const meco = beats.find((b) => b.label === 'MECO')!;
    const sep = beats.filter((b) => b.label === 'STAGE SEP').at(-1)!;
    expect(sep.t - meco.t).toBeGreaterThan(17);
  });

  it('the camera/clock bookkeeping event stays in the event list, flagged silent', () => {
    const seco = sum.events.find((e) => e.type === 'seco')!;
    expect(seco.silent).toBe(true);
  });

  it('other vehicles keep their SECO beat', () => {
    const f9 = integrateAscent(load('falcon-9'));
    expect(buildAscentBeats(f9).map((b) => b.label)).toContain('SECO');
    expect(f9.events.some((e) => e.silent)).toBe(false);
  });
});

describe('shared physics: booster jettison delay and a time-scheduled fairing', () => {
  const base = load('delta-ii');

  it('a booster stays attached for separationDelayS after burnout, then the STAGE SEP fires', () => {
    const none = integrateAscent({ ...base, boosters: { ...base.boosters!, separationDelayS: 0 } });
    const held = integrateAscent({
      ...base,
      boosters: { ...base.boosters!, separationDelayS: 3 },
    });
    expect(first(held.events, 'staging', 0)! - first(none.events, 'staging', 0)!).toBeGreaterThan(
      2.5,
    );
  });

  it('fairingJettisonS jettisons the fairing at that mission time, not at the altitude', () => {
    const timed = integrateAscent({ ...base, fairingJettisonS: 200 });
    expect(first(timed.events, 'fairing_jettison')).toBeCloseTo(200, 0);
    const altitude = integrateAscent({ ...base, fairingJettisonS: undefined });
    expect(first(altitude.events, 'fairing_jettison')).not.toBeCloseTo(200, 0);
  });
});
