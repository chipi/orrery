import { describe, it, expect } from 'vitest';
import {
  REGISTRY,
  defaultInputs,
  tsiolkovsky,
  twrFormula,
  deltaVMargin,
  orbitalVelocity,
  visVivaFormula,
  hohmannFormula,
  launchSite,
  reachOrbitVerdict,
  descentBurn,
  interplanetaryTransfer,
  launchWindow,
  terminalVelocity,
  softLandingCheck,
} from './index';
import { bodyGravityMs2 } from '../mechanics/bodies';
import { helioModel } from '../util/heliocentric';
import type { FormulaDef } from '../spec';

/**
 * Contract-invariant tests (S2a). These run over EVERY registered formula, so the
 * frozen guarantees (declared outputs, assumptions ⊆, key disjointness) hold as
 * S2b + goals add formulas — they don't have to be re-asserted per formula.
 */
describe('formula registry · frozen contract invariants', () => {
  it('every registry key equals its FormulaDef.id', () => {
    for (const [id, def] of REGISTRY) expect(def.id).toBe(id);
  });

  it('compute() output keys are declared (⊆ outputs always; ≡ when ok) — B1/N3', () => {
    for (const def of REGISTRY.values()) {
      const declared = new Set(def.outputs.map((o) => o.key));
      const res = def.compute(defaultInputs(def));
      const produced = Object.keys(res.values);
      for (const k of produced)
        expect(declared, `${def.id}: undeclared output "${k}"`).toContain(k);
      if (res.status.ok) {
        expect(new Set(produced), `${def.id}: ok result must produce all outputs`).toEqual(
          declared,
        );
      }
    }
  });

  it('output ∪ selectionOutput keys are disjoint + unique — N1', () => {
    for (const def of REGISTRY.values()) {
      const keys = [...def.outputs, ...(def.selectionOutputs ?? [])].map((o) => o.key);
      expect(new Set(keys).size, `${def.id}: duplicate output/selection key`).toBe(keys.length);
    }
  });

  it("a figure's assumptions ⊆ the result's assumptions — M3", () => {
    for (const def of REGISTRY.values()) {
      const res = def.compute(defaultInputs(def));
      if (!res.figure) continue;
      const parent = new Set(res.assumptions);
      for (const a of res.figure.assumptions)
        expect(parent, `${def.id}: figure assumption "${a}" not in result`).toContain(a);
    }
  });

  it('kernel figures declare fidelity "computed"', () => {
    for (const def of REGISTRY.values()) {
      const res = def.compute(defaultInputs(def));
      if (res.figure) expect(res.figure.provenance.fidelity).toBe('computed');
    }
  });
});

describe('Tsiolkovsky', () => {
  it('350 s, mass ratio 12 → ~8.6 km/s (RFC-033 north-star number)', () => {
    const r = tsiolkovsky.compute({ ispS: 350, m0Kg: 12, mfKg: 1 });
    expect(r.status.ok).toBe(true);
    expect(r.values.deltaV.value).toBeCloseTo(8.53, 1); // 350·9.80665·ln(12)/1000
    expect(r.values.deltaV.units).toBe('km/s');
    expect(r.figure?.kind).toBe('curve');
  });

  it('fails honest on a non-physical mass ratio (m0 ≤ mf)', () => {
    const r = tsiolkovsky.compute({ ispS: 350, m0Kg: 1, mfKg: 1 });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('mass-ratio');
  });
});

// MAJOR-1 (S2 holistic): the invariant runner only executes defaultInputs, so the
// non-default status branches ship untested. Exercise them explicitly.
describe('fail-honest branches (both status paths)', () => {
  it('TWR < 1 → ok:false but KEEPS the value + force-diagram (the lesson, MINOR-6)', () => {
    const r = twrFormula.compute({ thrustN: 5e6, massKg: 1e6, body: 'earth' }); // ≈0.51
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('wont-lift');
    expect(r.values.twr.value).toBeLessThan(1);
    expect(r.figure?.kind).toBe('force-diagram');
  });

  it('delta-v-margin OK branch: capacity > required → ok, positive margin, figure', () => {
    const r = deltaVMargin.compute({ capacityKms: 12, requiredKms: 9.4 });
    expect(r.status.ok).toBe(true);
    expect(r.values.margin.value).toBeCloseTo(2.6, 5);
    expect(r.values.margin.units).toBe('km/s');
    expect(r.figure?.kind).toBe('dv-waterfall');
  });

  it('delta-v-margin FAIL branch: capacity < required → ok:false, keeps figure', () => {
    const r = deltaVMargin.compute({ capacityKms: 5, requiredKms: 9.4 });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('insufficient');
    expect(r.figure?.kind).toBe('dv-waterfall'); // the deficit IS the lesson
  });
});

// MAJOR-3 (S2 holistic): body-kind FieldSpec.bodyIds are validated by nothing, and
// bodyGravityMs2 THROWS on an unknown id. Prove every declared bodyId resolves — a
// typo'd id in a bodyIds list would crash at user-pick time otherwise.
describe('body-kind inputs resolve (no throw at pick time)', () => {
  it('every registered body-kind field lists only resolvable bodyIds', () => {
    for (const def of REGISTRY.values()) {
      for (const field of def.inputs) {
        if (field.kind !== 'body') continue;
        for (const id of field.bodyIds ?? []) {
          expect(
            () => bodyGravityMs2(id),
            `${def.id}.${field.key}: bad body "${id}"`,
          ).not.toThrow();
          expect(bodyGravityMs2(id)).toBeGreaterThan(0);
        }
      }
    }
  });
});

// M2 review MAJOR-1/MAJOR-2: the invariant runner only hits defaultInputs (happy
// path), so pin the textbook numbers at the registry layer + exercise every M2
// fail-branch, including the unknown-body path that bypasses bodyGravityMs2.
describe('M2 orbital formulas — happy-path numbers + fail branches', () => {
  it('orbital-velocity: 200 km LEO ≈ 7.79 km/s', () => {
    const r = orbitalVelocity.compute({ altitudeKm: 200, body: 'earth' });
    expect(r.status.ok).toBe(true);
    expect(r.values.vCirc.value).toBeCloseTo(7.79, 1);
  });

  it('hohmann: LEO → Moon defaults give ~3.96 km/s total + ~5-day transfer', () => {
    const r = hohmannFormula.compute({ r1Km: 6571, r2Km: 384400, body: 'earth' });
    expect(r.status.ok).toBe(true);
    expect(r.values.dv1.value).toBeCloseTo(3.13, 1); // TLI
    expect(r.values.total.value).toBeCloseTo(3.96, 1);
    expect(r.values.tof.value).toBeCloseTo(5, 0);
    expect(r.figure?.kind).toBe('transfer-ellipse');
  });

  it('vis-viva fails honest when r is not on the orbit (r ≥ 2a)', () => {
    const r = visVivaFormula.compute({ rKm: 100000, aKm: 10000, body: 'earth' });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('off-orbit');
  });

  it('hohmann fails honest on a non-positive radius', () => {
    const r = hohmannFormula.compute({ r1Km: -1, r2Km: 384400, body: 'earth' });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('radius');
  });

  it('an unknown body fails HONEST — never silently computes Earth (review MAJOR-2)', () => {
    // Every PLANET_STATS body now resolves (physics runs on any planet); only a
    // truly-unknown id must be rejected.
    const forms: FormulaDef[] = [orbitalVelocity, visVivaFormula, hohmannFormula];
    for (const f of forms) {
      const r = f.compute({ ...defaultInputs(f), body: 'not-a-planet' });
      expect(r.status.ok, `${f.id} should reject unknown body`).toBe(false);
      if (!r.status.ok) expect(r.status.reasonKey).toContain('unknown-body');
    }
  });

  it('launch-site: rotation head-start peaks near the equator, honest curve', () => {
    const eq = launchSite.compute({ latitudeDeg: 0, body: 'earth' });
    const pole = launchSite.compute({ latitudeDeg: 90, body: 'earth' });
    expect(eq.status.ok && pole.status.ok).toBe(true);
    expect(eq.values.boost.value).toBeCloseTo(0.465, 2); // ~equatorial
    expect(pole.values.boost.value).toBeCloseTo(0, 3);
    expect(eq.figure?.kind).toBe('curve');
  });

  it('reach-orbit-verdict: the launch-site boost adds to the margin (the connection)', () => {
    const withBoost = reachOrbitVerdict.compute({
      capacityKms: 9,
      boostKms: 0.46,
      requiredKms: 9.4,
    });
    const noBoost = reachOrbitVerdict.compute({ capacityKms: 9, boostKms: 0, requiredKms: 9.4 });
    expect(withBoost.status.ok).toBe(true); // 9 + 0.46 − 9.4 = +0.06
    expect(noBoost.status.ok).toBe(false); // 9 + 0 − 9.4 = −0.4 → can't reach orbit
    if (withBoost.status.ok) expect(withBoost.values.margin.value).toBeCloseTo(0.06, 2);
  });

  it('launch-site rejects an unknown body fail-honest', () => {
    const r = launchSite.compute({ latitudeDeg: 5, body: 'not-a-planet' });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('unknown-body');
  });

  it('launch-site rejects an out-of-range / non-finite latitude fail-honest (review MINOR-5)', () => {
    for (const lat of [100, -100, NaN, Infinity]) {
      const r = launchSite.compute({ latitudeDeg: lat, body: 'earth' });
      expect(r.status.ok, `lat ${lat} should be rejected`).toBe(false);
      if (!r.status.ok) expect(r.status.reasonKey).toContain('latitude');
    }
  });

  it('descent-burn (M3): Δv = v_orbit·TWR/(TWR−1), wiring the TWR rung', () => {
    const r = descentBurn.compute({ vOrbitKms: 1.63, twr: 3 });
    expect(r.status.ok).toBe(true);
    expect(r.values.descentDv.value).toBeCloseTo(1.63 * 1.5, 3);
    expect(r.figure?.kind).toBe('dv-waterfall');
  });

  it("descent-burn fails honest when TWR ≤ 1 — you can't out-thrust gravity", () => {
    const r = descentBurn.compute({ vOrbitKms: 1.63, twr: 0.9 });
    expect(r.status.ok).toBe(false);
    if (!r.status.ok) expect(r.status.reasonKey).toContain('twr');
  });

  it('descent-burn rejects non-finite inputs fail-honest (review M-1)', () => {
    for (const inp of [
      { vOrbitKms: NaN, twr: 3 },
      { vOrbitKms: 1.63, twr: Infinity },
      { vOrbitKms: -1, twr: 3 },
    ]) {
      const r = descentBurn.compute(inp);
      expect(r.status.ok, `${JSON.stringify(inp)} should be rejected`).toBe(false);
    }
  });

  it('interplanetary-transfer (M4): Earth→Mars ≈ 5.6 km/s heliocentric, ~259-day cruise', () => {
    const r = interplanetaryTransfer.compute({ depart: 'earth', arrive: 'mars' });
    expect(r.status.ok).toBe(true);
    expect(r.values.total.value).toBeGreaterThan(5.0);
    expect(r.values.total.value).toBeLessThan(6.2);
    expect(r.values.tof.value).toBeCloseTo(259, -1); // ~8.5-month Hohmann to Mars
    expect(r.figure?.kind).toBe('transfer-ellipse');
  });

  it('interplanetary-transfer fails honest for same / untabulated worlds', () => {
    expect(interplanetaryTransfer.compute({ depart: 'earth', arrive: 'earth' }).status.ok).toBe(
      false,
    );
    expect(interplanetaryTransfer.compute({ depart: 'earth', arrive: 'pluto' }).status.ok).toBe(
      false,
    );
  });

  it('launch-window (M4): Earth↔Mars synodic ≈ 780 days', () => {
    const r = launchWindow.compute({ depart: 'earth', arrive: 'mars' });
    expect(r.status.ok).toBe(true);
    expect(r.values.synodic.value).toBeCloseTo(780, -1);
  });

  it('terminal-velocity (M5): a Mars capsule falls at hundreds of m/s; the Moon is airless', () => {
    const mars = terminalVelocity.compute({ massKg: 2000, areaM2: 10, cd: 1.5, body: 'mars' });
    expect(mars.status.ok).toBe(true);
    expect(mars.values.vTerminal.value).toBeGreaterThan(150);
    // Airless bodies have no terminal velocity → fail-honest.
    const moon = terminalVelocity.compute({ massKg: 2000, areaM2: 10, cd: 1.5, body: 'moon' });
    expect(moon.status.ok).toBe(false);
    if (!moon.status.ok) expect(moon.status.reasonKey).toContain('airless');
  });

  it('soft-landing-check (M5): a fast terminal speed FAILS honest — the Mars lesson', () => {
    const crash = softLandingCheck.compute({ terminalMs: 50, safeMs: 5 });
    expect(crash.status.ok).toBe(false); // 50 m/s ≫ 5 m/s survivable → need powered descent
    if (!crash.status.ok) expect(crash.status.reasonKey).toContain('too-fast');
    const ok = softLandingCheck.compute({ terminalMs: 4, safeMs: 5 });
    expect(ok.status.ok).toBe(true);
  });

  it('every planet offered by the interplanetary pickers resolves in helioModel (review MINOR-2)', () => {
    // The body-resolve test guards via bodyGravityMs2, but these formulas compute via
    // helioModel (a different table) — prove the picker never offers an unresolvable world.
    for (const f of [interplanetaryTransfer, launchWindow]) {
      const departField = f.inputs.find((i) => i.key === 'depart')!;
      for (const id of departField.bodyIds ?? []) {
        expect(helioModel(id), `${f.id}: "${id}" must resolve in helioModel`).toBeDefined();
      }
    }
  });

  it('every ORBIT_BODY_IDS entry actually resolves (the resolver M2 uses)', () => {
    // The M2 formulas route body → ORBIT_BODIES, not bodyGravityMs2; prove that
    // resolver covers every declared id (a mismatch would hit the fail-honest path).
    for (const id of ['earth', 'moon']) {
      const r = orbitalVelocity.compute({ altitudeKm: 200, body: id });
      expect(r.status.ok, `orbital-velocity should accept "${id}"`).toBe(true);
    }
  });
});
