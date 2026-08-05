import { describe, it, expect } from 'vitest';
import { pickVisibleMilestones, fdLegProgress } from './fly-frame-selectors';
import type { FlightTimelineEvent } from '$types/mission';

// Pure per-frame selection helpers (RFC-036 WS-B/B4). These lock the trickiest
// branching that used to live inline in the onFrame body: the milestone
// past/active/future picking and the FD leg-relative progress gate.

const ev = (label: string | undefined, met: number | null): FlightTimelineEvent =>
  ({ label, met_days: met }) as FlightTimelineEvent;

const WINDOW = { approachDays: 30, departDays: 20 };

describe('pickVisibleMilestones', () => {
  it('drops events with no label or no MET', () => {
    const picked = pickVisibleMilestones(
      [ev(undefined, 10), ev('NoMet', null), ev('Good', 10)],
      10,
      WINDOW,
    );
    expect(picked.map((p) => p.evt.label)).toEqual(['Good']);
  });

  it('classifies most-recent-past + all-active + first-future', () => {
    // currentMet=100. departDays=20 → past if delta>20 (met<80). approachDays=30 →
    // active if -30<=delta<=20 (70<=met<=130). future if delta<-30 (met>130).
    const events = [
      ev('A', 40), // delta 60 > 20 → past (overwritten by B)
      ev('B', 75), // delta 25 > 20 → past (latest past)
      ev('C', 95), // delta 5 → active
      ev('D', 120), // delta -20 → active
      ev('E', 160), // delta -60 < -30 → future (first)
      ev('F', 200), // future (not first) → dropped
    ];
    const picked = pickVisibleMilestones(events, 100, WINDOW);
    expect(picked.map((p) => `${p.evt.label}:${p.state}`)).toEqual([
      'B:past',
      'C:active',
      'D:active',
      'E:future',
    ]);
  });

  it('sorts by MET before classifying (input order does not matter)', () => {
    const picked = pickVisibleMilestones(
      [ev('late', 160), ev('now', 95), ev('old', 40)],
      100,
      WINDOW,
    );
    // old(40)→past, now(95)→active, late(160)→future.
    expect(picked.map((p) => p.evt.label)).toEqual(['old', 'now', 'late']);
  });

  it('emits nothing when there are no labelled events', () => {
    expect(pickVisibleMilestones([], 100, WINDOW)).toEqual([]);
  });

  it('past boundary is exclusive at exactly departDays (delta == departDays → active)', () => {
    // met=80, currentMet=100 → delta=20 == departDays → NOT >20 → active, not past.
    const picked = pickVisibleMilestones([ev('edge', 80)], 100, WINDOW);
    expect(picked).toEqual([{ evt: ev('edge', 80), state: 'active' }]);
  });
});

describe('fdLegProgress', () => {
  it('pre-launch → both legs at 0', () => {
    expect(fdLegProgress('pre-launch', 0.3)).toEqual({ outboundT: 0, returnT: 0 });
  });

  it('outbound doubles the 0→0.5 half-range; return stays 0', () => {
    expect(fdLegProgress('outbound', 0.25)).toEqual({ outboundT: 0.5, returnT: 0 });
  });

  it('return leg: outbound is complete (1), return doubles the 0.5→1 half-range', () => {
    expect(fdLegProgress('return', 0.75)).toEqual({ outboundT: 1, returnT: 0.5 });
  });

  it('any other phase (e.g. arrived) → both legs complete', () => {
    expect(fdLegProgress('arrived', 1)).toEqual({ outboundT: 1, returnT: 1 });
  });
});
