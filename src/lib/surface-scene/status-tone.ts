/**
 * Map a SurfaceSite's lifecycle status to a {label, color} pair for the
 * detail-panel badge. Per ADR-072 §Drift 17 — replaces Moon's older
 * predefined CSS classes (`.status-completed/ongoing/planned`) with a
 * single dynamic function that handles the full status enum
 * (FLOWN | PLANNED | ACTIVE | ENDED | CRASHED | LOST).
 *
 * Colour palette mirrors the Mars implementation's tones — teal for
 * active, red for crashed, orange for lost, blue for planned, dim for
 * historical (ended / flown).
 *
 * Optional `kind` argument refines the label for orbital sites — an
 * ACTIVE spacecraft sitting in orbit reads more honestly as "IN ORBIT"
 * than as "ACTIVE" (which fits surface landers + ground stations). The
 * tone colour stays the same active teal regardless of kind.
 */
import type { SiteStatus, SiteKind, SurfaceSite } from '$types/surface-site';
import * as m from '$lib/paraglide/messages';

export interface StatusBadgeTone {
  label: string;
  color: string;
}

/** A launch pad that has ended service reads "RETIRED" (the fleet's word),
 *  not the lander-style "ENDED". */
export function statusTone(
  s: SiteStatus | string,
  kind?: SiteKind,
  role?: SurfaceSite['site_role'],
): StatusBadgeTone {
  switch (s) {
    case 'ACTIVE':
      return {
        label: kind === 'orbiter' ? m.surface_status_in_orbit() : m.surface_status_active(),
        color: '#4ecdc4',
      };
    case 'CRASHED':
      return { label: m.surface_status_crashed(), color: '#ff6b6b' };
    case 'LOST':
      return { label: m.surface_status_lost(), color: '#ff8c42' };
    case 'PLANNED':
      return { label: m.surface_status_planned(), color: '#7b9cff' };
    case 'ENDED':
      return {
        label: role === 'launch-pad' ? m.surface_status_retired() : m.surface_status_ended(),
        color: 'rgba(255,255,255,0.5)',
      };
    case 'FLOWN':
    default:
      return { label: m.surface_status_flown(), color: 'rgba(255,255,255,0.5)' };
  }
}
