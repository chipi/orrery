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
    {
      formulaId: 'delta-v-margin',
      narrativeKey: 'lab.goal.lar.verdict',
      wiresFrom: [{ fromStep: 4, output: 'deltaV', toInput: 'capacityKms' }],
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

/** All goals, keyed by id. */
export const GOALS: ReadonlyMap<string, Goal> = new Map<string, Goal>([
  [launchARocket.id, launchARocket],
  [motionFirstPrinciples.id, motionFirstPrinciples],
]);

/**
 * Registered formulas intentionally NOT surfaced by a goal, each with a reason.
 * Empty at S2c — every registered formula has a goal (full coverage). The CI gate
 * (goals.test.ts) fails if a formula is neither goal-reachable nor listed here.
 */
export const NOT_A_GOAL_FORMULA: ReadonlyMap<string, string> = new Map();
