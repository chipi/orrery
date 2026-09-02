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

  it('the apollo-round-trip capstone EXECUTES ok at every one of its 6 stages', () => {
    // Guards that the composed capstone actually computes a valid result at each stage (PEG ascent →
    // TLI/LOI → powered descent → lunar ascent → TEI → lifting entry), not just references real
    // formulas. It uses no wiresFrom, so defaults + presetInputs are the full input; a typo'd preset
    // the Notebook silently drops would otherwise render defaults with no failure anywhere.
    const capstone = GOALS.get('apollo-round-trip')!;
    expect(capstone.path.length).toBe(6);
    for (const [i, step] of capstone.path.entries()) {
      const f = REGISTRY.get(step.formulaId)!;
      const inputs: Record<string, unknown> = {};
      for (const inp of f.inputs) inputs[inp.key] = (inp as { default?: unknown }).default;
      Object.assign(inputs, step.presetInputs ?? {});
      const r = f.compute(inputs as never);
      expect(r.status.ok, `apollo-round-trip[${i}] · ${step.formulaId}: compute not ok`).toBe(true);
    }
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
  const essays = new Set(readdirSync('static/data/essays').map((f) => f.replace(/\.json$/, ''))); // /essays/<slug>
  const earth = new Set(
    readdirSync('static/data/fleet/launch-site').map((f) => f.replace(/\.json$/, '')),
  ); // /earth?site=

  // Real top-level routes (source of truth: a directory under src/routes). Bare-route
  // connection links (observe goals sending you to LOOK — /moon, /explore) must hit one:
  // the panel <a> is interaction-gated so it never reaches prerendered HTML, meaning
  // check-internal-links can't see it — this is their only gate (review G8 MINOR).
  const routeDirs = new Set(
    readdirSync('src/routes', { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('[') && !d.name.startsWith('.'))
      .map((d) => `/${d.name}`),
  );

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
      if (path.startsWith('/essays/')) {
        const slug = path.slice('/essays/'.length);
        if (!essays.has(slug)) broken.push(`${goal}: unknown essay '${slug}' (${href})`);
        continue;
      }
      // A bare route link (no query) — e.g. observe goals sending you to /moon or /explore
      // to LOOK — must be a real top-level route (validated against src/routes, since the
      // interaction-gated panel <a> never reaches prerendered HTML for check-internal-links).
      if (qs === undefined) {
        if (!routeDirs.has(path)) broken.push(`${goal}: '${path}' is not a real route (${href})`);
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

/**
 * M-return "come home" physics — the deorbit + re-entry front half of land-on-Earth.
 * Locks the "surprisingly cheap deorbit / brutally energetic entry" numbers.
 */
describe('M-return · deorbit + entry heating', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('deorbit from a 400 km parking orbit costs only ~80 m/s (a nudge, not a dive)', () => {
    const r = compute('deorbit-burn', {
      body: 'earth',
      parkingAltitudeKm: 400,
      entryAltitudeKm: 120,
    });
    expect(r.status.ok).toBe(true);
    expect(r.values.deorbitDvKms.value).toBeGreaterThan(0.05);
    expect(r.values.deorbitDvKms.value).toBeLessThan(0.12); // ~0.08 km/s
  });

  it('deorbit fails honest if the parking orbit is not above the entry altitude', () => {
    expect(
      compute('deorbit-burn', { body: 'earth', parkingAltitudeKm: 100, entryAltitudeKm: 120 })
        .status.ok,
    ).toBe(false);
  });

  it('entry at 7.8 km/s dumps ~30 MJ/kg and peaks near 8 g at a 3° path (Allen–Eggers)', () => {
    const r = compute('entry-heating', {
      entryVelocityKms: 7.8,
      flightPathAngleDeg: 3,
      scaleHeightKm: 7,
    });
    expect(r.values.energyPerKgMjkg.value).toBeCloseTo(30.4, 0); // ½·7800² J/kg
    expect(r.values.peakDecelG.value).toBeCloseTo(8.5, 0);
    // the corridor: a steeper entry spikes the g-load (and heating).
    const steep = compute('entry-heating', {
      entryVelocityKms: 7.8,
      flightPathAngleDeg: 6,
      scaleHeightKm: 7,
    });
    expect(steep.values.peakDecelG.value).toBeGreaterThan(r.values.peakDecelG.value * 1.9);
  });

  it('A8 Venus: steep entry brakes >100 g, corridor is wide, aeroshell-only lands survivably (P2 · #526)', () => {
    const g = GOALS.get('land-on-venus')!;
    expect(g.path.map((s) => s.formulaId)).toEqual([
      'entry-heating',
      'entry-corridor',
      'terminal-velocity',
      'terminal-velocity',
      'soft-landing-check',
    ]);
    const run = (i: number, extra: Record<string, unknown> = {}) => {
      const step = g.path[i];
      const def = REGISTRY.get(step.formulaId)!;
      const inputs: Record<string, unknown> = {};
      for (const inp of def.inputs) inputs[inp.key] = (inp as { default?: unknown }).default;
      Object.assign(inputs, step.presetInputs ?? {}, extra);
      return def.compute(inputs as never);
    };
    // Rung 1: the Venera-class steep direct entry decelerates at over one hundred g.
    const entry = run(0);
    expect(entry.status.ok).toBe(true);
    expect(entry.values.peakDecelG.value).toBeGreaterThan(100);
    // Rung 2: dense air ⇒ a barn-door corridor (vs Mars's knife-edge).
    const corridor = run(1);
    expect(corridor.status.ok).toBe(true);
    expect(corridor.values.corridorWidthDeg.value).toBeGreaterThan(45);
    // Rung 4: aeroshell-only terminal speed — landable with NO chute, NO retro.
    const aeroshell = run(3);
    expect(aeroshell.status.ok).toBe(true);
    expect(aeroshell.values.vTerminal.value).toBeLessThan(10);
    // Rung 5 verdict: wired from the aeroshell rung, passes the ~15 m/s ring limit.
    expect(g.path[4].wiresFrom).toEqual([
      { fromStep: 3, output: 'vTerminal', toInput: 'terminalMs' },
    ]);
    const verdict = run(4, { terminalMs: aeroshell.values.vTerminal.value });
    expect(verdict.status.ok).toBe(true);
  });

  it('the M-return ladder runs deorbit → entry → corridor → parachute → splashdown (6 rungs, wire shifted)', () => {
    const g = GOALS.get('land-on-earth')!;
    expect(g.path.map((s) => s.formulaId)).toEqual([
      'deorbit-burn',
      'entry-heating',
      'entry-corridor',
      'terminal-velocity',
      'terminal-velocity',
      'soft-landing-check',
    ]);
    // the verdict wires the PARACHUTE rung, now index 4 after the corridor was inserted.
    const verdict = g.path.find((s) => s.formulaId === 'soft-landing-check')!;
    expect(verdict.wiresFrom).toEqual([
      { fromStep: 4, output: 'vTerminal', toInput: 'terminalMs' },
    ]);
  });

  it('entry-corridor: LEO return has a wide corridor and never skips; a lunar return has NONE (needs lift)', () => {
    // From LEO (7.8 km/s) you are too slow to skip — the skip boundary collapses to 0 and the
    // corridor is just the (wide) g-limit.
    const leo = compute('entry-corridor', {
      entryVelocityKms: 7.8,
      flightPathAngleDeg: 3,
      gLimit: 12,
      scaleHeightKm: 7,
    });
    const leoFig = leo.figure as { skipBoundaryDeg: number; gLimitBoundaryDeg: number };
    expect(leoFig.skipBoundaryDeg).toBeCloseTo(0, 5);
    expect(leoFig.gLimitBoundaryDeg).toBeGreaterThan(3); // a real, positive corridor
    // From the Moon (11 km/s) the skip boundary is STEEPER than the g-limit → corridor closes.
    const lunar = compute('entry-corridor', {
      entryVelocityKms: 11,
      flightPathAngleDeg: 6,
      gLimit: 12,
      scaleHeightKm: 7,
    });
    const lunarFig = lunar.figure as { skipBoundaryDeg: number; gLimitBoundaryDeg: number };
    expect(lunarFig.skipBoundaryDeg).toBeGreaterThan(lunarFig.gLimitBoundaryDeg); // no ballistic corridor
    expect(lunar.values.corridorWidthDeg.value).toBe(0);
    // and a mid-angle lunar ballistic entry is brutally high-g.
    expect(lunar.values.peakDecelG.value).toBeGreaterThan(20);
  });
});

/**
 * Family B / G8 "Moon phases" — the first observe goal. The lit fraction + phase name must
 * match the real ephemeris for known dates (new/full/first-quarter, 2024 reference epochs).
 */
describe('G8 moon-phases · phase geometry from the real ephemeris', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('a full-moon date reads ~fully lit, a new-moon date ~dark', () => {
    const full = compute('moon-phase', { dateIso: '2024-01-25' });
    expect(full.status.ok).toBe(true);
    expect(full.values.illuminatedPct.value).toBeGreaterThan(95);
    const nw = compute('moon-phase', { dateIso: '2024-01-11' });
    expect(nw.values.illuminatedPct.value).toBeLessThan(5);
  });

  it("first quarter is ~half lit and WAXING (the figure's disc + name come from the ephemeris)", () => {
    const r = compute('moon-phase', { dateIso: '2024-01-18' });
    expect(r.values.illuminatedPct.value).toBeGreaterThan(35);
    expect(r.values.illuminatedPct.value).toBeLessThan(65);
    const fig = r.figure as { waxing: boolean; phaseLabelKey: string; illuminatedFraction: number };
    expect(fig.waxing).toBe(true);
    expect(fig.phaseLabelKey).toBe('lab.moon.phase.first-quarter');
    expect(fig.illuminatedFraction).toBeCloseTo(r.values.illuminatedPct.value / 100, 5);
  });

  it('an invalid date fails honest, and the age stays within a synodic month', () => {
    expect(compute('moon-phase', { dateIso: 'not-a-date' }).status.ok).toBe(false);
    const r = compute('moon-phase', { dateIso: '2026-08-30' });
    expect(r.values.moonAgeDays.value).toBeGreaterThanOrEqual(0);
    expect(r.values.moonAgeDays.value).toBeLessThan(29.54);
  });

  it('G8 is an observe-family goal that sends you out to LOOK (bare route links)', () => {
    const g = GOALS.get('moon-phases')!;
    expect(g.family).toBe('observe');
    expect(g.connection!.links.map((l) => l.href)).toEqual(['/moon', '/explore']);
  });

  it('moon-distance: the real distance stays in the perigee–apogee band, size ~100% of mean', () => {
    const r = compute('moon-distance', { dateIso: '2026-08-30' });
    expect(r.values.distanceKm.value).toBeGreaterThan(356000);
    expect(r.values.distanceKm.value).toBeLessThan(407000);
    expect(r.values.apparentSizePct.value).toBeGreaterThan(88);
    expect(r.values.apparentSizePct.value).toBeLessThan(112);
  });

  it("eclipse-seasons: the Moon's latitude stays within its 5.1° tilt (why eclipses aren't monthly)", () => {
    const r = compute('eclipse-seasons', { dateIso: '2026-08-30' });
    expect(Math.abs(r.values.moonLatitudeDeg.value)).toBeLessThanOrEqual(5.2);
    // over ~70 days the figure sweeps the full ±5° range (it crosses the ±1.5° eclipse band).
    const fig = r.figure as { series: { points: { x: number; y: number }[] }[] };
    const betas = fig.series[0].points.map((p) => p.y);
    expect(Math.max(...betas) - Math.min(...betas)).toBeGreaterThan(6);
  });

  it('moon-altitude: culminates at ≤90°, peaking over the observer at its declination', () => {
    const r = compute('moon-altitude', { dateIso: '2026-08-30', latitudeDeg: 40 });
    expect(r.values.culminationAltitudeDeg.value).toBeLessThanOrEqual(90);
    const fig = r.figure as { series: { points: { x: number; y: number }[] }[] };
    expect(Math.max(...fig.series[0].points.map((p) => p.y))).toBeGreaterThan(87);
  });

  it('the G8 ladder is 4 rungs: phase → distance → eclipse seasons → altitude', () => {
    expect(GOALS.get('moon-phases')!.path.map((s) => s.formulaId)).toEqual([
      'moon-phase',
      'moon-distance',
      'eclipse-seasons',
      'moon-altitude',
    ]);
  });
});

/**
 * Family B / G10 "Choose an orbit" — altitude ⇄ speed ⇄ period, the geostationary altitude
 * from the sidereal day, and the light-lag that pushed the megaconstellations low.
 */
describe('G10 choose-an-orbit · regimes, geostationary, latency', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('a low orbit is fast and short-period; higher is slower and longer', () => {
    const leo = compute('orbit-regime', { body: 'earth', altitudeKm: 550 });
    expect(leo.values.speedKms.value).toBeCloseTo(7.6, 1);
    expect(leo.values.periodMin.value).toBeCloseTo(96, 0); // ~96 min
    const meo = compute('orbit-regime', { body: 'earth', altitudeKm: 20200 });
    expect(meo.values.periodMin.value).toBeGreaterThan(leo.values.periodMin.value);
    expect(meo.values.speedKms.value).toBeLessThan(leo.values.speedKms.value);
  });

  it('geostationary altitude is ~35,786 km for Earth (period = the sidereal day)', () => {
    const r = compute('geostationary-altitude', { body: 'earth' });
    expect(r.values.altitudeKm.value).toBeCloseTo(35786, -2); // ±~50 km
    // Mars's areostationary ring is lower (weaker gravity, similar day) — ~17,000 km.
    const mars = compute('geostationary-altitude', { body: 'mars' });
    expect(mars.values.altitudeKm.value).toBeGreaterThan(15000);
    expect(mars.values.altitudeKm.value).toBeLessThan(20000);
  });

  it('signal latency: ~239 ms at GEO, under 4 ms at a 550 km LEO shell', () => {
    expect(compute('signal-latency', { altitudeKm: 35786 }).values.roundTripMs.value).toBeCloseTo(
      238.8,
      0,
    );
    expect(compute('signal-latency', { altitudeKm: 550 }).values.roundTripMs.value).toBeLessThan(4);
  });

  it('the ladder wires the geostationary altitude into the latency rung', () => {
    const g = GOALS.get('choose-an-orbit')!;
    expect(g.family).toBe('observe');
    const latency = g.path.find((s) => s.formulaId === 'signal-latency')!;
    expect(latency.wiresFrom).toEqual([
      { fromStep: 1, output: 'altitudeKm', toInput: 'altitudeKm' },
    ]);
  });

  it('★ sun-synchronous: the J2 gem yields the retrograde ~98° near-polar orbit', () => {
    expect(compute('sun-synchronous', { altitudeKm: 700 }).values.inclinationDeg.value).toBeCloseTo(
      98.2,
      0,
    );
    // inclination grows with altitude; above ~5,970 km there is no solution → fail honest.
    expect(
      compute('sun-synchronous', { altitudeKm: 400 }).values.inclinationDeg.value,
    ).toBeLessThan(compute('sun-synchronous', { altitudeKm: 800 }).values.inclinationDeg.value);
    expect(compute('sun-synchronous', { altitudeKm: 8000 }).status.ok).toBe(false);
  });

  it('frozen-orbit: perigee drift vanishes at the 63.4° critical inclination', () => {
    expect(
      Math.abs(
        compute('frozen-orbit', { inclinationDeg: 63.4349 }).values.perigeeDriftDegPerDay.value,
      ),
    ).toBeLessThan(0.001);
    expect(
      compute('frozen-orbit', { inclinationDeg: 0 }).values.perigeeDriftDegPerDay.value,
    ).toBeGreaterThan(0);
    expect(
      compute('frozen-orbit', { inclinationDeg: 90 }).values.perigeeDriftDegPerDay.value,
    ).toBeLessThan(0);
  });

  it('coverage: THREE from geostationary blanket the globe (Clarke); a 550 km shell needs many', () => {
    expect(
      compute('constellation-coverage', { altitudeKm: 35786, minElevationDeg: 5 }).values
        .equatorRingSatellites.value,
    ).toBeLessThanOrEqual(3);
    expect(
      compute('constellation-coverage', { altitudeKm: 550, minElevationDeg: 25 }).values
        .equatorRingSatellites.value,
    ).toBeGreaterThan(15);
  });

  it('launch-azimuth: due-northeast for ISS from the Cape, southward for a retrograde SSO, unreachable below the latitude', () => {
    expect(
      compute('launch-azimuth', { launchLatitudeDeg: 28.5, targetInclinationDeg: 51.6 }).values
        .azimuthDeg.value,
    ).toBeCloseTo(44.9, 0);
    // SSO (i>90°) → azimuth > 90° = southward.
    expect(
      compute('launch-azimuth', { launchLatitudeDeg: 34.7, targetInclinationDeg: 98 }).values
        .azimuthDeg.value,
    ).toBeGreaterThan(90);
    // can't reach an inclination below the launch latitude.
    expect(
      compute('launch-azimuth', { launchLatitudeDeg: 45, targetInclinationDeg: 20 }).status.ok,
    ).toBe(false);
  });

  it('geostationary now uses the canonical 23.9345 h sidereal day (MINOR-2 fix): ~35,790 km above mean radius', () => {
    // Sidereal day → semimajor 42,164 km; altitude subtracts Earth's mean radius (6,371),
    // so ~35,793 km (the textbook 35,786 uses the equatorial radius — a separate choice).
    expect(
      compute('geostationary-altitude', { body: 'earth' }).values.altitudeKm.value,
    ).toBeCloseTo(35793, -1);
  });
});

/**
 * Family B / G9 "Catch the ISS" — the ground track slides ~23° west each orbit, and the ISS
 * stays sunlit until the Sun is ~20° below the horizon (the twilight-viewing window).
 */
describe('G9 catch-the-iss · ground track + visibility', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('the ~92-min ISS orbit slides ~23° west each lap; the track caps at the inclination', () => {
    const r = compute('ground-track-shift', { periodMin: 92, inclinationDeg: 51.6 });
    expect(r.values.shiftDeg.value).toBeCloseTo(23.1, 0);
    const fig = r.figure as { kind: string; tracks: { x: number; y: number }[][] };
    expect(fig.kind).toBe('ground-track');
    const maxLat = Math.max(...fig.tracks[0].map((p) => Math.abs(p.y)));
    expect(maxLat).toBeCloseTo(51.6, 1); // the sine is capped at the inclination
  });

  it('at 420 km the ISS is sunlit until the Sun is ~20° below the horizon (twilight window)', () => {
    const r = compute('visibility-window', { altitudeKm: 420 });
    expect(r.values.maxSunDepressionDeg.value).toBeCloseTo(20.3, 0);
    // higher satellites stay lit later into the night.
    expect(
      compute('visibility-window', { altitudeKm: 1200 }).values.maxSunDepressionDeg.value,
    ).toBeGreaterThan(r.values.maxSunDepressionDeg.value);
  });

  it('the ladder presets the station orbit and wires its period into the ground track', () => {
    const g = GOALS.get('catch-the-iss')!;
    expect(g.family).toBe('observe');
    const orbit = g.path.find((s) => s.formulaId === 'orbit-regime')!;
    expect(orbit.presetInputs).toEqual({ body: 'earth', altitudeKm: 420 });
    const track = g.path.find((s) => s.formulaId === 'ground-track-shift')!;
    expect(track.wiresFrom).toEqual([{ fromStep: 0, output: 'periodMin', toInput: 'periodMin' }]);
  });

  it('orbit-regime periodMin no longer emits a minutes value tagged as seconds (MINOR-1 fix)', () => {
    const q = compute('orbit-regime', { body: 'earth', altitudeKm: 550 }).values.periodMin;
    expect(q.value).toBeCloseTo(96, 0); // minutes
    expect(q.units).toBe(''); // NOT 's' — matches the output spec + the ground-track wire
  });

  it('orbit-regime draws the to-scale orbit-shell hero with a geostationary reference ring', () => {
    const fig = compute('orbit-regime', { body: 'earth', altitudeKm: 550 }).figure as {
      kind: string;
      bodyRadiusKm: number;
      altitudeKm: number;
      refAltitudeKm?: number;
    };
    expect(fig.kind).toBe('orbit');
    expect(fig.bodyRadiusKm).toBeCloseTo(6371, -2); // Earth mean radius
    expect(fig.altitudeKm).toBe(550);
    // the reference ring is Earth's geostationary altitude (~35,786 km above the mean radius).
    expect(fig.refAltitudeKm).toBeGreaterThan(35000);
    expect(fig.refAltitudeKm).toBeLessThan(36500);
  });

  it('the ground track now draws the westward march — 3 successive offset orbits', () => {
    const fig = compute('ground-track-shift', { periodMin: 92, inclinationDeg: 51.6 }).figure as {
      tracks: { x: number }[][];
    };
    expect(fig.tracks).toHaveLength(3);
    // each orbit starts ~23° further west (lower x) than the last.
    expect(fig.tracks[1][0].x).toBeLessThan(fig.tracks[0][0].x);
    expect(fig.tracks[2][0].x).toBeLessThan(fig.tracks[1][0].x);
  });

  it('★ iss-pass: near the TLE epoch, a real pass over a mid-latitude site — figure-less, honest', () => {
    const r = compute('iss-pass', { latitudeDeg: 40, longitudeDeg: -74, dateIso: '2026-07-21' });
    expect(r.status.ok).toBe(true);
    expect(r.figure).toBeUndefined(); // no figure → no fidelity overclaim (it's propagated, not geometry)
    expect(r.values.maxAltitudeDeg.value).toBeGreaterThanOrEqual(10);
    expect(r.values.maxAltitudeDeg.value).toBeLessThanOrEqual(90);
    expect(r.values.minutesUntilPass.value).toBeGreaterThanOrEqual(0);
    expect(r.values.minutesUntilPass.value).toBeLessThanOrEqual(48 * 60);
    // the snapshot-TLE staleness is disclosed on the result.
    expect(r.assumptions).toContain('lab.assume.snapshot-tle');
    // an equatorial site below the 51.6° inclination band still gets passes; a polar one may not.
    expect(
      compute('iss-pass', { latitudeDeg: 85, longitudeDeg: 0, dateIso: '2026-07-21' }).status.ok,
    ).toBe(false);
  });
});

/**
 * Family B / G7 "Observe the sky" — inner planets cap their elongation at arcsin(a) (Venus
 * ~46°, Mercury ~23°), outer planets reach opposition (180°); and the real ephemeris elongation
 * for a date must respect that cap.
 */
describe('G7 observe-the-sky · elongation + the inner/outer split', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('greatest elongation is eccentric-honest: Mercury swings 18°→28°, matching rung 1; Venus ~46.7°; outer = 180°', () => {
    const merc = compute('max-elongation', { planet: 'mercury' });
    // The FIX: Mercury's greatest (aphelion) is ~28°, not a flat arcsin(a)=22.8° — matches the
    // real ephemeris peak rung 1 shows, and the least (perihelion) is ~18°.
    expect(merc.values.greatestElongationDeg.value).toBeCloseTo(27.8, 0);
    expect(merc.values.leastElongationDeg.value).toBeCloseTo(17.9, 0);
    expect(
      compute('max-elongation', { planet: 'venus' }).values.greatestElongationDeg.value,
    ).toBeCloseTo(46.7, 0);
    expect(compute('max-elongation', { planet: 'mars' }).values.greatestElongationDeg.value).toBe(
      180,
    );
  });

  it("the sky-chart cap agrees with rung 2's eccentric limit — never the weaker circular arcsin(a) (honesty)", () => {
    // the elongation figure draws a "max" wall for inner planets; it MUST match what
    // max-elongation teaches (arcsin(a(1+e)) at aphelion), or a real Mercury plots past its wall.
    const rung2 = compute('max-elongation', { planet: 'mercury' }).values.greatestElongationDeg
      .value;
    const fig = compute('planet-elongation', { planet: 'mercury', dateIso: '2026-06-01' })
      .figure as {
      kind: string;
      maxElongationDeg?: number;
    };
    expect(fig.kind).toBe('sky-chart');
    expect(fig.maxElongationDeg).toBeCloseTo(rung2, 1); // ~27.8, NOT the circular 22.8
    expect(fig.maxElongationDeg).toBeGreaterThan(24);
    // outer planets have no cap.
    const mars = compute('planet-elongation', { planet: 'mars', dateIso: '2026-06-01' }).figure as {
      maxElongationDeg?: number;
    };
    expect(mars.maxElongationDeg).toBeUndefined();
  });

  it('the real ephemeris elongation for Mercury never exceeds its greatest (honesty check — the bug that was)', () => {
    const cap = compute('max-elongation', { planet: 'mercury' }).values.greatestElongationDeg.value;
    for (const dateIso of ['2026-01-15', '2026-06-01', '2027-03-20', '2027-11-09']) {
      const r = compute('planet-elongation', { planet: 'mercury', dateIso });
      expect(r.status.ok).toBe(true);
      expect(Math.abs(r.values.elongationDeg.value)).toBeLessThanOrEqual(cap + 1.5);
    }
    const vcap = compute('max-elongation', { planet: 'venus' }).values.greatestElongationDeg.value;
    // Mars, being outer, is free to swing well past Venus's cap at some point in a 2-year span.
    let marsMax = 0;
    for (let m = 0; m < 24; m++) {
      const iso = `2026-${String((m % 12) + 1).padStart(2, '0')}-15`;
      marsMax = Math.max(
        marsMax,
        Math.abs(
          compute('planet-elongation', { planet: 'mars', dateIso: iso }).values.elongationDeg.value,
        ),
      );
    }
    expect(marsMax).toBeGreaterThan(vcap);
  });

  it('an invalid date fails honest', () => {
    expect(compute('planet-elongation', { planet: 'venus', dateIso: 'not-a-date' }).status.ok).toBe(
      false,
    );
  });

  it('retrograde motion: Mars really does reverse (rate goes negative) somewhere in a 2-year span', () => {
    const rates: number[] = [];
    for (let m = 0; m < 26; m++) {
      const y = 2026 + Math.floor(m / 12);
      const iso = `${y}-${String((m % 12) + 1).padStart(2, '0')}-15`;
      rates.push(
        compute('retrograde-motion', { planet: 'mars', dateIso: iso }).values.apparentRateDegPerDay
          .value,
      );
    }
    expect(Math.min(...rates)).toBeLessThan(0); // retrograde happens (looping westward)
    expect(Math.max(...rates)).toBeGreaterThan(0); // and prograde the rest of the time
  });

  it('sky altitude: a planet culminates at 90° over an observer at its declination, lower elsewhere', () => {
    const dec = 20; // pretend
    // the formula is 90 − |lat − dec|; check the shape, not a specific ephemeris dec.
    const atDec = compute('planet-altitude', {
      planet: 'jupiter',
      dateIso: '2026-08-30',
      latitudeDeg: 40,
    });
    expect(atDec.status.ok).toBe(true);
    expect(atDec.values.culminationAltitudeDeg.value).toBeLessThanOrEqual(90);
    // moving your latitude toward the planet's declination maximises altitude (peaks near 90°;
    // the 5° figure grid gets within ~2.5° of the exact declination).
    const fig = atDec.figure as { series: { points: { x: number; y: number }[] }[] };
    expect(Math.max(...fig.series[0].points.map((p) => p.y))).toBeGreaterThan(87);
    void dec;
  });

  it('the G7 ladder is 4 rungs: elongation → its eccentric limit → retrograde → altitude', () => {
    const g = GOALS.get('observe-the-sky')!;
    expect(g.path.map((s) => s.formulaId)).toEqual([
      'planet-elongation',
      'max-elongation',
      'retrograde-motion',
      'planet-altitude',
    ]);
  });
});

/**
 * Family C — the "plan a mission" capstone. The assist-chain accumulator is the one new
 * formula; it must emit an HONEST upper bound (Σ 2·v∞), never a fake trajectory number. The
 * goal itself is a synthesis: it wires the transfer leg's departure/arrival speeds into the
 * Oberth + gravity-assist rungs, and the chain's Δv + the from-LEO cost into the verdict.
 */
describe('Family C plan-a-mission · assist-chain physics + capstone wiring', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('assist-chain sums the per-flyby ceiling: 4 flybys @ 10 km/s → 80 km/s upper bound', () => {
    const r = compute('assist-chain', { flybys: 4, vInfKms: 10 });
    expect(r.status.ok).toBe(true);
    expect(r.values.maxBoost.value).toBeCloseTo(80, 5); // 4 · 2 · 10
  });

  it('assist-chain is monotonic in both flybys and approach speed, and honest about being a ceiling', () => {
    const base = compute('assist-chain', { flybys: 2, vInfKms: 8 }).values.maxBoost.value;
    expect(
      compute('assist-chain', { flybys: 3, vInfKms: 8 }).values.maxBoost.value,
    ).toBeGreaterThan(base);
    expect(
      compute('assist-chain', { flybys: 2, vInfKms: 12 }).values.maxBoost.value,
    ).toBeGreaterThan(base);
    // the "this is only a ceiling" caveat must be a declared assumption, not buried in prose.
    expect(compute('assist-chain', { flybys: 4, vInfKms: 10 }).assumptions).toContain(
      'lab.assume.upper-bound-sum',
    );
  });

  it('assist-chain fails honest on a nonsense chain (negative speed, zero flybys)', () => {
    expect(compute('assist-chain', { flybys: 4, vInfKms: -1 }).status.ok).toBe(false);
    expect(compute('assist-chain', { flybys: 0, vInfKms: 10 }).status.ok).toBe(false);
  });

  it('assist-chain draws the cumulative staircase as a computed figure', () => {
    const fig = compute('assist-chain', { flybys: 4, vInfKms: 10 }).figure as {
      kind: string;
      provenance: { fidelity: string };
      steps: { n: number; cumKms: number }[];
      perFlybyKms: number;
      totalKms: number;
    };
    expect(fig.kind).toBe('assist-staircase');
    expect(fig.provenance.fidelity).toBe('computed');
    // one step per flyby, climbing 20 km/s each to an 80 km/s upper bound.
    expect(fig.perFlybyKms).toBe(20);
    expect(fig.totalKms).toBe(80);
    expect(fig.steps[0]).toEqual({ n: 1, cumKms: 20 });
    expect(fig.steps.at(-1)).toEqual({ n: 4, cumKms: 80 });
  });

  it('the capstone is cross-cutting and gated on BOTH families (spaceflight ∧ observe)', () => {
    const g = GOALS.get('plan-a-mission')!;
    expect(g.family).toBe('cross-cutting');
    expect(g.prereqs).toEqual(
      expect.arrayContaining(['leave-the-solar-system', 'observe-the-sky']),
    );
    // one prereq is a spaceflight (Family A) goal, the other an observe (Family B) goal.
    expect(GOALS.get('leave-the-solar-system')!.family).toBe('spaceflight');
    expect(GOALS.get('observe-the-sky')!.family).toBe('observe');
  });

  it('porkchop surfaces the kernel Lambert grid: a real Δv landscape with a feasible best window', () => {
    const r = compute('porkchop', { destination: 'mars' });
    expect(r.status.ok).toBe(true);
    // the cheapest heliocentric transfer to Mars is ~5.6 km/s — agrees with the transfer rung.
    expect(r.values.minDvKms.value).toBeGreaterThan(4);
    expect(r.values.minDvKms.value).toBeLessThan(9);
    expect(r.values.bestDepartureDay.value).toBeGreaterThanOrEqual(0);
    expect(r.values.bestTofDay.value).toBeGreaterThan(100); // a real Mars cruise
    const fig = r.figure as {
      kind: string;
      grid: number[][];
      depDays: number[];
      tofDays: number[];
    };
    expect(fig.kind).toBe('porkchop');
    expect(fig.grid.length).toBe(fig.tofDays.length); // rows = TOF
    expect(fig.grid[0].length).toBe(fig.depDays.length); // cols = departure
    // the grid holds real, varying Δv (not all the DV_FAILED=28 sentinel).
    const feasible = fig.grid.flat().filter((d) => d < 27.9);
    expect(feasible.length).toBeGreaterThan(100);
    expect(Math.min(...feasible)).toBeCloseTo(r.values.minDvKms.value, 5);
    // get-to-mars now teaches the porkchop between the window and the verdict.
    expect(GOALS.get('get-to-mars')!.path.map((s) => s.formulaId)).toEqual([
      'interplanetary-transfer',
      'launch-window',
      'porkchop',
      'delta-v-margin',
    ]);
  });

  it('cislunar-transfer surfaces the kernel geo-Lambert: Apollo-class TLI/LOI on the ~5-day Hohmann', () => {
    const r = compute('cislunar-transfer', {});
    expect(r.status.ok).toBe(true);
    // canonical trans-lunar injection ~3.1 km/s, LOI ~0.8-0.9 km/s, ~5-day coast.
    expect(r.values.tliKms.value).toBeGreaterThan(3);
    expect(r.values.tliKms.value).toBeLessThan(3.3);
    expect(r.values.loiKms.value).toBeGreaterThan(0.6);
    expect(r.values.loiKms.value).toBeLessThan(1.1);
    expect(r.values.tofDays.value).toBeGreaterThan(4.5);
    expect(r.values.tofDays.value).toBeLessThan(5.5);
    const fig = r.figure as { kind: string; moonTravelDeg: number; moonDistanceKm: number };
    expect(fig.kind).toBe('cislunar-eci');
    // the Moon travels ~59-66° during the coast (why you aim ahead of it).
    expect(fig.moonTravelDeg).toBeGreaterThan(55);
    expect(fig.moonTravelDeg).toBeLessThan(72);
    // reach-the-moon now shows the ECI transfer before the verdict.
    expect(GOALS.get('reach-the-moon')!.path.map((s) => s.formulaId)).toEqual([
      'orbital-velocity',
      'vis-viva',
      'hohmann-transfer',
      'cislunar-transfer',
      'delta-v-margin',
    ]);
  });

  it('the ladder synthesizes A+B in order: window → leg → inject → assist → chain → verdict', () => {
    const g = GOALS.get('plan-a-mission')!;
    expect(g.path.map((s) => s.formulaId)).toEqual([
      'launch-window',
      'interplanetary-transfer',
      'oberth-departure-dv',
      'gravity-assist',
      'assist-chain',
      'escape-verdict',
    ]);
  });

  it('the transfer leg feeds both the injection cost and the flyby, and the verdict weighs chain vs cost', () => {
    const g = GOALS.get('plan-a-mission')!;
    const inject = g.path.find((s) => s.formulaId === 'oberth-departure-dv')!;
    expect(inject.wiresFrom).toEqual([{ fromStep: 1, output: 'dv1', toInput: 'vInfKms' }]);
    const assist = g.path.find((s) => s.formulaId === 'gravity-assist')!;
    expect(assist.wiresFrom).toEqual([{ fromStep: 1, output: 'dv2', toInput: 'vInfKms' }]);
    const verdict = g.path.find((s) => s.formulaId === 'escape-verdict')!;
    // the chain Δv is the assist; required is SOLAR ESCAPE from LEO (~8.7), preset — NOT the
    // cheaper Jupiter-leg cost (chemical clears that, which would falsify the verdict narrative).
    expect(verdict.wiresFrom).toEqual([{ fromStep: 4, output: 'maxBoost', toInput: 'assistKms' }]);
    expect(verdict.presetInputs?.requiredKms).toBe(8.7);
    // sanity: with 8.5 chemical capacity, chemical ALONE (no assist) falls short of the 8.7 tour bar.
    expect(
      compute('escape-verdict', { capacityKms: 8.5, assistKms: 0, requiredKms: 8.7 }).status.ok,
    ).toBe(false);
  });
});

/**
 * Reach-orbit — the real gravity-turn from the kernel's ascent integrator. Orbit is SPEED, and
 * getting there costs the 7.8 km/s of orbital speed PLUS the gravity/drag/steering losses; a
 * heavy enough payload fails to reach orbit (fail-honest). Surfaces integrateAscent.
 */
describe('reach-orbit · the real ascent (integrateAscent) + the Δv tax', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('the default stack reaches orbit and breaks out the three real losses', () => {
    const r = compute('ascent-to-orbit', { payloadKg: 6000, targetOrbitAltKm: 200 });
    expect(r.status.ok).toBe(true);
    // gravity loss dominates (~0.8), drag is small (~0.05), steering modest (~0.2) — real ascent.
    expect(r.values.gravityLossKms.value).toBeGreaterThan(0.4);
    expect(r.values.dragLossKms.value).toBeGreaterThan(0);
    expect(r.values.dragLossKms.value).toBeLessThan(r.values.gravityLossKms.value);
    expect(r.values.steeringLossKms.value).toBeGreaterThan(0);
    // final speed ~ orbital speed at 200 km (~7.78 km/s).
    expect(r.values.finalSpeedKms.value).toBeGreaterThan(7.5);
    const fig = r.figure as { kind: string; reachedOrbit: boolean; targetSpeedKms: number };
    expect(fig.kind).toBe('ascent-trajectory');
    expect(fig.reachedOrbit).toBe(true);
    // the tax is real: orbital speed + losses is comfortably above the 7.78 orbital speed.
    const tax =
      r.values.gravityLossKms.value + r.values.dragLossKms.value + r.values.steeringLossKms.value;
    expect(tax).toBeGreaterThan(0.8);
  });

  it('a payload too heavy for the stack FAILS to reach orbit (fail-honest, figure still drawn)', () => {
    const r = compute('ascent-to-orbit', { payloadKg: 15000, targetOrbitAltKm: 200 });
    expect(r.status.ok).toBe(false);
    const fig = r.figure as { kind: string; reachedOrbit: boolean };
    expect(fig.kind).toBe('ascent-trajectory'); // partial trajectory still emitted
    expect(fig.reachedOrbit).toBe(false);
  });

  it('reach-orbit slots into the arc between launch-a-rocket and the Moon', () => {
    const g = GOALS.get('reach-orbit')!;
    expect(g.family).toBe('spaceflight');
    expect(g.prereqs).toContain('launch-a-rocket');
    expect(g.path.map((s) => s.formulaId)).toEqual(['orbital-velocity', 'ascent-to-orbit']);
  });
});

/**
 * Systems — ascent guidance (the flight computer). Runs the real integrator with a lofting
 * low-TWR upper stage so PEG (systems/peg) fires: the commanded pitch dips BELOW the horizon
 * (γ < 0), trading altitude for speed — a command no human flies by hand. Reaches orbit.
 */
describe('systems · ascent guidance (PEG lofts the arc, via the real integrator)', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('PEG lofts the arc below the horizon and still reaches orbit', () => {
    const r = compute('ascent-guidance', { upperThrustKN: 220, targetOrbitAltKm: 200 });
    expect(r.status.ok).toBe(true);
    // the signature of closed-loop PEG on a low-TWR stage: commanded pitch goes negative.
    expect(r.values.minPitchDeg.value).toBeLessThan(0);
    expect(r.values.minPitchDeg.value).toBeGreaterThan(-40); // sane loft, not inverted
    // the open→closed handoff happens partway into the flight (after the atmosphere).
    expect(r.values.handoffTimeS.value).toBeGreaterThan(30);
    expect(r.values.handoffTimeS.value).toBeLessThan(r.values.burnTimeS.value);
    const fig = r.figure as {
      kind: string;
      reachedOrbit: boolean;
      samples: { closedLoop: boolean }[];
    };
    expect(fig.kind).toBe('guidance-timeline');
    expect(fig.reachedOrbit).toBe(true);
    // the timeline has both regimes.
    expect(fig.samples.some((s) => !s.closedLoop)).toBe(true); // open-loop table phase
    expect(fig.samples.some((s) => s.closedLoop)).toBe(true); // closed-loop PEG phase
  });

  it('flying-computer is the first systems-family goal', () => {
    const g = GOALS.get('flying-computer')!;
    expect(g.family).toBe('systems');
    expect(g.path.map((s) => s.formulaId)).toEqual(['ascent-guidance']);
  });
});

/**
 * Systems — powered-descent guidance. Drives the SAME systems/powered-descent controller the
 * /fly descent sim runs: a descent-rate schedule that lands softly with enough braking, and
 * hits hard (fail-honest) when you arrive too fast for the throttle to null the velocity.
 */
describe('systems · powered-descent guidance (the landing computer)', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('lands softly on the Moon with enough braking', () => {
    const r = compute('powered-descent', { body: 'moon', startSpeedMs: 200, maxBrakeG: 4 });
    expect(r.status.ok).toBe(true);
    expect(r.values.touchdownMs.value).toBeLessThan(3); // gentle touchdown
    const fig = r.figure as { kind: string; landedSoft: boolean; samples: unknown[] };
    expect(fig.kind).toBe('descent-guidance');
    expect(fig.landedSoft).toBe(true);
    expect(fig.samples.length).toBeGreaterThan(10);
  });

  it('CRASHES (fail-honest) when it arrives too fast for the braking authority', () => {
    const r = compute('powered-descent', { body: 'moon', startSpeedMs: 500, maxBrakeG: 2 });
    expect(r.status.ok).toBe(false);
    expect(r.values.touchdownMs.value).toBeGreaterThan(10); // hits hard
    const fig = r.figure as { kind: string; landedSoft: boolean };
    expect(fig.kind).toBe('descent-guidance'); // descent still drawn
    expect(fig.landedSoft).toBe(false);
  });

  it('landing-computer is the second systems-family goal', () => {
    const g = GOALS.get('landing-computer')!;
    expect(g.family).toBe('systems');
    expect(g.path.map((s) => s.formulaId)).toEqual(['powered-descent']);
  });
});

/**
 * Systems — re-entry lift-vector steering. Flies the systems/entry-steering bank controller
 * through a 2-DOF lifting entry and measures the survivable corridor: a ballistic capsule's is a
 * knife-edge, and lift roughly DOUBLES it (Apollo L/D≈0.3) — the honest payoff of entry-corridor.
 */
describe('systems · re-entry lift steering (lift widens the corridor)', () => {
  const compute = (id: string, i: Record<string, number | string>) => REGISTRY.get(id)!.compute(i);

  it('lift roughly doubles the survivable entry corridor vs ballistic', () => {
    const r = compute('entry-steering', { liftToDrag: 0.3, entryAngleDeg: 5.75, gLimitG: 12 });
    const fig = r.figure as { kind: string; liftWidthDeg: number; ballWidthDeg: number };
    expect(fig.kind).toBe('entry-steering');
    // ballistic corridor is a narrow knife-edge; the lifting one is meaningfully wider.
    expect(fig.ballWidthDeg).toBeGreaterThan(0);
    expect(fig.liftWidthDeg).toBeGreaterThan(fig.ballWidthDeg * 1.5);
    // more lift → wider corridor still.
    const hi = compute('entry-steering', { liftToDrag: 0.5, entryAngleDeg: 5.75, gLimitG: 12 })
      .figure as { liftWidthDeg: number };
    expect(hi.liftWidthDeg).toBeGreaterThan(fig.liftWidthDeg);
  });

  it('entry-computer is the third systems-family goal (corridor + range control)', () => {
    const g = GOALS.get('entry-computer')!;
    expect(g.family).toBe('systems');
    // Two rungs: entry-steering (lift widens the corridor) → entry-range-control (steer to a target).
    expect(g.path.map((s) => s.formulaId)).toEqual(['entry-steering', 'entry-range-control']);
  });
});
