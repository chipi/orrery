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
 * S2c seeds the M1 rung ladder; M2–M6 + Family-B goals are added as their slices land.
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
    {
      formulaId: 'reach-orbit-verdict',
      narrativeKey: 'lab.goal.lar.verdict',
      // The payoff wires BOTH the rocket's Δv (Tsiolkovsky) and the launch-site
      // head-start into the verdict — a better site visibly buys margin.
      wiresFrom: [
        { fromStep: 4, output: 'deltaV', toInput: 'capacityKms' },
        { fromStep: 5, output: 'boost', toInput: 'boostKms' },
      ],
    },
  ],
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
      presetInputs: { body: 'moon' },
      wiresFrom: [{ fromStep: 0, output: 'vCirc', toInput: 'vOrbitKms' }],
    },
    {
      formulaId: 'delta-v-margin',
      narrativeKey: 'lab.goal.ltm.verdict',
      wiresFrom: [{ fromStep: 2, output: 'descentDv', toInput: 'requiredKms' }],
    },
  ],
};

/** All goals, keyed by id. */
export const GOALS: ReadonlyMap<string, Goal> = new Map<string, Goal>([
  [launchARocket.id, launchARocket],
  [motionFirstPrinciples.id, motionFirstPrinciples],
  [reachTheMoon.id, reachTheMoon],
  [landOnTheMoon.id, landOnTheMoon],
]);

/**
 * Registered formulas intentionally NOT surfaced by a goal, each with a reason.
 * Empty at S2c — every registered formula has a goal (full coverage). The CI gate
 * (goals.test.ts) fails if a formula is neither goal-reachable nor listed here.
 */
export const NOT_A_GOAL_FORMULA: ReadonlyMap<string, string> = new Map();
