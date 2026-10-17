/**
 * Reader-facing label for a launch status. Rows used to print `status.label`
 * verbatim — GCAT codes ("OS", "OF40", "DS") or English source text ("To Be
 * Determined") in every locale. The normalised `status.code` maps to a
 * translated message; the raw label stays available as a tooltip.
 */
import * as m from '$lib/paraglide/messages';
import type { LaunchStatusCode } from './types';

const LABEL: Record<LaunchStatusCode, () => string> = {
  GO: m.launches_status_go,
  TBD: m.launches_status_tbd,
  SUCCESS: m.launches_status_success,
  FAILURE: m.launches_status_failure,
  PARTIAL: m.launches_status_partial,
  HOLD: m.launches_status_hold,
  IN_FLIGHT: m.launches_status_in_flight,
};

export function launchStatusLabel(status: { code: string; label: string }): string {
  const fn = LABEL[status.code as LaunchStatusCode];
  return fn ? fn() : status.label;
}
