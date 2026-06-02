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
import type { SiteStatus, SiteKind } from '$types/surface-site';

export interface StatusBadgeTone {
  label: string;
  color: string;
}

export function statusTone(s: SiteStatus | string, kind?: SiteKind): StatusBadgeTone {
  switch (s) {
    case 'ACTIVE':
      return {
        label: kind === 'orbiter' ? 'IN ORBIT' : 'ACTIVE',
        color: '#4ecdc4',
      };
    case 'CRASHED':
      return { label: 'CRASHED', color: '#ff6b6b' };
    case 'LOST':
      return { label: 'LOST', color: '#ff8c42' };
    case 'PLANNED':
      return { label: 'PLANNED', color: '#7b9cff' };
    case 'ENDED':
      return { label: 'ENDED', color: 'rgba(255,255,255,0.5)' };
    case 'FLOWN':
    default:
      return { label: 'FLOWN', color: 'rgba(255,255,255,0.5)' };
  }
}
