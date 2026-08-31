/**
 * The goal registry (S2c · RFC-037 Amendment 01, Contract 5). A `Goal` is an
 * ordered curriculum path over registered formulas — simultaneously the learner's
 * lesson, the S2.5 workbench validation scenario, and an engineering acceptance
 * anchor. The `Goal`/`GoalStep` shapes are frozen in `spec.ts`.
 *
 * Coverage is bidirectional (goals.test.ts): every registered formula must be
 * reachable from ≥1 goal (or explicitly on NOT_A_GOAL_FORMULA), AND every wire
 * must name a real upstream output with matching units (no implicit conversion).
 *
 * Each goal also carries a `connection` (v0.9 reality-punch): the "so what" panel
 * that links the lesson's conclusion out to the real missions, vehicles, programs
 * and launch sites in Orrery that live this physics — plus the citizen-science hook.
 * Every `href` is an INTERNAL route; its target id is checked against the real data
 * index by goals.test.ts (check-internal-links only sees the query-stripped path).
 *
 * Ladder order (the natural mission arc): launch → land on Earth → reach the Moon →
 * land on the Moon → get to Mars → land on Mars. The three landings share the SAME
 * physics (terminal velocity + a soft-landing check); the BODY's atmosphere changes
 * the answer — thick air (Earth) nearly lands you on a chute alone, no air (Moon)
 * forces an all-powered descent, thin air (Mars) leaves you needing a big supplement.
 */
import type { Goal } from '../spec';

/**
 * M1 "launch a rocket" — the first-principles critical path: force → weight →
 * momentum → thrust-beats-weight → the rocket equation → the Δv verdict. The
 * verdict rung WIRES its capacity from Tsiolkovsky's Δv output (exercises the
 * `wiresFrom` model — Fable-5 r2/NEW-5).
 */
export const launchARocket: Goal = {
  id: 'launch-a-rocket',
  titleKey: 'lab.goal.launch-a-rocket.title',
  family: 'spaceflight',
  tier: 1,
  prereqs: [],
  path: [
    { formulaId: 'newton-second-law', narrativeKey: 'lab.goal.lar.force' },
    { formulaId: 'weight', narrativeKey: 'lab.goal.lar.weight' },
    { formulaId: 'momentum', narrativeKey: 'lab.goal.lar.momentum' },
    { formulaId: 'twr', narrativeKey: 'lab.goal.lar.twr' },
    { formulaId: 'tsiolkovsky', narrativeKey: 'lab.goal.lar.tsiolkovsky' },
    { formulaId: 'launch-site', narrativeKey: 'lab.goal.lar.launch-site' },
    { formulaId: 'dv-to-orbit', narrativeKey: 'lab.goal.lar.required' },
    {
      formulaId: 'reach-orbit-verdict',
      narrativeKey: 'lab.goal.lar.verdict',
      // The payoff wires the rocket's Δv (Tsiolkovsky), the launch-site head-start,
      // AND the DERIVED Δv-to-orbit (no magic 9.4) — a better site buys margin, and
      // switching worlds updates the target honestly.
      wiresFrom: [
        { fromStep: 4, output: 'deltaV', toInput: 'capacityKms' },
        { fromStep: 5, output: 'boost', toInput: 'boostKms' },
        { fromStep: 6, output: 'required', toInput: 'requiredKms' },
      ],
    },
  ],
  connection: {
    whyKey: 'lab.conn.lar.why',
    hookKey: 'lab.conn.lar.hook',
    links: [
      { labelKey: 'lab.conn.lar.kourou', href: '/earth?site=kourou-ela-3', agency: 'ESA' },
      { labelKey: 'lab.conn.lar.cape', href: '/earth?site=lc-39a', agency: 'NASA' },
      {
        labelKey: 'lab.conn.lar.baikonur',
        href: '/earth?site=gagarins-start',
        agency: 'Roscosmos',
      },
      { labelKey: 'lab.conn.lar.wenchang', href: '/earth?site=wenchang-lc-101', agency: 'CNSA' },
      { labelKey: 'lab.conn.lar.sriharikota', href: '/earth?site=sriharikota-slp', agency: 'ISRO' },
      { labelKey: 'lab.conn.lar.vostok1', href: '/fly?mission=vostok-1', agency: 'Roscosmos' },
    ],
  },
};

/**
 * "Scale a rocket" — the design depth behind M1. M1 asks "does my Δv clear the bar?";
 * this asks "so what rocket does that TAKE?" The first-principles cascade: payload → gross
 * mass (the rocket equation solved for mass, with the single-stage wall) → liftoff thrust →
 * engine count → why you must stage → when to strap on boosters. Every rung ties to a real
 * engine or launcher: the same job builds a 9-Merlin Falcon 9, a 5-F-1 Saturn V, or a
 * single-RD-180 Atlas V with solids. Two rungs WIRE the gross mass; one wires the thrust.
 */
export const scaleARocket: Goal = {
  id: 'scale-a-rocket',
  titleKey: 'lab.goal.scale-rocket.title',
  family: 'spaceflight',
  tier: 1,
  prereqs: ['launch-a-rocket'],
  path: [
    { formulaId: 'rocket-sizing', narrativeKey: 'lab.goal.sar.size' },
    {
      formulaId: 'liftoff-thrust',
      narrativeKey: 'lab.goal.sar.thrust',
      wiresFrom: [{ fromStep: 0, output: 'grossMassKg', toInput: 'grossMassKg' }],
    },
    {
      formulaId: 'engine-count',
      narrativeKey: 'lab.goal.sar.engines',
      wiresFrom: [{ fromStep: 1, output: 'thrustN', toInput: 'thrustN' }],
    },
    { formulaId: 'staging', narrativeKey: 'lab.goal.sar.stage' },
    {
      formulaId: 'booster-count',
      narrativeKey: 'lab.goal.sar.boosters',
      wiresFrom: [{ fromStep: 0, output: 'grossMassKg', toInput: 'grossMassKg' }],
    },
    {
      // The finale: the whole chain on the biggest rocket ever built. Preset to Starship +
      // Super Heavy — 33 Raptors, ~76 MN, a ~5,000 t stainless-steel stack at TWR ~1.5.
      formulaId: 'cluster-thrust',
      narrativeKey: 'lab.goal.sar.starship',
      presetInputs: { engineCount: 33, engineThrustN: 2300000, grossMassKg: 5000000 },
    },
  ],
  connection: {
    whyKey: 'lab.conn.sar.why',
    hookKey: 'lab.conn.sar.hook',
    links: [
      { labelKey: 'lab.conn.sar.starship', href: '/fleet?id=starship', agency: 'SpaceX' },
      { labelKey: 'lab.conn.sar.raptor', href: '/fleet?id=raptor', agency: 'SpaceX' },
      { labelKey: 'lab.conn.sar.falcon9', href: '/fleet?id=falcon-9', agency: 'SpaceX' },
      { labelKey: 'lab.conn.sar.merlin', href: '/fleet?id=merlin-1d', agency: 'SpaceX' },
      { labelKey: 'lab.conn.sar.saturnv', href: '/fleet?id=saturn-v', agency: 'NASA' },
      { labelKey: 'lab.conn.sar.f1', href: '/fleet?id=f-1', agency: 'NASA' },
      { labelKey: 'lab.conn.sar.atlasv', href: '/fleet?id=atlas-v', agency: 'ULA' },
      { labelKey: 'lab.conn.sar.ariane5', href: '/fleet?id=ariane-5', agency: 'ESA' },
      { labelKey: 'lab.conn.sar.n1', href: '/fleet?id=n1', agency: 'Roscosmos' },
    ],
  },
};

/**
 * M1.5 "land on Earth" — the return leg the very first spaceflights flew: ride a
 * rocket up, fall back under a parachute. It reuses the SAME terminal-velocity +
 * soft-landing-check as "land on Mars", but on Earth. The lesson: Earth's thick air
 * (ρ ≈ 1.2, ~60× Mars) does almost all the braking — a capsule that would smash in
 * at ~46 m/s bare is slowed to ~10 m/s under a chute, which a water splashdown or a
 * crushable couch survives. The identical craft hits Mars at ~50 m/s (M5 fails) and
 * gets NO braking on the airless Moon (M3, all-powered). Same rules; the body's air
 * changes the answer.
 */
export const landOnEarth: Goal = {
  id: 'land-on-earth',
  titleKey: 'lab.goal.land-earth.title',
  family: 'spaceflight',
  tier: 2,
  prereqs: ['launch-a-rocket'],
  path: [
    // The full "come home" sequence — the seven minutes the arc was missing: deorbit →
    // re-entry heating → parachute → splashdown.
    { formulaId: 'deorbit-burn', narrativeKey: 'lab.goal.loe.deorbit' },
    { formulaId: 'entry-heating', narrativeKey: 'lab.goal.loe.entry' },
    {
      formulaId: 'terminal-velocity',
      narrativeKey: 'lab.goal.loe.capsule',
      presetInputs: { body: 'earth', areaM2: 10, massKg: 2000 },
    },
    {
      formulaId: 'terminal-velocity',
      narrativeKey: 'lab.goal.loe.parachute',
      presetInputs: { body: 'earth', areaM2: 200, massKg: 2000 },
    },
    {
      formulaId: 'soft-landing-check',
      narrativeKey: 'lab.goal.loe.verdict',
      // A water splashdown / crushable couch survives ~12 m/s; the chute brings the
      // capsule to ~10 m/s, so Earth PASSES — the success case the identical Mars craft
      // FAILS (M5). safeMs preset to the splashdown-survivable speed. Wires the parachute
      // rung (now index 3, after deorbit + entry).
      presetInputs: { safeMs: 12 },
      wiresFrom: [{ fromStep: 3, output: 'vTerminal', toInput: 'terminalMs' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.loe.why',
    hookKey: 'lab.conn.loe.hook',
    links: [
      { labelKey: 'lab.conn.loe.vostok1', href: '/fly?mission=vostok-1', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.loe.freedom7', href: '/fly?mission=freedom-7', agency: 'NASA' },
      { labelKey: 'lab.conn.loe.friendship7', href: '/fly?mission=friendship-7', agency: 'NASA' },
      { labelKey: 'lab.conn.loe.dragon', href: '/fleet?id=crew-dragon', agency: 'SpaceX' },
      { labelKey: 'lab.conn.loe.soyuz', href: '/fleet?id=soyuz-ms', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.loe.orion', href: '/fleet?id=orion', agency: 'NASA' },
      { labelKey: 'lab.conn.loe.falcon9', href: '/fleet?id=falcon-9', agency: 'SpaceX' },
    ],
    nextKey: 'lab.conn.loe.next',
  },
};

/**
 * "Move a thing" — the pre-rocket motion primitives a learner starts from:
 * drop a mass (free-fall), throw a mass (projectile). Covers the kinematics
 * formulas that aren't on the launch spine.
 */
export const motionFirstPrinciples: Goal = {
  id: 'motion-first-principles',
  titleKey: 'lab.goal.motion.title',
  family: 'cross-cutting',
  tier: 1,
  prereqs: [],
  path: [
    { formulaId: 'free-fall', narrativeKey: 'lab.goal.motion.drop' },
    { formulaId: 'projectile', narrativeKey: 'lab.goal.motion.throw' },
  ],
  connection: {
    whyKey: 'lab.conn.motion.why',
    hookKey: 'lab.conn.motion.hook',
    links: [
      { labelKey: 'lab.conn.motion.freedom7', href: '/fly?mission=freedom-7', agency: 'NASA' },
      { labelKey: 'lab.conn.motion.vostok1', href: '/fly?mission=vostok-1', agency: 'Roscosmos' },
    ],
  },
};

/**
 * M2 "reach the Moon" — from in-orbit to at-the-Moon. The first-principles path:
 * circular orbital velocity (you must ORBIT first) → vis-viva (the general speed
 * law) → the Hohmann transfer (the two-burn ellipse LEO→lunar distance) → the Δv
 * verdict, whose required Δv WIRES from the Hohmann total (exercises a wire into a
 * REUSED formula — delta-v-margin, same as M1 but a different output→input mapping).
 */
export const reachTheMoon: Goal = {
  id: 'reach-the-moon',
  titleKey: 'lab.goal.reach-moon.title',
  family: 'spaceflight',
  tier: 2,
  prereqs: ['launch-a-rocket'],
  path: [
    { formulaId: 'orbital-velocity', narrativeKey: 'lab.goal.rtm.orbit' },
    { formulaId: 'vis-viva', narrativeKey: 'lab.goal.rtm.visviva' },
    { formulaId: 'hohmann-transfer', narrativeKey: 'lab.goal.rtm.hohmann' },
    {
      formulaId: 'delta-v-margin',
      narrativeKey: 'lab.goal.rtm.verdict',
      wiresFrom: [{ fromStep: 2, output: 'total', toInput: 'requiredKms' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.rtm.why',
    hookKey: 'lab.conn.rtm.hook',
    links: [
      { labelKey: 'lab.conn.rtm.apollo11', href: '/fly?mission=apollo11', agency: 'NASA' },
      { labelKey: 'lab.conn.rtm.apollo13', href: '/fly?mission=apollo13', agency: 'NASA' },
      { labelKey: 'lab.conn.rtm.luna16', href: '/fly?mission=luna16', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.rtm.change5', href: '/fly?mission=change5', agency: 'CNSA' },
      { labelKey: 'lab.conn.rtm.chandrayaan1', href: '/fly?mission=chandrayaan1', agency: 'ISRO' },
      { labelKey: 'lab.conn.rtm.program', href: '/programs/apollo', agency: 'NASA' },
    ],
  },
};

/**
 * M3 "land on the Moon" — from lunar orbit to the surface. Reuses the now body-
 * parametric rungs (orbital-velocity + TWR, preset to the Moon) and adds the powered-
 * descent burn: circle the Moon → thrust must beat lunar gravity to control the fall →
 * the descent Δv (cancel orbital speed + gravity loss) → do you have the fuel to land
 * softly? `presetInputs` puts the shared formulas on the Moon; the descent Δv wires
 * into the verdict's required.
 */
export const landOnTheMoon: Goal = {
  id: 'land-on-the-moon',
  titleKey: 'lab.goal.land-moon.title',
  family: 'spaceflight',
  tier: 3,
  prereqs: ['reach-the-moon'],
  path: [
    {
      formulaId: 'orbital-velocity',
      narrativeKey: 'lab.goal.ltm.orbit',
      presetInputs: { body: 'moon', altitudeKm: 100 },
    },
    { formulaId: 'twr', narrativeKey: 'lab.goal.ltm.twr', presetInputs: { body: 'moon' } },
    {
      formulaId: 'descent-burn',
      narrativeKey: 'lab.goal.ltm.descent',
      // Wires BOTH the orbital speed to cancel AND the lander's TWR — the descent Δv
      // now falls straight out of the two rungs above it (a better model than g·t).
      wiresFrom: [
        { fromStep: 0, output: 'vCirc', toInput: 'vOrbitKms' },
        { fromStep: 1, output: 'twr', toInput: 'twr' },
      ],
    },
    {
      formulaId: 'delta-v-margin',
      narrativeKey: 'lab.goal.ltm.verdict',
      // A lander's DESCENT stage carries ~2.5 km/s, not a full launch vehicle's 8.5 —
      // preset it so the margin is honestly tight (Apollo-class), not a fake landslide
      // (review M-2). The learner sees descent is margin-critical, which is the lesson.
      presetInputs: { capacityKms: 2.5 },
      wiresFrom: [{ fromStep: 2, output: 'descentDv', toInput: 'requiredKms' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.ltm.why',
    hookKey: 'lab.conn.ltm.hook',
    links: [
      { labelKey: 'lab.conn.ltm.apollo-lm', href: '/fleet?id=apollo-lm', agency: 'NASA' },
      { labelKey: 'lab.conn.ltm.apollo11', href: '/moon?site=apollo11', agency: 'NASA' },
      { labelKey: 'lab.conn.ltm.luna9', href: '/fly?mission=luna9', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.ltm.change4', href: '/moon?site=change4', agency: 'CNSA' },
      { labelKey: 'lab.conn.ltm.chandrayaan3', href: '/moon?site=chandrayaan3', agency: 'ISRO' },
      { labelKey: 'lab.conn.ltm.slim', href: '/moon?site=slim', agency: 'JAXA' },
      { labelKey: 'lab.conn.ltm.beresheet', href: '/fly?mission=beresheet', agency: 'SpaceIL' },
    ],
  },
};

/**
 * M4 "get to Mars" — the same Hohmann transfer as the Moon, one frame out: everything
 * orbits the Sun. Reuses interplanetary-transfer (Earth→Mars, heliocentric), teaches the
 * synodic launch window (~26 months), and the Δv verdict — honest that this Δv is FROM
 * Earth's solar orbit, on top of leaving Earth. The transfer total wires into the verdict.
 */
export const getToMars: Goal = {
  id: 'get-to-mars',
  titleKey: 'lab.goal.get-mars.title',
  family: 'spaceflight',
  tier: 4,
  prereqs: ['reach-the-moon'],
  path: [
    { formulaId: 'interplanetary-transfer', narrativeKey: 'lab.goal.gtm.transfer' },
    { formulaId: 'launch-window', narrativeKey: 'lab.goal.gtm.window' },
    {
      formulaId: 'delta-v-margin',
      narrativeKey: 'lab.goal.gtm.verdict',
      // A Mars-injection stage from Earth's solar orbit carries ~6 km/s — tight against
      // the ~5.6 heliocentric transfer Δv (honest margin, not a full launch vehicle's 8.5).
      presetInputs: { capacityKms: 6 },
      wiresFrom: [{ fromStep: 0, output: 'total', toInput: 'requiredKms' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.gtm.why',
    hookKey: 'lab.conn.gtm.hook',
    links: [
      { labelKey: 'lab.conn.gtm.perseverance', href: '/fly?mission=perseverance', agency: 'NASA' },
      { labelKey: 'lab.conn.gtm.tianwen1', href: '/fly?mission=tianwen1', agency: 'CNSA' },
      { labelKey: 'lab.conn.gtm.hope', href: '/fly?mission=hope-probe', agency: 'MBRSC' },
      { labelKey: 'lab.conn.gtm.mangalyaan', href: '/fly?mission=mangalyaan', agency: 'ISRO' },
      { labelKey: 'lab.conn.gtm.mars-express', href: '/fly?mission=mars-express', agency: 'ESA' },
      { labelKey: 'lab.conn.gtm.program', href: '/programs/mars-rovers', agency: 'NASA' },
    ],
  },
};

/**
 * M5 "land on Mars" — the hardest landing, and the lesson is a FAILURE. Mars has air,
 * but ~1/60 of Earth's: terminal velocity is still hundreds of m/s, and even a huge
 * parachute only reaches tens of m/s. The soft-landing check comes up short → you must
 * fire engines (the sky-crane). Two terminal-velocity rungs (bare capsule, then a big
 * chute — presetInputs sets the area) feed the verdict, which fails HONEST: that's why
 * every Mars lander ends under power ("seven minutes of terror").
 */
export const landOnMars: Goal = {
  id: 'land-on-mars',
  titleKey: 'lab.goal.land-mars.title',
  family: 'spaceflight',
  tier: 5,
  prereqs: ['get-to-mars'],
  path: [
    {
      formulaId: 'terminal-velocity',
      narrativeKey: 'lab.goal.lom.terminal',
      presetInputs: { body: 'mars', areaM2: 10 },
    },
    {
      formulaId: 'terminal-velocity',
      narrativeKey: 'lab.goal.lom.parachute',
      presetInputs: { body: 'mars', areaM2: 200 },
    },
    {
      formulaId: 'soft-landing-check',
      narrativeKey: 'lab.goal.lom.verdict',
      wiresFrom: [{ fromStep: 1, output: 'vTerminal', toInput: 'terminalMs' }],
    },
    {
      formulaId: 'airbags-check',
      narrativeKey: 'lab.goal.lom.airbags',
      wiresFrom: [{ fromStep: 1, output: 'vTerminal', toInput: 'impactMs' }],
    },
    {
      formulaId: 'retro-descent',
      narrativeKey: 'lab.goal.lom.retro',
      wiresFrom: [{ fromStep: 1, output: 'vTerminal', toInput: 'terminalMs' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.lom.why',
    hookKey: 'lab.conn.lom.hook',
    links: [
      { labelKey: 'lab.conn.lom.pathfinder', href: '/mars?site=mars-pathfinder', agency: 'NASA' },
      { labelKey: 'lab.conn.lom.opportunity', href: '/mars?site=opportunity', agency: 'NASA' },
      { labelKey: 'lab.conn.lom.curiosity', href: '/mars?site=curiosity', agency: 'NASA' },
      { labelKey: 'lab.conn.lom.perseverance', href: '/mars?site=perseverance', agency: 'NASA' },
      { labelKey: 'lab.conn.lom.viking1', href: '/mars?site=viking1-lander', agency: 'NASA' },
      { labelKey: 'lab.conn.lom.zhurong', href: '/mars?site=zhurong', agency: 'CNSA' },
      { labelKey: 'lab.conn.lom.mars3', href: '/mars?site=mars3', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.lom.schiaparelli', href: '/mars?site=schiaparelli', agency: 'ESA' },
    ],
    nextKey: 'lab.conn.lom.next',
  },
};

/**
 * M6 "leave the solar system" — the last spaceflight rung, and a genuinely NEW physics:
 * hyperbolic escape, not another closed transfer. Solar escape velocity at 1 AU (~42 km/s)
 * → the heliocentric Δv beyond Earth's orbital motion to reach it (~12.3 km/s) → the
 * gravity assist that supplies what a chemical rocket can't → a verdict wiring the assist
 * boost and the escape Δv. The lesson: no rocket has ever escaped the Sun on its own thrust
 * — every craft that left (Voyager, Pioneer, New Horizons) was slung out by a planet.
 */
export const leaveTheSolarSystem: Goal = {
  id: 'leave-the-solar-system',
  titleKey: 'lab.goal.leave-system.title',
  family: 'spaceflight',
  tier: 6,
  prereqs: ['get-to-mars'],
  path: [
    { formulaId: 'solar-escape-velocity', narrativeKey: 'lab.goal.lss.escape' },
    {
      formulaId: 'heliocentric-escape-dv',
      narrativeKey: 'lab.goal.lss.helio',
      // The escape SPEED (42) wires in; you already own Earth's 29.8, so the ladder shows
      // the heliocentric excess you need is just the ~12.3 difference.
      wiresFrom: [{ fromStep: 0, output: 'vEsc', toInput: 'escapeKms' }],
    },
    {
      formulaId: 'oberth-departure-dv',
      narrativeKey: 'lab.goal.lss.oberth',
      // The honest twist: that 12.3 heliocentric excess costs only ~8.7 km/s of Δv FROM
      // LEO, because you burn deep in Earth's well (Oberth). Wires v∞ from the rung above.
      wiresFrom: [{ fromStep: 1, output: 'dvKms', toInput: 'vInfKms' }],
    },
    { formulaId: 'gravity-assist', narrativeKey: 'lab.goal.lss.assist' },
    {
      formulaId: 'escape-verdict',
      narrativeKey: 'lab.goal.lss.verdict',
      // Required is the Oberth-discounted from-LEO Δv (~8.7); a strong stage (~8.5) lands
      // on the line, and the flyby boost supplies margin + the speed to tour. Honest frame.
      wiresFrom: [
        { fromStep: 3, output: 'boost', toInput: 'assistKms' },
        { fromStep: 2, output: 'dvFromLeo', toInput: 'requiredKms' },
      ],
    },
  ],
  connection: {
    whyKey: 'lab.conn.lss.why',
    hookKey: 'lab.conn.lss.hook',
    links: [
      { labelKey: 'lab.conn.lss.voyager1', href: '/fly?mission=voyager-1', agency: 'NASA' },
      { labelKey: 'lab.conn.lss.voyager2', href: '/fly?mission=voyager-2', agency: 'NASA' },
      { labelKey: 'lab.conn.lss.pioneer10', href: '/fly?mission=pioneer-10', agency: 'NASA' },
      { labelKey: 'lab.conn.lss.newhorizons', href: '/fly?mission=new-horizons', agency: 'NASA' },
      { labelKey: 'lab.conn.lss.galileo', href: '/fly?mission=galileo', agency: 'NASA' },
      // The slingshot run backwards — assists that BRAKE, to fall inward instead of out.
      { labelKey: 'lab.conn.lss.messenger', href: '/fly?mission=messenger', agency: 'NASA' },
      { labelKey: 'lab.conn.lss.parker', href: '/fly?mission=parker-solar-probe', agency: 'NASA' },
    ],
  },
};

// ─── Family B — observe & orbit ("understand the sky") ───────────────────────

/**
 * G8 "Moon phases" — the first Family-B goal, a shift from dynamics (Δv, trajectories) to
 * OBSERVATION (what the sky is doing). Hybrid precision: it teaches the geometry — the lit
 * fraction is ½(1 + cos α) of the Sun–Moon–Earth phase angle — but reads the ACTUAL phase for
 * a chosen date from Orrery's ephemeris, so the disc matches tonight's Moon. Introduces the
 * date input and the first observe-family figure (the phase disc). The connection sends you to
 * LOOK — the real Moon on /moon, the live sky on /explore — rather than to a catalogue item.
 */
export const moonPhases: Goal = {
  id: 'moon-phases',
  titleKey: 'lab.goal.moon-phases.title',
  family: 'observe',
  tier: 2,
  prereqs: [],
  path: [
    { formulaId: 'moon-phase', narrativeKey: 'lab.goal.g8.phase' },
    { formulaId: 'moon-distance', narrativeKey: 'lab.goal.g8.distance' },
    { formulaId: 'eclipse-seasons', narrativeKey: 'lab.goal.g8.eclipse' },
    { formulaId: 'moon-altitude', narrativeKey: 'lab.goal.g8.altitude' },
  ],
  connection: {
    whyKey: 'lab.conn.g8.why',
    hookKey: 'lab.conn.g8.hook',
    links: [
      { labelKey: 'lab.conn.g8.moon', href: '/moon' },
      { labelKey: 'lab.conn.g8.explore', href: '/explore' },
    ],
  },
};

/**
 * G10 "Choose an orbit" — the satellite-designer's first decision, and a shift from "get to
 * orbit" (Family A) to "which orbit, and why". Altitude sets speed AND period (rung 1); one
 * special altitude makes the period match the day so the satellite hovers — geostationary
 * (rung 2); and altitude costs time — the signal round-trip that pushed the megaconstellations
 * low (rung 3, wired from the geostationary altitude). Reuses the orbital helpers on any body.
 */
export const chooseAnOrbit: Goal = {
  id: 'choose-an-orbit',
  titleKey: 'lab.goal.choose-orbit.title',
  family: 'observe',
  tier: 3,
  prereqs: [],
  path: [
    { formulaId: 'orbit-regime', narrativeKey: 'lab.goal.g10.regime' },
    { formulaId: 'geostationary-altitude', narrativeKey: 'lab.goal.g10.geo' },
    {
      formulaId: 'signal-latency',
      narrativeKey: 'lab.goal.g10.latency',
      // At geostationary altitude the round trip is ~0.24 s — the wire makes the "why not
      // just put everything at GEO?" answer fall out: the lag.
      wiresFrom: [{ fromStep: 1, output: 'altitudeKm', toInput: 'altitudeKm' }],
    },
  ],
  connection: {
    whyKey: 'lab.conn.g10.why',
    hookKey: 'lab.conn.g10.hook',
    links: [
      { labelKey: 'lab.conn.g10.starlink', href: '/fleet?id=starlink', agency: 'SpaceX' },
      { labelKey: 'lab.conn.g10.gps', href: '/fleet?id=gps-gnss', agency: 'USSF' },
      { labelKey: 'lab.conn.g10.goes', href: '/fleet?id=goes-noaa', agency: 'NOAA' },
      { labelKey: 'lab.conn.g10.molniya', href: '/fleet?id=molniya', agency: 'Roscosmos' },
      { labelKey: 'lab.conn.g10.sentinel', href: '/fleet?id=sentinel-copernicus', agency: 'ESA' },
    ],
  },
};

/**
 * G9 "Catch the ISS" — the most hands-on observe goal: go outside and see it. Reuses the
 * orbit-regime formula preset to the station (~420 km → ~92 min, 7.66 km/s), then the two
 * facts that let you actually spot it: the ground track slides ~23° west each orbit (Earth
 * turning underneath), and you can only see it in the ~20° twilight window when it is still
 * sunlit while your sky is dark. Sends you to the real station on /iss (and Tiangong).
 */
export const catchTheIss: Goal = {
  id: 'catch-the-iss',
  titleKey: 'lab.goal.catch-iss.title',
  family: 'observe',
  tier: 3,
  prereqs: [],
  path: [
    {
      formulaId: 'orbit-regime',
      narrativeKey: 'lab.goal.g9.orbit',
      presetInputs: { body: 'earth', altitudeKm: 420 },
    },
    {
      formulaId: 'ground-track-shift',
      narrativeKey: 'lab.goal.g9.track',
      presetInputs: { inclinationDeg: 51.6 },
      wiresFrom: [{ fromStep: 0, output: 'periodMin', toInput: 'periodMin' }],
    },
    { formulaId: 'visibility-window', narrativeKey: 'lab.goal.g9.visible' },
    { formulaId: 'iss-pass', narrativeKey: 'lab.goal.g9.pass' },
  ],
  connection: {
    whyKey: 'lab.conn.g9.why',
    hookKey: 'lab.conn.g9.hook',
    links: [
      { labelKey: 'lab.conn.g9.iss', href: '/iss' },
      { labelKey: 'lab.conn.g9.iss-fleet', href: '/fleet?id=iss', agency: 'NASA / Roscosmos' },
      { labelKey: 'lab.conn.g9.tiangong', href: '/tiangong', agency: 'CNSA' },
      { labelKey: 'lab.conn.g9.starlink', href: '/fleet?id=starlink', agency: 'SpaceX' },
    ],
  },
};

/**
 * G7 "Observe the sky" — the last observe goal, and the naked-eye question: where is a planet
 * relative to the Sun, so when can I see it? Rung 1 reads the real elongation for a date (east =
 * evening star, west = morning star, ~180° = an outer planet at opposition, up all night); rung 2
 * is the first-principles reason Mercury and Venus never leave the Sun's side — an inner planet's
 * elongation caps at arcsin(a/a⊕) (~46° for Venus, ~23° for Mercury), while outer planets swing
 * all the way to opposition. Sends you to the live sky on /explore and the planets themselves.
 */
export const observeTheSky: Goal = {
  id: 'observe-the-sky',
  titleKey: 'lab.goal.observe-sky.title',
  family: 'observe',
  tier: 2,
  prereqs: [],
  path: [
    { formulaId: 'planet-elongation', narrativeKey: 'lab.goal.g7.elong' },
    { formulaId: 'max-elongation', narrativeKey: 'lab.goal.g7.max' },
    { formulaId: 'retrograde-motion', narrativeKey: 'lab.goal.g7.retro' },
    { formulaId: 'planet-altitude', narrativeKey: 'lab.goal.g7.alt' },
  ],
  connection: {
    whyKey: 'lab.conn.g7.why',
    hookKey: 'lab.conn.g7.hook',
    links: [
      { labelKey: 'lab.conn.g7.explore', href: '/explore' },
      { labelKey: 'lab.conn.g7.venus', href: '/venus' },
      { labelKey: 'lab.conn.g7.mars', href: '/mars' },
      { labelKey: 'lab.conn.g7.worlds', href: '/worlds' },
    ],
  },
};

/** All goals, keyed by id — insertion order drives the Lab picker (the mission arc). */
export const GOALS: ReadonlyMap<string, Goal> = new Map<string, Goal>([
  [launchARocket.id, launchARocket],
  [scaleARocket.id, scaleARocket],
  [landOnEarth.id, landOnEarth],
  [motionFirstPrinciples.id, motionFirstPrinciples],
  [reachTheMoon.id, reachTheMoon],
  [landOnTheMoon.id, landOnTheMoon],
  [getToMars.id, getToMars],
  [landOnMars.id, landOnMars],
  [leaveTheSolarSystem.id, leaveTheSolarSystem],
  [moonPhases.id, moonPhases],
  [chooseAnOrbit.id, chooseAnOrbit],
  [catchTheIss.id, catchTheIss],
  [observeTheSky.id, observeTheSky],
]);

/**
 * Registered formulas intentionally NOT surfaced by a goal, each with a reason.
 * Empty at S2c — every registered formula has a goal (full coverage). The CI gate
 * (goals.test.ts) fails if a formula is neither goal-reachable nor listed here.
 */
export const NOT_A_GOAL_FORMULA: ReadonlyMap<string, string> = new Map();
