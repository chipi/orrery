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
} from './descent-physics';

/** EDL phase → HUD status label. */
export const EDL_PHASE_LABEL: Record<EDLPhaseKind, string> = {
  ballistic_entry: 'ENTRY',
  parachute: 'PARACHUTE',
  powered_retro: 'POWERED DESCENT',
  skycrane: 'SKYCRANE',
  airbag_bounce: 'AIRBAG DESCENT',
  aeroshell_descent: 'AEROSHELL DESCENT',
  direct_impact: 'HARD DESCENT',
  coast: 'COAST',
};

/** EDL event → short timeline-strip label. */
export const EDL_BEAT_LABEL: Record<DescentEventType, string> = {
  entry: 'ENTRY',
  peak_heat: 'PEAK HEAT',
  peak_decel: 'MAX-G',
  parachute_deploy: 'CHUTE',
  heatshield_sep: 'H/S SEP',
  backshell_sep: 'B/S SEP',
  skycrane_lower: 'SKYCRANE',
  skycrane_flyaway: 'FLYAWAY',
  retro_ignition: 'RETRO',
  airbag_deploy: 'AIRBAG',
  touchdown: 'TOUCHDOWN',
};

export interface DescentBeat {
  label: string;
  t: number;
}

/** The major EDL beats for the timeline strip, in chronological order. */
const TIMELINE_BEATS: DescentEventType[] = [
  'entry',
  'parachute_deploy',
  'heatshield_sep',
  'backshell_sep',
  'retro_ignition',
  'skycrane_lower',
  'airbag_deploy',
  'touchdown',
];

/** Build the descent timeline strip (major beats only). */
export function buildDescentBeats(summary: DescentSummary): DescentBeat[] {
  return summary.events
    .filter((e) => TIMELINE_BEATS.includes(e.type))
    .map((e) => ({ label: EDL_BEAT_LABEL[e.type], t: e.t }));
}

/** The status line for the current descent instant. */
export function descentStatus(s: DescentState, summary: DescentSummary): string {
  if (s.altM <= 0) return summary.touchdownSuccess ? 'TOUCHDOWN' : 'IMPACT';
  return EDL_PHASE_LABEL[s.phaseKind] ?? 'DESCENT';
}

/** Format an altitude (km) as a km or m readout — switches to metres below 5 km. */
export function formatDescentAltitude(altKm: number): { value: string; unit: string } {
  if (altKm >= 5) return { value: altKm.toFixed(0), unit: 'KM' };
  return { value: Math.max(0, altKm * 1000).toFixed(0), unit: 'M' };
}
