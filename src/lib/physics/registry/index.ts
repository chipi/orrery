/**
 * The formula registry (S2a · RFC-037 §5). The single source the palette, the
 * Lab views, the MCP tool generator, and the coverage CI all derive from. Pure:
 * each `FormulaDef` wraps a kernel function and emits a `FigureSpec` — the app
 * and the standalone MCP process import this unchanged.
 *
 * The defs live one file per goal family (mechanics, orbits, transfer, ascent,
 * descent, come-home, rocket-sizing, escape, moon, choose-orbit, iss,
 * observe-sky; helpers used by several families in shared.ts). This file only
 * assembles REGISTRY — its order is the palette order — and re-exports the defs.
 * Formulas are pulled demand-driven by a goal (goals.ts).
 */
import type { FormulaDef, Registry } from '../spec';
import {
  tsiolkovsky,
  newtonSecondLaw,
  weight,
  momentumFormula,
  thrustFromFlowFormula,
  twrFormula,
  freeFallFormula,
  projectileFormula,
  deltaVMargin,
} from './mechanics';
import {
  orbitalVelocity,
  visVivaFormula,
  hohmannFormula,
  launchSite,
  reachOrbitVerdict,
} from './orbits';
import { interplanetaryTransfer, launchWindow, porkchop, cislunarTransfer } from './transfer';
import { ascentToOrbit, ascentGuidance, dvToOrbit } from './ascent';
import {
  descentBurn,
  poweredDescent,
  entrySteering,
  entryRangeControl,
  terminalVelocity,
  softLandingCheck,
  airbagsCheck,
  enginePerformance,
  microGSurface,
  touchdownBounce,
  retroDescent,
} from './descent';
import { deorbitBurn, entryHeating, entryCorridor } from './come-home';
import {
  rocketSizing,
  liftoffThrust,
  engineCount,
  staging,
  boosterCount,
  clusterThrust,
} from './rocket-sizing';
import {
  solarEscapeVelocity,
  heliocentricEscapeDv,
  oberthDepartureDv,
  gravityAssist,
  escapeVerdict,
  assistChain,
} from './escape';
import { moonPhaseFormula, moonDistance, eclipseSeasons, moonAltitude } from './moon';
import {
  orbitRegime,
  geostationaryAltitude,
  signalLatency,
  sunSynchronous,
  frozenOrbit,
  constellationCoverage,
  launchAzimuth,
} from './choose-orbit';
import { groundTrackShift, visibilityWindow, issPass } from './iss';
import { planetElongation, maxElongation, retrogradeMotion, planetAltitude } from './observe-sky';

export {
  tsiolkovsky,
  newtonSecondLaw,
  weight,
  momentumFormula,
  thrustFromFlowFormula,
  twrFormula,
  freeFallFormula,
  projectileFormula,
  deltaVMargin,
} from './mechanics';
export {
  orbitalVelocity,
  visVivaFormula,
  hohmannFormula,
  launchSite,
  reachOrbitVerdict,
} from './orbits';
export { interplanetaryTransfer, launchWindow, porkchop, cislunarTransfer } from './transfer';
export { ascentToOrbit, ascentGuidance, dvToOrbit } from './ascent';
export {
  descentBurn,
  poweredDescent,
  entrySteering,
  entryRangeControl,
  terminalVelocity,
  softLandingCheck,
  airbagsCheck,
  enginePerformance,
  microGSurface,
  touchdownBounce,
  retroDescent,
} from './descent';
export { deorbitBurn, entryHeating, entryCorridor } from './come-home';
export {
  rocketSizing,
  liftoffThrust,
  engineCount,
  staging,
  boosterCount,
  clusterThrust,
} from './rocket-sizing';
export {
  solarEscapeVelocity,
  heliocentricEscapeDv,
  oberthDepartureDv,
  gravityAssist,
  escapeVerdict,
  assistChain,
} from './escape';
export { moonPhaseFormula, moonDistance, eclipseSeasons, moonAltitude } from './moon';
export {
  orbitRegime,
  geostationaryAltitude,
  signalLatency,
  sunSynchronous,
  frozenOrbit,
  constellationCoverage,
  launchAzimuth,
} from './choose-orbit';
export { groundTrackShift, visibilityWindow, issPass } from './iss';
export { planetElongation, maxElongation, retrogradeMotion, planetAltitude } from './observe-sky';

/** All registered formulas, keyed by id. Add a formula in exactly one place. */
export const REGISTRY: Registry = new Map<string, FormulaDef>([
  [tsiolkovsky.id, tsiolkovsky],
  [newtonSecondLaw.id, newtonSecondLaw],
  [weight.id, weight],
  [momentumFormula.id, momentumFormula],
  [thrustFromFlowFormula.id, thrustFromFlowFormula],
  [twrFormula.id, twrFormula],
  [freeFallFormula.id, freeFallFormula],
  [projectileFormula.id, projectileFormula],
  [deltaVMargin.id, deltaVMargin],
  [launchSite.id, launchSite],
  [dvToOrbit.id, dvToOrbit],
  [reachOrbitVerdict.id, reachOrbitVerdict],
  [rocketSizing.id, rocketSizing],
  [liftoffThrust.id, liftoffThrust],
  [engineCount.id, engineCount],
  [staging.id, staging],
  [boosterCount.id, boosterCount],
  [clusterThrust.id, clusterThrust],
  [orbitalVelocity.id, orbitalVelocity],
  [visVivaFormula.id, visVivaFormula],
  [hohmannFormula.id, hohmannFormula],
  [descentBurn.id, descentBurn],
  [interplanetaryTransfer.id, interplanetaryTransfer],
  [launchWindow.id, launchWindow],
  [porkchop.id, porkchop],
  [cislunarTransfer.id, cislunarTransfer],
  [ascentToOrbit.id, ascentToOrbit],
  [ascentGuidance.id, ascentGuidance],
  [poweredDescent.id, poweredDescent],
  [entrySteering.id, entrySteering],
  [entryRangeControl.id, entryRangeControl],
  [terminalVelocity.id, terminalVelocity],
  [softLandingCheck.id, softLandingCheck],
  [airbagsCheck.id, airbagsCheck],
  [retroDescent.id, retroDescent],
  [deorbitBurn.id, deorbitBurn],
  [entryHeating.id, entryHeating],
  [entryCorridor.id, entryCorridor],
  [microGSurface.id, microGSurface],
  [touchdownBounce.id, touchdownBounce],
  [enginePerformance.id, enginePerformance],
  [solarEscapeVelocity.id, solarEscapeVelocity],
  [heliocentricEscapeDv.id, heliocentricEscapeDv],
  [oberthDepartureDv.id, oberthDepartureDv],
  [gravityAssist.id, gravityAssist],
  [escapeVerdict.id, escapeVerdict],
  [assistChain.id, assistChain],
  [moonPhaseFormula.id, moonPhaseFormula],
  [moonDistance.id, moonDistance],
  [eclipseSeasons.id, eclipseSeasons],
  [moonAltitude.id, moonAltitude],
  [orbitRegime.id, orbitRegime],
  [geostationaryAltitude.id, geostationaryAltitude],
  [signalLatency.id, signalLatency],
  [sunSynchronous.id, sunSynchronous],
  [frozenOrbit.id, frozenOrbit],
  [constellationCoverage.id, constellationCoverage],
  [launchAzimuth.id, launchAzimuth],
  [groundTrackShift.id, groundTrackShift],
  [visibilityWindow.id, visibilityWindow],
  [issPass.id, issPass],
  [planetElongation.id, planetElongation],
  [maxElongation.id, maxElongation],
  [retrogradeMotion.id, retrogradeMotion],
  [planetAltitude.id, planetAltitude],
]);

/** Default input record for a formula (drives a first compute / the invariant tests). */
export function defaultInputs(def: FormulaDef): Record<string, number | string> {
  // Injected fields (adapter-owned, e.g. fresh TLE) are NOT seeded — they never
  // live in cell.inputs, so they can't render, serialize into a share-link, or
  // be user-edited (R1 · #464). They are resolved at compute time instead.
  return Object.fromEntries(def.inputs.filter((f) => !f.injected).map((f) => [f.key, f.default]));
}
