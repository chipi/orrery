import { pointToScrubber, type JourneyTimeline } from '$lib/orbital/ascent-clock';

/**
 * The marker row on /fly's play bar (UXD-042): one row for the whole journey. Ascent beats
 * sit in the ascent slice, cruise milestones and flight-director stages in the cruise band,
 * descent beats in the descent tail. Pure: positions come from the same clock map the bar
 * scrubs with (`pointToScrubber`), so a marker sits exactly where a click on it lands.
 */

export type JourneyMarkerKind = 'ascent' | 'milestone' | 'stage' | 'descent';

/** Where a click on a marker seeks to. `t` is bar seconds; `actT`, when given, is the beat's
 *  exact time on the act's own clock (the bar's watching-time layout does not round-trip exactly,
 *  so a seek through the bar alone can land just before the beat). */
export type JourneySeek =
  | { phase: 'ascent'; t: number; actT?: number }
  | { phase: 'cruise'; metDays: number }
  | { phase: 'descent'; t: number; actT?: number };

export interface JourneyMarker {
  id: string;
  kind: JourneyMarkerKind;
  /** Position on the bar, 0..100. */
  pct: number;
  label: string;
  seek: JourneySeek;
  /** Optional one-line description (an authored milestone's). */
  description?: string;
  /** Markers collapsed into this one by {@link declutterMarkers}. */
  more?: number;
}

export interface JourneyMarkerInput {
  /** The master timeline once a launch act is loaded; null on the cruise-only bar. */
  timeline: JourneyTimeline | null;
  arcTotalDays: number;
  /** Ascent beats, `t` in ascent bar seconds, `actT` the act's own time. Ignored without a timeline. */
  ascentBeats: Array<{ label: string; t: number; actT?: number }>;
  /** Descent beats, `t` in raw scrubber (warped-clock) seconds. Ignored without a descent tail. */
  descentBeats: Array<{ label: string; t: number; actT?: number }>;
  milestones: Array<{ id: string; label: string; metDays: number; description?: string }>;
  stages: Array<{ id: string; label: string; metDays: number }>;
}

/** Ticks closer than this many pixels collapse into the first. */
export const MARKER_MIN_GAP_PX = 10;

const RANK: Record<JourneyMarkerKind, number> = { ascent: 0, descent: 1, milestone: 2, stage: 3 };

export function journeyMarkers(i: JourneyMarkerInput): JourneyMarker[] {
  const tl = i.timeline;
  const cruiseFrac = (metDays: number) =>
    i.arcTotalDays > 0 ? Math.min(1, Math.max(0, metDays / i.arcTotalDays)) : 0;
  const cruisePct = (metDays: number): number =>
    tl
      ? pointToScrubber(
          {
            phase: 'cruise',
            ascentT: tl.ascentDurationS,
            cruiseMetDays: cruiseFrac(metDays) * tl.cruiseDurationDays,
          },
          tl,
        ) * 100
      : cruiseFrac(metDays) * 100;

  const out: JourneyMarker[] = [];
  if (tl) {
    i.ascentBeats.forEach((b, k) =>
      out.push({
        id: `ascent-${k}`,
        kind: 'ascent',
        pct: pointToScrubber({ phase: 'ascent', ascentT: b.t, cruiseMetDays: 0 }, tl) * 100,
        label: b.label,
        seek: { phase: 'ascent', t: b.t, actT: b.actT },
      }),
    );
    if (tl.descentScrubberFraction > 0 && tl.descentDurationS > 0) {
      i.descentBeats.forEach((b, k) =>
        out.push({
          id: `descent-${k}`,
          kind: 'descent',
          pct:
            pointToScrubber(
              {
                phase: 'descent',
                ascentT: tl.ascentDurationS,
                cruiseMetDays: tl.cruiseDurationDays,
                descentT: b.t,
              },
              tl,
            ) * 100,
          label: b.label,
          seek: { phase: 'descent', t: b.t, actT: b.actT },
        }),
      );
    }
  }
  for (const m of i.milestones)
    out.push({
      id: m.id,
      kind: 'milestone',
      pct: cruisePct(m.metDays),
      label: m.label,
      seek: { phase: 'cruise', metDays: m.metDays },
      ...(m.description ? { description: m.description } : {}),
    });
  for (const s of i.stages)
    out.push({
      id: s.id,
      kind: 'stage',
      pct: cruisePct(s.metDays),
      label: s.label,
      seek: { phase: 'cruise', metDays: s.metDays },
    });
  return out.sort((a, b) => a.pct - b.pct || RANK[a.kind] - RANK[b.kind]);
}

/**
 * Collapse markers closer than `minGapPx` on a bar `widthPx` wide into the first of each
 * cluster, which carries the count of the others in `more`. The ascent slice is about 32 px on
 * a phone, where six beats cannot all show; a click on the kept marker seeks to the first.
 * An unmeasured bar (`widthPx` 0) is left as is.
 */
export function declutterMarkers(
  markers: JourneyMarker[],
  widthPx: number,
  minGapPx = MARKER_MIN_GAP_PX,
): JourneyMarker[] {
  if (widthPx <= 0) return markers;
  const out: JourneyMarker[] = [];
  for (const m of markers) {
    const head = out[out.length - 1];
    if (head && ((m.pct - head.pct) / 100) * widthPx < minGapPx) {
      head.more = (head.more ?? 0) + 1;
    } else {
      out.push({ ...m });
    }
  }
  return out;
}
