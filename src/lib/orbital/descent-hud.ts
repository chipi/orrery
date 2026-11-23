/**
 * Descent HUD vocabulary (RFC-034 §9) — the inverse of ascent-hud.ts. Maps the
 * headless descent trajectory (integrateDescent) to the human-facing EDL phase
 * labels, timeline beats, and status line the DescentScene HUD surfaces. Pure —
 * no DOM.
 */

import type {
  DescentEventType,
  DescentState,
  DescentSummary,
  EDLPhaseKind,
} from '$lib/physics/descent/descent-physics';

/** EDL phase → HUD status label. */
export const EDL_PHASE_LABEL: Record<EDLPhaseKind, string> = {
  ballistic_entry: 'ENTRY',
  parachute: 'PARACHUTE',
  powered_retro: 'POWERED DESCENT',
  skycrane: 'SKYCRANE',
  airbag_bounce: 'AIRBAG DESCENT',
  aeroshell_descent: 'AEROSHELL DESCENT',
  direct_impact: 'HARD DESCENT',
  touch_and_go_contact: 'TOUCH-AND-GO',
  coast: 'COAST',
};

/** EDL event → short timeline-strip label. */
export const EDL_BEAT_LABEL: Record<DescentEventType, string> = {
  entry: 'ENTRY',
  entry_flip: 'FLIP',
  landing_flip: 'FLIP',
  peak_heat: 'PEAK HEAT',
  peak_decel: 'MAX-G',
  parachute_deploy: 'CHUTE',
  heatshield_sep: 'H/S SEP',
  backshell_sep: 'B/S SEP',
  skycrane_lower: 'SKYCRANE',
  skycrane_flyaway: 'FLYAWAY',
  retro_ignition: 'RETRO',
  airbag_deploy: 'AIRBAG',
  harpoon_fire: 'HARPOON',
  first_contact: 'CONTACT',
  bounce: 'BOUNCE',
  sample_collected: 'SAMPLE',
  parachute_jettison: 'CHUTE SEP',
  probe_signal_lost: 'SIGNAL LOST',
  record_ends: 'DATA ENDS',
  skip_out: 'SKIP OUT',
  second_entry: '2ND ENTRY',
  radar_lock: 'RADAR LOCK',
  bridle_lower: 'BRIDLE',
  bridle_cut: 'BRIDLE CUT',
  at_rest: 'AT REST',
  petals_open: 'PETALS OPEN',
  touchdown: 'TOUCHDOWN',
};

export interface DescentBeat {
  label: string;
  t: number;
  /** The real time of a beat the scene shows sooner (an airbag lander's petals). */
  realT?: number;
}

/** The major EDL beats for the timeline strip, in chronological order. */
const TIMELINE_BEATS: DescentEventType[] = [
  'entry',
  'parachute_deploy',
  'heatshield_sep',
  'backshell_sep',
  'bridle_lower',
  'radar_lock',
  'landing_flip',
  'airbag_deploy',
  'retro_ignition',
  'skycrane_lower',
  'bridle_cut',
  'touchdown',
  'at_rest',
  'petals_open',
  'record_ends',
];

/** Build the descent timeline strip (major beats only). */
export function buildDescentBeats(summary: DescentSummary): DescentBeat[] {
  return summary.events
    .filter((e) => TIMELINE_BEATS.includes(e.type))
    .map((e) => ({
      label: EDL_BEAT_LABEL[e.type],
      t: e.t,
      ...(e.realT != null ? { realT: e.realT } : {}),
    }));
}

/** The status line for the current descent instant. */
export function descentStatus(s: DescentState, summary: DescentSummary): string {
  const body = summary.body;
  // No-surface atmospheric probe (Jupiter): the descent ends when the rising
  // pressure crushes the probe at depth, not at a ground the body lacks — so
  // hold the phase label all the way down and close on SIGNAL LOST at the floor.
  if (body === 'jupiter') {
    const deepest = summary.states.at(-1)?.altM ?? -Infinity;
    return s.altM <= deepest + 1 ? 'SIGNAL LOST' : (EDL_PHASE_LABEL[s.phaseKind] ?? 'DESCENT');
  }
  // A lander whose published record stops in the air (Chandrayaan-2's Vikram, `recordEndsAltM`):
  // the descent ends there, and the last state says so.
  const end = summary.states.at(-1);
  if (summary.events.at(-1)?.type === 'record_ends' && end && s.t >= end.t - 0.5) {
    return 'DATA ENDS';
  }
  // An airbag ball after its first contact (afterTouchdown): bouncing until it comes to rest.
  const firstContact = summary.events.find((e) => e.type === 'touchdown');
  const rest = summary.events.find((e) => e.type === 'at_rest');
  if (firstContact && rest && s.t > firstContact.t && s.t < rest.t) return 'BOUNCE';
  if (s.altM <= 0) {
    // Touch-and-go asteroids (Hayabusa/OSIRIS-REx) sample and depart; a comet is
    // a low-g settle after the bounces; Eros (NEAR) actually soft-landed, so it —
    // like every true lander — closes on TOUCHDOWN.
    if (body === 'itokawa' || body === 'ryugu' || body === 'bennu') return 'SAMPLE COLLECTED';
    if (body === 'comet_67p') return summary.touchdownSuccess ? 'SETTLED' : 'IMPACT';
    return summary.touchdownSuccess ? 'TOUCHDOWN' : 'IMPACT';
  }
  return EDL_PHASE_LABEL[s.phaseKind] ?? 'DESCENT';
}

/** Format an altitude (km) as a km or m readout — switches to metres below 5 km. */
export function formatDescentAltitude(altKm: number): { value: string; unit: string } {
  if (altKm >= 5) return { value: altKm.toFixed(0), unit: 'KM' };
  return { value: Math.max(0, altKm * 1000).toFixed(0), unit: 'M' };
}

/**
 * The guidance readout for a range-controlled entry (#29 · ADR-088). When the entry computer
 * solved a bank to steer the capsule to its target downrange, surface the commanded bank as a
 * roll angle (arccos of the vertical lift fraction) + whether the target was reachable. Null for
 * an unguided descent (ballistic, or full-lift-up with no target). Pure — feeds the HUD.
 */
export function descentGuidanceReadout(
  summary: DescentSummary,
): { bankDeg: number; reachable: boolean } | null {
  if (!summary.guidance) return null;
  const cos = Math.max(-1, Math.min(1, summary.guidance.entryBankCos));
  return {
    bankDeg: Math.round((Math.acos(cos) * 180) / Math.PI),
    reachable: summary.guidance.targetReachable,
  };
}
