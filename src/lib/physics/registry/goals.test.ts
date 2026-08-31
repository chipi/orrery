import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { REGISTRY } from './index';
import { GOALS, NOT_A_GOAL_FORMULA } from './goals';

/**
 * S2c coverage CI + wire integrity (Fable-5 rounds: bidirectional coverage,
 * B1/B2 wire validation, N1 output namespace). These gate the whole flagship's
 * "every built capability has a goal" + "no silently-wrong wire" guarantees.
 */
describe('goal registry · coverage + wire integrity', () => {
  it('bidirectional coverage: every registered formula is reachable from ≥1 goal (or allowlisted)', () => {
    const used = new Set<string>();
    for (const g of GOALS.values()) for (const step of g.path) used.add(step.formulaId);
    for (const id of REGISTRY.keys()) {
      expect(used.has(id) || NOT_A_GOAL_FORMULA.has(id), `formula "${id}" has no goal`).toBe(true);
    }
  });

  it('every goal step references a real registered formula', () => {
    for (const g of GOALS.values())
      for (const step of g.path)
        expect(REGISTRY.has(step.formulaId), `${g.id}: unknown formula ${step.formulaId}`).toBe(
          true,
        );
  });

  it('every wiresFrom is a valid upstream output with matching units (B1/B2)', () => {
    for (const g of GOALS.values()) {
      g.path.forEach((step, i) => {
        for (const w of step.wiresFrom ?? []) {
          // fromStep must be an earlier step (no forward/self wires)
          expect(w.fromStep, `${g.id}[${i}]: fromStep out of range`).toBeGreaterThanOrEqual(0);
          expect(w.fromStep, `${g.id}[${i}]: fromStep must precede this step`).toBeLessThan(i);
          const srcDef = REGISTRY.get(g.path[w.fromStep].formulaId);
          expect(srcDef, `${g.id}[${i}]: upstream formula missing`).toBeDefined();
          const out = [...srcDef!.outputs, ...(srcDef!.selectionOutputs ?? [])].find(
            (o) => o.key === w.output,
          );
          expect(
            out,
            `${g.id}[${i}]: output "${w.output}" not declared by ${srcDef!.id}`,
          ).toBeDefined();
          const dstDef = REGISTRY.get(step.formulaId)!;
          const inp = dstDef.inputs.find((f) => f.key === w.toInput);
          expect(inp, `${g.id}[${i}]: input "${w.toInput}" not on ${dstDef.id}`).toBeDefined();
          // B2 — no implicit conversion: units must be equal
          expect(out!.units, `${g.id}[${i}]: unit mismatch ${out!.units} → ${inp!.units}`).toBe(
            inp!.units,
          );
        }
      });
    }
  });

  it('goal prereqs reference real goals', () => {
    for (const g of GOALS.values())
      for (const p of g.prereqs)
        expect(GOALS.has(p), `${g.id}: unknown prereq goal ${p}`).toBe(true);
  });

  it('the M1 launch goal wires Tsiolkovsky Δv, the launch-site boost, AND the derived Δv-to-orbit into the verdict', () => {
    const g = GOALS.get('launch-a-rocket')!;
    const verdict = g.path.find((s) => s.formulaId === 'reach-orbit-verdict')!;
    expect(verdict.wiresFrom).toHaveLength(3);
    expect(verdict.wiresFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: 'deltaV', toInput: 'capacityKms' }),
        expect.objectContaining({ output: 'boost', toInput: 'boostKms' }),
        expect.objectContaining({ output: 'required', toInput: 'requiredKms' }),
      ]),
    );
  });

  it('M3 presets the shared rungs onto the Moon + a realistic lander capacity', () => {
    const g = GOALS.get('land-on-the-moon')!;
    // orbital-velocity + twr are put on the Moon by presetInputs (descent-burn derives
    // its Δv from the two wired rungs, so it has no body of its own).
    for (const id of ['orbital-velocity', 'twr']) {
      const step = g.path.find((s) => s.formulaId === id)!;
      expect(step.presetInputs?.body, `${id} should preset body=moon`).toBe('moon');
    }
    // the verdict presets a descent-stage Δv (~2.5), not a full launch vehicle's 8.5.
    const verdict = g.path.find((s) => s.formulaId === 'delta-v-margin')!;
    expect(verdict.presetInputs?.capacityKms).toBe(2.5);
  });
});

/**
 * Connection-panel href integrity (v0.9 reality-punch). The check-internal-links
 * preflight gate crawls prerendered HTML and STRIPS the query, so it only proves the
 * route PATH exists — it never validates a `?site=`/`?mission=`/`?id=` target id, and
 * /lab prerenders the default goal only (the other goals' <a>s never reach HTML). So a
 * typo'd id (`/mars?site=perseverence`) would 404 the deep-link silently. THIS test is
 * that missing gate: it resolves every connection href against the real data index its
 * route reads, so an unknown id fails at test time, not in the user's face.
 */
describe('goal registry · connection href integrity', () => {
  const idSet = (f: string): Set<string> =>
    new Set((JSON.parse(readFileSync(f, 'utf8')) as { id: string }[]).map((x) => x.id));
  const missions = idSet('static/data/missions/index.json'); // /fly?mission= , /missions?id=
  const fleet = idSet('static/data/fleet/index.json'); // /fleet?id=
  const moon = idSet('static/data/moon-sites.json'); // /moon?site=
  const mars = idSet('static/data/mars-sites.json'); // /mars?site=
  const programs = idSet('static/data/programs/index.json'); // /programs/<id>
  const earth = new Set(
    readdirSync('static/data/fleet/launch-site').map((f) => f.replace(/\.json$/, '')),
  ); // /earth?site=

  // route path → (id) => does the id exist in that route's data source?
  const resolvers: Record<string, (id: string | null) => boolean> = {
    '/fly': (id) => !!id && missions.has(id),
    '/missions': (id) => !!id && missions.has(id),
    '/fleet': (id) => !!id && fleet.has(id),
    '/moon': (id) => !!id && moon.has(id),
    '/mars': (id) => !!id && mars.has(id),
    '/earth': (id) => !!id && earth.has(id),
  };
  const queryKeyFor: Record<string, string> = {
    '/fly': 'mission',
    '/missions': 'id',
    '/fleet': 'id',
    '/moon': 'site',
    '/mars': 'site',
    '/earth': 'site',
  };

  const allLinks = [...GOALS.values()].flatMap((g) =>
    (g.connection?.links ?? []).map((l) => ({ goal: g.id, href: l.href })),
  );

  it('every goal with a connection has at least one link', () => {
    for (const g of GOALS.values()) {
      if (g.connection)
        expect(g.connection.links.length, `${g.id}: empty links`).toBeGreaterThan(0);
    }
  });

  it('every connection href is an internal route with a resolvable target id', () => {
    const broken: string[] = [];
    for (const { goal, href } of allLinks) {
      if (!href.startsWith('/')) {
        broken.push(`${goal}: '${href}' is not an internal ('/'-rooted) route`);
        continue;
      }
      const [path, qs] = href.split('?');
      if (path.startsWith('/programs/')) {
        const id = path.slice('/programs/'.length);
        if (!programs.has(id)) broken.push(`${goal}: unknown program '${id}' (${href})`);
        continue;
      }
      const resolve = resolvers[path];
      if (!resolve) {
        broken.push(`${goal}: '${path}' is not a known deep-linkable route (${href})`);
        continue;
      }
      const id = new URLSearchParams(qs).get(queryKeyFor[path]);
      if (!resolve(id)) broken.push(`${goal}: unknown ${path} target '${id}' (${href})`);
    }
    expect(broken, `broken connection links:\n${broken.join('\n')}`).toEqual([]);
  });
});

/**
 * M6 "leave the solar system" physics — locks the escape numbers the narrative claims,
 * and proves the assist is DECISIVE (rocket-alone fails, assist tips it positive). If a
 * refactor changes µ_sun, the escape-velocity formula, or the assist model, this fails.
 */
describe('M6 leave-the-solar-system · escape physics', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('solar escape velocity at 1 AU is ~42.1 km/s (√2 × Earth orbital)', () => {
    const r = compute('solar-escape-velocity', { distanceAu: 1 });
    expect(r.status.ok).toBe(true);
    expect(r.values.vEsc.value).toBeCloseTo(42.1, 0);
    // falls with distance: 4 AU (Jupiter-ish) is slower than 1 AU
    expect(compute('solar-escape-velocity', { distanceAu: 5.2 }).values.vEsc.value).toBeLessThan(
      r.values.vEsc.value,
    );
  });

  it('heliocentric escape Δv from Earth is only ~12.3 km/s (you keep Earth’s 29.8)', () => {
    const r = compute('heliocentric-escape-dv', { escapeKms: 42.1, orbitalKms: 29.78 });
    expect(r.values.dvKms.value).toBeCloseTo(12.3, 0);
  });

  it('the Oberth effect makes the from-LEO Δv (~8.7) far cheaper than the 12.3 heliocentric v∞', () => {
    const r = compute('oberth-departure-dv', { vInfKms: 12.3, body: 'earth', altitudeKm: 200 });
    expect(r.status.ok).toBe(true);
    expect(r.values.dvFromLeo.value).toBeCloseTo(8.7, 0);
    // the honesty crux: burning deep in the well costs LESS than the excess speed you gain
    expect(r.values.dvFromLeo.value).toBeLessThan(12.3);
  });

  it('a gravity assist boost is 2·v∞ — the honest 180° ceiling, no planet-speed fudge', () => {
    expect(compute('gravity-assist', { vInfKms: 8 }).values.boost.value).toBe(16);
    expect(compute('gravity-assist', { vInfKms: 6 }).values.boost.value).toBe(12);
  });

  it('the verdict is honest: a top launch clears escape alone, a weaker one needs the assist', () => {
    // New Horizons class (~9 ≥ 8.7) escapes on its own thrust — no "only the slingshot can".
    expect(
      compute('escape-verdict', { capacityKms: 9, assistKms: 0, requiredKms: 8.7 }).status.ok,
    ).toBe(true);
    // a weaker stage falls a hair short alone…
    expect(
      compute('escape-verdict', { capacityKms: 8, assistKms: 0, requiredKms: 8.7 }).status.ok,
    ).toBe(false);
    // …and the flyby boost tips it over (and buys the tour speed).
    const withAssist = compute('escape-verdict', {
      capacityKms: 8,
      assistKms: 12,
      requiredKms: 8.7,
    });
    expect(withAssist.status.ok).toBe(true);
    expect(withAssist.values.margin.value).toBeCloseTo(11.3, 1);
  });

  it('the M6 ladder wires v∞ into Oberth, and the flyby boost + from-LEO Δv into the verdict', () => {
    const g = GOALS.get('leave-the-solar-system')!;
    const oberth = g.path.find((s) => s.formulaId === 'oberth-departure-dv')!;
    expect(oberth.wiresFrom).toEqual(
      expect.arrayContaining([expect.objectContaining({ output: 'dvKms', toInput: 'vInfKms' })]),
    );
    const verdict = g.path.find((s) => s.formulaId === 'escape-verdict')!;
    expect(verdict.wiresFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: 'boost', toInput: 'assistKms' }),
        expect.objectContaining({ output: 'dvFromLeo', toInput: 'requiredKms' }),
      ]),
    );
  });
});

/**
 * "Scale a rocket" physics — locks the sizing/staging/engine-count numbers the lesson
 * teaches, and pins the reality anchors (Falcon 9 = 9 Merlins, orbit needs 2 stages).
 */
describe('scale-a-rocket · sizing, staging, engine + booster counts', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('sizing: a 5 t payload for 7 km/s (Isp 350, ε 0.08) needs a ~90 t rocket, mostly fuel', () => {
    const r = compute('rocket-sizing', {
      payloadKg: 5000,
      deltaVKms: 7,
      ispS: 350,
      structuralFraction: 0.08,
    });
    expect(r.status.ok).toBe(true);
    expect(r.values.grossMassKg.value).toBeGreaterThan(80000);
    expect(r.values.grossMassKg.value).toBeLessThan(110000);
    // propellant dominates — the "a rocket is mostly fuel" lesson.
    expect(r.values.propellantMassKg.value).toBeGreaterThan(r.values.grossMassKg.value * 0.8);
  });

  it('sizing: past the single-stage wall (Rε ≥ 1) it fails HONEST, not with a fake number', () => {
    // 12 km/s single-stage with ε 0.08 is impossible — the denominator goes non-positive.
    const r = compute('rocket-sizing', {
      payloadKg: 5000,
      deltaVKms: 12,
      ispS: 350,
      structuralFraction: 0.08,
    });
    expect(r.status.ok).toBe(false);
  });

  it('staging: a single stage caps at ~8.7 km/s < 9.4 to orbit → 2 stages', () => {
    const r = compute('staging', { deltaVKms: 9.4, ispS: 350, structuralFraction: 0.08 });
    expect(r.values.singleStageCeilingKms.value).toBeCloseTo(8.67, 1);
    expect(r.values.singleStageCeilingKms.value).toBeLessThan(9.4); // why no SSTO
    expect(r.values.stagesNeeded.value).toBe(2);
  });

  it('engine-count: Falcon 9-class thrust (~7.6 MN) on Merlins (~845 kN) = 9 engines', () => {
    expect(
      compute('engine-count', { thrustN: 7_600_000, engineThrustN: 845_000 }).values.engineCount
        .value,
    ).toBe(9);
    // one big engine can do what many small ones do — Atlas V's single RD-180 (~3.83 MN).
    expect(
      compute('engine-count', { thrustN: 3_800_000, engineThrustN: 3_830_000 }).values.engineCount
        .value,
    ).toBe(1);
  });

  it('booster-count: a heavy stack the core cannot lift alone needs strap-ons', () => {
    // 500 t at TWR 1.3 ⇒ ~6.4 MN required; a 1 MN core leaves ~5.4 MN → 2× 4 MN boosters.
    const r = compute('booster-count', {
      grossMassKg: 500_000,
      coreThrustN: 1_000_000,
      boosterThrustN: 4_000_000,
      liftoffTwr: 1.3,
    });
    expect(r.values.boostersNeeded.value).toBe(2);
    // a light rocket the core lifts alone needs none.
    expect(
      compute('booster-count', {
        grossMassKg: 50_000,
        coreThrustN: 1_000_000,
        boosterThrustN: 4_000_000,
        liftoffTwr: 1.3,
      }).values.boostersNeeded.value,
    ).toBe(0);
  });

  it('cluster-thrust finale: Starship (33 Raptors) makes ~76 MN and lifts a 5000 t stack at TWR ~1.5', () => {
    const r = compute('cluster-thrust', {
      engineCount: 33,
      engineThrustN: 2_300_000,
      grossMassKg: 5_000_000,
    });
    expect(r.status.ok).toBe(true);
    expect(r.values.totalThrustN.value).toBeCloseTo(75_900_000, -5); // ~76 MN
    expect(r.values.liftoffTwr.value).toBeCloseTo(1.55, 1); // beats weight → it flies
    // and the Starship rung presets exactly those real numbers.
    const g = GOALS.get('scale-a-rocket')!;
    const finale = g.path.find((s) => s.formulaId === 'cluster-thrust')!;
    expect(finale.presetInputs).toEqual({
      engineCount: 33,
      engineThrustN: 2_300_000,
      grossMassKg: 5_000_000,
    });
  });

  it('the ladder wires gross mass → thrust → engines, and gross mass → boosters', () => {
    const g = GOALS.get('scale-a-rocket')!;
    const thrust = g.path.find((s) => s.formulaId === 'liftoff-thrust')!;
    expect(thrust.wiresFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: 'grossMassKg', toInput: 'grossMassKg' }),
      ]),
    );
    const engines = g.path.find((s) => s.formulaId === 'engine-count')!;
    expect(engines.wiresFrom).toEqual(
      expect.arrayContaining([expect.objectContaining({ output: 'thrustN', toInput: 'thrustN' })]),
    );
    const boosters = g.path.find((s) => s.formulaId === 'booster-count')!;
    expect(boosters.wiresFrom).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ output: 'grossMassKg', toInput: 'grossMassKg' }),
      ]),
    );
  });
});
