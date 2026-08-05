/**
 * /fly phase controller (RFC-036 WS-A · #440).
 *
 * The pure, framework-agnostic state machine for the /fly flight acts —
 * opening → ascent → coast → cruise → descent → recovery. Extracted from the
 * scattered `showLaunch`/`showCoast`/`showDescent`/`showRecovery`/`openingActive`
 * booleans in `+page.svelte` so the routing that this session kept debugging by
 * hand (crewed-mission earth-orbit routing, deep-links, scrub→act) is a single
 * unit-tested reducer, not invisible page logic.
 *
 * NO svelte / three / dom imports — this is a plain reducer: `(act, inputs,
 * event) → act`, plus the derived scene flags the page + scene layer read. The
 * continuous playback clock (launchT / coastMetDays / descentT / simDay) stays
 * in the page; the controller owns only which ACT is active. See the A0
 * transition table in docs/wip/2026-08-05-fly-restructure-plan.md.
 */

/** The active flight act. `cruise` is the interplanetary/cislunar transfer scene
 *  (viewMode selects which); `opening` is the pre-flight title overlay. */
export type FlyAct = 'opening' | 'ascent' | 'coast' | 'cruise' | 'descent' | 'recovery';

/** Which Science-Lens layer set the panel offers (opening/cruise/recovery all
 *  read as the cruise segment, matching the legacy `flySegment` derivation). */
export type FlySegment = 'ascent' | 'coast' | 'descent' | 'cruise';

/** Body the descent lands on — earth rests on a recovery card; the others hand
 *  off to a surface route (navigation the page performs, not the controller). */
export type DescentBody = 'moon' | 'mars' | 'venus' | 'earth' | null;

/** Scrubber bands `scrubberToPoint` can resolve to. `cruise` resolves to the
 *  coast act for Tier-1 earth-orbit missions, else the interplanetary cruise. */
export type ScrubPhase = 'ascent' | 'descent' | 'cruise';

/** Mission capabilities the controller reads. Set by the page whenever they
 *  change (mission load, async profile load, deep-link parse). */
export interface FlightPhaseInputs {
  /** dest is MOON/EARTH — selects the cislunar view. */
  isMoonMission: boolean;
  /** hasLaunchProfile(mission) — a launchable ascent act exists. */
  launchAvailable: boolean;
  /** getEarthOrbitCoast(id) != null — a Tier-1 pad→coast→reentry flight. */
  earthCoast: boolean;
  /** The mission's descent profile has finished loading (async). */
  descentAvailable: boolean;
  /** The descent target body, for the touchdown branch. */
  descentBody: DescentBody;
  /** Parsed deep-link params (`?launch=1` / `?descent=1`, mission id match). */
  deepLink: { launch: boolean; descent: boolean; missionMatches: boolean };
}

/** The read-only view the page + scene layer consume. Derived from `act` +
 *  inputs; the page binds its overlays to the `show*` flags. */
export interface FlightPhaseState {
  act: FlyAct;
  viewMode: 'heliocentric' | 'cislunar';
  showOpening: boolean;
  showLaunch: boolean;
  showCoast: boolean;
  showDescent: boolean;
  showRecovery: boolean;
  showCruise: boolean;
  segment: FlySegment;
}

/** Events the page dispatches — one per site that flips a boolean today. */
export type FlightPhaseEvent =
  | { type: 'startLaunch' } // CTA / ?launch deep-link / skipOpening (earth-orbit)
  | { type: 'launchComplete' } // LaunchScene onComplete (ascent → coast|cruise)
  | { type: 'coastComplete' } // CoastScene onComplete / coast auto-cross → descent
  | { type: 'startDescent' } // deep-link / lander arrival / coastComplete
  | { type: 'touchdown' } // DescentScene onComplete (earth → recovery)
  | { type: 'skipOpening' } // user skips the opening overlay
  | { type: 'scrubTo'; phase: ScrubPhase }; // master scrubber drag

export const DEFAULT_FLY_ACT: FlyAct = 'opening';

function segmentFor(act: FlyAct): FlySegment {
  if (act === 'ascent') return 'ascent';
  if (act === 'coast') return 'coast';
  if (act === 'descent') return 'descent';
  return 'cruise'; // opening / cruise / recovery → cruise layer set (legacy parity)
}

/** Derive the full read-only view from the core `act` + inputs. */
export function deriveFlightPhaseState(act: FlyAct, inputs: FlightPhaseInputs): FlightPhaseState {
  return {
    act,
    viewMode: inputs.isMoonMission ? 'cislunar' : 'heliocentric',
    showOpening: act === 'opening',
    showLaunch: act === 'ascent',
    showCoast: act === 'coast',
    showDescent: act === 'descent',
    showRecovery: act === 'recovery',
    showCruise: act === 'cruise',
    segment: segmentFor(act),
  };
}

/**
 * The transition reducer — the A0 truth-table. Pure: same (act, inputs, event)
 * always yields the same next act. Guards mirror `+page.svelte` exactly:
 * - startLaunch needs a launch profile (page loads it, THEN dispatches).
 * - launchComplete forks on earthCoast (the crewed-mission routing bug this
 *   guards against: earth-orbit flights go ascent→COAST, never the heliocentric
 *   cruise fallback).
 * - startDescent/coastComplete need the descent profile loaded.
 * - touchdown → recovery only for an earth reentry (others leave the route).
 * - skipOpening forks on earthCoast (→ ascent) vs. reveal cruise.
 * - scrubTo(cruise) resolves to coast for earth-orbit missions.
 */
export function reduceFlyAct(
  act: FlyAct,
  inputs: FlightPhaseInputs,
  event: FlightPhaseEvent,
): FlyAct {
  switch (event.type) {
    case 'startLaunch':
      return inputs.launchAvailable ? 'ascent' : act;
    case 'launchComplete':
      return inputs.earthCoast ? 'coast' : 'cruise';
    case 'coastComplete':
    case 'startDescent':
      return inputs.descentAvailable ? 'descent' : act;
    case 'touchdown':
      // earth rests on the recovery card; moon/mars/venus navigate to a surface
      // route (the page does the goto — the controller just stops driving descent).
      return inputs.descentBody === 'earth' ? 'recovery' : act;
    case 'skipOpening':
      return inputs.earthCoast && inputs.launchAvailable ? 'ascent' : 'cruise';
    case 'scrubTo':
      if (event.phase === 'ascent') return 'ascent';
      if (event.phase === 'descent') return 'descent';
      // cruise band: earth-orbit missions render it as the coast act.
      return inputs.earthCoast ? 'coast' : 'cruise';
  }
}

export interface FlightPhaseController {
  readonly state: FlightPhaseState;
  /** Update the mission-capability inputs (re-derives viewMode etc.). */
  setInputs(inputs: FlightPhaseInputs): void;
  /** Apply an event; returns the new state. */
  dispatch(event: FlightPhaseEvent): FlightPhaseState;
}

/** Create a controller seeded with a starting act (default `opening`) + inputs. */
export function createFlightPhaseController(
  inputs: FlightPhaseInputs,
  initialAct: FlyAct = DEFAULT_FLY_ACT,
): FlightPhaseController {
  let act = initialAct;
  let current = inputs;
  return {
    get state() {
      return deriveFlightPhaseState(act, current);
    },
    setInputs(next: FlightPhaseInputs) {
      current = next;
    },
    dispatch(event: FlightPhaseEvent) {
      act = reduceFlyAct(act, current, event);
      return deriveFlightPhaseState(act, current);
    },
  };
}
