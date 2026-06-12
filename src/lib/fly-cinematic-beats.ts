/**
 * Cinematic-beat timings + state machine for /fly.
 *
 * Polish-waves 1-3 (2026-06) layered 7 distinct cinematic beats on top
 * of the base camera lerp:
 *   W3.1 peak hold        — 2.5 s sim-time freeze at ±0.5 day from flyby
 *   W3.2 afterglow        — 6 s ease-in-out-cubic dolly pull-out
 *   W3.3 prelaunch dwell  — 4 s static Earth closeup on mission load
 *   W3.4 finale           — 12 s lock + caption + fade-to-black for OI endings
 *   W3.5 chrome suppress  — HUD/scrubber fade during W3.1/W3.2/W3.4 beats
 *   W3.6 scrub-cut        — 200 ms fade-to-black on > 365 day jumps
 *   W3.7 cruise hold      — 10 s lock at midpoint of the longest cruise gap
 *
 * Each timing lived as a magic number scattered through `fly/+page.svelte`.
 * Centralising here:
 *   - One source of truth for every duration / threshold (single import)
 *   - Reset funnel that handles mission-swap + jumpToMet(0) +
 *     onScrub-out-of-bounds cleanly (the audit flagged that the
 *     `applyMissionAsLoaded` reset path missed peak hold + afterglow +
 *     finale flags, leaving stale `peakHoldUntil > now` from the previous
 *     mission's hold leaking into the new one).
 *   - Typed predicates so the animate loop reads as English instead of
 *     `now < someUntil && now >= someStartedAt && something != null`.
 *
 * This module is data + pure functions only; nothing touches Three.js or
 * Svelte. The component holds the live CinematicBeatState and passes it
 * to the predicates each frame.
 */

/** Durations + thresholds — all in milliseconds unless suffixed `_DAYS`. */
export const CINEMATIC_TIMINGS = {
  /** W3.1 peak-hold sim-time freeze duration. Per the creative-direction
   *  guide §5 flyby-peak: "hero hold for 6-10 seconds minimum." 2500 ms
   *  felt right at the testing pass — long enough to read as a deliberate
   *  shutter-click, short enough that auto-play through a grand-tour
   *  doesn't drag. */
  PEAK_HOLD_DURATION_MS: 2500,
  /** Half-window in sim-days around a flyby's MET where the peak hold
   *  arms. Tighter than FLYBY_PEAK_DAYS (4) on purpose — the parallax
   *  arc is allowed within ±4 d, but the full freeze only fires within
   *  ±0.5 d so it's the literal closest-approach moment, not a smear. */
  PEAK_HOLD_RADIUS_DAYS: 0.5,
  /** W3.2 afterglow pull-out duration. 6 s mirrors Wernquist's Cassini
   *  Grand Finale animation; the audience needs that long to "feel the
   *  recede" as deliberate rather than as a slow lerp. */
  AFTERGLOW_DURATION_MS: 6000,
  /** Camera distance multiplier at the end of the afterglow tween.
   *  Starts at the held iconic-frame distance, ends at start × this. */
  AFTERGLOW_PULLBACK_FACTOR: 4.5,
  /** W3.3 pre-launch static-hold-on-Earth duration. Bumped from the
   *  legacy 3500 ms (which was just "wait for camera lerp to settle")
   *  to 4000 ms so the audience reads it as a deliberate ritual beat,
   *  not a transitional pause. */
  LAUNCH_DWELL_DURATION_MS: 4000,
  /** W3.4 end-of-mission finale total duration. 12 s = 8 s silent hold
   *  + caption fade-in over 1 s + 2 s of caption held + 1 s of fade to
   *  black. Matches the Cassini Grand Finale animation's terminal beat. */
  FINALE_DURATION_MS: 12000,
  /** When in the finale window the MISSION END caption begins to fade
   *  in. Caption then holds visible until the black fade-in. */
  FINALE_CAPTION_FADE_IN_AT_MS: 8000,
  /** When in the finale window the screen begins to fade to black. */
  FINALE_BLACK_FADE_IN_AT_MS: 11000,
  /** Length of each opacity fade ramp inside the finale (caption-in,
   *  black-in). 1 s each. */
  FINALE_FADE_RAMP_MS: 1000,
  /** Delay after entering `arrived` phase before the 12 s finale lock
   *  engages. Lets the arrival-snap (1.5 s of fast-LERP convergence to
   *  the parked-in-orbit composition) settle BEFORE we lock. */
  FINALE_ARRIVAL_SETTLE_DELAY_MS: 1500,
  /** W3.6 scrubber-jump fade-to-black ramp length (each half — total
   *  cut duration is 2× this). */
  CUT_FADE_RAMP_MS: 100,
  /** W3.6 cut threshold — sim-day delta above which a jump fires the
   *  cinematic fade-to-black overlay. 365 days = 1 mission year. Picked
   *  to cleanly separate "stepping forward through a planned flyby
   *  sequence" (small drag, no cut) from "jumping across the system"
   *  (big jump, cut warranted). */
  CUT_THRESHOLD_DAYS: 365,
  /** W3.7 Tarkovsky cruise hold duration. 10 s of locked frame in the
   *  middle of the mission's longest cruise gap. Discipline of
   *  stillness — Kubrick's Discovery cruise grammar. */
  CRUISE_HOLD_DURATION_MS: 10000,
  /** Minimum cruise-gap size in sim-days for the cruise hold to arm.
   *  Below this, mission events are too tightly packed to benefit from
   *  a meditative beat (Apollo 11 = 7 days total, no qualifying gap). */
  CRUISE_HOLD_MIN_GAP_DAYS: 200,
  /** W3.7 trigger-window slop — sim-days past the gap midpoint within
   *  which a jump-forward still arms the hold. Without slop, scrubbing
   *  past the midpoint at 90 d/s could overshoot before the next
   *  animate frame fires and the arm condition would never match. */
  CRUISE_HOLD_TRIGGER_WINDOW_DAYS: 30,
  /** Quick-snap LERP window kicked by jumpToMet (700 ms) and onScrub
   *  (300 ms). During the window LERP runs at ~3× the cinematic rate
   *  so big scrub-jumps don't stall in a slow lerp. */
  CAM_SNAP_JUMP_MS: 700,
  CAM_SNAP_SCRUB_MS: 300,
  /** Arrival-snap LERP boost — fast convergence onto the parked-in-orbit
   *  composition the moment phase first transitions to 'arrived', so the
   *  shot settles in ~1.5 s instead of slow-lerping for 10. */
  ARRIVAL_SNAP_MS: 1500,
} as const;

/**
 * Mutable cinematic-beat state — these wall-clock timestamps + flags drive
 * which beat (if any) is active in the current frame. Lives as a single
 * object so the component can pass it by reference to predicates instead
 * of plumbing 13 individual `let` bindings.
 *
 * Fields are PLAIN — not Svelte `$state` — because reads happen inside the
 * requestAnimationFrame loop and don't need fine-grained reactivity. The
 * component does keep a few derived booleans as `$state` for UI binding
 * (chrome suppression, finale overlay opacities) — those are surfaced
 * via the matching helper getters in the animate frame.
 */
export interface CinematicBeatState {
  /** W3.1: wall-clock ms past which the peak hold ends. 0 = inactive. */
  peakHoldUntil: number;
  /** W3.1: which flyby's MET (sim-days from dep_day) the current peak
   *  hold is armed for. null = no arm. Reset when the spacecraft leaves
   *  that flyby's PEAK_DAYS window so each grand-tour flyby gets its
   *  own arm. */
  peakHoldArmedForFlybyMet: number | null;
  /** W3.2: wall-clock ms past which the afterglow tween ends. */
  afterglowUntil: number;
  /** W3.2: captured camR / camTarget / camP at the moment the afterglow
   *  started, used as the start values of the recede tween. 0 in
   *  afterglowStartCamR = "not captured yet" (sentinel). */
  afterglowStartCamR: number;
  afterglowTargetCamR: number;
  afterglowCenterX: number;
  afterglowCenterZ: number;
  afterglowP: number;
  /** W3.4: wall-clock ms when the end-of-mission lock began. 0 = no
   *  active finale. */
  finaleStartedAt: number;
  /** W3.6: wall-clock ms when the current cut overlay began fading. */
  cutStartedAt: number;
  /** W3.7: wall-clock ms past which the cruise hold ends. */
  cruiseHoldUntil: number;
  /** W3.7: true once the cruise hold has fired for this mission run.
   *  Reset on jumpToMet(0) (replay) and on mission swap. */
  cruiseHoldFired: boolean;
  /** W3.7: simDay observed on the previous frame, used to detect when
   *  the trigger midpoint is crossed (vs. an instantaneous scrub). */
  lastSeenSimDayForCruiseHold: number;
  /** Arrival snap — true once the 'arrived' phase transition has fired
   *  its 1.5 s fast-converge. Reset when phase leaves arrived. */
  arrivalSnapped: boolean;
  /** Tracks the previous frame's sc.phase so transitions in / out of
   *  'arrived' can be detected. */
  lastSeenPhase: 'pre-launch' | 'outbound' | 'return' | 'arrived' | null;
}

/** Returns a fresh CinematicBeatState with all timestamps cleared. */
export function createCinematicBeatState(): CinematicBeatState {
  return {
    peakHoldUntil: 0,
    peakHoldArmedForFlybyMet: null,
    afterglowUntil: 0,
    afterglowStartCamR: 0,
    afterglowTargetCamR: 0,
    afterglowCenterX: 0,
    afterglowCenterZ: 0,
    afterglowP: 0,
    finaleStartedAt: 0,
    cutStartedAt: 0,
    cruiseHoldUntil: 0,
    cruiseHoldFired: false,
    lastSeenSimDayForCruiseHold: 0,
    arrivalSnapped: false,
    lastSeenPhase: null,
  };
}

/**
 * Reset cinematic-beat state in-place. Single funnel called from the
 * three places mission state can change underneath the cinematic
 * machine: mission swap, jumpToMet(0), and (optionally) scrub-out-of-
 * window. The pre-fix code only reset launchDwellUntil + cruiseHoldFired
 * in those paths, leaving the other 11 fields to leak across missions —
 * a Cassini-after-Voyager swap could land with peakHoldUntil already in
 * the future, triggering an apparent hold at the wrong moment.
 *
 * Caller's responsibility to reset overlay opacities + launchDwellUntil
 * + camSnapUntil separately — those live as Svelte `$state` in the
 * component (so the template reacts), not on this state object.
 */
export function resetCinematicBeatState(state: CinematicBeatState): void {
  state.peakHoldUntil = 0;
  state.peakHoldArmedForFlybyMet = null;
  state.afterglowUntil = 0;
  state.afterglowStartCamR = 0;
  state.afterglowTargetCamR = 0;
  state.afterglowCenterX = 0;
  state.afterglowCenterZ = 0;
  state.afterglowP = 0;
  state.finaleStartedAt = 0;
  state.cutStartedAt = 0;
  state.cruiseHoldUntil = 0;
  state.cruiseHoldFired = false;
  state.lastSeenSimDayForCruiseHold = 0;
  state.arrivalSnapped = false;
  state.lastSeenPhase = null;
}

/* ───────────────────────── predicates ─────────────────────────────── */

/** True while the W3.1 peak hold is freezing sim time. */
export function isPeakHolding(state: CinematicBeatState, now: number): boolean {
  return now < state.peakHoldUntil;
}

/** True while the W3.2 afterglow tween is running (after hold, before
 *  it ends). False while peak hold is still active even though the
 *  afterglowUntil > now would also be true — afterglow comes AFTER hold. */
export function isAfterglowing(state: CinematicBeatState, now: number): boolean {
  return now >= state.peakHoldUntil && now < state.afterglowUntil;
}

/** True while the W3.7 cruise hold is freezing sim time. */
export function isCruiseHolding(state: CinematicBeatState, now: number): boolean {
  return now < state.cruiseHoldUntil;
}

/** True while the W3.4 end-of-mission lock is engaged. */
export function isFinaleLocked(state: CinematicBeatState, now: number): boolean {
  return (
    state.finaleStartedAt > 0 &&
    now >= state.finaleStartedAt &&
    now < state.finaleStartedAt + CINEMATIC_TIMINGS.FINALE_DURATION_MS
  );
}

/** True while any beat is freezing sim time. Drives the simDay-advance
 *  gate at the top of animate() and the chrome-suppression class on
 *  the HUD / scrubber / FD banner. */
export function isAnyCinematicFreeze(state: CinematicBeatState, now: number): boolean {
  return (
    isPeakHolding(state, now) ||
    isAfterglowing(state, now) ||
    isCruiseHolding(state, now) ||
    isFinaleLocked(state, now)
  );
}

/* ───────────────────────── tween helpers ──────────────────────────── */

/** Ease-in-out cubic, t ∈ [0, 1]. The afterglow tween shape — slow
 *  start (audience lingers on the iconic frame for a beat), accelerates
 *  through the middle (the recede), eases out at the end (settles wide). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* ───────────────────────── derivations ────────────────────────────── */

/**
 * Compute the sim-day at the midpoint of the longest cruise gap between
 * consecutive labeled events. Returns null if no qualifying gap exists
 * (short missions, single-event Moon flights — Apollo 11, etc).
 *
 * Used by the W3.7 cruise hold to know WHERE in the timeline to engage
 * the 10-second lock. Bound to the component's `cruiseHoldTriggerSimDay`
 * derived so it recomputes whenever the loaded mission changes.
 */
export function computeCruiseHoldTriggerSimDay(
  events: Array<{ met_days?: number | null }> | undefined,
  depDay: number,
): number | null {
  if (!events || events.length < 2) return null;
  const mets = events
    .filter((e) => e.met_days != null)
    .map((e) => e.met_days as number)
    .sort((a, b) => a - b);
  if (mets.length < 2) return null;
  let longestGap = 0;
  let longestStart = 0;
  for (let i = 1; i < mets.length; i++) {
    const gap = mets[i] - mets[i - 1];
    if (gap > longestGap) {
      longestGap = gap;
      longestStart = mets[i - 1];
    }
  }
  if (longestGap < CINEMATIC_TIMINGS.CRUISE_HOLD_MIN_GAP_DAYS) return null;
  return depDay + longestStart + longestGap / 2;
}

/**
 * Parse `lastHelioSubPhase` (e.g. "flyby-193-venus") to extract the
 * embedded flyby MET. Returns null when the sub-phase isn't a flyby
 * one (prelaunch / cruise-out / depart / approach / arrived / etc).
 *
 * The audit flagged that `__flyDebug.activeFlybyMet` stays stale across
 * non-flyby frames (it's only set when the cinema trigger fires), so
 * `lastHelioSubPhase` parsing became the source of truth for "are we
 * in a flyby right now." This helper centralises that parse so the
 * regex doesn't drift between call sites.
 */
/**
 * Pure peakHold arming step. Given the current animate-frame inputs +
 * the cine state, returns the mutations that should be applied. Caller
 * is responsible for actually writing them onto `cine.*` — keeping the
 * step pure makes it trivially unit-testable.
 *
 * Two stages run inside one call so the reset → arm round-trip is
 * captured atomically per frame:
 *  1. Reset: clear `peakHoldArmedForFlybyMet` if the spacecraft is no
 *     longer in the armed flyby (different sub-phase) or drifted >
 *     FLYBY_PEAK_DAYS from the armed peak.
 *  2. Arm: if currently inside the ±0.5 sim-day window of an iconic
 *     moment AND not already armed for this flyby, fire a fresh
 *     `peakHoldUntil` + `afterglowUntil` + mark armed.
 *
 * `gateInputs.gates` packs the four blockers that prevent arming:
 * isMoonMission (cislunar uses a different freeze), reducedMotion,
 * isDrag (scrubbing), label-misclassification fallback. See
 * docs/reference/fly-cinematic-state-machine.md §"peakHold arming".
 */
export interface PeakHoldArmInputs {
  /** Active flyby MET parsed from sub-phase string, or null if not in a
   *  flyby right now. */
  currentFrameFlybyMet: number | null;
  /** Sim day (dep_day + MET). */
  simDay: number;
  /** Mission's dep_day (sim time at MET 0). */
  depDay: number;
  /** Current performance.now() in ms. */
  now: number;
  /** True if this flyby's label includes 'earth' — gets a longer hold. */
  isEarthFlyby: boolean;
  /** Hard gates: any one true and we don't arm. */
  isMoonMission: boolean;
  reducedMotion: boolean;
  isDrag: boolean;
  /** Days before peak to FREEZE the iconic moment (PLANET_COMPOSITION
   *  default). Matches biasJumpToIconicMoment. */
  iconicLeadDays?: number;
  /** Half-width of the arming window in sim days. */
  peakHoldRadius?: number;
  /** Days outside which the reset stage fires. */
  flybyPeakDays?: number;
  /** Hold durations. */
  defaultHoldMs?: number;
  earthHoldMs?: number;
}

export interface PeakHoldArmResult {
  /** New value for peakHoldArmedForFlybyMet, or undefined to leave alone. */
  newArmedForFlybyMet?: number | null;
  /** New value for peakHoldUntil, or undefined to leave alone. */
  newPeakHoldUntil?: number;
  /** New value for afterglowUntil, or undefined to leave alone. */
  newAfterglowUntil?: number;
  /** True if an arm fired this frame (informational, useful in tests). */
  armed: boolean;
  /** True if a reset fired this frame. */
  reset: boolean;
}

export function computePeakHoldArmStep(
  cine: Pick<CinematicBeatState, 'peakHoldArmedForFlybyMet' | 'peakHoldUntil' | 'afterglowUntil'>,
  inputs: PeakHoldArmInputs,
): PeakHoldArmResult {
  const ICONIC_LEAD_DAYS = inputs.iconicLeadDays ?? 2;
  const peakHoldRadius = inputs.peakHoldRadius ?? 0.5;
  const FLYBY_PEAK_DAYS = inputs.flybyPeakDays ?? 4;
  const defaultHoldMs = inputs.defaultHoldMs ?? 2500;
  const earthHoldMs = inputs.earthHoldMs ?? 4000;
  const result: PeakHoldArmResult = { armed: false, reset: false };

  // ── Reset stage
  if (cine.peakHoldArmedForFlybyMet != null) {
    const sameFlyby = inputs.currentFrameFlybyMet === cine.peakHoldArmedForFlybyMet;
    const outsidePeakDays =
      Math.abs(inputs.simDay - (inputs.depDay + cine.peakHoldArmedForFlybyMet)) > FLYBY_PEAK_DAYS;
    if (!sameFlyby || outsidePeakDays) {
      result.newArmedForFlybyMet = null;
      result.reset = true;
    }
  }

  // ── Arm stage (uses POST-reset armed value)
  const effectiveArmed =
    result.newArmedForFlybyMet !== undefined
      ? result.newArmedForFlybyMet
      : cine.peakHoldArmedForFlybyMet;
  if (
    !inputs.isMoonMission &&
    !inputs.reducedMotion &&
    !inputs.isDrag &&
    inputs.currentFrameFlybyMet != null
  ) {
    const iconicPeakSimDay = inputs.depDay + inputs.currentFrameFlybyMet - ICONIC_LEAD_DAYS;
    const inHeldWindow = Math.abs(inputs.simDay - iconicPeakSimDay) < peakHoldRadius;
    if (inHeldWindow && effectiveArmed !== inputs.currentFrameFlybyMet) {
      const holdMs = inputs.isEarthFlyby ? earthHoldMs : defaultHoldMs;
      result.newPeakHoldUntil = inputs.now + holdMs;
      result.newArmedForFlybyMet = inputs.currentFrameFlybyMet;
      result.newAfterglowUntil =
        inputs.now + holdMs + CINEMATIC_TIMINGS.AFTERGLOW_DURATION_MS;
      result.armed = true;
    }
  }

  return result;
}

export function parseFlybyMetFromSubPhase(sub: string | null | undefined): number | null {
  if (!sub) return null;
  const m = sub.match(/^flyby-(-?\d+(?:\.\d+)?)-/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
