import { describe, expect, it } from 'vitest';
import { makeTimeline } from '$lib/orbital/ascent-clock';
import {
  MARKER_MIN_GAP_PX,
  declutterMarkers,
  journeyMarkers,
  type JourneyMarkerInput,
} from './journey-markers';

const ASCENT_BEATS = [
  { label: 'LIFTOFF', t: 0 },
  { label: 'MAX-Q', t: 72 },
  { label: 'STAGE SEP', t: 160 },
  { label: 'FAIRING', t: 200 },
  { label: 'SECO', t: 520 },
];

const base = (over: Partial<JourneyMarkerInput> = {}): JourneyMarkerInput => ({
  timeline: makeTimeline(580, 200), // ascent 0.15, no descent
  arcTotalDays: 200,
  ascentBeats: ASCENT_BEATS,
  descentBeats: [],
  milestones: [],
  stages: [],
  ...over,
});

describe('journeyMarkers — one row for the whole journey', () => {
  it('puts the ascent beats inside the ascent slice [0, seam]', () => {
    const ms = journeyMarkers(base());
    const ascent = ms.filter((m) => m.kind === 'ascent');
    expect(ascent).toHaveLength(5);
    for (const m of ascent) {
      expect(m.pct).toBeGreaterThanOrEqual(0);
      expect(m.pct).toBeLessThanOrEqual(15 + 1e-9);
    }
    // MAX-Q at 72 s of 580 s on a 15 % slice
    expect(ascent[1].pct).toBeCloseTo((72 / 580) * 15, 6);
    expect(ascent[1].seek).toEqual({ phase: 'ascent', t: 72 });
  });

  it('places cruise milestones and stages in [seam, 1] when there is no descent', () => {
    const ms = journeyMarkers(
      base({
        milestones: [{ id: 'm1', label: 'FLYBY', metDays: 100 }],
        stages: [{ id: 'arrival', label: 'ARRIVAL', metDays: 200 }],
      }),
    );
    const flyby = ms.find((m) => m.id === 'm1')!;
    expect(flyby.kind).toBe('milestone');
    expect(flyby.pct).toBeCloseTo(15 + 85 * 0.5, 6);
    expect(flyby.seek).toEqual({ phase: 'cruise', metDays: 100 });
    expect(ms.find((m) => m.id === 'arrival')!.pct).toBeCloseTo(100, 6);
  });

  it('with a descent tail the cruise ends where the tail begins and the beats fill the tail', () => {
    const tl = makeTimeline(580, 200, 0.15, 400, 0.2); // ascent 0.15, descent 0.2 → cruise ends at 80 %
    const ms = journeyMarkers(
      base({
        timeline: tl,
        stages: [{ id: 'arrival', label: 'ARRIVAL', metDays: 200 }],
        descentBeats: [
          { label: 'ENTRY', t: 0 },
          { label: 'CHUTE', t: 200 },
          { label: 'TOUCHDOWN', t: 400 },
        ],
      }),
    );
    expect(ms.find((m) => m.id === 'arrival')!.pct).toBeCloseTo(80, 6);
    const descent = ms.filter((m) => m.kind === 'descent');
    expect(descent.map((m) => Math.round(m.pct))).toEqual([80, 90, 100]);
    expect(descent[1].seek).toEqual({ phase: 'descent', t: 200 });
  });

  it('shows no descent markers when the timeline has no descent tail (a plan flight)', () => {
    const ms = journeyMarkers(base({ descentBeats: [{ label: 'ENTRY', t: 0 }] }));
    expect(ms.some((m) => m.kind === 'descent')).toBe(false);
  });

  it('on the cruise-only bar (no launch act) there are no ascent beats and the cruise owns [0, 1]', () => {
    const ms = journeyMarkers(
      base({
        timeline: null,
        milestones: [{ id: 'm1', label: 'FLYBY', metDays: 50 }],
      }),
    );
    expect(ms.some((m) => m.kind === 'ascent')).toBe(false);
    expect(ms.find((m) => m.id === 'm1')!.pct).toBeCloseTo(25, 6);
  });

  it('returns the markers left to right', () => {
    const ms = journeyMarkers(
      base({
        milestones: [{ id: 'm1', label: 'A', metDays: 150 }],
        stages: [{ id: 's1', label: 'B', metDays: 20 }],
      }),
    );
    const pcts = ms.map((m) => m.pct);
    expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  });

  it('clamps a milestone past the arc end onto the bar', () => {
    const ms = journeyMarkers(base({ milestones: [{ id: 'late', label: 'X', metDays: 999 }] }));
    expect(ms.find((m) => m.id === 'late')!.pct).toBeCloseTo(100, 6);
  });
});

describe('declutterMarkers — ticks closer than 10 px collapse', () => {
  const ms = journeyMarkers(base({ stages: [{ id: 'arrival', label: 'ARRIVAL', metDays: 200 }] }));

  it('uses a 10 px gap', () => {
    expect(MARKER_MIN_GAP_PX).toBe(10);
  });

  it('keeps every marker on a 1109 px desktop bar', () => {
    const out = declutterMarkers(ms, 1109);
    expect(out).toHaveLength(ms.length);
    expect(out.every((m) => (m.more ?? 0) === 0)).toBe(true);
  });

  it('collapses the crowded ascent slice on the 216 px phone bar, keeping the first with a count', () => {
    const out = declutterMarkers(ms, 216);
    const ascentKept = out.filter((m) => m.kind === 'ascent');
    expect(ascentKept.length).toBeLessThan(5);
    expect(ascentKept[0].label).toBe('LIFTOFF');
    expect(ascentKept[0].more).toBeGreaterThan(0);
    // nothing kept sits closer than the gap to its neighbour
    for (let i = 1; i < out.length; i++) {
      expect(((out[i].pct - out[i - 1].pct) / 100) * 216).toBeGreaterThanOrEqual(10 - 1e-9);
    }
    // every marker is either kept or counted
    expect(out.reduce((n, m) => n + 1 + (m.more ?? 0), 0)).toBe(ms.length);
  });

  it('does nothing before the bar has been measured', () => {
    expect(declutterMarkers(ms, 0)).toHaveLength(ms.length);
  });
});
