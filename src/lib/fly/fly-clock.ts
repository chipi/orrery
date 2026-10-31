import { pointToScrubber, scrubberToPoint, type JourneyTimeline } from '$lib/orbital/ascent-clock';
import { terminalStartTime, unwarpDescentTime } from '$lib/orbital/descent-timewarp';
import { biasJumpToIconicMoment, type FlightEventLite } from '$lib/orbital/jump-to-met-bias';
import { CINEMATIC_TIMINGS, type CinematicBeatState } from '$lib/fly-cinematic-beats';
import type { AscentSummary } from '$lib/physics/ascent/ascent-physics';
import type { DescentSummary } from '$lib/physics/descent/descent-physics';

/**
 * `/fly` master clock + scrubber helpers (RFC-034 §4 · §11 · §12), lifted out of
 * routes/fly/+page.svelte. Plain functions over plain data — the page keeps the
 * `$state`/`$derived` and passes values in; `jumpToMet` takes an explicit
 * context (getters/setters for the page's reassigned state).
 */

/** The capture-burn window straddling arrival, days (the orbit-insertion beat). */
export const OI_WINDOW_DAYS = 5;

/**
 * Orbit-insertion callout window (callers gate on the mission being an orbiter):
 * outside the launch/descent acts, from `OI_WINDOW_DAYS` before arrival to a day after.
 */
export function isOrbitInsertionBeatActive(args: {
  showLaunch: boolean;
  showDescent: boolean;
  simDay: number;
  arrDay: number;
}): boolean {
  return (
    !args.showLaunch &&
    !args.showDescent &&
    args.simDay >= args.arrDay - OI_WINDOW_DAYS &&
    args.simDay <= args.arrDay + 1
  );
}

/** Burn firing — the last half of the window into arrival (the retro burn). */
export function isOrbitInsertionFiring(args: { simDay: number; arrDay: number }): boolean {
  return args.simDay >= args.arrDay - OI_WINDOW_DAYS / 2 && args.simDay <= args.arrDay + 0.5;
}

/**
 * Compressive coast-band width (RFC-034 §13): shrink the ascent fraction with
 * log(coast hours) so the coast band widens with real duration (~0.71 for one
 * orbit → ~0.80 for months), bounded so the launch stays scrubbable.
 * Interplanetary missions keep the default 0.15.
 */
export function coastAscentFraction(earthCoast: boolean, coastDurationDays: number): number {
  return earthCoast
    ? Math.max(0.1, Math.min(0.2, 0.2 - 0.03 * Math.log10(Math.max(1, coastDurationDays * 24))))
    : 0.15;
}

/**
 * Raw-scrubber times of the ascent separation beats (staging, fairing, SECO) —
 * already in the launch clock's base. The play-clock eases into slow-mo at each.
 */
export function launchSeparationTimes(summary: AscentSummary | null): number[] {
  return summary
    ? summary.events
        .filter((e) => e.type === 'staging' || e.type === 'fairing_jettison' || e.type === 'seco')
        .map((e) => e.t)
    : [];
}

const DESCENT_SEP_BEATS = new Set([
  'entry_flip',
  'parachute_deploy',
  'heatshield_sep',
  'backshell_sep',
  'skycrane_lower',
  'skycrane_flyaway',
  'retro_ignition',
  'airbag_deploy',
  'touchdown',
]);

/**
 * Descent separation beats in raw-scrubber time. Event times are in *trajectory*
 * time, so they are unwarped to align with where the sep actually renders (the
 * descent scene warps its sample clock — descent-timewarp.ts).
 */
export function descentSeparationTimes(summary: DescentSummary | null): number[] {
  if (!summary) return [];
  const dur = summary.totalDurationS;
  const tB = terminalStartTime(summary.states, dur);
  return summary.events
    .filter((e) => DESCENT_SEP_BEATS.has(e.type))
    .map((e) => unwarpDescentTime(e.t, dur, tB));
}

/** Where the live phase sits, as the inputs `masterScrubFraction` needs. */
export interface MasterScrubInputs {
  timeline: JourneyTimeline;
  live: 'ascent' | 'descent' | 'coast' | 'cruise';
  launchT: number;
  descentT: number;
  /** Real ascent duration (the scrubber's ascent slice), seconds. */
  launchDurationS: number;
  /** Cruise duration, days: on-orbit time for an Earth-coast flight, else the transfer arc. */
  cruiseDays: number;
  coastMetDays: number;
  simDay: number;
  depDay: number;
}

/** The unified scrubber fraction ∈ [0,1] for the live phase. */
export function masterScrubFraction(i: MasterScrubInputs): number {
  switch (i.live) {
    case 'ascent':
      return pointToScrubber(
        { phase: 'ascent', ascentT: Math.max(0, i.launchT), cruiseMetDays: 0 },
        i.timeline,
      );
    case 'descent':
      return pointToScrubber(
        {
          phase: 'descent',
          ascentT: i.launchDurationS,
          cruiseMetDays: i.cruiseDays,
          descentT: Math.max(0, i.descentT),
        },
        i.timeline,
      );
    case 'coast':
      return pointToScrubber(
        { phase: 'cruise', ascentT: i.launchDurationS, cruiseMetDays: i.coastMetDays },
        i.timeline,
      );
    case 'cruise':
      return pointToScrubber(
        {
          phase: 'cruise',
          ascentT: i.launchDurationS,
          cruiseMetDays: Math.max(0, i.simDay - i.depDay),
        },
        i.timeline,
      );
  }
}

/**
 * A cruise MET (days) → its % position on the ACTIVE bar. On the unified bar
 * the cruise occupies `[seam, 1]`; on the cruise-only bar it is `[0, 1]`.
 */
export function cruiseTickPercent(metDays: number, arcTotalDays: number, seam: number): number {
  const frac = arcTotalDays > 0 ? metDays / arcTotalDays : 0;
  return Math.max(0, Math.min(100, (seam + (1 - seam) * frac) * 100));
}

/** What a scrub of the unified bar to fraction `u` should write back. */
export type MasterScrubTarget =
  | { phase: 'ascent'; launchT: number }
  | { phase: 'descent'; descentT: number }
  | { phase: 'coast'; coastMetDays: number }
  | { phase: 'cruise'; cruiseMetDays: number };

/**
 * Resolve a unified-bar scrub. The cruise band of a Tier-1 Earth-orbit flight
 * is the orbit-coast act, hence the `earthCoast` fork.
 */
export function masterScrubTarget(
  u: number,
  timeline: JourneyTimeline,
  earthCoast: boolean,
): MasterScrubTarget {
  const pt = scrubberToPoint(u, timeline);
  if (pt.phase === 'ascent') return { phase: 'ascent', launchT: pt.ascentT };
  if (pt.phase === 'descent') return { phase: 'descent', descentT: pt.descentT ?? 0 };
  if (earthCoast) return { phase: 'coast', coastMetDays: pt.cruiseMetDays };
  return { phase: 'cruise', cruiseMetDays: pt.cruiseMetDays };
}

/** A jump/drag that crosses more than a mission year triggers the cinematic cut. */
export function isCinematicCutJump(previousSimDay: number, nextSimDay: number): boolean {
  return Math.abs(nextSimDay - previousSimDay) > CINEMATIC_TIMINGS.CUT_THRESHOLD_DAYS;
}

/**
 * The page state `jumpToMet` reads and writes. Getters/setters rather than
 * values because the page reassigns these `$state`s and module-level lets.
 */
export interface JumpToMetContext {
  getSimDay: () => number;
  setSimDay: (day: number) => void;
  getIsPlaying: () => boolean;
  setIsPlaying: (playing: boolean) => void;
  /** Mission departure day and the authored flight events (for the iconic-moment bias). */
  getMissionDepDay: () => number;
  getMissionFlightEvents: () => ReadonlyArray<FlightEventLite> | null | undefined;
  /** Wall-clock ms until which the camera converges fast on its sub-phase target. */
  setCamSnapUntil: (ms: number) => void;
  setLaunchDwellUntil: (ms: number) => void;
  getOpeningDurationMs: () => number;
  /** Re-arm the cinematic opening (opening clock, `enterOpening`, overlay opacities to 0). */
  restartOpening: () => void;
  cine: CinematicBeatState;
  /** Sensory cue fired on every jump. */
  cueSelect: () => void;
  now: () => number;
}

/**
 * #107 Step 6g — click-event-to-jump scrubber. Snaps `simDay` to (mission
 * depart day + the event's MET) and pauses the sim so the moment can be
 * examined. No animation, even outside reduced-motion.
 */
export function jumpToMet(ctx: JumpToMetContext, metDays: number): void {
  if (!Number.isFinite(metDays) || metDays < 0) return;
  ctx.cueSelect();
  const previousSimDay = ctx.getSimDay();
  // Bias the target onto the iconic-shot hold window when the jump lands on a
  // flyby / EDL event (see $lib/orbital/jump-to-met-bias).
  const landMet = biasJumpToIconicMoment(metDays, ctx.getMissionFlightEvents());
  ctx.setSimDay(ctx.getMissionDepDay() + landMet);
  if (ctx.getIsPlaying()) ctx.setIsPlaying(false);
  ctx.setCamSnapUntil(ctx.now() + 700);
  // Re-jumping to the same flyby would normally fail to re-arm peakHold because
  // the arming guard (peakHoldArmedForFlybyMet !== currentFrameFlybyMet) treats
  // the prior arm as still valid though peakHoldUntil has long expired. Clearing
  // the arm flag lets the next animate frame re-detect the window and re-fire
  // the freeze, so every timeline click yields the iconic hold.
  ctx.cine.peakHoldArmedForFlybyMet = null;
  ctx.cine.peakHoldUntil = 0;
  // Jumping back to MET 0 (Launch) replays the cinematic opening (#86) and the
  // W3.3 pre-launch dwell; non-zero jumps want the snap the camSnapUntil
  // window already provides.
  if (metDays === 0) {
    ctx.restartOpening();
    // Hold sim until the opening fade-out completes + 300 ms settle so the
    // first animate frame doesn't fire under visible opening text.
    ctx.setLaunchDwellUntil(ctx.now() + ctx.getOpeningDurationMs() + 300);
    // W3.7 — re-arm the cruise hold so it fires again on the mission replay.
    ctx.cine.cruiseHoldFired = false;
  }
  // W3.6 — deliberate cut when the jump crosses > 1 mission year; the
  // fade-to-black overlay handles the visual cut.
  if (isCinematicCutJump(previousSimDay, ctx.getSimDay())) {
    ctx.cine.cutStartedAt = ctx.now();
  }
}
